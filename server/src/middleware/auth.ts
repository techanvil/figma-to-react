import type { Request, Response, NextFunction } from "express";
import logger from "@/utils/logger.js";
import type { AuthenticatedRequest, ErrorResponse } from "@/types/index.js";

/**
 * Middleware to validate API key
 */
export const validateApiKey = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const apiKey =
    (req.headers["x-api-key"] as string) ?? (req.query.apiKey as string);
  const expectedApiKey = process.env.API_KEY;

  // Skip API key validation in development if not set
  if (process.env.NODE_ENV === "development" && !expectedApiKey) {
    logger.warn("API key validation skipped in development mode");
    next();
    return;
  }

  if (!apiKey) {
    logger.warn("API key missing in request", {
      ip: req.ip,
      path: req.path,
    });

    const response: ErrorResponse = {
      error: "API key required",
      message:
        "Please provide a valid API key in the x-api-key header or apiKey query parameter",
      timestamp: new Date().toISOString(),
    };

    res.status(401).json(response);
    return;
  }

  if (apiKey !== expectedApiKey) {
    logger.warn("Invalid API key provided", {
      ip: req.ip,
      path: req.path,
      providedKey: apiKey.substring(0, 8) + "...", // Log partial key for debugging
    });

    const response: ErrorResponse = {
      error: "Invalid API key",
      message: "The provided API key is not valid",
      timestamp: new Date().toISOString(),
    };

    res.status(401).json(response);
    return;
  }

  logger.debug("API key validation successful", {
    ip: req.ip,
    path: req.path,
  });

  // Add API key to request for downstream middleware
  req.apiKey = apiKey;
  next();
};

/**
 * Middleware to validate Figma plugin origin
 */
export const validateFigmaOrigin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const origin = req.headers.origin;
  const figmaOrigins = ["https://www.figma.com", "https://figma.com"];

  // Allow localhost in development
  if (
    process.env.NODE_ENV === "development" &&
    (origin?.includes("localhost") || !origin)
  ) {
    next();
    return;
  }

  if (!origin || !figmaOrigins.includes(origin)) {
    logger.warn("Invalid origin for Figma request", {
      origin,
      ip: req.ip,
    });

    const response: ErrorResponse = {
      error: "Forbidden",
      message: "Request must originate from Figma",
      timestamp: new Date().toISOString(),
    };

    res.status(403).json(response);
    return;
  }

  next();
};
