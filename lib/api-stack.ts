import * as path from "path";
import { Stack, StackProps, Duration, CfnOutput } from "aws-cdk-lib";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface ApiStackProps extends StackProps {
  readonly table: dynamodb.Table;
  /** us-east-1 only — AWS/Billing metrics are exclusively published there. */
  readonly billingAlarmThresholdUsd: number;
}

export class ApiStack extends Stack {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const healthLogGroup = new logs.LogGroup(this, "HealthFnLogs", {
      retention: logs.RetentionDays.TWO_WEEKS,
    });

    // Placeholder route so CloudFront's /api/* behavior has a real origin to
    // exercise now, ahead of Phase 2's generateTicket/submitAnswer/getPublic.
    const healthFn = new lambdaNode.NodejsFunction(this, "HealthFn", {
      entry: path.join(__dirname, "..", "lambda", "health", "handler.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: Duration.seconds(5),
      logGroup: healthLogGroup,
      bundling: { minify: true, sourceMap: false },
    });
    props.table.grantReadData(healthFn);

    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "portfolio-api",
      corsPreflight: undefined, // same-origin via CloudFront /api/*, no CORS needed
    });
    this.httpApi.addRoutes({
      path: "/api/health",
      methods: [apigwv2.HttpMethod.GET],
      integration: new apigwv2Integrations.HttpLambdaIntegration(
        "HealthIntegration",
        healthFn
      ),
    });

    new cloudwatch.Alarm(this, "BillingAlarm", {
      alarmName: "portfolio-billing-over-threshold",
      metric: new cloudwatch.Metric({
        namespace: "AWS/Billing",
        metricName: "EstimatedCharges",
        dimensionsMap: { Currency: "USD" },
        statistic: "Maximum",
        period: Duration.hours(6),
      }),
      threshold: props.billingAlarmThresholdUsd,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: "portfolio",
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: "API — requests / errors",
            left: [
              this.httpApi.metricCount({ period: Duration.minutes(15) }),
              this.httpApi.metricServerError({ period: Duration.minutes(15) }),
            ],
          }),
          new cloudwatch.GraphWidget({
            title: "Health Lambda — invocations / errors",
            left: [healthFn.metricInvocations({ period: Duration.minutes(15) })],
            right: [healthFn.metricErrors({ period: Duration.minutes(15) })],
          }),
          new cloudwatch.GraphWidget({
            title: "DynamoDB — consumed capacity",
            left: [
              props.table.metricConsumedReadCapacityUnits({
                period: Duration.minutes(15),
              }),
              props.table.metricConsumedWriteCapacityUnits({
                period: Duration.minutes(15),
              }),
            ],
          }),
        ],
      ],
    });

    new CfnOutput(this, "HttpApiUrl", { value: this.httpApi.apiEndpoint });
    new CfnOutput(this, "HttpApiId", { value: this.httpApi.apiId });
  }
}
