// UI management for Figma plugin interface

import { BridgeConfig, UIMessage } from "./types";
import { loadConfiguration } from "./config";
import { getSelectionData } from "./dataExtraction";
import { sanitizeData } from "./utils";

// Plugin state
let isUIOpen: boolean = false;

/**
 * Open the plugin UI
 */
export async function openUI(): Promise<void> {
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

/**
 * Close the plugin UI
 */
export function closeUI(): void {
  if (isUIOpen) {
    figma.closePlugin();
    isUIOpen = false;
  }
}

/**
 * Send message to UI
 */
export function sendToUI(type: string, data: any = {}): void {
  if (isUIOpen) {
    try {
      // Deep clone and sanitize data to ensure it's serializable
      const sanitizedData = sanitizeData(data);
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

/**
 * Check if UI is currently open
 */
export function isUICurrentlyOpen(): boolean {
  return isUIOpen;
}

/**
 * Set UI open state (for internal use)
 */
export function setUIOpenState(state: boolean): void {
  isUIOpen = state;
}
