import { z } from "@hono/zod-openapi";

// COMMON --------

const apiKey = z
  .string({ required_error: "X-API-KEY header is required" })
  .uuid({ message: "Invalid API key format" })
  .openapi({
    description: "API key to authorize the request",
    example: "36b8f84d-df4e-4d49-b662-bcde71a8764f",
  });

const model = z
  .string({ required_error: "Model identifier is required" })
  .openapi({
    description: "The identifier of an LLM",
    example: "meta-llama3.3-70b",
  });

const modelName = z
  .string({ required_error: "Model name is required" })
  .openapi({ description: "Human-readable model name" });

const modelProvider = z
  .string({ required_error: "Model provider is required" })
  .openapi({ description: "The provider of the model" });

const system = z.string().default("You are a helpful assistant").openapi({
  description: "Sets the context in which to interact with the AI model",
  default: "You are a helpful assistant",
});

const temperature = z
  .number()
  .min(0.0, "Temperature must be >= 0")
  .max(1.0, "Temperature must be <= 1")
  .default(0.5)
  .openapi({
    description: "Use a lower value to decrease randomness in the response",
    default: 0.5,
  });

const topP = z
  .number()
  .min(0.0, "Top P must be >= 0")
  .max(1.0, "Top P must be <= 1")
  .default(0.9)
  .openapi({
    description:
      "Use a lower value to ignore less probable options. Set to 0 or 1.0 to disable.",
    default: 0.9,
  });

const maxGenLen = z
  .number()
  .min(1, "Max gen length must be >= 1")
  .max(2048, "Max gen length must be <= 2048")
  .default(512)
  .openapi({
    description:
      "The maximum number of tokens to use in the generated response",
    default: 512,
  });

const generation = z
  .string({ required_error: "Generation is required" })
  .openapi({ description: "The text generated by the model" });

const stopReason = z
  .enum(["stop", "length"])
  .openapi({ description: "The reason why the model stopped generating text" });

const usage = z
  .object({
    inputTokens: z.number().openapi({
      description: "The number of input tokens consumed for the request",
    }),
    outputTokens: z.number().openapi({
      description: "The number of output tokens produced for the request",
    }),
  })
  .openapi({ description: "Token usage information for the request" });

// HEADERS --------

export const AuthorizedReqHeadersSchema = z
  .object({
    "X-API-KEY": apiKey,
  })
  .openapi("AuthorizedRequestHeaders");

// REQUEST PARAMS --------

export const GetModelReqSchema = z
  .object({
    model,
  })
  .openapi("ModelRequestParams");

// REQUEST BODIES --------

export const CompletionReqSchema = z
  .object({
    model,
    prompt: z.string({ required_error: "Prompt is required" }).openapi({
      description: "The inputs, commands, and questions to the model",
    }),
    system,
    temperature,
    topP,
    maxGenLen,
  })
  .openapi("CompletionRequest");

export type CompletionReq = z.infer<typeof CompletionReqSchema>;

export const ChatReqSchema = z
  .object({
    model,
    messages: z
      .array(
        z.object({
          role: z
            .enum(["user", "assistant"], { required_error: "Role is required" })
            .openapi({ description: "The role of the message" }),
          message: z.string({ required_error: "Message is required" }).openapi({
            description: "The user's prompt or assistant's response",
          }),
        })
      )
      .nonempty()
      .openapi({
        description:
          "List of chat messages in order from oldest to most recent user prompt",
      }),
    system,
    temperature,
    topP,
    maxGenLen,
  })
  .openapi("ChatRequest");

// RESPONSES --------

export const CompletionResSchema = z
  .object({
    model,
    generation,
    stopReason,
    usage,
  })
  .openapi("CompletionResponse");

export const ModelsResSchema = z
  .object({
    models: z.array(
      z
        .object({
          name: modelName,
          provider: modelProvider,
          id: model,
        })
        .optional()
    ),
  })
  .openapi("ModelsResponse");

export const ModelResSchema = z
  .object({
    id: model,
    name: modelName,
    provider: modelProvider,
    inputModalities: z
      .array(z.string())
      .openapi({ description: "List of supported input modalities" }),
    outputModalities: z
      .array(z.string())
      .openapi({ description: "List of supported output modalities" }),
  })
  .openapi("ModelResponse");

export const ErrorResSchema = z
  .object({
    error: z.string().openapi({
      description: "The error description",
    }),
    messages: z.array(z.string()).optional().openapi({
      description: "Additional error context messages for end-user display",
    }),
  })
  .openapi("ErrorResponse");
