// Configuration management for Figma to React Bridge Plugin

import { BridgeConfig } from "./types";

// Default configuration
export const DEFAULT_CONFIG: BridgeConfig = {
  serverUrl: "http://localhost:3001",
  wsUrl: "ws://localhost:3002",
  apiKey: "",
  autoConnect: true,
};

/**
 * Load configuration from client storage
 */
export async function loadConfiguration(): Promise<BridgeConfig> {
  try {
    const savedConfig = await figma.clientStorage.getAsync("bridgeConfig");
    return Object.assign({}, DEFAULT_CONFIG, savedConfig);
  } catch (error) {
    console.error("Error loading configuration:", error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Save configuration to client storage
 */
export async function saveConfiguration(
  config: BridgeConfig
): Promise<boolean> {
  try {
    await figma.clientStorage.setAsync("bridgeConfig", config);
    console.log("Configuration saved");
    return true;
  } catch (error) {
    console.error("Error saving configuration:", error);
    return false;
  }
}
