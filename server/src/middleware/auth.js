const logger = require("../utils/logger");

/**
 * Middleware to validate API key
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"] || req.query.apiKey;
  const expectedApiKey = process.env.API_KEY;

  // Skip API key validation in development if not set
  if (process.env.NODE_ENV === "development" && !expectedApiKey) {
    logger.warn("API key validation skipped in development mode");
    return next();
  }

  if (!apiKey) {
    logger.warn("API key missing in request", {
      ip: req.ip,
      path: req.path,
    });
    return res.status(401).json({
      error: "API key required",
      message:
        "Please provide a valid API key in the x-api-key header or apiKey query parameter",
    });
  }

  if (apiKey !== expectedApiKey) {
    logger.warn("Invalid API key provided", {
      ip: req.ip,
      path: req.path,
      providedKey: apiKey.substring(0, 8) + "...", // Log partial key for debugging
    });
    return res.status(401).json({
      error: "Invalid API key",
      message: "The provided API key is not valid",
    });
  }

  logger.debug("API key validation successful", {
    ip: req.ip,
    path: req.path,
  });
  next();
};

/**
 * Middleware to validate Figma plugin origin
 */
const validateFigmaOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const figmaOrigins = ["https://www.figma.com", "https://figma.com"];

  // Allow localhost in development
  if (
    process.env.NODE_ENV === "development" &&
    (origin?.includes("localhost") || !origin)
  ) {
    return next();
  }

  if (!origin || !figmaOrigins.includes(origin)) {
    logger.warn("Invalid origin for Figma request", {
      origin,
      ip: req.ip,
    });
    return res.status(403).json({
      error: "Forbidden",
      message: "Request must originate from Figma",
    });
  }

  next();
};

module.exports = {
  validateApiKey,
  validateFigmaOrigin,
};
