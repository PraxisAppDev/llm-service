import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { addDays } from "date-fns";
import { handle } from "hono/aws-lambda";
import { deleteCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { authorizeToken, pwHash, pwVerify, sid } from "./auth";
import { LambdaBindings, responseTypes } from "./common";
import { adminSessions, adminUsers } from "./db";
import env from "./env";
import { llm, MODELS } from "./llm";
import { validationHook } from "./middleware";
import {
  chatRoute,
  completionsRoute,
  getCurrentAdminRoute,
  getModelRoute,
  listAdminsRoute,
  listModelsRoute,
  loginAdminRoute,
  logoutAdminRoute,
} from "./routes";

// Hono app
const app = new OpenAPIHono<{ Bindings: LambdaBindings }>({
  // custom validation error handling
  defaultHook: validationHook,
});

// use error logging
app.use(logger());

// setup CORS to make sure we respond to OPTIONS requests; API Gateway handles this for us outbound
app.use("*", cors());

// define security schemes
const APIKEY_HEADER = "X-API-KEY";
app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: APIKEY_HEADER,
});

const TOKEN_COOKIE = "SESSION-TOKEN";
app.openAPIRegistry.registerComponent("securitySchemes", "SessionAuth", {
  type: "apiKey",
  in: "cookie",
  name: TOKEN_COOKIE,
});

// ERROR HANDLING --------

app.onError((err, c) => {
  console.error("Application error", err);
  if (err instanceof HTTPException) {
    console.error(`Caught HTTPException: ${err.message}`);
    switch (err.status) {
      case 401:
        return c.json(
          {
            error: responseTypes.unauthorized,
            messages: [err.message],
          },
          err.status
        );

      default:
        return c.json(
          {
            error: responseTypes.server_error,
            messages: [`Status: ${err.status}`, err.message],
          },
          500
        );
    }
  } else {
    console.error(`Caught unknown error: ${err}`);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: [err.message],
      },
      500
    );
  }
});

// ADMINS --------

app.openapi(listAdminsRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`List admins request with token ${token?.substring(0, 7)}...`);

  if (!token) {
    return c.json(
      {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
      401
    );
  }

  try {
    const auth = await authorizeToken(token);

    if (auth.error) {
      return c.json(auth.error, 401);
    }

    const admins = await adminUsers.list();

    return c.json(
      {
        count: admins.length,
        admins,
      },
      200
    );
  } catch (e) {
    console.error("List admins failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["List admins failed"],
      },
      500
    );
  }
});

app.openapi(getCurrentAdminRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Current admin request for ${token?.substring(0, 7)}...`);

  if (!token) {
    return c.json(
      {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
      401
    );
  }

  try {
    const auth = await authorizeToken(token);

    if (auth.adminUser) {
      return c.json(auth.adminUser.user, 200);
    } else {
      return c.json(auth.error, 401);
    }
  } catch (e) {
    console.error("Get current admin user failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Get admin user for session failed"],
      },
      500
    );
  }
});

app.openapi(loginAdminRoute, async (c) => {
  const { email, password } = c.req.valid("json");

  console.info(`Login request for ${email}`);

  try {
    const admin = await adminUsers.find(email);
    console.log("Found admin user", admin);

    if (admin && (await pwVerify(admin.passwordHash, password))) {
      // create the session
      const sessionToken = sid();
      const expiresAt = addDays(new Date(), 30);
      await adminSessions.create(admin.user, sessionToken, expiresAt);

      // set the cookie
      setCookie(c, TOKEN_COOKIE, sessionToken, {
        path: "/",
        // TODO: in production set 'domain' to the root domain
        httpOnly: true,
        secure: true,
        sameSite: env.devMode ? "None" : "Lax",
        expires: expiresAt,
      });

      // send the response
      return c.json(admin.user, 201);
    } else {
      // waste some more time to throttle
      await pwHash(password);
      return c.json(
        {
          error: responseTypes.unauthorized,
          messages: ["Invalid email or password"],
        },
        401
      );
    }
  } catch (e) {
    console.error("Admin login failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Session creation failed"],
      },
      500
    );
  }
});

app.openapi(logoutAdminRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Logout request for ${userId} -> ${token?.substring(0, 7)}...`);

  if (!token) {
    return c.json(
      {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
      401
    );
  }

  try {
    const { userId: sessionUid } = await adminSessions.find(token);

    if (sessionUid && sessionUid === userId) {
      // valid session that matches the given user ID; delete the session
      await adminSessions.delete(userId, token);

      // instruct the client to delete the session token cookie
      deleteCookie(c, TOKEN_COOKIE);

      return c.body(null, 204);
    } else {
      return c.json(
        {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
        401
      );
    }
  } catch (e) {
    console.error("Admin logout failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Session creation failed"],
      },
      500
    );
  }
});

// MODELS --------

app.openapi(listModelsRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const apiKey = c.req.valid("header")[APIKEY_HEADER];

  console.info(
    `List models request with token=${token?.substring(0, 7)} / key=${apiKey?.substring(0, 7)}`
  );

  try {
    if (token) {
      const auth = await authorizeToken(token);
      if (auth.adminUser) {
        return c.json({ models: MODELS }, 200);
      } else {
        return c.json(auth.error, 401);
      }
    } else if (apiKey) {
      // TODO: implement api key authorization
      return c.json(
        {
          error: responseTypes.server_error,
          messages: ["API key authorization implemented"],
        },
        500
      );
    } else {
      // unauthorized
      return c.json(
        {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
        401
      );
    }
  } catch (e) {
    console.error("List models failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["List models failed on the server"],
      },
      500
    );
  }
});

