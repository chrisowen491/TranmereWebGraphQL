import * as cdk from '@aws-cdk/core';
import * as appsync from '@aws-cdk/aws-appsync';
import * as ddb from '@aws-cdk/aws-dynamodb';
import * as iam from '@aws-cdk/aws-iam';
import { MappingTemplate } from '@aws-cdk/aws-appsync';
import * as config from '../package.json';

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Creates the AppSync API
    const api = new appsync.GraphqlApi(this, 'Api', {
      name: 'tranmere-web-appsync-api',
      schema: appsync.Schema.fromAsset('graphql/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: cdk.Expiration.after(cdk.Duration.days(365))
          }
        },
      },
      xrayEnabled: true,
    });

    // Prints out the AppSync GraphQL endpoint to the terminal
    new cdk.CfnOutput(this, "GraphQLAPIURL", {
      value: api.graphqlUrl
      });
  
      // Prints out the AppSync GraphQL API key to the terminal
      new cdk.CfnOutput(this, "GraphQLAPIKey", {
        value: api.apiKey || ''
      });
  
      // Prints out the stack region to the terminal
      new cdk.CfnOutput(this, "Stack Region", {
        value: this.region
      });

      this.account

      const dynamoTables = config.tables;
      for(var i=0; i < dynamoTables.length; i++) {
        const tableName = dynamoTables[i];
        
        const table = ddb.Table.fromTableArn(this, tableName, `arn:aws:dynamodb:${this.region}:${this.account}:table/${tableName}`);
        const dynamoDataSources = api.addDynamoDbDataSource(tableName, table);
        table.grantReadData(new iam.ServicePrincipal("appsync.amazonaws.com"));
        dynamoDataSources.createResolver({
          typeName: "Query",
          fieldName: "list" + tableName,
          requestMappingTemplate: MappingTemplate.fromFile("graphql/template.json"),
          responseMappingTemplate: MappingTemplate.fromString("$util.toJson($context.result)")
        });
      }
  }
}
