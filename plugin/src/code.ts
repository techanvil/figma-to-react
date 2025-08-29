// Figma Plugin Main Code
// This code runs in the main thread and has access to the Figma API

// Type definitions
interface BridgeConfig {
  serverUrl: string;
  wsUrl: string;
  apiKey: string;
  autoConnect: boolean;
}

interface UIMessage {
  type: string;
  data?: any;
}

interface ComponentData {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

console.log("Figma to React Bridge Plugin loaded");

// Plugin state
let isUIOpen: boolean = false;
let websocketConnection: WebSocket | null = null;

// Default configuration
const DEFAULT_CONFIG: BridgeConfig = {
  serverUrl: "http://localhost:3001",
  wsUrl: "ws://localhost:3002",
  apiKey: "",
  autoConnect: true,
};

// Initialize plugin
async function initialize(): Promise<void> {
  // Load saved configuration
  const config = await loadConfiguration();

  // Set up message handlers
  figma.ui.onmessage = handleUIMessage;

  console.log("Plugin initialized with config:", config);
}

// Configuration management
async function loadConfiguration(): Promise<BridgeConfig> {
  try {
    const savedConfig = await figma.clientStorage.getAsync("bridgeConfig");
    return Object.assign({}, DEFAULT_CONFIG, savedConfig);
  } catch (error) {
    console.error("Error loading configuration:", error);
    return DEFAULT_CONFIG;
  }
}

async function saveConfiguration(config: BridgeConfig): Promise<boolean> {
  try {
    await figma.clientStorage.setAsync("bridgeConfig", config);
    console.log("Configuration saved");
    return true;
  } catch (error) {
    console.error("Error saving configuration:", error);
    return false;
  }
}

// UI Management
async function openUI() {
  if (!isUIOpen) {
    figma.showUI(__html__, {
      width: 400,
      height: 600,
      title: "Figma to React Bridge",
    });
    isUIOpen = true;

    // Send initial data to UI
    const config = await loadConfiguration();
    sendToUI("plugin-ready", {
      config: config,
      selection: getSelectionData(),
    });
  }
}

function closeUI() {
  if (isUIOpen) {
    figma.closePlugin();
    isUIOpen = false;
  }
}

function sendToUI(type: string, data: any = {}) {
  if (isUIOpen) {
    try {
      // Deep clone and sanitize data to ensure it's serializable
      const sanitizedData = JSON.parse(JSON.stringify(data));
      figma.ui.postMessage({
        type,
        data: sanitizedData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error sending data to UI:", error);
      // Send a simplified error message instead
      figma.ui.postMessage({
        type: "error",
        data: {
          message: "Failed to serialize data for UI",
          originalType: type,
        },
        timestamp: Date.now(),
      });
    }
  }
}

// Handle messages from UI
async function handleUIMessage(msg) {
  const { type, data } = msg;

  console.log("Received UI message:", type, data);

  switch (type) {
    case "get-selection":
      handleGetSelection();
      break;

    case "send-to-bridge":
      await handleSendToBridge(data);
      break;

    case "save-config":
      await handleSaveConfig(data);
      break;

    case "test-connection":
      await handleTestConnection(data);
      break;

    case "close-plugin":
      closeUI();
      break;

    case "refresh-selection":
      sendToUI("selection-updated", getSelectionData());
      break;

    default:
      console.warn("Unknown message type:", type);
  }
}

// Selection handling
function getSelectionData() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return {
      hasSelection: false,
      count: 0,
      components: [],
      message: "No components selected",
    };
  }

  const components = selection.map((node) => extractNodeData(node));

  return {
    hasSelection: true,
    count: selection.length,
    components,
    metadata: {
      fileKey: figma.fileKey,
      fileName: figma.root.name,
      currentPage: {
        id: figma.currentPage.id,
        name: figma.currentPage.name,
      },
      user: figma.currentUser
        ? {
            id: figma.currentUser.id,
            name: figma.currentUser.name,
          }
        : null,
      viewport: figma.viewport,
      version: figma.version || "unknown",
      selectedAt: new Date().toISOString(),
    },
  };
}

function handleGetSelection() {
  const selectionData = getSelectionData();
  sendToUI("selection-data", selectionData);
}

// Extract comprehensive node data
function extractNodeData(node) {
  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    removed: node.removed,
    pluginData: node.getPluginData("figma-to-react-bridge") || null,
  };