app.openapi(getModelRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const apiKey = c.req.valid("header")[APIKEY_HEADER];
  const { model: modelId } = c.req.valid("param");

  console.info(
    `Get model ${modelId} request with token=${token?.substring(0, 7)} / key=${apiKey?.substring(
      0,
      7
    )}`
  );

  const awsModelId = llm.getAwsModelId(modelId);
  if (!awsModelId) {
    return c.json(
      {
        error: responseTypes.invalid_request,
        messages: [`Unknown model identifier "${modelId}"`],
      },
      400
    );
  }

  try {
    if (token) {
      const auth = await authorizeToken(token);
      if (auth.adminUser) {
        const model = await llm.getModel(awsModelId);

        if (model) {
          return c.json({ ...model, id: modelId }, 200);
        } else {
          console.error(`Get model returned no result for "${awsModelId}"!`);
          return c.json(
            {
              error: responseTypes.server_error,
              messages: ["Model retrieval failed"],
            },
            500
          );
        }
      } else {
        return c.json(auth.error, 401);
      }
    } else if (apiKey) {
      // TODO: implement api key authorization
      return c.json(
        {
          error: responseTypes.server_error,
          messages: ["API key authorization implemented"],
        },
        500
      );
    } else {
      // unauthorized
      return c.json(
        {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
        401
      );
    }
  } catch (e) {
    console.error(`Get model failed for "${awsModelId}"`, e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Model retrieval failed"],
      },
      500
    );
  }
});

// COMPLETIONS --------

app.openapi(completionsRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const apiKey = c.req.valid("header")[APIKEY_HEADER];
  const body = c.req.valid("json");

  console.info(
    `Completion request for model ${body.model} with token=${token?.substring(
      0,
      7
    )} / key=${apiKey?.substring(0, 7)}`
  );

  const awsModelId = llm.getAwsModelId(body.model);
  if (!awsModelId) {
    return c.json(
      {
        error: responseTypes.invalid_request,
        messages: [`Unknown model identifier "${body.model}"`],
      },
      400
    );
  }

  try {
    if (token) {
      const auth = await authorizeToken(token);
      if (auth.adminUser) {
        let gen = await llm.getCompletion(
          awsModelId,
          body.system,
          body.prompt,
          body.temperature,
          body.topP,
          body.maxGenLen
        );

        return c.json(
          {
            model: body.model,
            generation: gen.generation,
            stopReason: gen.stopReason,
            usage: {
              inputTokens: gen.inputTokens,
              outputTokens: gen.outputTokens,
            },
          },
          200
        );
      } else {
        return c.json(auth.error, 401);
      }
    } else if (apiKey) {
      // TODO: implement api key authorization
      return c.json(
        {
          error: responseTypes.server_error,
          messages: ["API key authorization implemented"],
        },
        500
      );
    } else {
      // unauthorized
      return c.json(
        {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
        401
      );
    }
  } catch (e) {
    console.error(`Get completion failed for "${awsModelId}"`, e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Model inference for completion failed"],
      },
      500
    );
  }
});

// CHAT --------

app.openapi(chatRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const apiKey = c.req.valid("header")[APIKEY_HEADER];
  const body = c.req.valid("json");

  console.info(
    `Chat completion request for model ${body.model} with token=${token?.substring(
      0,
      7
    )} / key=${apiKey?.substring(0, 7)}`
  );

  const awsModelId = llm.getAwsModelId(body.model);
  if (!awsModelId) {
    return c.json(
      {
        error: responseTypes.invalid_request,
        messages: [`Unknown model identifier "${body.model}"`],
      },
      400
    );
  }

  try {
    if (token) {
      const auth = await authorizeToken(token);
      if (auth.adminUser) {
        let gen = await llm.getChatCompletion(
          awsModelId,
          body.system,
          body.messages,
          body.temperature,
          body.topP,
          body.maxGenLen
        );

        return c.json(
          {
            model: body.model,
            generation: gen.generation,
            stopReason: gen.stopReason,
            usage: {
              inputTokens: gen.inputTokens,
              outputTokens: gen.outputTokens,
            },
          },
          200
        );
      } else {
        return c.json(auth.error, 401);
      }
    } else if (apiKey) {
      // TODO: implement api key authorization
      return c.json(
        {
          error: responseTypes.server_error,
          messages: ["API key authorization implemented"],
        },
        500
      );
    } else {
      // unauthorized
      return c.json(
        {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
        401
      );
    }
  } catch (e) {
    console.error(`Get chat completion failed for "${awsModelId}"`, e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Model inference for chat completion failed"],
      },
      500
    );
  }
});

// OpenAPI endpoints

app.doc31("/docs.json", (c) => ({
  info: {
    title: "Afterhours LLM API",
    version: "v1",
    description: "Provides access to LLMs for authorized users",
  },
  openapi: "3.1.0",
  servers: [
    {
      url: new URL(c.req.url).origin,
      description: "Current environment",
    },
  ],
}));

app.get("/docs", swaggerUI({ url: "/docs.json" }));

export const handler = handle(app);
