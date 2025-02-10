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
    // DATABASE
    const db = new sst.aws.Dynamo("llm-db", {
      fields: {
        userId: "string",
        recordId: "string",
      },
      primaryIndex: { hashKey: "userId", rangeKey: "recordId" },
      globalIndexes: {
        AdminAuthIdx: {
          hashKey: "recordId",
          projection: ["passwordHash", "createdAt", "updatedAt"],
        },
        AdminSessionIdx: {
          hashKey: "recordId",
          projection: ["expiresAt"],
        },
      },
    });

    // API
    const api = new sst.aws.ApiGatewayV2("llm-gw");

    api.route("ANY /{proxy+}", {
      handler: "src/index.handler",
      runtime: "nodejs22.x",
      link: [db],
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
      nodejs: {
        install: ["@node-rs/argon2"],
      },
    });

    // UI
    const ui = new sst.aws.StaticSite("llm-ui", {
      path: "ui",
      build: {
        command: "npm run build",
        output: "dist",
      },
      dev: {
        autostart: true,
        command: "npm run dev",
        url: "http://localhost:5173/",
      },
      environment: {
        VITE_LLMSVC_API_ROOT: api.url,
      },
    });

    return {
      api: api.url,
      ui: ui.url,
    };
  },
});
