import { Request, Response, NextFunction } from "express";
import Ajv, { JSONSchemaType } from "ajv";
import { ValidationError } from "./errors.js";

// Initialize Ajv - using type assertion to handle ESM/CJS interop issues in TS with NodeNext
const ajv = new ((Ajv as any).default || (Ajv as any))({ allErrors: true });

/**
 * Middleware factory for validating request body with Ajv.
 * @param schema - The JSON Schema to validate against.
 * @returns - A standard Express middleware function.
 */
export function validateBody<T>(schema: JSONSchemaType<T>) {
  const validate = ajv.compile(schema);

  return (req: Request, _res: Response, next: NextFunction) => {
    if (!validate(req.body)) {
      const errorMessage = ajv.errorsText(validate.errors, {
        separator: ", ",
        dataVar: "body",
      });
      return next(new ValidationError(errorMessage));
    }
    next();
  };
}
