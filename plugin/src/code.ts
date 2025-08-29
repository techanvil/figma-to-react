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
  data?: unknown;
  timestamp?: number;
}

interface ComponentData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  removed: boolean;
  pluginData: string | null;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  fills?: FillData[];
  strokes?: PaintData[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  effects?: EffectData[];
  characters?: string;
  fontSize?: number | typeof figma.mixed;
  fontName?: FontName | typeof figma.mixed;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: LetterSpacing | typeof figma.mixed;
  lineHeight?: LineHeight | typeof figma.mixed;
  style?: CustomTextStyle;
  componentId?: string;
  componentName?: string;
  componentProperties?: ComponentProperties;
  children?: ComponentData[];
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
}

interface FillData {
  type: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  gradientStops?: GradientStop[];
  gradientTransform?: Transform;
  imageHash?: string;
  scaleMode?: string;
  imageTransform?: Transform;
}

interface PaintData extends FillData {}

interface GradientStop {
  position: number;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

interface EffectData {
  type: string;
  visible: boolean;
  radius?: number;
  spread?: number;
  offset?: {
    x: number;
    y: number;
  };
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  blendMode?: string;
}

interface CustomTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

interface SelectionData {
  hasSelection: boolean;
  count: number;
  components: ComponentData[];
  message?: string;
  metadata?: {
    fileKey: string;
    fileName: string;
    currentPage: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string;
    } | null;
    viewport: {
      center: Vector;
      zoom: number;
    };
    version: string;
    selectedAt: string;
  };
}

interface BridgePayload {
  components: ComponentData[];
  metadata: SelectionData["metadata"];
  sessionId: string;
  timestamp: string;
  pluginVersion?: string;
}

interface BridgeResponse {
  success: boolean;
  sessionId?: string;
  componentCount?: number;
  error?: string;
}

interface TestConnectionData {
  serverUrl: string;
  apiKey: string;
}

console.log("Figma to React Bridge Plugin loaded");

// Plugin state
let isUIOpen: boolean = false;
let websocketConnection: WebSocket | null = null;

// Helper function to convert font weight strings to numbers
function convertFontWeightToNumber(
  fontWeightStyle?: string
): number | undefined {
  if (!fontWeightStyle) return undefined;

  const weightMap: { [key: string]: number } = {
    Thin: 100,
    "Extra Light": 200,
    Light: 300,
    Regular: 400,
    Medium: 500,
    "Semi Bold": 600,
    Bold: 700,
    "Extra Bold": 800,
    Black: 900,
  };

  // Try direct lookup first
  if (weightMap[fontWeightStyle]) {
    return weightMap[fontWeightStyle];
  }

  // Try case-insensitive lookup
  const lowerStyle = fontWeightStyle.toLowerCase();
  for (const [key, value] of Object.entries(weightMap)) {
    if (key.toLowerCase() === lowerStyle) {
      return value;
    }
  }

  // If it's already a number, parse it
  const numericWeight = parseInt(fontWeightStyle, 10);
  if (!isNaN(numericWeight) && numericWeight >= 100 && numericWeight <= 900) {
    return numericWeight;
  }

  // Default to regular weight
  return 400;
}

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
async function handleUIMessage(msg: UIMessage) {
  const { type, data } = msg;

  console.log("Received UI message:", type, data);

  switch (type) {
    case "get-selection":
      handleGetSelection();
      break;

    case "send-to-bridge":
      await handleSendToBridge(data as { sessionId?: string });
      break;

    case "save-config":
      await handleSaveConfig(data as BridgeConfig);
      break;

    case "test-connection":
      await handleTestConnection(data as TestConnectionData);
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
function getSelectionData(): SelectionData {
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
      fileKey: figma.fileKey || "unknown-file-key",
      fileName: figma.root.name || "Untitled",
      currentPage: {
        id: figma.currentPage.id,
        name: figma.currentPage.name,
      },
      user:
        figma.currentUser && figma.currentUser.id
          ? {
              id: figma.currentUser.id,
              name: figma.currentUser.name,
            }
          : null,
      viewport: figma.viewport,
      version: "1.0.0", // figma.version is not available in plugin API
      selectedAt: new Date().toISOString(),
    },
  };
}

