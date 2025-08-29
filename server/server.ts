import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import type { Server } from "http";

import logger from "./src/utils/logger.js";
import websocketServer from "./src/websocket/server.js";
import figmaRoutes from "./src/routes/figma.js";
import healthRoutes from "./src/routes/health.js";
import { errorHandler, notFound } from "./src/middleware/error.js";
import { validateApiKey } from "./src/middleware/auth.js";
import type { ServerConfig } from "./src/types/index.js";

// Load environment variables
dotenv.config();

const app = express();

// Configuration
const config: ServerConfig = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  logLevel: process.env.LOG_LEVEL ?? "info",
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") ?? [
    "http://localhost:3000",
  ],
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "900000", 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "100", 10),
  },
};

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like Figma plugins, Postman, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Allow configured origins
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    // Allow file:// origins (for local development)
    if (origin.startsWith("file://")) {
      callback(null, true);
      return;
    }

    // For development, be more permissive
    if (config.nodeEnv === "development") {
      callback(null, true);
      return;
    }

    // Reject other origins in production
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-API-Key",
    "X-Requested-With",
  ],
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });
  next();
});

// Routes
app.use("/health", healthRoutes);
app.use("/api/figma", validateApiKey, figmaRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const server: Server = app.listen(config.port, () => {
  logger.info(`Figma Bridge Server running on port ${config.port}`, {
    environment: config.nodeEnv,
    port: config.port,
  });
});

// Start WebSocket server
websocketServer.start(server);

// Graceful shutdown handlers
const gracefulShutdown = (signal: string): void => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info("Process terminated");
    process.exit(0);
  });
};

process.on("SIGTERM", () => {
  gracefulShutdown("SIGTERM");
});
process.on("SIGINT", () => {
  gracefulShutdown("SIGINT");
});

export default app;
