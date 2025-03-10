import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";

export type LambdaBindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

export type NewAdminEmailCommand = {
  type: "new-admin";
  name: string;
  email: string;
  password: string;
};

export type NewUserEmailCommand = {
  type: "new-user";
  name: string;
  email: string;
  apiKey: string;
  expiresAt: number;
};

export type NewKeyEmailCommand = {
  type: "new-key";
  name: string;
  email: string;
  apiKey: string;
  expiresAt: number;
};

export type EmailerCommand = NewAdminEmailCommand | NewUserEmailCommand | NewKeyEmailCommand;

export const responseTypes = {
  invalid_request: "Invalid client request",
  server_error: "Internal service error",
  not_found: "Not found",
  unauthorized: "Unauthorized",
};
