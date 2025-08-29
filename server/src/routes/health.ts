import express from "express";
import type { Request, Response } from "express";
import logger from "@/utils/logger.js";

const router = express.Router();

interface HealthCheckResponse {
  status: string;
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  memory: NodeJS.MemoryUsage;
  pid: number;
}

interface ReadinessCheckResponse {
  status: string;
  timestamp: string;
  services: {
    websocket: string;
    figmaApi: string;
  };
}

interface LivenessCheckResponse {
  status: string;
  timestamp: string;
}

/**
 * Health check endpoint
 */
router.get("/", (req: Request, res: Response<HealthCheckResponse>) => {
  const healthCheck: HealthCheckResponse = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV ?? "development",
    version: process.env.npm_package_version ?? "1.0.0",
    memory: process.memoryUsage(),
    pid: process.pid,
  };

  logger.debug("Health check requested", { healthCheck });
  res.status(200).json(healthCheck);
});

/**
 * Readiness check endpoint
 */
router.get("/ready", (req: Request, res: Response<ReadinessCheckResponse>) => {
  // Add any readiness checks here (database connections, etc.)
  const readinessCheck: ReadinessCheckResponse = {
    status: "READY",
    timestamp: new Date().toISOString(),
    services: {
      websocket: "OK", // This could be dynamically checked
      figmaApi: "OK", // This could be dynamically checked
    },
  };

  res.status(200).json(readinessCheck);
});

/**
 * Liveness check endpoint
 */
router.get("/live", (req: Request, res: Response<LivenessCheckResponse>) => {
  res.status(200).json({
    status: "ALIVE",
    timestamp: new Date().toISOString(),
  });
});

export default router;
