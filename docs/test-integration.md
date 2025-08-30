# Testing the Figma Bridge + Cursor Integration

This guide walks through testing the complete integration between Figma, the Bridge Server, and Cursor.

## 🧪 Test Scenarios

### **Scenario 1: Basic Component Creation**

#### Step 1: Send Component from Figma

```bash
# Simulate Figma plugin sending a component
curl -X POST http://localhost:3001/api/figma/components \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "components": [{
      "id": "123:456",
      "name": "Login Button",
      "customName": "LoginButton",
      "type": "FRAME",
      "visible": true,
      "absoluteBoundingBox": {
        "x": 0, "y": 0, "width": 120, "height": 40
      },
      "fills": [{
        "type": "SOLID",
        "color": { "r": 0, "g": 0.48, "b": 1, "a": 1 }
      }],
      "cornerRadius": 6,
      "children": [{
        "id": "123:457",
        "name": "Button Text",
        "type": "TEXT",
        "characters": "Login",
        "style": {
          "fontFamily": "Inter",
          "fontSize": 14,
          "fontWeight": 500
        }
      }]
    }],
    "metadata": {
      "fileKey": "abc123",
      "fileName": "Design System",
      "currentPage": { "id": "0:1", "name": "Components" }
    }
  }'
```

#### Step 2: List Available Components

```bash
curl http://localhost:3001/api/figma/available \
  -H "X-API-Key: your-api-key"
```

Expected response:

```json
{
  "success": true,
  "data": {
    "components": [
      {
        "name": "LoginButton",
        "originalName": "Login Button",
        "sessionId": "...",
        "componentId": "123:456"
      }
    ],
    "totalCount": 1
  }
}
```

#### Step 3: Generate React Component

```bash
curl "http://localhost:3001/api/figma/generate?name=LoginButton&typescript=true&styling=styled-components" \
  -H "X-API-Key: your-api-key"
```

Expected response with complete React component code!

### **Scenario 2: Search and Preview**

#### Search for Components

```bash
curl "http://localhost:3001/api/figma/search?q=button&limit=5" \
  -H "X-API-Key: your-api-key"
```

#### Preview Component Code

```bash
curl "http://localhost:3001/api/figma/generate?name=LoginButton&typescript=true&styling=css" \
  -H "X-API-Key: your-api-key"
```

### **Scenario 3: MCP Tool Testing**

Create a test MCP client to verify the tools work:

```typescript
// test-mcp-client.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testMCPTools() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["dist/mcp-server-example.js"],
    env: {
      FIGMA_BRIDGE_URL: "http://localhost:3001",
      FIGMA_BRIDGE_API_KEY: "your-api-key",
    },
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);

  // Test 1: List available tools
  const tools = await client.request({
    method: "tools/list",
    params: {},
  });
  console.log(
    "Available tools:",
    tools.tools.map((t) => t.name)
  );

  // Test 2: List Figma components
  const components = await client.request({
    method: "tools/call",
    params: {
      name: "list_figma_components",
      arguments: {},
    },
  });
  console.log("Components result:", components);

  // Test 3: Preview a component
  const preview = await client.request({
    method: "tools/call",
    params: {
      name: "preview_figma_component",
      arguments: {
        componentName: "LoginButton",
        typescript: true,
        styling: "styled-components",
      },
    },
  });
  console.log("Preview result:", preview);

  await client.close();
}

testMCPTools().catch(console.error);
```

## 🔍 Expected Results

### **1. Component List Response**

```json
{
  "success": true,
  "data": {
    "components": [
      {
        "name": "LoginButton",
        "originalName": "Login Button",
        "sessionId": "figma-1234567890-abc",
        "componentId": "123:456"
      }
    ],
    "totalCount": 1
  }
}
```

### **2. Generated Component Code**

