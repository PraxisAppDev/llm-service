import { Hook, z } from "@hono/zod-openapi";
import { LambdaBindings, responseTypes } from "./common";

export const validationHook: Hook<any, { Bindings: LambdaBindings }, any, any> = (result, c) => {
  if (result.success === false) {
    const zErrs = z.flattenError(result.error);
    console.error(`Request validation failed for: ${Object.keys(zErrs.fieldErrors).join(", ")}`);

    return c.json(
      {
        error: responseTypes.invalid_request,
        messages: Object.keys(zErrs.fieldErrors).map((k) => zErrs.fieldErrors[k]?.join(", ")),
      },
      400,
    );
  }
};
