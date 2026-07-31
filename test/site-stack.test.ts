import { describe, it } from "vitest";
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { SiteStack } from "../lib/site-stack";

describe("SiteStack", () => {
  const app = new App();
  const stack = new SiteStack(app, "TestSiteStack", {
    env: { account: "111111111111", region: "us-east-1" },
    httpApiEndpoint: "https://abc123.execute-api.us-east-1.amazonaws.com",
  });
  const template = Template.fromStack(stack);

  it("blocks all public access on the site bucket", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  it("grants CloudFront read access via Origin Access Control, not a public policy", () => {
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Principal: { Service: "cloudfront.amazonaws.com" },
            Condition: Match.objectLike({
              StringEquals: Match.objectLike({
                "AWS:SourceArn": Match.anyValue(),
              }),
            }),
          }),
        ]),
      }),
    });
  });

  it("enforces TLS 1.2+ and pins both domain names on the distribution", () => {
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: Match.arrayWith(["eraliev.com", "www.eraliev.com"]),
        ViewerCertificate: Match.objectLike({
          MinimumProtocolVersion: "TLSv1.2_2021",
        }),
      }),
    });
  });

  it("applies HSTS via the response headers policy", () => {
    template.hasResourceProperties("AWS::CloudFront::ResponseHeadersPolicy", {
      ResponseHeadersPolicyConfig: Match.objectLike({
        SecurityHeadersConfig: Match.objectLike({
          StrictTransportSecurity: Match.objectLike({
            Override: true,
            Preload: true,
          }),
        }),
      }),
    });
  });
});
