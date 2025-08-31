#!/usr/bin/env node

/**
 * Test script to verify MCP server functionality
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MCP_SERVER_PATH = path.join(__dirname, "dist", "mcp-server-example.js");

console.log("🧪 Testing Figma Bridge MCP Server...\n");

// Test 1: Check if server starts
console.log("1. Testing server startup...");
const server = spawn("node", [MCP_SERVER_PATH], {
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    FIGMA_BRIDGE_URL: "http://localhost:3001",
    FIGMA_BRIDGE_API_KEY: "test-key",
  },
});

let serverOutput = "";
let serverError = "";

server.stdout.on("data", (data) => {
  serverOutput += data.toString();
});

server.stderr.on("data", (data) => {
  serverError += data.toString();
});

server.on("close", (code) => {
  console.log(`   Server exit code: ${code}`);
  if (serverOutput.includes("Figma Bridge MCP server running")) {
    console.log("   ✅ Server started successfully");
  } else {
    console.log("   ❌ Server failed to start properly");
    console.log("   Output:", serverOutput);
    console.log("   Error:", serverError);
  }
});

// Give server time to start
setTimeout(() => {
  server.kill();
  console.log("\n2. Testing tool definitions...");

  // Check if tools are properly defined in the source
  const sourceCode = fs.readFileSync(MCP_SERVER_PATH, "utf8");

  const expectedTools = [
    "list_figma_components",
    "create_figma_component",
    "preview_figma_component",
    "search_figma_components",
    "extract_design_tokens",
    "create_component_library",
  ];

  let toolsFound = 0;
  expectedTools.forEach((tool) => {
    if (sourceCode.includes(tool)) {
      toolsFound++;
      console.log(`   ✅ ${tool} tool found`);
    } else {
      console.log(`   ❌ ${tool} tool missing`);
    }
  });

  console.log(`\n   Total tools found: ${toolsFound}/${expectedTools.length}`);

  if (toolsFound === expectedTools.length) {
    console.log("\n🎉 All tools are properly defined!");
    console.log("\n📋 Next steps:");
    console.log("   1. Configure the MCP server in Cursor settings");
    console.log("   2. Set FIGMA_BRIDGE_URL and FIGMA_BRIDGE_API_KEY");
    console.log("   3. Restart Cursor");
    console.log("   4. Check MCP & Integrations section");
  } else {
    console.log("\n⚠️  Some tools are missing. Check the source code.");
  }

  console.log(
    "\n📖 See CURSOR_INTEGRATION.md for detailed setup instructions."
  );
}, 2000);
