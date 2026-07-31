#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { OidcStack } from "../lib/oidc-stack";

// Deployed manually, once, from a workstation — never from CI. See README.
const app = new App();

new OidcStack(app, "PortfolioOidcStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  githubOrg: "zhanboloteraliev",
  githubRepo: "portfolio",
  tags: { project: "portfolio" },
});
