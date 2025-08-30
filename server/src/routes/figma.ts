import express from "express";
import type { Request, Response } from "express";
import { asyncHandler, handleValidationError } from "@/middleware/error.js";
import {
  validateFigmaData,
  validateComponentRequest,
} from "@/validators/figma.js";
import * as figmaController from "@/controllers/figma.js";

const router = express.Router();

// Apply validation error handler
router.use(handleValidationError);

/**
 * POST /api/figma/components
 * Receive component data from Figma plugin
 */
router.post(
  "/components",
  validateFigmaData,
  asyncHandler(figmaController.receiveComponents)
);

/**
 * GET /api/figma/components/:sessionId
 * Get stored component data by session ID
 */
router.get(
  "/components/:sessionId",
  asyncHandler(figmaController.getComponents)
);

/**
 * POST /api/figma/transform
 * Transform Figma data to React component structure
 */
router.post(
  "/transform",
  validateComponentRequest,
  asyncHandler(figmaController.transformToReact)
);

/**
 * GET /api/figma/sessions
 * Get all active sessions
 */
router.get("/sessions", asyncHandler(figmaController.getSessions));

/**
 * DELETE /api/figma/sessions/:sessionId
 * Delete a session and its data
 */
router.delete(
  "/sessions/:sessionId",
  asyncHandler(figmaController.deleteSession)
);

/**
 * POST /api/figma/extract/tokens
 * Extract design tokens from Figma data
 */
router.post(
  "/extract/tokens",
  validateFigmaData,
  asyncHandler(figmaController.extractDesignTokens)
);

/**
 * POST /api/figma/analyze
 * Analyze Figma components for React generation patterns
 */
router.post(
  "/analyze",
  validateFigmaData,
  asyncHandler(figmaController.analyzeComponents)
);

/**
 * GET /api/figma/search?q=<query>&limit=<number>
 * Search components by custom name
 */
router.get("/search", asyncHandler(figmaController.searchComponentsByName));

/**
 * GET /api/figma/names
 * Get all indexed custom names
 */
router.get("/names", asyncHandler(figmaController.getCustomNames));

/**
 * PUT /api/figma/sessions/:sessionId/components/:componentId/name
 * Update component custom name
 */
router.put(
  "/sessions/:sessionId/components/:componentId/name",
  asyncHandler(figmaController.updateComponentName)
);

/**
 * GET /api/figma/components/by-name/:name
 * Get component by custom name (Cursor-friendly)
 */
router.get(
  "/components/by-name/:name",
  asyncHandler(figmaController.getComponentByName)
);

/**
 * GET /api/figma/generate?name=<name>&framework=react&typescript=true
 * Generate React component code from Figma component name (one-step for Cursor)
 */
router.get("/generate", asyncHandler(figmaController.generateComponentCode));

/**
 * GET /api/figma/available
 * Get all available components for Cursor autocomplete
 */
router.get("/available", asyncHandler(figmaController.getAvailableComponents));

/**
 * WebSocket endpoint info
 */
router.get("/websocket/info", (req: Request, res: Response) => {
  res.json({
    websocketUrl: `ws://localhost:${process.env.WS_PORT ?? "3002"}`,
    protocols: ["figma-bridge"],
    connectionInfo:
      "Connect with session ID as query parameter: ?sessionId=your-session-id",
  });
});

export default router;
