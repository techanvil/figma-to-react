import WebSocket, { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import type { Server, IncomingMessage } from "http";
import logger from "@/utils/logger.js";
import type { ExtendedWebSocket, WebSocketMessage } from "@/types/index.js";

let wss: WebSocketServer | null = null;
const clients = new Map<string, Set<ExtendedWebSocket>>(); // sessionId -> Set of WebSocket connections

/**
 * Start WebSocket server
 */
export const start = (httpServer: Server): void => {
  const WS_PORT = parseInt(process.env.WS_PORT ?? "3002", 10);

  wss = new WebSocketServer({
    port: WS_PORT,
    verifyClient: (info: { origin: string; req: IncomingMessage }) => {
      // Basic verification - could be enhanced with auth
      const url = new URL(info.req.url!, `http://${info.req.headers.host!}`);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        logger.warn("WebSocket connection rejected: no sessionId provided", {
          origin: info.origin,
          url: info.req.url,
        });
        return false;
      }

      return true;
    },
  });

  wss.on("connection", (ws: ExtendedWebSocket, req: IncomingMessage) => {
    const url = new URL(req.url!, `http://${req.headers.host!}`);
    const sessionId = url.searchParams.get("sessionId")!;
    const clientId = uuidv4();

    // Store client connection
    if (!clients.has(sessionId)) {
      clients.set(sessionId, new Set());
    }
    clients.get(sessionId)!.add(ws);

    // Add client metadata
    ws.sessionId = sessionId;
    ws.id = clientId;
    ws.isAlive = true;

    logger.info("WebSocket client connected", {
      sessionId,
      clientId,
      clientCount: clients.get(sessionId)!.size,
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connection-established",
        payload: {
          clientId,
          sessionId,
          connectedAt: new Date().toISOString(),
          server: "figma-bridge-server",
        },
        timestamp: Date.now(),
      } satisfies WebSocketMessage)
    );

    // Handle incoming messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        handleMessage(ws, message);
      } catch (error) {
        logger.error("Error parsing WebSocket message", {
          error: (error as Error).message,
          sessionId,
          clientId,
          rawData: data.toString(),
        });

        ws.send(
          JSON.stringify({
            type: "error",
            payload: {
              error: "Invalid message format",
            },
            timestamp: Date.now(),
          } satisfies WebSocketMessage)
        );
      }
    });

    // Handle client disconnect
    ws.on("close", (code, reason) => {
      logger.info("WebSocket client disconnected", {
        sessionId,
        clientId,
        code,
        reason: reason?.toString(),
      });

      // Remove client from session
      if (clients.has(sessionId)) {
        clients.get(sessionId)!.delete(ws);
        if (clients.get(sessionId)!.size === 0) {
          clients.delete(sessionId);
        }
      }
    });

    // Handle errors
    ws.on("error", (error) => {
      logger.error("WebSocket error", {
        error: error.message,
        sessionId,
        clientId,
      });
    });

    // Handle pong responses for heartbeat
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  });

  // Handle server events
  wss.on("error", (error: Error) => {
    logger.error("WebSocket server error", { error: error.message });
  });

  // Heartbeat interval to detect broken connections
  const heartbeatInterval = setInterval(() => {
    if (wss) {
      wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  logger.info(`WebSocket server started on port ${WS_PORT}`);
};

/**
 * Handle incoming WebSocket messages
 */
const handleMessage = (
  ws: ExtendedWebSocket,
  message: WebSocketMessage
): void => {
  const { type, payload } = message;

  logger.debug("WebSocket message received", {
    type,
    sessionId: ws.sessionId,
    clientId: ws.id,
  });

  switch (type) {
    case "ping":
      ws.send(
        JSON.stringify({
          type: "pong",
          payload: {},
          timestamp: Date.now(),
        } satisfies WebSocketMessage)
      );
      break;

    case "subscribe-to-session":
      // Client wants to subscribe to session updates
      ws.send(
        JSON.stringify({
          type: "subscription-confirmed",
          payload: {
            sessionId: ws.sessionId,
            subscriptions: ["components", "transformations", "analysis"],
          },
          timestamp: Date.now(),
        } satisfies WebSocketMessage)
      );
      break;

    case "figma-plugin-data":
      // Forward data from Figma plugin to other clients
      broadcastToSession(
        ws.sessionId!,
        {
          type: "figma-data-update",
          payload: {
            ...(typeof payload === "object" && payload !== null ? payload : {}),
            from: "figma-plugin",
          },
          timestamp: Date.now(),
        },
        ws
      );
      break;

    case "request-status":
      // Send current session status
      ws.send(
        JSON.stringify({
          type: "status-update",
          payload: {
            sessionId: ws.sessionId,
            connectedClients: clients.get(ws.sessionId!)?.size ?? 0,
            serverUptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
          timestamp: Date.now(),
        } satisfies WebSocketMessage)
      );
      break;

    default:
      logger.warn("Unknown WebSocket message type", {
        type,
        sessionId: ws.sessionId,
        clientId: ws.id,
      });

      ws.send(
        JSON.stringify({
          type: "error",
          payload: {
            error: `Unknown message type: ${type}`,
          },
          timestamp: Date.now(),
        } satisfies WebSocketMessage)
      );
  }
};

/**
 * Broadcast message to all clients in a session
 */
export const broadcastToSession = (
  sessionId: string,
  message: WebSocketMessage,
  excludeClient?: ExtendedWebSocket
): void => {
  if (!clients.has(sessionId)) {
    logger.debug("No clients to broadcast to", { sessionId });
    return;
  }

  const sessionClients = clients.get(sessionId)!;
  let sentCount = 0;

  sessionClients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        logger.error("Error sending message to client", {
          error: (error as Error).message,
          sessionId,
          clientId: client.id,
        });
      }
    }
  });

  logger.debug("Message broadcasted to session", {
    sessionId,
    messageType: message.type,
    clientCount: sentCount,
  });
};

/**
 * Get connection statistics
 */
export const getStats = () => {
  const stats = {
    totalSessions: clients.size,
    totalConnections: 0,
    sessions: {} as Record<
      string,
      {
        connections: number;
        clients: Array<{
          clientId: string;
          connectedAt: string;
        }>;
      }
    >,
  };

  clients.forEach((sessionClients, sessionId) => {
    stats.totalConnections += sessionClients.size;
    stats.sessions[sessionId] = {
      connections: sessionClients.size,
      clients: Array.from(sessionClients).map((ws) => ({
        clientId: ws.id ?? "unknown",
        connectedAt: new Date().toISOString(), // We could store this if needed
      })),
    };
  });

  return stats;
};

/**
 * Close all connections and stop server
 */
export const stop = (): void => {
  if (wss) {
    wss.clients.forEach((ws: ExtendedWebSocket) => {
      ws.close(1000, "Server shutting down");
    });
    wss.close();
    clients.clear();
    logger.info("WebSocket server stopped");
  }
};

export default {
  start,
  stop,
  broadcastToSession,
  getStats,
};
