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
    // DOMAIN
    const hostedZone = "Z02504132A2QSK5CUNLEL";
    const domain =
      $app.stage === "production"
        ? "llms.afterhoursdev.com"
        : $dev
        ? `dev-${$app.stage}.llms.afterhoursdev.com`
        : `${$app.stage}.llms.afterhoursdev.com`;

    // DATABASE
    const db = new sst.aws.Dynamo("Data", {
      fields: {
        userId: "string",
        recordId: "string",
        expiresAt: "number",
        sessionToken: "string",
        apiKey: "string",
      },
      primaryIndex: { hashKey: "userId", rangeKey: "recordId" },
      globalIndexes: {
        AllUserIdx: {
          hashKey: "recordId",
          projection: ["userName", "passwordHash", "createdAt", "updatedAt"],
        },
        AdminSessionIdx: {
          hashKey: "sessionToken",
          rangeKey: "expiresAt",
          projection: "keys-only",
        },
        UserKeyIdx: {
          hashKey: "apiKey",
          rangeKey: "expiresAt",
          projection: "keys-only",
        },
      },
      ttl: "expiresAt",
    });

    // EMAIL
    // const email = new sst.aws.Email("Email", {
    //   sender: domain,
    //   dmarc: "v=DMARC1; p=reject; adkim=r;",
    //   dns: sst.aws.dns({
    //     zone: hostedZone,
    //   }),
    // });

    // API
    const api = new sst.aws.ApiGatewayV2("Gateway", {
      cors: {
        allowOrigins: $dev ? ["http://localhost:5173", `https://${domain}`] : [`https://${domain}`],
        allowMethods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
        allowHeaders: ["Accept", "Content-Type", "Authorization"],
        allowCredentials: true,
      },
      domain: {
        name: `api.${domain}`,
        dns: sst.aws.dns({
          zone: hostedZone,
        }),
      },
    });

    api.route("ANY /{proxy+}", {
      handler: "src/index.handler",
      architecture: "arm64",
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
      environment: {
        LLMSVC_STAGE: $app.stage,
        LLMSVC_DEV_MODE: $dev ? "true" : "false",
      },
    });

    // UI
    const ui = new sst.aws.StaticSite("UI", {
      path: "ui",
      build: {
        command: "npm run build",
        output: "dist",
      },
      domain: $dev
        ? undefined
        : {
            name: domain,
            dns: sst.aws.dns({
              zone: hostedZone,
            }),
          },
      dev: {
        autostart: true,
        command: "npm run dev",
        url: "http://localhost:5173/",
      },
      environment: {
        VITE_LLMSVC_API_ROOT: api.url,
        VITE_LLMSVC_STAGE: $app.stage,
        VITE_LLMSVC_DEV_MODE: $dev ? "true" : "false",
      },
    });

    return {
      table: db.name,
      api: api.url,
      ui: ui.url,
    };
  },
});
