// Bridge communication logic for server interactions

import {
  BridgeConfig,
  BridgePayload,
  BridgeResponse,
  TestConnectionData,
} from "./types";

/**
 * Send payload to bridge server
 */
export async function sendToBridgeServer(
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

/**
 * Test connection to bridge server
 */
export async function testConnection(configData: TestConnectionData): Promise<{
  success: boolean;
  message: string;
  serverInfo?: any;
  error?: string;
}> {
  try {
    const testUrl = `${configData.serverUrl}/health`;
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        "X-API-Key": configData.apiKey || "",
      },
    });

    if (response.ok) {
      const healthData = await response.json();
      return {
        success: true,
        message: "Connection successful!",
        serverInfo: healthData,
      };
    } else {
      throw new Error(`Server responded with status ${response.status}`);
    }
  } catch (error) {
    console.error("Connection test failed:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorString =
      error instanceof Error ? error.toString() : String(error);
    return {
      success: false,
      message: `Connection failed: ${errorMessage}`,
      error: errorString,
    };
  }
}