function handleGetSelection() {
  const selectionData = getSelectionData();
  sendToUI("selection-data", selectionData);
}

// Extract comprehensive node data
function extractNodeData(node: SceneNode): ComponentData {
  const baseData: ComponentData = {
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
    baseData.fills = (node.fills as Paint[]).map((fill) =>
      extractFillData(fill)
    );
  }

  // Extract strokes
  if ("strokes" in node && Array.isArray(node.strokes)) {
    baseData.strokes = (node.strokes as Paint[]).map((stroke) =>
      extractPaintData(stroke)
    );
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      baseData.strokeWeight = node.strokeWeight;
    }
  }

  // Extract corner radius
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    baseData.cornerRadius = node.cornerRadius;
  }

  if (
    "rectangleCornerRadii" in node &&
    Array.isArray(node.rectangleCornerRadii)
  ) {
    baseData.rectangleCornerRadii = node.rectangleCornerRadii;
  }

  // Extract effects
  if ("effects" in node) {
    baseData.effects = node.effects.map((effect) => extractEffectData(effect));
  }

  // Extract text-specific data
  if (node.type === "TEXT") {
    const textNode = node as TextNode;
    baseData.characters = textNode.characters;
    baseData.fontSize = textNode.fontSize;
    baseData.fontName = textNode.fontName;
    baseData.textAlignHorizontal = textNode.textAlignHorizontal;
    baseData.textAlignVertical = textNode.textAlignVertical;
    baseData.letterSpacing = textNode.letterSpacing;
    baseData.lineHeight = textNode.lineHeight;

    // Get text style
    try {
      baseData.style = {
        fontFamily:
          typeof textNode.fontName === "object"
            ? textNode.fontName.family
            : undefined,
        fontSize:
          typeof textNode.fontSize === "number" ? textNode.fontSize : undefined,
        fontWeight:
          typeof textNode.fontName === "object"
            ? convertFontWeightToNumber(textNode.fontName.style)
            : undefined,
        lineHeightPx:
          typeof textNode.lineHeight === "object" &&
          "value" in textNode.lineHeight
            ? (textNode.lineHeight as { value: number }).value
            : undefined,
        letterSpacing:
          typeof textNode.letterSpacing === "object" &&
          "value" in textNode.letterSpacing
            ? (textNode.letterSpacing as { value: number }).value
            : undefined,
        textAlignHorizontal: textNode.textAlignHorizontal,
        textAlignVertical: textNode.textAlignVertical,
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
    if ("primaryAxisSizingMode" in node) {
      baseData.primaryAxisSizingMode = node.primaryAxisSizingMode;
    }
    if ("counterAxisSizingMode" in node) {
      baseData.counterAxisSizingMode = node.counterAxisSizingMode;
    }
    if ("primaryAxisAlignItems" in node) {
      baseData.primaryAxisAlignItems = node.primaryAxisAlignItems;
    }
    if ("counterAxisAlignItems" in node) {
      baseData.counterAxisAlignItems = node.counterAxisAlignItems;
    }
    if ("paddingLeft" in node) {
      baseData.paddingLeft = node.paddingLeft;
    }
    if ("paddingRight" in node) {
      baseData.paddingRight = node.paddingRight;
    }
    if ("paddingTop" in node) {
      baseData.paddingTop = node.paddingTop;
    }
    if ("paddingBottom" in node) {
      baseData.paddingBottom = node.paddingBottom;
    }
    if ("itemSpacing" in node) {
      baseData.itemSpacing = node.itemSpacing;
    }
  }

  return baseData;
}

// Extract fill/paint data
function extractFillData(fill: Paint): FillData {
  const fillData: FillData = {
    type: fill.type,
    visible: fill.visible,
    opacity: fill.opacity,
    blendMode: fill.blendMode,
  };

  if (fill.type === "SOLID") {
    const solidFill = fill as SolidPaint;
    fillData.color = {
      r: solidFill.color.r,
      g: solidFill.color.g,
      b: solidFill.color.b,
      a: solidFill.opacity || 1,
    };
  } else if (
    fill.type === "GRADIENT_LINEAR" ||
    fill.type === "GRADIENT_RADIAL" ||
    fill.type === "GRADIENT_ANGULAR" ||
    fill.type === "GRADIENT_DIAMOND"
  ) {
    const gradientFill = fill as GradientPaint;
    fillData.gradientStops = gradientFill.gradientStops.map((stop) => ({
      position: stop.position,
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a || 1,
      },
    }));

    if (gradientFill.gradientTransform) {
      fillData.gradientTransform = gradientFill.gradientTransform;
    }
  } else if (fill.type === "IMAGE") {
    const imageFill = fill as ImagePaint;
    fillData.imageHash = imageFill.imageHash || undefined;
    fillData.scaleMode = imageFill.scaleMode;
    fillData.imageTransform = imageFill.imageTransform;
  }

  return fillData;
}

