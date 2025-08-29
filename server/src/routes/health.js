const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

/**
 * Health check endpoint
 */
router.get("/", (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "1.0.0",
    memory: process.memoryUsage(),
    pid: process.pid,
  };

  logger.debug("Health check requested", { healthCheck });
  res.status(200).json(healthCheck);
});

/**
 * Readiness check endpoint
 */
router.get("/ready", (req, res) => {
  // Add any readiness checks here (database connections, etc.)
  const readinessCheck = {
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
router.get("/live", (req, res) => {
  res.status(200).json({
    status: "ALIVE",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
