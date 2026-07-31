#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import { DataStack } from "../lib/data-stack";
import { AuthStack } from "../lib/auth-stack";
import { ApiStack } from "../lib/api-stack";
import { SiteStack } from "../lib/site-stack";

const app = new App();

// ACM-for-CloudFront and AWS/Billing metrics both require us-east-1, so the
// whole app lives there — CloudFront itself is edge-global regardless.
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: "us-east-1",
};

const dataStack = new DataStack(app, "PortfolioDataStack", { env });

new AuthStack(app, "PortfolioAuthStack", { env });

const apiStack = new ApiStack(app, "PortfolioApiStack", {
  env,
  table: dataStack.table,
  billingAlarmThresholdUsd: 10,
});

new SiteStack(app, "PortfolioSiteStack", {
  env,
  httpApiEndpoint: apiStack.httpApi.apiEndpoint,
});

Tags.of(app).add("project", "portfolio");
