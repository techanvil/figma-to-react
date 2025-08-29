const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

let wss = null;
const clients = new Map(); // sessionId -> Set of WebSocket connections

/**
 * Start WebSocket server
 */
const start = (httpServer) => {
  const WS_PORT = process.env.WS_PORT || 3002;

  wss = new WebSocket.Server({
    port: WS_PORT,
    verifyClient: (info) => {
      // Basic verification - could be enhanced with auth
      const url = new URL(info.req.url, `http://${info.req.headers.host}`);
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

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    const clientId = uuidv4();

    // Store client connection
    if (!clients.has(sessionId)) {
      clients.set(sessionId, new Set());
    }
    clients.get(sessionId).add(ws);

    // Add client metadata
    ws.sessionId = sessionId;
    ws.clientId = clientId;
    ws.connectedAt = new Date().toISOString();

    logger.info("WebSocket client connected", {
      sessionId,
      clientId,
      clientCount: clients.get(sessionId).size,
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connection-established",
        data: {
          clientId,
          sessionId,
          connectedAt: ws.connectedAt,
          server: "figma-bridge-server",
        },
      })
    );

    // Handle incoming messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        logger.error("Error parsing WebSocket message", {
          error: error.message,
          sessionId,
          clientId,
          rawData: data.toString(),
        });

        ws.send(
          JSON.stringify({
            type: "error",
            error: "Invalid message format",
            timestamp: new Date().toISOString(),
          })
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
        clients.get(sessionId).delete(ws);
        if (clients.get(sessionId).size === 0) {
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
  });

  // Handle server events
  wss.on("error", (error) => {
    logger.error("WebSocket server error", { error: error.message });
  });

  logger.info(`WebSocket server started on port ${WS_PORT}`);
};

/**
 * Handle incoming WebSocket messages
 */
const handleMessage = (ws, message) => {
  const { type, data } = message;

  logger.debug("WebSocket message received", {
    type,
    sessionId: ws.sessionId,
    clientId: ws.clientId,
  });

  switch (type) {
    case "ping":
      ws.send(
        JSON.stringify({
          type: "pong",
          timestamp: new Date().toISOString(),
        })
      );
      break;

    case "subscribe-to-session":
      // Client wants to subscribe to session updates
      ws.send(
        JSON.stringify({
          type: "subscription-confirmed",
          data: {
            sessionId: ws.sessionId,
            subscriptions: ["components", "transformations", "analysis"],
          },
        })
      );
      break;

    case "figma-plugin-data":
      // Forward data from Figma plugin to other clients
      broadcastToSession(
        ws.sessionId,
        {
          type: "figma-data-update",
          data,
          from: "figma-plugin",
        },
        ws
      );
      break;

    case "request-status":
      // Send current session status
      ws.send(
        JSON.stringify({
          type: "status-update",
          data: {
            sessionId: ws.sessionId,
            connectedClients: clients.get(ws.sessionId)?.size || 0,
            serverUptime: process.uptime(),
            timestamp: new Date().toISOString(),
          },
        })
      );
      break;

    default:
      logger.warn("Unknown WebSocket message type", {
        type,
        sessionId: ws.sessionId,
        clientId: ws.clientId,
      });

      ws.send(
        JSON.stringify({
          type: "error",
          error: `Unknown message type: ${type}`,
          timestamp: new Date().toISOString(),
        })
      );
  }
};

/**
 * Broadcast message to all clients in a session
 */
const broadcastToSession = (sessionId, message, excludeClient = null) => {
  if (!clients.has(sessionId)) {
    logger.debug("No clients to broadcast to", { sessionId });
    return;
  }

  const sessionClients = clients.get(sessionId);
  let sentCount = 0;

  sessionClients.forEach((client) => {
    if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
      try {
        client.send(
          JSON.stringify({
            ...message,
            timestamp: message.timestamp || new Date().toISOString(),
          })
        );
        sentCount++;
      } catch (error) {
        logger.error("Error sending message to client", {
          error: error.message,
          sessionId,
          clientId: client.clientId,
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
const getStats = () => {
  const stats = {
    totalSessions: clients.size,
    totalConnections: 0,
    sessions: {},
  };

  clients.forEach((sessionClients, sessionId) => {
    stats.totalConnections += sessionClients.size;
    stats.sessions[sessionId] = {
      connections: sessionClients.size,
      clients: Array.from(sessionClients).map((ws) => ({
        clientId: ws.clientId,
        connectedAt: ws.connectedAt,
      })),
    };
  });

  return stats;
};

/**
 * Close all connections and stop server
 */
const stop = () => {
  if (wss) {
    wss.clients.forEach((ws) => {
      ws.close(1000, "Server shutting down");
    });
    wss.close();
    clients.clear();
    logger.info("WebSocket server stopped");
  }
};

module.exports = {
  start,
  stop,
  broadcastToSession,
  getStats,
};
