import { v4 as uuidv4 } from "uuid";
import type { Request, Response } from "express";
import logger from "@/utils/logger.js";
import { broadcastToSession } from "@/websocket/server.js";
import figmaTransformer from "@/services/figmaTransformer.js";
import designTokenExtractor from "@/services/designTokenExtractor.js";
import componentAnalyzer from "@/services/componentAnalyzer.js";
import componentNameIndex from "@/services/componentNameIndex.js";
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

    // Index components by custom names
    componentNameIndex.indexComponents(sessionId, components);

    // Store session components after indexing is complete
    componentNameIndex.storeSessionComponents(sessionId, components);

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

    // Remove from component name index
    componentNameIndex.removeSessionFromIndex(sessionId);

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

/**
 * Search components by custom name
 */
export const searchComponentsByName = async (
  req: Request<{}, SuccessResponse, {}, { q: string; limit?: string }>,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { q: query, limit } = req.query;

    if (!query || typeof query !== "string") {
      res.status(400).json({
        success: false,
        error: "Query parameter 'q' is required",
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    const searchLimit = limit ? parseInt(limit, 10) : 50;
    const results = componentNameIndex.searchByCustomName(query);

    // Combine and limit results
    const allResults = [
      ...results.exactMatches.map((r) => ({
        ...r,
        matchType: "exact" as const,
      })),
      ...results.partialMatches.map((r) => ({
        ...r,
        matchType: "partial" as const,
      })),
    ].slice(0, searchLimit);

    logger.info("Component search by name completed", {
      query,
      totalResults: allResults.length,
      exactMatches: results.exactMatches.length,
      partialMatches: results.partialMatches.length,
    });

    res.json({
      success: true,
      data: {
        query,
        results: allResults,
        totalCount: allResults.length,
        exactMatches: results.exactMatches.length,
        partialMatches: results.partialMatches.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error searching components by name", {
      error: (error as Error).message,
      query: req.query.q,
    });
    throw error;
  }
};

/**
 * Get all indexed custom names
 */
export const getCustomNames = async (
  req: Request,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const customNames = componentNameIndex.getAllCustomNames();

    res.json({
      success: true,
      data: {
        customNames,
        totalCount: customNames.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving custom names", {
      error: (error as Error).message,
    });
    throw error;
  }
};

/**
 * Update component custom name
 */
export const updateComponentName = async (
  req: Request<
    { sessionId: string; componentId: string },
    SuccessResponse,
    { customName: string }
  >,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { sessionId, componentId } = req.params;
    const { customName } = req.body;

    if (!customName || typeof customName !== "string") {
      res.status(400).json({
        success: false,
        error: "Custom name is required",
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    const success = componentNameIndex.updateComponentCustomName(
      sessionId,
      componentId,
      customName
    );

    if (!success) {
      res.status(404).json({
        success: false,
        error: "Component not found in session",
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    // Update session activity
    if (sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      session.lastActivity = new Date().toISOString();
      sessions.set(sessionId, session);
    }

    logger.info("Component custom name updated", {
      sessionId,
      componentId,
      customName,
    });

    res.json({
      success: true,
      data: {
        sessionId,
        componentId,
        customName,
        updatedAt: new Date().toISOString(),
      },
      message: "Component custom name updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error updating component custom name", {
      error: (error as Error).message,
      sessionId: req.params.sessionId,
      componentId: req.params.componentId,
    });
    throw error;
  }
};

/**
 * Get component by custom name (Cursor-friendly)
 */
export const getComponentByName = async (
  req: Request<{ name: string }>,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { name } = req.params;

    // Search for component by custom name
    const searchResults = componentNameIndex.searchByCustomName(name);

    // Prefer exact matches
    let targetComponent = searchResults.exactMatches[0];
    if (!targetComponent && searchResults.partialMatches.length > 0) {
      targetComponent = searchResults.partialMatches[0];
    }

    if (!targetComponent) {
      res.status(404).json({
        success: false,
        error: "Component not found",
        message: `No component found with name: ${name}`,
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    logger.info("Target component", {
      targetComponentId: targetComponent.component.id,
    });

    // Get the full component data
    const componentData = componentNameIndex.getComponentData(
      targetComponent.sessionId,
      targetComponent.component.id
    );

    if (!componentData) {
      res.status(404).json({
        success: false,
        error: "Component data not found",
        message: `Component data not found for: ${name}`,
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    logger.info("Component retrieved by name", {
      name,
      componentId: targetComponent.component.id,
      sessionId: targetComponent.sessionId,
    });

    res.json({
      success: true,
      data: {
        component: componentData,
        metadata: {
          customName: targetComponent.component.customName,
          originalName: targetComponent.component.name,
          sessionId: targetComponent.sessionId,
          componentId: targetComponent.component.id,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving component by name", {
      error: (error as Error).message,
      name: req.params.name,
    });
    throw error;
  }
};

/**
 * Generate React component code from Figma component name (one-step for Cursor)
 */
export const generateComponentCode = async (
  req: Request<
    {},
    SuccessResponse,
    {},
    {
      name: string;
      framework?: string;
      typescript?: string;
      styling?: string;
      componentNaming?: string;
    }
  >,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const {
      name,
      framework = "react",
      typescript = "true",
      styling = "css",
      componentNaming = "pascal",
    } = req.query;

    if (!name || typeof name !== "string") {
      res.status(400).json({
        success: false,
        error: "Component name is required",
        message:
          "Please provide a component name in the 'name' query parameter",
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    // Search for component by custom name
    const searchResults = componentNameIndex.searchByCustomName(name);

    // Prefer exact matches
    let targetComponent = searchResults.exactMatches[0];
    if (!targetComponent && searchResults.partialMatches.length > 0) {
      targetComponent = searchResults.partialMatches[0];
    }

    if (!targetComponent) {
      res.status(404).json({
        success: false,
        error: "Component not found",
        message: `No component found with name: ${name}`,
        suggestions: componentNameIndex.getAllCustomNames().slice(0, 5),
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    // Get the full component data
    const componentData = componentNameIndex.getComponentData(
      targetComponent.sessionId,
      targetComponent.component.id
    );

    if (!componentData) {
      res.status(404).json({
        success: false,
        error: "Component data not found",
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    // Transform options
    const transformOptions: TransformOptions = {
      framework: framework as any,
      typescript: typescript === "true",
      styling: styling as any,
      componentNaming: componentNaming as any,
      includeProps: true,
      includeTypes: typescript === "true",
      generateStorybook: false,
      generateTests: false,
      extractTokens: false,
      optimizeImages: false,
    };

    logger.info("Generating React component code", {
      name,
      componentId: targetComponent.component.id,
      options: transformOptions,
    });

    // Transform the component
    const transformedComponents = await figmaTransformer.transformComponents(
      [componentData],
      transformOptions
    );

    if (transformedComponents.length === 0) {
      res.status(500).json({
        success: false,
        error: "Transformation failed",
        message: "Failed to transform Figma component to React code",
        timestamp: new Date().toISOString(),
      } as any);
      return;
    }

    const transformedComponent = transformedComponents[0];

    logger.info("React component code generated", {
      name,
      componentName: transformedComponent.name,
      hasCode: !!transformedComponent.code?.component,
    });

    res.json({
      success: true,
      data: {
        componentName: transformedComponent.name,
        originalFigmaName: targetComponent.originalName,
        customName: targetComponent.customName,
        code: transformedComponent.code,
        props: transformedComponent.props,
        metadata: {
          sessionId: targetComponent.sessionId,
          componentId: targetComponent.component.id,
          transformOptions,
          generatedAt: new Date().toISOString(),
        },
      },
      message: `Generated React component code for: ${name}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error generating component code", {
      error: (error as Error).message,
      name: req.query.name,
    });
    throw error;
  }
};

/**
 * Get all available components for Cursor autocomplete
 */
export const getAvailableComponents = async (
  req: Request,
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const allCustomNames = componentNameIndex.getAllCustomNames();

    // Get component details for each name
    const availableComponents = allCustomNames.map((name) => {
      const searchResults = componentNameIndex.searchByCustomName(
        name.customName
      );
      const component = searchResults.exactMatches[0];

      return {
        name,
        originalName: component?.component.name,
        sessionId: component?.sessionId,
        componentId: component?.component.id,
        lastUpdated: component?.component.lastUpdated,
      };
    });

    logger.info("Available components retrieved", {
      count: availableComponents.length,
    });

    res.json({
      success: true,
      data: {
        components: availableComponents,
        totalCount: availableComponents.length,
        lastUpdated: new Date().toISOString(),
      },
      message: `Found ${availableComponents.length} available components`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error retrieving available components", {
      error: (error as Error).message,
    });
    throw error;
  }
};
