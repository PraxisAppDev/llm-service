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
