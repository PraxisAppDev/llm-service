import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";
import { handle } from "hono/aws-lambda";
import { logger } from "hono/logger";
import { CompletionReqSchema, CompletionResSchema } from "./schemas";

type LambdaBindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

const app = new OpenAPIHono<{ Bindings: LambdaBindings }>();

app.use(logger());

const completionsRoute = createRoute({
  method: "post",
  path: "/completions",
  summary: "Creates a completion for the provided prompt and parameters",
  tags: ["Completions"],
  request: {
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
  },
});

app.openapi(completionsRoute, async (c) => {
  const { model } = c.req.valid("json");

  console.info(`Completions request for model ${model}`);

  return c.json(
    {
      model,
    },
    200
  );
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
