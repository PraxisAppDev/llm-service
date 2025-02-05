/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "afterhours-llm-svc",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // API
    const api = new sst.aws.ApiGatewayV2("llm-gw");

    api.route("ANY /{proxy+}", {
      handler: "src/index.handler",
      runtime: "nodejs22.x",
      permissions: [
        {
          effect: "allow",
          actions: [
            "bedrock:InvokeModel",
            "bedrock:ListFoundationModels",
            "bedrock:GetFoundationModel",
          ],
          resources: ["*"],
        },
      ],
    });

    return {
      api: api.url,
    };
  },
});
