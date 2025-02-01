import { z } from "@hono/zod-openapi";

// COMMON

const model = z
  .string({ required_error: "Model identifier is required" })
  .openapi({
    description: "The identifier of an LLM",
    example: "foobar",
  });

// REQUEST BODIES

export const CompletionReqSchema = z
  .object({
    model,
  })
  .openapi("CompletionRequest");

export const CompletionResSchema = z
  .object({
    model,
  })
  .openapi("CompletionResponse");
