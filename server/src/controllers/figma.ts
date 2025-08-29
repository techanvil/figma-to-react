import { v4 as uuidv4 } from "uuid";
import type { Request, Response } from "express";
import logger from "@/utils/logger.js";
import { broadcastToSession } from "@/websocket/server.js";
import figmaTransformer from "@/services/figmaTransformer.js";
import designTokenExtractor from "@/services/designTokenExtractor.js";
import componentAnalyzer from "@/services/componentAnalyzer.js";
import type {
  FigmaNode,
  SessionData,
  ComponentEntry,
  TransformEntry,
  TransformOptions,
  SuccessResponse,
  ErrorResponse,
} from "@/types/index.js";

// In-memory storage for demo (replace with Redis/Database in production)
const sessions = new Map<string, SessionData>();
const componentData = new Map<string, ComponentEntry | TransformEntry>();

interface ReceiveComponentsRequest {
  components: FigmaNode[];
  metadata: ComponentEntry["metadata"];
  sessionId?: string;
}

interface TransformRequest {
  components: FigmaNode[];
  sessionId?: string;
  options?: Partial<TransformOptions>;
}

interface ExtractTokensRequest {
  components: FigmaNode[];
  sessionId?: string;
  options?: Record<string, unknown>;
}

interface AnalyzeRequest {
  components: FigmaNode[];
  sessionId?: string;
}

/**
 * Receive and store component data from Figma plugin
 */
export const receiveComponents = async (
  req: Request<
    {},
    SuccessResponse<{
      sessionId: string;
      componentId: string;
      componentCount: number;
    }>,
    ReceiveComponentsRequest
  >,
  res: Response<
    SuccessResponse<{
      sessionId: string;
      componentId: string;
      componentCount: number;
    }>
  >
): Promise<void> => {
  try {
    const { components, metadata, sessionId: providedSessionId } = req.body;
    const sessionId = providedSessionId ?? uuidv4();

    // Store component data
    const componentEntry: ComponentEntry = {
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
      const session = sessions.get(sessionId)!;
      session.lastActivity = new Date().toISOString();
      sessions.set(sessionId, session);
    }

    logger.info("Components received from Figma", {
      sessionId,
      componentCount: components?.length ?? 0,
      metadata,
    });

    // Broadcast to WebSocket clients
    broadcastToSession(sessionId, {
      type: "components-received",
      payload: {
        sessionId,
        componentCount: components?.length ?? 0,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        componentId: componentEntry.id,
        componentCount: components?.length ?? 0,
      },
      message: "Components received successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error receiving components", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

/**
 * Get stored component data by session ID
 */
export const getComponents = async (
  req: Request<{ sessionId: string }>,
  res: Response<SuccessResponse<ComponentEntry> | ErrorResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!componentData.has(sessionId)) {
      res.status(404).json({
        error: "Session not found",
        message: `No component data found for session: ${sessionId}`,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const data = componentData.get(sessionId) as ComponentEntry;

    // Update session activity
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      session.lastActivity = new Date().toISOString();
      sessions.set(sessionId, session);
    }

    logger.info("Components retrieved", { sessionId });

    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving components", {
      error: (error as Error).message,
      sessionId: req.params.sessionId,
    });
    throw error;
  }
};

/**
 * Transform Figma data to React component structure
 */
export const transformToReact = async (
  req: Request<{}, SuccessResponse, TransformRequest>,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { components, options = {} } = req.body;
    const sessionId = req.body.sessionId ?? uuidv4();

    logger.info("Starting React transformation", {
      sessionId,
      componentCount: components?.length ?? 0,
      options,
    });

    // Transform components using the transformer service
    const transformedComponents = await figmaTransformer.transformComponents(
      components,
      options as TransformOptions
    );

    // Store transformed data
    const transformEntry: TransformEntry = {
      id: uuidv4(),
      sessionId,
      originalComponents: components,
      transformedComponents,
      options: options as TransformOptions,
      transformedAt: new Date().toISOString(),
    };

    componentData.set(`${sessionId}-transformed`, transformEntry);

    // Broadcast transformation complete
    broadcastToSession(sessionId, {
      type: "transformation-complete",
      payload: {
        sessionId,
        componentCount: transformedComponents.length,
        timestamp: new Date().toISOString(),
      },
      timestamp: Date.now(),
    });

    logger.info("React transformation completed", {
      sessionId,
      transformedCount: transformedComponents.length,
    });

    res.json({
      success: true,
      data: {
        sessionId,
        transformedComponents,
        metadata: {
          originalCount: components?.length ?? 0,
          transformedCount: transformedComponents.length,
          transformedAt: transformEntry.transformedAt,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error transforming to React", {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
};

/**
 * Get all active sessions
 */
export const getSessions = async (
  req: Request,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const activeSessions = Array.from(sessions.values()).map((session) => ({
      ...session,
      hasComponentData: componentData.has(session.id),
      hasTransformedData: componentData.has(`${session.id}-transformed`),
    }));

    res.json({
      success: true,
      data: {
        sessions: activeSessions,
        totalCount: activeSessions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving sessions", {
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Delete a session and its associated data
 */
export const deleteSession = async (
  req: Request<{ sessionId: string }>,
  res: Response<SuccessResponse>
): Promise<void> => {
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
      payload: { sessionId, timestamp: new Date().toISOString() },
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: `Session ${sessionId} deleted successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error deleting session", {
      error: (error as Error).message,
      sessionId: req.params.sessionId,
    });
    throw error;
  }
};

/**
 * Extract design tokens from Figma data
 */
export const extractDesignTokens = async (
  req: Request<{}, SuccessResponse, ExtractTokensRequest>,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { components, options = {} } = req.body;
    const sessionId = req.body.sessionId ?? uuidv4();

    logger.info("Extracting design tokens", {
      sessionId,
      componentCount: components?.length ?? 0,
    });

    const designTokens = await designTokenExtractor.extract(
      components,
      options
    );

    res.json({
      success: true,
      data: {
        sessionId,
        designTokens,
        extractedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error extracting design tokens", {
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Analyze components for React generation patterns
 */
export const analyzeComponents = async (
  req: Request<{}, SuccessResponse, AnalyzeRequest>,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { components } = req.body;
    const sessionId = req.body.sessionId ?? uuidv4();

    logger.info("Analyzing components", {
      sessionId,
      componentCount: components?.length ?? 0,
    });

    const analysis = await componentAnalyzer.analyze(components);

    res.json({
      success: true,
      data: {
        sessionId,
        analysis,
        analyzedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error analyzing components", {
      error: (error as Error).message,
    });
    throw error;
  }
};
