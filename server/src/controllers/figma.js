const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const { broadcastToSession } = require("../websocket/server");
const figmaTransformer = require("../services/figmaTransformer");
const designTokenExtractor = require("../services/designTokenExtractor");
const componentAnalyzer = require("../services/componentAnalyzer");

// In-memory storage for demo (replace with Redis/Database in production)
const sessions = new Map();
const componentData = new Map();

/**
 * Receive and store component data from Figma plugin
 */
const receiveComponents = async (req, res) => {
  try {
    const { components, metadata, sessionId: providedSessionId } = req.body;
    const sessionId = providedSessionId || uuidv4();

    // Store component data
    const componentEntry = {
      id: uuidv4(),
      sessionId,
      components,
      metadata: {
        ...metadata,
        receivedAt: new Date().toISOString(),
        source: "figma-plugin",
      },
      status: "received",
    };

    componentData.set(sessionId, componentEntry);

    // Update session info
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        id: sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        status: "active",
      });
    } else {
      const session = sessions.get(sessionId);
      session.lastActivity = new Date().toISOString();
      sessions.set(sessionId, session);
    }

    logger.info("Components received from Figma", {
      sessionId,
      componentCount: components?.length || 0,
      metadata,
    });

    // Broadcast to WebSocket clients
    broadcastToSession(sessionId, {
      type: "components-received",
      data: {
        sessionId,
        componentCount: components?.length || 0,
        timestamp: new Date().toISOString(),
      },
    });

    res.status(201).json({
      success: true,
      sessionId,
      componentId: componentEntry.id,
      message: "Components received successfully",
      componentCount: components?.length || 0,
    });
  } catch (error) {
    logger.error("Error receiving components", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get stored component data by session ID
 */
const getComponents = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!componentData.has(sessionId)) {
      return res.status(404).json({
        error: "Session not found",
        message: `No component data found for session: ${sessionId}`,
      });
    }

    const data = componentData.get(sessionId);

    // Update session activity
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      session.lastActivity = new Date().toISOString();
      sessions.set(sessionId, session);
    }

    logger.info("Components retrieved", { sessionId });

    res.json({
      success: true,
      data,
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving components", {
      error: error.message,
      sessionId: req.params.sessionId,
    });
    throw error;
  }
};

/**
 * Transform Figma data to React component structure
 */
const transformToReact = async (req, res) => {
  try {
    const { components, options = {} } = req.body;
    const sessionId = req.body.sessionId || uuidv4();

    logger.info("Starting React transformation", {
      sessionId,
      componentCount: components?.length || 0,
      options,
    });

    // Transform components using the transformer service
    const transformedComponents = await figmaTransformer.transformComponents(
      components,
      options
    );

    // Store transformed data
    const transformEntry = {
      id: uuidv4(),
      sessionId,
      originalComponents: components,
      transformedComponents,
      options,
      transformedAt: new Date().toISOString(),
    };

    componentData.set(`${sessionId}-transformed`, transformEntry);

    // Broadcast transformation complete
    broadcastToSession(sessionId, {
      type: "transformation-complete",
      data: {
        sessionId,
        componentCount: transformedComponents.length,
        timestamp: new Date().toISOString(),
      },
    });

    logger.info("React transformation completed", {
      sessionId,
      transformedCount: transformedComponents.length,
    });

    res.json({
      success: true,
      sessionId,
      transformedComponents,
      metadata: {
        originalCount: components?.length || 0,
        transformedCount: transformedComponents.length,
        transformedAt: transformEntry.transformedAt,
      },
    });
  } catch (error) {
    logger.error("Error transforming to React", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

/**
 * Get all active sessions
 */
const getSessions = async (req, res) => {
  try {
    const activeSessions = Array.from(sessions.values()).map((session) => ({
      ...session,
      hasComponentData: componentData.has(session.id),
      hasTransformedData: componentData.has(`${session.id}-transformed`),
    }));

    res.json({
      success: true,
      sessions: activeSessions,
      totalCount: activeSessions.length,
    });
  } catch (error) {
    logger.error("Error retrieving sessions", { error: error.message });
    throw error;
  }
};

/**
 * Delete a session and its associated data
 */
const deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Remove session data
    sessions.delete(sessionId);
    componentData.delete(sessionId);
    componentData.delete(`${sessionId}-transformed`);

    logger.info("Session deleted", { sessionId });

    // Broadcast session deletion
    broadcastToSession(sessionId, {
      type: "session-deleted",
      data: { sessionId, timestamp: new Date().toISOString() },
    });

    res.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
    });
  } catch (error) {
    logger.error("Error deleting session", {
      error: error.message,
      sessionId: req.params.sessionId,
    });
    throw error;
  }
};

/**
 * Extract design tokens from Figma data
 */
const extractDesignTokens = async (req, res) => {
  try {
    const { components, options = {} } = req.body;
    const sessionId = req.body.sessionId || uuidv4();

    logger.info("Extracting design tokens", {
      sessionId,
      componentCount: components?.length || 0,
    });

    const designTokens = await designTokenExtractor.extract(
      components,
      options
    );

    res.json({
      success: true,
      sessionId,
      designTokens,
      extractedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error extracting design tokens", { error: error.message });
    throw error;
  }
};

/**
 * Analyze components for React generation patterns
 */
const analyzeComponents = async (req, res) => {
  try {
    const { components } = req.body;
    const sessionId = req.body.sessionId || uuidv4();

    logger.info("Analyzing components", {
      sessionId,
      componentCount: components?.length || 0,
    });

    const analysis = await componentAnalyzer.analyze(components);

    res.json({
      success: true,
      sessionId,
      analysis,
      analyzedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error analyzing components", { error: error.message });
    throw error;
  }
};

module.exports = {
  receiveComponents,
  getComponents,
  transformToReact,
  getSessions,
  deleteSession,
  extractDesignTokens,
  analyzeComponents,
};
