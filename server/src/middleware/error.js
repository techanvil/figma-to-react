const logger = require("../utils/logger");

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (error, req, res, next) => {
  const statusCode = error.status || error.statusCode || 500;
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
  const response = {
    error: message,
    status: statusCode,
    ...(process.env.NODE_ENV === "development" && {
      stack: error.stack,
      details: error.details,
    }),
  };

  res.status(statusCode).json(response);
};

/**
 * Async error wrapper
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation error handler
 */
const handleValidationError = (error, req, res, next) => {
  if (error.isJoi) {
    const validationError = {
      error: "Validation Error",
      message: "Invalid request data",
      details: error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      })),
    };

    logger.warn("Validation error", {
      error: validationError,
      request: {
        method: req.method,
        url: req.originalUrl,
        body: req.body,
      },
    });

    return res.status(400).json(validationError);
  }
  next(error);
};

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  handleValidationError,
};
