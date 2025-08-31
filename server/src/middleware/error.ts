import type {
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from "express";
import type { ValidationError as JoiValidationError } from "joi";
import logger from "@/utils/logger.js";
import type {
  ErrorResponse,
  AsyncMiddleware,
  ValidationError,
} from "@/types/index.js";

// Extended error interface
interface ExtendedError extends Error {
  status?: number;
  statusCode?: number;
  details?: unknown;
  isJoi?: boolean;
}

// Joi validation error interface
interface JoiError extends ExtendedError {
  details: Array<{
    path: string[];
    message: string;
  }>;
}

/**
 * 404 Not Found handler
 */
export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error: ExtendedError = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler: ErrorRequestHandler = (
  error: ExtendedError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = error.status ?? error.statusCode ?? 500;
  const message = error.message || "Internal Server Error";

  // Log error details
  logger.error("Request error", {
    error: {
      message: error.message,
      stack: error.stack,
      status: statusCode,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    },
  });

  // Don't leak error details in production
  const response: ErrorResponse = {
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && {
      details: error.stack,
    }),
  };

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper
 */
export const asyncHandler = <T extends AsyncMiddleware>(fn: T): T => {
  return ((req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }) as T;
};

/**
 * Validation error handler
 */
export const handleValidationError: ErrorRequestHandler = (
  error: JoiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (error.isJoi && error.details) {
    const validationErrors: ValidationError[] = error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message,
      value: undefined,
    }));

    const validationResponse: ErrorResponse = {
      error: "Validation Error",
      message: "Invalid request data",
      details: validationErrors,
      timestamp: new Date().toISOString(),
    };

    logger.warn("Validation error", {
      error: validationResponse,
      request: {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
      },
    });

    res.status(400).json(validationResponse);
    return;
  }
  next(error);
};
