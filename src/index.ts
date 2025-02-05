import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { handle } from "hono/aws-lambda";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { authorize } from "./auth";
import { LambdaBindings, responseTypes } from "./common";
import { llm, MODELS } from "./llm";
import { validationHook } from "./middleware";
import {
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

// user error logging
app.use(logger());

// define openapi security scheme
app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "apiKey",
  in: "header",
  name: "X-API-KEY",
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
