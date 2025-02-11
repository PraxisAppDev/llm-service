import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { addDays, getUnixTime } from "date-fns";
import { handle } from "hono/aws-lambda";
import { setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { authorize, pwHash, pwVerify, sid } from "./auth";
import { LambdaBindings, responseTypes } from "./common";
import { adminSessions, adminUsers } from "./db";
import { llm, MODELS } from "./llm";
import { validationHook } from "./middleware";
import {
  AdminLoginReqSchema,
  AdminUserResSchema,
  AuthorizedReqCookiesSchema,
  AuthorizedReqHeadersSchema,
  ChatReqSchema,
  CompletionReqSchema,
  CompletionResSchema,
  ErrorResSchema,
  GetModelReqSchema,
  ModelResSchema,
  ModelsResSchema,
} from "./schemas";

// Hono app
const app = new OpenAPIHono<{ Bindings: LambdaBindings }>({
  // custom validation error handling
  defaultHook: validationHook,
});

// use error logging
app.use(logger());

// setup CORS
// TODO make this more strict
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["*"],
    allowMethods: ["*"],
    credentials: true,
  })
);

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

const getCurrentAdminRoute = createRoute({
  method: "get",
  path: "/admins/current",
  summary: "Get information about the current authenticated admin user",
  tags: ["Admins"],
  security: [{ SessionAuth: [] }],
  request: {
    cookies: AuthorizedReqCookiesSchema,
  },
  responses: {
    200: {
      description: "Authorized user retrieved successfully",
      content: { "application/json": { schema: AdminUserResSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResSchema } },
    },
  },
});

app.openapi(getCurrentAdminRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Current admin request for ${token?.substring(0, 7)}...`);

  try {
    if (token) {
      const { userId, sessionExpiresAt } = await adminSessions.find(token);

      // make sure the session is valid and not expired
      if (
        userId &&
        sessionExpiresAt &&
        getUnixTime(new Date()) < sessionExpiresAt
      ) {
        const adminUser = await adminUsers.get(userId);
        if (adminUser) {
          return c.json(adminUser.user, 200);
        } else {
          return c.json(
            {
              error: responseTypes.unauthorized,
              messages: ["Not authorized"],
            },
            401
          );
        }
      } else {
        return c.json(
          {
            error: responseTypes.unauthorized,
            messages: [sessionExpiresAt ? "Session expired" : "Not authorized"],
          },
          401
        );
      }
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

const loginAdminRoute = createRoute({
  method: "post",
  path: "/admins/sessions",
  summary: "Log in an admin user and get a session token",
  tags: ["Admins"],
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: AdminLoginReqSchema } },
    },
  },
  responses: {
    201: {
      description: "Session created successfully",
      content: { "application/json": { schema: AdminUserResSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResSchema } },
    },
  },
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
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
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
    console.error("User login failed", e);
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

const listModelsRoute = createRoute({
  method: "get",
  path: "/models",
  summary: "Lists the currently available LLMs",
  tags: ["Models"],
  security: [{ ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
  },
  responses: {
    200: {
      description: "Models retrieved successfully",
      content: { "application/json": { schema: ModelsResSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResSchema } },
    },
  },
});

app.openapi(listModelsRoute, async (c) => {
  const apiKey = c.req.valid("header")["X-API-KEY"];

  console.info(`Get request for models list with key ${apiKey}`);

  const user = authorize(apiKey);

  console.info(`Request authorized for user ${user.name} <${user.email}>`);

  return c.json({ models: MODELS }, 200);
});

const getModelRoute = createRoute({
  method: "get",
  path: "/models/{model}",
  summary: "Get basic information about a specific model",
  tags: ["Models"],
  security: [{ ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    params: GetModelReqSchema,
  },
  responses: {
    200: {
      description: "Model retrieved successfully",
      content: { "application/json": { schema: ModelResSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResSchema } },
    },
  },
});

app.openapi(getModelRoute, async (c) => {
  const apiKey = c.req.valid("header")["X-API-KEY"];
  const { model: modelId } = c.req.valid("param");

  console.info(`Get request for model ${modelId} with key ${apiKey}`);

  const user = authorize(apiKey);

  console.info(`Request authorized for user ${user.name} <${user.email}>`);

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

const completionsRoute = createRoute({
  method: "post",
  path: "/completions",
  summary: "Creates a model completion for the given prompt",
  tags: ["Completions"],
  security: [{ ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    body: {
      required: true,
      content: { "application/json": { schema: CompletionReqSchema } },
    },
  },
  responses: {
    200: {
      description: "Completion generated successfully",
      content: { "application/json": { schema: CompletionResSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResSchema } },
    },
  },
});

app.openapi(completionsRoute, async (c) => {
  const apiKey = c.req.valid("header")["X-API-KEY"];
  const body = c.req.valid("json");

  console.info(`Completion request for model ${body.model} with key ${apiKey}`);

  const user = authorize(apiKey);

  console.info(`Request authorized for user ${user.name} <${user.email}>`);

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

const chatRoute = createRoute({
  method: "post",
  path: "/chat/completions",
  summary: "Creates a model completion for the given chat conversation",
  tags: ["Chat"],
  security: [{ ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    body: {
      required: true,
      content: { "application/json": { schema: ChatReqSchema } },
    },
  },
  responses: {
    200: {
      description: "Completion generated successfully",
      content: { "application/json": { schema: CompletionResSchema } },
    },
    400: {
      description: "Bad request",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorResSchema } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: ErrorResSchema } },
    },
  },
});

app.openapi(chatRoute, async (c) => {
  const apiKey = c.req.valid("header")["X-API-KEY"];
  const body = c.req.valid("json");

  console.info(
    `Chat completion request for model ${body.model} with key ${apiKey}`
  );

  const user = authorize(apiKey);

  console.info(`Request authorized for user ${user.name} <${user.email}>`);

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
