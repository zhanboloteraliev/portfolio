import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface OidcStackProps extends StackProps {
  readonly githubOrg: string;
  readonly githubRepo: string;
  /** CDK bootstrap qualifier — default matches `cdk bootstrap` with no --qualifier. */
  readonly cdkQualifier?: string;
}

export class OidcStack extends Stack {
  constructor(scope: Construct, id: string, props: OidcStackProps) {
    super(scope, id, props);

    const qualifier = props.cdkQualifier ?? "hnb659fds";
    const account = this.account;
    const region = this.region;
    const repository = `${props.githubOrg}/${props.githubRepo}`;
    const subBase = `repo:${repository}`;

    // AWS IAM requires every OIDC trust policy to include a *scoped* `sub`
    // (or `job_workflow_ref`) condition — matching only on custom claims like
    // `repository`/`ref` is rejected at the API level. GitHub now embeds
    // immutable owner/repo IDs into `sub` by default (e.g.
    // `repo:org@123/repo@456:ref:...`) for rename-safety, so both the
    // classic and ID-suffixed forms are matched here.
    const subPatterns = (suffix: string) => [
      `${subBase}:${suffix}`,
      `repo:${props.githubOrg}@*/${props.githubRepo}@*:${suffix}`,
    ];

    const provider = new iam.OpenIdConnectProvider(this, "GithubOidcProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    const bootstrapRoleArn = (role: string) =>
      `arn:aws:iam::${account}:role/cdk-${qualifier}-${role}-${account}-${region}`;

    // The GitHub role never gets direct AWS permissions. It can only assume
    // the roles `cdk bootstrap` already created and scoped to this qualifier —
    // so the blast radius of a leaked token is exactly what CDK itself can do.
    const deployRole = new iam.Role(this, "GithubDeployRole", {
      roleName: "github-portfolio-deploy",
      description: "Assumed by GitHub Actions on push to main to run cdk deploy",
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:repository": repository,
          "token.actions.githubusercontent.com:ref": "refs/heads/main",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": subPatterns("ref:refs/heads/main"),
        },
      }),
      maxSessionDuration: Duration.hours(1),
    });
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkExecRoles",
        actions: ["sts:AssumeRole"],
        resources: [
          bootstrapRoleArn("deploy-role"),
          bootstrapRoleArn("file-publishing-role"),
          bootstrapRoleArn("lookup-role"),
        ],
      })
    );

    const diffRole = new iam.Role(this, "GithubDiffRole", {
      roleName: "github-portfolio-diff",
      description: "Assumed by GitHub Actions on pull_request to run cdk diff (read-only)",
      assumedBy: new iam.WebIdentityPrincipal(provider.openIdConnectProviderArn, {
        StringEquals: {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:repository": repository,
          "token.actions.githubusercontent.com:event_name": "pull_request",
        },
        StringLike: {
          "token.actions.githubusercontent.com:sub": subPatterns("pull_request"),
        },
      }),
      maxSessionDuration: Duration.hours(1),
    });
    diffRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "AssumeCdkLookupRole",
        actions: ["sts:AssumeRole"],
        resources: [bootstrapRoleArn("lookup-role")],
      })
    );

    new CfnOutput(this, "DeployRoleArn", { value: deployRole.roleArn });
    new CfnOutput(this, "DiffRoleArn", { value: diffRole.roleArn });
  }
}
