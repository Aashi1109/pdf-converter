/**
 * Base error class for all application errors
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Factory function to create specific error classes
 * @param name - The name of the error class
 * @param defaultStatusCode - Default HTTP status code for this error type
 */
export function createErrorClass(
  name: string,
  defaultStatusCode: number = 500,
) {
  return class extends AppError {
    constructor(message: string, statusCode: number = defaultStatusCode) {
      super(message, statusCode);
      this.name = name;
    }
  };
}

// Pre-defined error classes using the factory
export const ValidationError = createErrorClass("ValidationError", 400);
export const ConversionError = createErrorClass("ConversionError", 500);
export const StorageError = createErrorClass("StorageError", 500);
export const NotFoundError = createErrorClass("NotFoundError", 404);
