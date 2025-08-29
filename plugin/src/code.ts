// Figma Plugin Main Code
// This code runs in the main thread and has access to the Figma API

// Import modules
import { loadConfiguration } from "./config";
import { openUI, isUICurrentlyOpen, sendToUI } from "./uiManager";
import {
  handleUIMessage,
  handleSelectionChange,
  handleQuickSendToBridge,
} from "./messageHandlers";

console.log("Figma to React Bridge Plugin loaded");

// Plugin state
let websocketConnection: WebSocket | null = null;

// Initialize plugin
async function initialize(): Promise<void> {
  // Load saved configuration
  const config = await loadConfiguration();

  // Set up message handlers
  figma.ui.onmessage = handleUIMessage;

  console.log("Plugin initialized with config:", config);
}

// Selection change listener
figma.on("selectionchange", () => {
  if (isUICurrentlyOpen()) {
    handleSelectionChange();
  }
});

// Menu command handlers
figma.on("run", async ({ command, parameters }) => {
  console.log("Plugin command:", command, parameters);

  switch (command) {
    case "send-to-bridge":
      // Quick send without opening UI
      try {
        await handleQuickSendToBridge();
      } catch (error) {
        // If configuration is required, open UI
        if (error instanceof Error && error.message === "OPEN_UI_REQUIRED") {
          await openUI();
        }
      }
      break;

    case "open-panel":
    default:
      await openUI();
      break;
  }
});

// Initialize the plugin
initialize().catch((error) => {
  console.error("Plugin initialization failed:", error);
});
