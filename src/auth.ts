import { hash, verify } from "@node-rs/argon2";
import { createId } from "@paralleldrive/cuid2";
import { getUnixTime } from "date-fns";
import { HTTPException } from "hono/http-exception";
import { randomBytes } from "node:crypto";
import { responseTypes } from "./common";
import { adminSessions, adminUsers } from "./db";

const argonOpts = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Create a hash of the provided password
 * @param password the password to hash
 * @returns an argon2 hash of the given password
 */
export const pwHash = async (password: string) => {
  const h = await hash(password, argonOpts);
  return h;
};

/**
 * Verify a user's password
 * @param hash a user's passwordHash to check against
 * @param password the password to verify
 * @returns true if the given password validates to the given hash
 */
export const pwVerify = async (hash: string, password: string) => {
  const v = await verify(hash, password, argonOpts);
  return v;
};

/**
 * Create a random user ID (standard cuid2)
 * @returns a new user ID
 */
export const uid = () => createId();

/**
 * Create a random session ID (32 bytes, base64)
 * @returns a new session ID
 */
export const sid = () => {
  const buf = randomBytes(32);
  return buf.toString("base64");
};

export const authorizeToken = async (token: string) => {
  // lookupt the token
  const { userId, sessionExpiresAt } = await adminSessions.find(token);

  // make sure the session is valid and not expired
  if (userId) {
    if (getUnixTime(new Date()) >= sessionExpiresAt) {
      // session expired!
      return {
        adminUser: undefined,
        error: {
          error: responseTypes.unauthorized,
          messages: ["Session expired"],
        },
      };
    }

    // lookup the admin user
    const adminUser = await adminUsers.get(userId);

    if (adminUser) {
      // success! good authorization
      return { adminUser: adminUser, error: undefined };
    } else {
      // strange state mismatch (deleted user?)
      return {
        adminUser: undefined,
        error: {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
      };
    }
  } else {
    // session lookup failed
    return {
      adminUser: undefined,
      error: {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
    };
  }
};

type User = {
  name: string;
  email: string;
  authorized: boolean;
  admin: boolean;
};

const AUTHORIZATIONS = new Map<string, User>();

AUTHORIZATIONS.set("2ead2cbc-69e5-44f2-8393-58e30fc04772", {
  name: "Alex Gladd",
  email: "foo@example.com",
  authorized: true,
  admin: true,
});

export const authorize = (apiKey: string) => {
  if (!apiKey) {
    throw new HTTPException(401, { message: "Access denied" });
  }

  const user = AUTHORIZATIONS.get(apiKey);
  if (!user) {
    console.log("AUTH: invalid api key");
    throw new HTTPException(401, { message: "Access denied" });
  } else if (!user.authorized) {
    console.log("AUTH: valid api key; user authorization revoked");
    throw new HTTPException(401, { message: "Access denied" });
  } else {
    console.log("AUTH: authorization success");
    return user;
  }
};
