const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/error");
const {
  validateFigmaData,
  validateComponentRequest,
} = require("../validators/figma");
const { handleValidationError } = require("../middleware/error");
const figmaController = require("../controllers/figma");
const logger = require("../utils/logger");

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
 * POST /api/figma/extract
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
 * WebSocket endpoint info
 */
router.get("/websocket/info", (req, res) => {
  res.json({
    websocketUrl: `ws://localhost:${process.env.WS_PORT || 3002}`,
    protocols: ["figma-bridge"],
    connectionInfo:
      "Connect with session ID as query parameter: ?sessionId=your-session-id",
  });
});

module.exports = router;
