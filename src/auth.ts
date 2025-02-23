import { hash, verify } from "@node-rs/argon2";
import { createId } from "@paralleldrive/cuid2";
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

/**
 * Create a random API key (32 bytes, hex)
 * @returns a new API key
 */
export const key = () => {
  const buf = randomBytes(32);
  return buf.toString("hex");
};

export const authorizeToken = async (token?: string) => {
  // handle empty tokens
  if (!token) {
    return {
      error: {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
    };
  }
  // lookupt the token (this also excludes expired tokens)
  const { userId } = await adminSessions.find(token);

  // make sure the session is valid
  if (userId) {
    // lookup the admin user
    const adminUser = await adminUsers.get(userId);

    if (adminUser) {
      // success! good authorization
      return { adminUser: adminUser };
    } else {
      // strange state mismatch (deleted user?)
      return {
        error: {
          error: responseTypes.unauthorized,
          messages: ["Not authorized"],
        },
      };
    }
  } else {
    // session lookup failed
    return {
      error: {
        error: responseTypes.unauthorized,
        messages: ["Not authorized"],
      },
    };
  }
};

export const authorizeTokenOrKey = async (token?: string, apiKey?: string) => {
  // try token first
  const tok = await authorizeToken(token);

  if (tok.adminUser) {
    return {
      user: tok.adminUser.user,
    };
  }

  // TODO: try the api key

  return {
    error: {
      error: responseTypes.unauthorized,
      messages: ["Not authorized"],
    },
  };
};
