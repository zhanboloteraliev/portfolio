# eraliev.com

Infrastructure and source for my cloud support portfolio site, deployed entirely on AWS via CDK.

## Stacks

Deploy order matters — each depends on the one before it:

1. `PortfolioOidcStack` — GitHub OIDC provider + two IAM roles (`github-portfolio-diff`, `github-portfolio-deploy`). Deployed **manually, once, from a workstation** via `bin/oidc.ts`. CI never touches this stack — it must not be able to redeploy the trust policy that authorizes itself.

   The trust policy scopes on the `repository`/`ref`/`event_name` OIDC claims rather than parsing `sub`, because GitHub embeds immutable owner/repo IDs into `sub` by default (`repo:org@123/repo@456:ref:...`) for rename-safety — exact-match `sub` conditions break against that. IAM also hard-requires a *scoped* `sub` or `job_workflow_ref` condition on every OIDC trust policy regardless (a bare `repository` match alone is rejected at the API level), so `sub` is still matched via `StringLike` against both the classic and ID-suffixed forms. See `lib/oidc-stack.ts`.
2. `PortfolioDataStack` — single DynamoDB table (`portfolio`), on-demand, PITR on, `RemovalPolicy.RETAIN`.
3. `PortfolioAuthStack` — Cognito user pool, self-signup disabled, MFA required. No users created yet (Phase 3).
4. `PortfolioApiStack` — HTTP API + a placeholder `/api/health` Lambda, CloudWatch dashboard, $10 billing alarm.
5. `PortfolioSiteStack` — Route 53 hosted zone, ACM cert, private S3 + CloudFront (Origin Access Control), `/api/*` routed to the API, HSTS/CSP response headers, www→apex redirect.

Stacks 2–5 live in `bin/portfolio.ts` and are what CI deploys on every push to `main`.

## One-time setup

```bash
npm ci

# 1. Bootstrap the account for CDK (once per account/region)
npx cdk bootstrap aws://<ACCOUNT_ID>/us-east-1

# 2. Deploy the OIDC stack manually — this is the only stack you deploy by hand
npx cdk deploy --app "npx ts-node --prefer-ts-exts bin/oidc.ts" PortfolioOidcStack
```

Take the `DeployRoleArn` and `DiffRoleArn` from the output and add them as GitHub Actions repo secrets:

- `AWS_DEPLOY_ROLE_ARN`
- `AWS_DIFF_ROLE_ARN`

(Settings → Secrets and variables → Actions, on `zhanboloteraliev/portfolio`.)

### Domain

The zone is created by `PortfolioSiteStack`, not registered — the domain itself is registered at Porkbun. After the first deploy, take the four `NameServers` from the `PortfolioSiteStack` output and set them as the NS records for `eraliev.com` in the Porkbun dashboard. DNS propagation can take up to 24–48 hours; ACM validation and the site won't go live until it resolves.

### Anthropic API key (Phase 3+)

CloudFormation cannot create a `SecureString` SSM parameter — this is an AWS limitation, not a choice. `ApiStack` will grant Lambda read access to the parameter *by ARN*, but the parameter itself is created once via CLI, after the stack that grants access to it exists:

```bash
aws ssm put-parameter \
  --name /portfolio/anthropic-api-key \
  --type SecureString \
  --value "sk-ant-..." \
  --region us-east-1
```

It never appears in a CloudFormation template or in git.

### Billing alerts

`AWS/Billing` metrics (used by the $10 alarm in `ApiStack`) are only published once **"Receive Billing Alerts"** is checked in Billing Preferences in the AWS Console — this is an account-level setting CloudFormation cannot toggle. Enable it once, manually.

## Local development

```bash
npm run build     # tsc
npm test          # vitest — CDK assertion tests on Data/Site stacks
npx cdk diff       # against whatever profile `aws configure` set up locally
npx cdk deploy --all
```

## CI/CD

- `.github/workflows/pr.yml` — on every PR: typecheck, test, `cdk diff` via the read-only role (OIDC, no stored credentials).
- `.github/workflows/deploy.yml` — on push to `main`: typecheck, test, `cdk deploy --all` via the deploy role (OIDC, no stored credentials).

Both roles can only assume the IAM roles `cdk bootstrap` already created in this account — they hold no direct AWS permissions of their own.
