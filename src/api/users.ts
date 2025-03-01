import { formatISO, getUnixTime, parseISO } from "date-fns";
import { authorizeToken, key, uid } from "../auth";
import { responseTypes } from "../common";
import { apiUsers } from "../db";
import { CreateUserRequest } from "../schemas";

export const listUsers = async (token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  const users = await apiUsers.list();

  return {
    users: {
      count: users.length,
      users,
    },
  };
};

export const createUser = async (req: CreateUserRequest, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  const existingUser = await apiUsers.find(req.email);

  if (existingUser) {
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: [`User with email ${req.email} already exists`],
      },
      errorStatus: 400 as 400,
    };
  }

  const now = formatISO(new Date());
  const user = {
    id: uid(),
    name: req.name,
    email: req.email,
    createdAt: now,
    updatedAt: now,
  };

  const fullKey = key();
  const expiresAtUnix = getUnixTime(parseISO(req.keyExpiresAt));
  const apiKey = {
    id: uid(),
    snippet: fullKey.substring(0, 8),
    expiresAt: req.keyExpiresAt,
  };

  await apiUsers.create(user, { ...apiKey, key: fullKey, expiresAtUnix });

  return {
    user: { ...user, apiKeys: [apiKey] },
  };
};

export const deleteUser = async (userId: string, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  if (await apiUsers.delete(userId)) {
    return { ok: true };
  } else {
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: ["API user does not exist"],
      },
      errorStatus: 400 as 400,
    };
  }
};

export const createUserKey = async (userId: string, expiresAt: string, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  const user = await apiUsers.get(userId);

  if (!user) {
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: ["API user does not exist"],
      },
      errorStatus: 400 as 400,
    };
  }

  const fullKey = key();
  const expiresAtUnix = getUnixTime(parseISO(expiresAt));
  const apiKey = {
    id: uid(),
    snippet: fullKey.substring(0, 8),
    expiresAt: expiresAt,
  };

  await apiUsers.createKey(user, { ...apiKey, key: fullKey, expiresAtUnix });

  return {
    key: apiKey,
  };
};

export const deleteUserKey = async (userId: string, keyId: string, token?: string) => {
  const auth = await authorizeToken(token);

  if (auth.error) {
    return {
      error: auth.error,
      errorStatus: 401 as 401,
    };
  }

  if (await apiUsers.deleteKey(userId, keyId)) {
    return { ok: true };
  } else {
    return {
      error: {
        error: responseTypes.invalid_request,
        messages: ["API key does not exist"],
      },
      errorStatus: 400 as 400,
    };
  }
};