  // Add bounding box if available
  if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
    baseData.absoluteBoundingBox = {
      x: node.absoluteBoundingBox.x,
      y: node.absoluteBoundingBox.y,
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height,
    };
  }

  // Add layout constraints
  if ("constraints" in node) {
    baseData.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }

  // Extract fills
  if ("fills" in node && node.fills !== figma.mixed) {
    baseData.fills = node.fills.map((fill) => extractFillData(fill));
  }

  // Extract strokes
  if ("strokes" in node && node.strokes !== figma.mixed) {
    baseData.strokes = node.strokes.map((stroke) => extractPaintData(stroke));
    if ("strokeWeight" in node) {
      baseData.strokeWeight = node.strokeWeight;
    }
  }

  // Extract corner radius
  if ("cornerRadius" in node) {
    baseData.cornerRadius = node.cornerRadius;
  }

  if ("rectangleCornerRadii" in node) {
    baseData.rectangleCornerRadii = node.rectangleCornerRadii;
  }

  // Extract effects
  if ("effects" in node) {
    baseData.effects = node.effects.map((effect) => extractEffectData(effect));
  }

  // Extract text-specific data
  if (node.type === "TEXT") {
    baseData.characters = node.characters;
    baseData.fontSize = node.fontSize;
    baseData.fontName = node.fontName;
    baseData.textAlignHorizontal = node.textAlignHorizontal;
    baseData.textAlignVertical = node.textAlignVertical;
    baseData.letterSpacing = node.letterSpacing;
    baseData.lineHeight = node.lineHeight;

    // Get text style
    try {
      baseData.style = {
        fontFamily: node.fontName?.family,
        fontSize: typeof node.fontSize === "number" ? node.fontSize : undefined,
        fontWeight: node.fontName?.style,
        lineHeightPx:
          typeof node.lineHeight === "object"
            ? node.lineHeight.value
            : undefined,
        letterSpacing:
          typeof node.letterSpacing === "object"
            ? node.letterSpacing.value
            : undefined,
        textAlignHorizontal: node.textAlignHorizontal,
        textAlignVertical: node.textAlignVertical,
      };
    } catch (error) {
      console.warn("Error extracting text style:", error);
    }
  }

  // Extract component data
  if ("mainComponent" in node && node.mainComponent) {
    baseData.componentId = node.mainComponent.id;
    baseData.componentName = node.mainComponent.name;
  }

  // Extract component properties (variants)
  if ("componentProperties" in node) {
    baseData.componentProperties = node.componentProperties;
  }

  // Extract children recursively
  if ("children" in node && node.children.length > 0) {
    baseData.children = node.children.map((child) => extractNodeData(child));
  }

  // Add auto layout properties if available
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    baseData.layoutMode = node.layoutMode;
    baseData.primaryAxisSizingMode = node.primaryAxisSizingMode;
    baseData.counterAxisSizingMode = node.counterAxisSizingMode;
    baseData.primaryAxisAlignItems = node.primaryAxisAlignItems;
    baseData.counterAxisAlignItems = node.counterAxisAlignItems;
    baseData.paddingLeft = node.paddingLeft;
    baseData.paddingRight = node.paddingRight;
    baseData.paddingTop = node.paddingTop;
    baseData.paddingBottom = node.paddingBottom;
    baseData.itemSpacing = node.itemSpacing;
  }

  return baseData;
}

// Extract fill/paint data
function extractFillData(fill) {
  const fillData = {
    type: fill.type,
    visible: fill.visible,
    opacity: fill.opacity,
    blendMode: fill.blendMode,
  };

  if (fill.type === "SOLID") {
    fillData.color = {
      r: fill.color.r,
      g: fill.color.g,
      b: fill.color.b,
      a: fill.opacity || 1,
    };
  } else if (
    fill.type === "GRADIENT_LINEAR" ||
    fill.type === "GRADIENT_RADIAL" ||
    fill.type === "GRADIENT_ANGULAR" ||
    fill.type === "GRADIENT_DIAMOND"
  ) {
    fillData.gradientStops = fill.gradientStops.map((stop) => ({
      position: stop.position,
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a || 1,
      },
    }));

    if (fill.gradientTransform) {
      fillData.gradientTransform = fill.gradientTransform;
    }
  } else if (fill.type === "IMAGE") {
    fillData.imageHash = fill.imageHash;
    fillData.scaleMode = fill.scaleMode;
    fillData.imageTransform = fill.imageTransform;
  }

  return fillData;
}

function extractPaintData(paint) {
  return extractFillData(paint); // Same structure for now
}

// Extract effect data
function extractEffectData(effect) {
  const effectData = {
    type: effect.type,
    visible: effect.visible,
    radius: effect.radius,
    spread: effect.spread,
    offset: effect.offset
      ? {
          x: effect.offset.x,
          y: effect.offset.y,
        }
      : undefined,
    color: effect.color
      ? {
          r: effect.color.r,
          g: effect.color.g,
          b: effect.color.b,
          a: effect.color.a || 1,
        }
      : undefined,
    blendMode: effect.blendMode,
  };

  return effectData;
}

