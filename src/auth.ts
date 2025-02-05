import { HTTPException } from "hono/http-exception";

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
