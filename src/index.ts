import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { handle } from "hono/aws-lambda";
import { deleteCookie, setCookie } from "hono/cookie";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import {
  changeAdminPw,
  createAdmin,
  currentAdmin,
  deleteAdmin,
  listAdmins,
  loginAdmin,
  logoutAdmin,
} from "./api/admins";
import { chatCompletion, completion } from "./api/completions";
import { getModel, listModels } from "./api/models";
import { createUser, createUserKey, deleteUser, deleteUserKey, listUsers } from "./api/users";
import { LambdaBindings, responseTypes } from "./common";
import env from "./env";
import { validationHook } from "./middleware";
import {
  changeAdminPwRoute,
  chatRoute,
  completionsRoute,
  createAdminRoute,
  createUserKeyRoute,
  createUserRoute,
  deleteAdminRoute,
  deleteUserKeyRoute,
  deleteUserRoute,
  getCurrentAdminRoute,
  getModelRoute,
  listAdminsRoute,
  listModelsRoute,
  listUsersRoute,
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
const APIKEY_HEADER = "Authorization";
app.openAPIRegistry.registerComponent("securitySchemes", "ApiKeyAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "API key",
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

  console.info(`List admins request from token ${token?.substring(0, 7)}...`);

  try {
    const result = await listAdmins(token);

    if (result.admins) {
      return c.json(result.admins, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("List admins failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["List admins failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(createAdminRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const body = c.req.valid("json");

  console.info(`Create admin request for ${body.email} from token ${token?.substring(0, 7)}...`);

  try {
    const result = await createAdmin(body, token);

    if (result.admin) {
      return c.json(result.admin, 201);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Create admin failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Create admin failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(getCurrentAdminRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Current admin request for ${token?.substring(0, 7)}...`);

  try {
    const result = await currentAdmin(token);

    if (result.admin) {
      return c.json(result.admin.user, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Get current admin user failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Get admin user for session failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(deleteAdminRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Delete admin request for ${userId} from token ${token?.substring(0, 7)}...`);

  try {
    const result = await deleteAdmin(userId, token);

    if (result.ok) {
      return c.body(null, 204);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Delete admin user failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Delete admin user failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(changeAdminPwRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const body = c.req.valid("json");

  console.info(
    `Change admin password request for ${userId} from token ${token?.substring(0, 7)}...`
  );

  try {
    const result = await changeAdminPw(body, userId, token);

    if (result.admin) {
      return c.json(result.admin, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Change admin password failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["Change admin password failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(loginAdminRoute, async (c) => {
  const { email, password } = c.req.valid("json");

  console.info(`Login request for ${email}`);

  try {
    const result = await loginAdmin(email, password);

    if (result.admin) {
      // set the cookie
      setCookie(c, TOKEN_COOKIE, result.token, {
        path: "/",
        // TODO: in production set 'domain' to the root domain
        httpOnly: true,
        secure: true,
        sameSite: env.devMode ? "None" : "Lax",
        expires: result.tokenExpiresAt,
      });

      return c.json(result.admin, 201);
    } else {
      return c.json(result.error, result.errorStatus);
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

  try {
    const result = await logoutAdmin(userId, token);

    if (result.ok) {
      // instruct the client to delete the session token cookie
      deleteCookie(c, TOKEN_COOKIE);
      return c.body(null, 204);
    } else {
      return c.json(result.error, result.errorStatus);
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

// USERS & KEYS --------

app.openapi(listUsersRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`List API users request from token ${token?.substring(0, 7)}...`);

  try {
    const result = await listUsers(token);

    if (result.users) {
      return c.json(result.users, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("List API users failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["List API users failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(createUserRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const body = c.req.valid("json");

  console.info(`Create API user request for ${body.email} from token ${token?.substring(0, 7)}...`);

  try {
    const result = await createUser(body, token);

    if (result.user) {
      return c.json(result.user, 201);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Create API user failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["User creation failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(deleteUserRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Delete API user request for ${userId} from token ${token?.substring(0, 7)}...`);

  try {
    const result = await deleteUser(userId, token);

    if (result.ok) {
      return c.body(null, 204);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Delete API user failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["User deletion failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(createUserKeyRoute, async (c) => {
  const { userId } = c.req.valid("param");
  const { keyExpiresAt } = c.req.valid("json");
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Create API key request for user ${userId} from token ${token?.substring(0, 7)}...`);

  try {
    const result = await createUserKey(userId, keyExpiresAt, token);

    if (result.key) {
      return c.json(result.key, 201);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Create API key failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["API key creation failed unexpectedly"],
      },
      500
    );
  }
});

app.openapi(deleteUserKeyRoute, async (c) => {
  const { userId, keyId } = c.req.valid("param");
  const token = c.req.valid("cookie")[TOKEN_COOKIE];

  console.info(`Delete API key request for ${keyId} from token ${token?.substring(0, 7)}...`);

  try {
    const result = await deleteUserKey(userId, keyId, token);

    if (result.ok) {
      return c.body(null, 204);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error("Delete API key failed", e);
    return c.json(
      {
        error: responseTypes.server_error,
        messages: ["API key deletion failed unexpectedly"],
      },
      500
    );
  }
});

// MODELS --------

app.openapi(listModelsRoute, async (c) => {
  const token = c.req.valid("cookie")[TOKEN_COOKIE];
  const bearer = c.req.valid("header")[APIKEY_HEADER];

  console.info(
    `List models request with token=${token?.substring(0, 7)} / key=${bearer?.substring(0, 14)}`
  );

  try {
    const result = await listModels(token, bearer);

    if (result.models) {
      return c.json(result, 200);
    } else {
      return c.json(result.error, result.errorStatus);
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
  const bearer = c.req.valid("header")[APIKEY_HEADER];
  const { model: modelId } = c.req.valid("param");

  console.info(
    `Get model ${modelId} request with token=${token?.substring(0, 7)} / key=${bearer?.substring(
      0,
      14
    )}`
  );

  try {
    const result = await getModel(modelId, token, bearer);

    if (result.model) {
      return c.json(result.model, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error(`Get model failed for "${modelId}"`, e);
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
  const bearer = c.req.valid("header")[APIKEY_HEADER];
  const body = c.req.valid("json");

  console.info(
    `Completion request for model ${body.model} with token=${token?.substring(
      0,
      7
    )} / key=${bearer?.substring(0, 14)}`
  );

  try {
    const result = await completion(body, token, bearer);

    if (result.completion) {
      return c.json(result.completion, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error(`Get completion failed for "${body.model}"`, e);
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
  const bearer = c.req.valid("header")[APIKEY_HEADER];
  const body = c.req.valid("json");

  console.info(
    `Chat completion request for model ${body.model} with token=${token?.substring(
      0,
      7
    )} / key=${bearer?.substring(0, 14)}`
  );

  try {
    const result = await chatCompletion(body, token, bearer);

    if (result.completion) {
      return c.json(result.completion, 200);
    } else {
      return c.json(result.error, result.errorStatus);
    }
  } catch (e) {
    console.error(`Get chat completion failed for "${body.model}"`, e);
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