// Bridge communication
async function handleSendToBridge(data) {
  try {
    const config = await loadConfiguration();
    const selectionData = getSelectionData();

    if (!selectionData.hasSelection) {
      sendToUI("error", {
        message: "No components selected",
        type: "selection-error",
      });
      return;
    }

    sendToUI("sending-to-bridge", {
      status: "preparing",
      message: "Preparing component data...",
    });

    // Prepare payload
    const payload = {
      components: selectionData.components,
      metadata: selectionData.metadata,
      sessionId: data.sessionId || generateSessionId(),
      timestamp: new Date().toISOString(),
      pluginVersion: "1.0.0",
    };

    sendToUI("sending-to-bridge", {
      status: "sending",
      message: "Sending to bridge server...",
    });

    // Send to bridge server
    const response = await sendToBridgeServer(config, payload);

    if (response.success) {
      sendToUI("bridge-success", {
        message: "Components sent successfully!",
        sessionId: response.sessionId,
        componentCount: response.componentCount,
      });

      // Store session ID for future reference
      await figma.clientStorage.setAsync("lastSessionId", response.sessionId);
    } else {
      throw new Error(response.error || "Unknown error occurred");
    }
  } catch (error) {
    console.error("Error sending to bridge:", error);
    sendToUI("bridge-error", {
      message: error.message || "Failed to send to bridge server",
      error: error.toString(),
    });
  }
}

async function sendToBridgeServer(config, payload) {
  const url = `${config.serverUrl}/api/figma/components`;

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey || "",
      "User-Agent": "Figma-Plugin/1.0.0",
    },
    body: JSON.stringify(payload),
  };

  try {
    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Network error:", error);
    throw new Error(`Network error: ${error.message}`);
  }
}

// Configuration handlers
async function handleSaveConfig(configData) {
  try {
    const success = await saveConfiguration(configData);
    if (success) {
      sendToUI("config-saved", { message: "Configuration saved successfully" });
    } else {
      sendToUI("config-error", { message: "Failed to save configuration" });
    }
  } catch (error) {
    console.error("Error saving config:", error);
    sendToUI("config-error", { message: error.message });
  }
}

async function handleTestConnection(configData) {
  try {
    sendToUI("testing-connection", { status: "testing" });

    const testUrl = `${configData.serverUrl}/health`;
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "X-API-Key": configData.apiKey || "",
      },
    });

    if (response.ok) {
      const healthData = await response.json();
      sendToUI("connection-test-result", {
        success: true,
        message: "Connection successful!",
        serverInfo: healthData,
      });
    } else {
      throw new Error(`Server responded with status ${response.status}`);
    }
  } catch (error) {
    console.error("Connection test failed:", error);
    sendToUI("connection-test-result", {
      success: false,
      message: `Connection failed: ${error.message}`,
      error: error.toString(),
    });
  }
}

// Utility functions
function generateSessionId() {
  return `figma-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Selection change listener
figma.on("selectionchange", () => {
  if (isUIOpen) {
    sendToUI("selection-changed", getSelectionData());
  }
});

// Menu command handlers
figma.on("run", async ({ command, parameters }) => {
  console.log("Plugin command:", command, parameters);

  switch (command) {
    case "send-to-bridge":
      // Quick send without opening UI
      await handleQuickSendToBridge();
      break;

    case "open-panel":
    default:
      await openUI();
      break;
  }
});

async function handleQuickSendToBridge() {
  const selectionData = getSelectionData();

  if (!selectionData.hasSelection) {
    figma.notify("Please select components to send to bridge", { error: true });
    return;
  }

  try {
    const config = await loadConfiguration();

    if (!config.serverUrl || !config.apiKey) {
      figma.notify("Please configure server settings first", { error: true });
      await openUI();
      return;
    }

    figma.notify("Sending components to bridge...", { timeout: 2000 });

    const payload = {
      components: selectionData.components,
      metadata: selectionData.metadata,
      sessionId: generateSessionId(),
      timestamp: new Date().toISOString(),
    };

    const response = await sendToBridgeServer(config, payload);

    if (response.success) {
      figma.notify(
        `✅ Sent ${response.componentCount} components successfully!`,
        { timeout: 3000 }
      );
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error("Quick send error:", error);
    figma.notify(`❌ Failed to send: ${error.message}`, {
      error: true,
      timeout: 5000,
    });
  }
}

// Initialize the plugin
initialize().catch((error) => {
  console.error("Plugin initialization failed:", error);
});