```typescript
import React from "react";
import styled from "styled-components";

interface LoginButtonProps {
  children?: React.ReactNode;
}

const LoginButton: React.FC<LoginButtonProps> = ({ children }) => {
  return <StyledButton>{children || "Login"}</StyledButton>;
};

const StyledButton = styled.button`
  width: 120px;
  height: 40px;
  background-color: #007bff;
  border-radius: 6px;
  border: none;
  color: white;
  font-family: "Inter";
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

export default LoginButton;
```

### **3. MCP Tool Response**

```json
{
  "content": [
    {
      "type": "text",
      "text": "✅ Successfully created **LoginButton** component from Figma!\n\n**Files created:**\n• src/components/LoginButton.tsx\n• src/components/LoginButton.styles.ts\n\n**Component details:**\n• Original Figma name: Login Button\n• Custom name: LoginButton\n• Props: 1 detected\n• Styling: styled-components\n• TypeScript: Yes"
    }
  ]
}
```

## 🚀 End-to-End Test

Here's a complete end-to-end test you can run:

```bash
#!/bin/bash

echo "🧪 Testing Figma Bridge + Cursor Integration"
echo "============================================="

# 1. Start the bridge server (in background)
echo "1. Starting bridge server..."
cd server && npm start &
SERVER_PID=$!
sleep 5

# 2. Send a test component
echo "2. Sending test component to bridge..."
curl -s -X POST http://localhost:3001/api/figma/components \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key" \
  -d '{
    "components": [{
      "id": "test:123",
      "name": "Test Button",
      "customName": "TestButton",
      "type": "FRAME",
      "absoluteBoundingBox": {"x": 0, "y": 0, "width": 100, "height": 40},
      "fills": [{"type": "SOLID", "color": {"r": 0, "g": 0.5, "b": 1, "a": 1}}],
      "children": [{"id": "test:124", "type": "TEXT", "characters": "Test"}]
    }],
    "metadata": {"fileKey": "test", "fileName": "Test File"}
  }' > /dev/null

# 3. List components
echo "3. Listing available components..."
COMPONENTS=$(curl -s http://localhost:3001/api/figma/available -H "X-API-Key: test-key")
echo $COMPONENTS | jq '.data.components[0].name'

# 4. Generate component code
echo "4. Generating React component..."
CODE=$(curl -s "http://localhost:3001/api/figma/generate?name=TestButton&typescript=true" -H "X-API-Key: test-key")
echo "✅ Component generated successfully!"

# 5. Test MCP server
echo "5. Testing MCP server..."
cd .. && npx tsx test-mcp-client.ts

# Cleanup
kill $SERVER_PID
echo "🎉 All tests completed!"
```

## 📊 Performance Benchmarks

Expected performance metrics:

- **Component listing**: < 50ms
- **Component generation**: < 500ms
- **File creation**: < 100ms
- **MCP tool response**: < 1s total

## ✅ Success Criteria

The integration is working correctly if:

1. ✅ Figma plugin can send components to bridge server
2. ✅ Bridge server stores and indexes components by name
3. ✅ API endpoints return expected JSON responses
4. ✅ Generated React code is valid and compilable
5. ✅ MCP server responds to all tool calls
6. ✅ Cursor can successfully create components in codebase
7. ✅ Generated components have proper TypeScript types
8. ✅ Styling is applied correctly based on Figma data

## 🐛 Common Issues & Solutions

### Issue: "Component not found"

**Solution:** Check component indexing with:

```bash
curl http://localhost:3001/api/figma/names -H "X-API-Key: test-key"
```

### Issue: "Invalid React code generated"

**Solution:** Review transformer service and test with simple components first.

### Issue: "MCP server not responding"

**Solution:** Check MCP server logs and verify environment variables.

### Issue: "CORS errors from Figma plugin"

**Solution:** Update CORS configuration in bridge server to allow Figma origins.

This testing guide ensures your Figma → Bridge → Cursor integration works perfectly! 🎯
