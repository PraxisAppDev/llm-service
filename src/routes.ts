import { createRoute } from "@hono/zod-openapi";
import {
  AdminListResSchema,
  AdminLoginReqSchema,
  AdminUserResSchema,
  AuthorizedReqCookiesSchema,
  AuthorizedReqHeadersSchema,
  ChatReqSchema,
  CompletionReqSchema,
  CompletionResSchema,
  CreateAdminReqSchema,
  ErrorResSchema,
  GetModelReqSchema,
  LogoutReqParamsSchema,
  ModelResSchema,
  ModelsResSchema,
} from "./schemas";

const RES_400 = {
  description: "Bad request",
  content: { "application/json": { schema: ErrorResSchema } },
};
const RES_401 = {
  description: "Unauthorized",
  content: { "application/json": { schema: ErrorResSchema } },
};
const RES_404 = {
  description: "Not found",
  content: { "application/json": { schema: ErrorResSchema } },
};
const RES_500 = {
  description: "Internal server error",
  content: { "application/json": { schema: ErrorResSchema } },
};

// ADMINS --------

export const listAdminsRoute = createRoute({
  method: "get",
  path: "/admins",
  summary: "Get a list of all admin users",
  tags: ["Admins"],
  security: [{ SessionAuth: [] }],
  request: {
    cookies: AuthorizedReqCookiesSchema,
  },
  responses: {
    200: {
      description: "Admin users retrieved successfully",
      content: { "application/json": { schema: AdminListResSchema } },
    },
    401: RES_401,
    500: RES_500,
  },
});

export const createAdminRoute = createRoute({
  method: "post",
  path: "/admins",
  summary: "Create a new admin user",
  tags: ["Admins"],
  security: [{ SessionAuth: [] }],
  request: {
    cookies: AuthorizedReqCookiesSchema,
    body: {
      content: { "application/json": { schema: CreateAdminReqSchema } },
    },
  },
  responses: {
    201: {
      description: "Admin user created successfully",
      content: { "application/json": { schema: AdminUserResSchema } },
    },
    400: RES_400,
    401: RES_401,
    500: RES_500,
  },
});

export const getCurrentAdminRoute = createRoute({
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
    401: RES_401,
    500: RES_500,
  },
});

// ADMIN SESSIONS --------

export const loginAdminRoute = createRoute({
  method: "post",
  path: "/admins/sessions",
  summary: "Create a session for an admin user (login)",
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
    400: RES_400,
    401: RES_401,
    500: RES_500,
  },
});

export const logoutAdminRoute = createRoute({
  method: "delete",
  path: "/admins/{userId}/sessions",
  summary: "Delete a session for an admin user (logout)",
  tags: ["Admins"],
  security: [{ SessionAuth: [] }],
  request: {
    params: LogoutReqParamsSchema,
    cookies: AuthorizedReqCookiesSchema,
  },
  responses: {
    204: {
      description: "Session deleted successfully",
    },
    400: RES_400,
    401: RES_401,
    500: RES_500,
  },
});

// MODELS --------

export const listModelsRoute = createRoute({
  method: "get",
  path: "/models",
  summary: "Lists the currently available LLMs",
  tags: ["Models"],
  security: [{ SessionAuth: [], ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    cookies: AuthorizedReqCookiesSchema,
  },
  responses: {
    200: {
      description: "Models retrieved successfully",
      content: { "application/json": { schema: ModelsResSchema } },
    },
    400: RES_400,
    401: RES_401,
    500: RES_500,
  },
});

export const getModelRoute = createRoute({
  method: "get",
  path: "/models/{model}",
  summary: "Get basic information about a specific model",
  tags: ["Models"],
  security: [{ SessionAuth: [], ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    cookies: AuthorizedReqCookiesSchema,
    params: GetModelReqSchema,
  },
  responses: {
    200: {
      description: "Model retrieved successfully",
      content: { "application/json": { schema: ModelResSchema } },
    },
    400: RES_400,
    401: RES_401,
    404: RES_404,
    500: RES_500,
  },
});

// COMPLETIONS --------

export const completionsRoute = createRoute({
  method: "post",
  path: "/completions",
  summary: "Creates a model completion for the given prompt",
  tags: ["Completions"],
  security: [{ SessionAuth: [], ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    cookies: AuthorizedReqCookiesSchema,
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
    400: RES_400,
    401: RES_401,
    404: RES_404,
    500: RES_500,
  },
});

export const chatRoute = createRoute({
  method: "post",
  path: "/chat/completions",
  summary: "Creates a model completion for the given chat conversation",
  tags: ["Chat"],
  security: [{ SessionAuth: [], ApiKeyAuth: [] }],
  request: {
    headers: AuthorizedReqHeadersSchema,
    cookies: AuthorizedReqCookiesSchema,
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
    400: RES_400,
    401: RES_401,
    404: RES_404,
    500: RES_500,
  },
});
