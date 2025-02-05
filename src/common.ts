import type { LambdaContext, LambdaEvent } from "hono/aws-lambda";

export type LambdaBindings = {
  event: LambdaEvent;
  lambdaContext: LambdaContext;
};

export const responseTypes = {
  invalid_request: "Invalid client request",
  server_error: "Internal service error",
  not_found: "Not found",
  unauthorized: "Unauthorized",
};
