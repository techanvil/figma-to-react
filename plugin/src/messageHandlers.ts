// Message and event handlers for Figma plugin

import {
  UIMessage,
  BridgeConfig,
  TestConnectionData,
  BridgePayload,
} from "./types";
import { loadConfiguration, saveConfiguration } from "./config";
import { getSelectionData } from "./dataExtraction";
import { sendToBridgeServer, testConnection } from "./bridgeCommunication";
import { sendToUI, closeUI } from "./uiManager";
import { generateSessionId } from "./utils";

/**
 * Handle messages from UI
 */
export async function handleUIMessage(msg: UIMessage): Promise<void> {
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

/**
 * Handle get selection request
 */
function handleGetSelection(): void {
  const selectionData = getSelectionData();
  sendToUI("selection-data", selectionData);
}

/**
 * Handle send to bridge request
 */
async function handleSendToBridge(data: { sessionId?: string }): Promise<void> {
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

/**
 * Handle save configuration request
 */
async function handleSaveConfig(configData: BridgeConfig): Promise<void> {
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

/**
 * Handle test connection request
 */
async function handleTestConnection(
  configData: TestConnectionData
): Promise<void> {
  try {
    sendToUI("testing-connection", { status: "testing" });

    const result = await testConnection(configData);
    sendToUI("connection-test-result", result);
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

/**
 * Handle selection change events
 */
export function handleSelectionChange(): void {
  sendToUI("selection-changed", getSelectionData());
}

/**
 * Handle quick send to bridge (without UI)
 */
export async function handleQuickSendToBridge(): Promise<void> {
  const selectionData = getSelectionData();

  if (!selectionData.hasSelection) {
    figma.notify("Please select components to send to bridge", { error: true });
    return;
  }

  try {
    const config = await loadConfiguration();

    if (!config.serverUrl || !config.apiKey) {
      figma.notify("Please configure server settings first", { error: true });
      // Return a special flag to indicate UI should be opened
      throw new Error("OPEN_UI_REQUIRED");
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
