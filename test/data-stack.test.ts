import { describe, it } from "vitest";
import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { DataStack } from "../lib/data-stack";

describe("DataStack", () => {
  const app = new App();
  const stack = new DataStack(app, "TestDataStack", {
    env: { account: "111111111111", region: "us-east-1" },
  });
  const template = Template.fromStack(stack);

  it("creates an on-demand table with point-in-time recovery", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    });
  });

  it("retains the table on stack deletion", () => {
    template.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Retain",
      UpdateReplacePolicy: "Retain",
    });
  });

  it("exposes a GSI1 index for topic queries", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({ IndexName: "GSI1" }),
      ]),
    });
  });
});