function extractPaintData(paint: Paint): PaintData {
  return extractFillData(paint); // Same structure for now
}

// Extract effect data
function extractEffectData(effect: Effect): EffectData {
  const effectData: EffectData = {
    type: effect.type,
    visible: effect.visible,
  };

  // Handle shadow effects
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    const shadowEffect = effect as DropShadowEffect | InnerShadowEffect;
    effectData.radius = shadowEffect.radius;
    effectData.spread = shadowEffect.spread;
    effectData.offset = {
      x: shadowEffect.offset.x,
      y: shadowEffect.offset.y,
    };
    effectData.color = {
      r: shadowEffect.color.r,
      g: shadowEffect.color.g,
      b: shadowEffect.color.b,
      a: shadowEffect.color.a || 1,
    };
    effectData.blendMode = shadowEffect.blendMode;
  }
  // Handle blur effects
  else if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
    const blurEffect = effect as BlurEffect;
    effectData.radius = blurEffect.radius;
  }

  return effectData;
}

// Bridge communication
async function handleSendToBridge(data: { sessionId?: string }) {
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
    const payload: BridgePayload = {
      components: selectionData.components,
      metadata: selectionData.metadata,
      sessionId: data.sessionId || generateSessionId(),
      timestamp: new Date().toISOString(),
      pluginVersion: "1.0.0",
    };

    // Debug logging
    console.log("Payload metadata:", JSON.stringify(payload.metadata, null, 2));

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
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to send to bridge server";
    const errorString =
      error instanceof Error ? error.toString() : String(error);
    sendToUI("bridge-error", {
      message: errorMessage,
      error: errorString,
    });
  }
}

async function sendToBridgeServer(
  config: BridgeConfig,
  payload: BridgePayload
): Promise<BridgeResponse> {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Network error: ${errorMessage}`);
  }
}

// Configuration handlers
async function handleSaveConfig(configData: BridgeConfig) {
  try {
    const success = await saveConfiguration(configData);
    if (success) {
      sendToUI("config-saved", { message: "Configuration saved successfully" });
    } else {
      sendToUI("config-error", { message: "Failed to save configuration" });
    }
  } catch (error) {
    console.error("Error saving config:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    sendToUI("config-error", { message: errorMessage });
  }
}

async function handleTestConnection(configData: TestConnectionData) {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString =
      error instanceof Error ? error.toString() : String(error);
    sendToUI("connection-test-result", {
      success: false,
      message: `Connection failed: ${errorMessage}`,
      error: errorString,
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

    const payload: BridgePayload = {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.notify(`❌ Failed to send: ${errorMessage}`, {
      error: true,
      timeout: 5000,
    });
  }
}

// Initialize the plugin
initialize().catch((error) => {
  console.error("Plugin initialization failed:", error);
});
