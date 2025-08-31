# Examples and Usage Guide

This document provides practical examples of using the Figma to React Bridge.

## Basic Usage Flow

### 1. Start the Bridge Server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your configuration
npm start
```

### 2. Configure the Figma Plugin

1. Open Figma
2. Import the plugin from `plugin/manifest.json`
3. Open the plugin and go to the Config tab
4. Set:
   - Server URL: `http://localhost:3001`
   - API Key: (your configured API key)

### 3. Send Components

1. Select components in Figma
2. Open the plugin
3. Click "Send to Bridge"
4. Note the session ID returned

## API Examples

### Example: Send Components from Plugin

The plugin sends data like this:

```json
{
  "components": [
    {
      "id": "123:456",
      "name": "Button",
      "type": "FRAME",
      "visible": true,
      "absoluteBoundingBox": {
        "x": 0,
        "y": 0,
        "width": 120,
        "height": 40
      },
      "fills": [
        {
          "type": "SOLID",
          "color": {
            "r": 0,
            "g": 0.48,
            "b": 1,
            "a": 1
          }
        }
      ],
      "cornerRadius": 6,
      "children": [
        {
          "id": "123:457",
          "name": "Button Text",
          "type": "TEXT",
          "characters": "Click me",
          "style": {
            "fontFamily": "Inter",
            "fontSize": 14,
            "fontWeight": 500
          }
        }
      ]
    }
  ],
  "metadata": {
    "fileKey": "abc123def456",
    "fileName": "Design System",
    "currentPage": {
      "id": "0:1",
      "name": "Components"
    }
  },
  "sessionId": "figma-1703123456789-abc123def"
}
```

### Example: Transform to React

Request:

```http
POST /api/figma/transform
X-API-Key: your-api-key
Content-Type: application/json

{
  "components": [/* component data */],
  "options": {
    "framework": "react",
    "typescript": true,
    "styling": "css",
    "componentNaming": "pascal",
    "includeProps": true,
    "includeTypes": true
  }
}
```

Response:

```json
{
  "success": true,
  "sessionId": "transform-1703123456789-xyz",
  "transformedComponents": [
    {
      "id": "123:456",
      "name": "Button",
      "type": "react-component",
      "props": [
        {
          "name": "text",
          "type": "string",
          "defaultValue": "Click me"
        }
      ],
      "code": {
        "component": "import React from 'react';\n\nconst Button: FC<ButtonProps> = (props) => {\n  return (\n    <div style={{width: 120, height: 40, backgroundColor: '#007bff', borderRadius: 6}}>\n      <span>{props.text || 'Click me'}</span>\n    </div>\n  );\n};\n\nexport default Button;",
        "types": "interface ButtonProps {\n  text?: string;\n}",
        "styles": ".button {\n  width: 120px;\n  height: 40px;\n  background-color: #007bff;\n  border-radius: 6px;\n}"
      }
    }
  ]
}
```

### Example: Extract Design Tokens

Request:

```http
POST /api/figma/extract/tokens
X-API-Key: your-api-key
Content-Type: application/json

{
  "components": [/* component data */]
}
```

Response:

```json
{
  "success": true,
  "designTokens": {
    "colors": {
      "color-primary": {
        "value": "rgb(0, 123, 255)",
        "hex": "#007bff",
        "usage": [
          {
            "component": "Button",
            "property": "fill"
          }
        ]
      }
    },
    "typography": {
      "typography-inter-14": {
        "fontFamily": "Inter",
        "fontSize": 14,
        "fontWeight": 500,
        "css": "font-family: 'Inter'; font-size: 14px; font-weight: 500"
      }
    },
    "spacing": {
      "spacing-120": {
        "value": 120,
        "px": "120px",
        "rem": "7.500rem"
      }
    }
  }
}
```

## Integration Examples

### Example: MCP Server Integration

Your MCP server can poll for new sessions and fetch data:

```javascript
// Poll for new sessions
async function checkForNewSessions() {
  const response = await fetch("http://localhost:3001/api/figma/sessions", {
    headers: {
      "X-API-Key": process.env.FIGMA_BRIDGE_API_KEY,
    },
  });

  const { sessions } = await response.json();

  for (const session of sessions) {
    if (session.hasComponentData && !processedSessions.has(session.id)) {
      await processSession(session.id);
      processedSessions.add(session.id);
    }
  }
}

async function processSession(sessionId) {
  // Get component data
  const response = await fetch(
    `http://localhost:3001/api/figma/components/${sessionId}`,
    {
      headers: {
        "X-API-Key": process.env.FIGMA_BRIDGE_API_KEY,
      },
    }
  );

  const { data } = await response.json();

  // Transform to React
  const transformResponse = await fetch(
    "http://localhost:3001/api/figma/transform",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.FIGMA_BRIDGE_API_KEY,
      },
      body: JSON.stringify({
        components: data.components,
        options: {
          framework: "react",
          typescript: true,
          styling: "styled-components",
        },
      }),
    }
  );

  const { transformedComponents } = await transformResponse.json();

  // Generate files
  for (const component of transformedComponents) {
    await generateComponentFiles(component);
  }
}
```

### Example: WebSocket Integration

```javascript
const WebSocket = require("ws");

class FigmaBridgeClient {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:3002?sessionId=${this.sessionId}`);

    this.ws.on("open", () => {
      console.log("Connected to Figma Bridge");

      // Subscribe to session updates
      this.ws.send(
        JSON.stringify({
          type: "subscribe-to-session",
        })
      );
    });

    this.ws.on("message", (data) => {
      const message = JSON.parse(data);
      this.handleMessage(message);
    });
  }

  handleMessage(message) {
    switch (message.type) {
      case "components-received":
        console.log("New components received:", message.data);
        this.processNewComponents(message.data);
        break;

      case "transformation-complete":
        console.log("Transformation complete:", message.data);
        this.handleTransformationComplete(message.data);
        break;

      default:
        console.log("Received message:", message);
    }
  }

  async processNewComponents(data) {
    // Automatically request transformation
    const response = await fetch("http://localhost:3001/api/figma/transform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.FIGMA_BRIDGE_API_KEY,
      },
      body: JSON.stringify({
        sessionId: data.sessionId,
        components: [], // Will use stored components
        options: {
          framework: "react",
          typescript: true,
        },
      }),
    });
  }
}
```

## Component Transformation Examples

### Simple Button Component

**Figma Input:**

- Frame named "Button"
- Blue background (#007bff)
- Text child "Click me"
- Corner radius: 6px

**Generated React:**

```typescript
import React from "react";
import { FC } from "react";

interface ButtonProps {
  text?: string;
}

const Button: FC<ButtonProps> = (props) => {
  return (
    <div
      style={{
        width: 120,
        height: 40,
        backgroundColor: "#007bff",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          fontFamily: "Inter",
          fontSize: 14,
          fontWeight: 500,
          color: "#ffffff",
        }}
      >
        {props.text || "Click me"}
      </span>
    </div>
  );
};

export default Button;
```

### Card Component with Multiple Children

**Figma Input:**

- Frame named "ProductCard"
- Image, title, description, price
- Drop shadow effect

**Generated React:**

```typescript
import React from "react";
import { FC } from "react";

interface ProductCardProps {
  title?: string;
  description?: string;
  price?: string;
  imageUrl?: string;
}

const ProductCard: FC<ProductCardProps> = (props) => {
  return (
    <div
      style={{
        width: 280,
        height: 360,
        backgroundColor: "#ffffff",
        borderRadius: 12,
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        padding: 16,
      }}
    >
      <div
        style={{
          width: 248,
          height: 160,
          backgroundColor: "#f8f9fa",
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        {/* Image placeholder */}
      </div>
      <h3
        style={{
          fontFamily: "Inter",
          fontSize: 18,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        {props.title || "Product Title"}
      </h3>
      <p
        style={{
          fontFamily: "Inter",
          fontSize: 14,
          color: "#666666",
          marginBottom: 12,
        }}
      >
        {props.description || "Product description goes here"}
      </p>
      <div
        style={{
          fontFamily: "Inter",
          fontSize: 20,
          fontWeight: 700,
          color: "#007bff",
        }}
      >
        {props.price || "$29.99"}
      </div>
    </div>
  );
};

export default ProductCard;
```

## Design Token Examples

### Extracted Color Tokens

```json
{
  "colors": {
    "color-primary": {
      "value": "rgb(0, 123, 255)",
      "hex": "#007bff",
      "rgb": { "r": 0, "g": 123, "b": 255, "a": 1 },
      "usage": [
        { "component": "Button", "property": "fill" },
        { "component": "Link", "property": "fill" }
      ]
    },
    "color-success": {
      "value": "rgb(40, 167, 69)",
      "hex": "#28a745",
      "usage": [{ "component": "SuccessButton", "property": "fill" }]
    }
  }
}
```

### CSS Variables Generation

```css
:root {
  /* Colors */
  --color-primary: #007bff;
  --color-success: #28a745;
  --color-danger: #dc3545;

  /* Typography */
  --font-family-primary: "Inter", sans-serif;
  --font-size-small: 12px;
  --font-size-medium: 14px;
  --font-size-large: 18px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;

  /* Border Radius */
  --radius-small: 4px;
  --radius-medium: 8px;
  --radius-large: 12px;
}
```

## Component Analysis Examples

### Analysis Output

```json
{
  "overview": {
    "totalComponents": 5,
    "totalNodes": 23,
    "averageDepth": 2.4,
    "maxDepth": 4,
    "estimatedComplexity": 85
  },
  "designPatterns": {
    "detected": [
      [
        "buttonPattern",
        [
          { "id": "123:456", "name": "Primary Button", "confidence": 0.9 },
          { "id": "123:789", "name": "Secondary Button", "confidence": 0.85 }
        ]
      ],
      [
        "cardPattern",
        [{ "id": "124:001", "name": "Product Card", "confidence": 0.8 }]
      ]
    ]
  },
  "complexity": {
    "components": [
      {
        "id": "123:456",
        "name": "Primary Button",
        "nodeCount": 2,
        "depth": 1,
        "stylingComplexity": 8,
        "overallComplexity": 15
      }
    ]
  },
  "recommendations": [
    {
      "type": "reusability",
      "priority": "medium",
      "title": "Improve Component Reusability",
      "description": "2 components have low reusability scores. Consider adding variants.",
      "action": "enhance"
    }
  ]
}
```

## Error Handling Examples

### Plugin Error Handling

```javascript
// In the Figma plugin
async function handleSendToBridge(data) {
  try {
    const response = await sendToBridgeServer(config, payload);

    if (response.success) {
      figma.notify("✅ Components sent successfully!");
    } else {
      throw new Error(response.error || "Unknown error");
    }
  } catch (error) {
    if (error.message.includes("Network")) {
      figma.notify(
        "❌ Cannot connect to bridge server. Check your configuration.",
        { error: true }
      );
    } else if (error.message.includes("401")) {
      figma.notify("❌ Invalid API key. Please check your configuration.", {
        error: true,
      });
    } else {
      figma.notify(`❌ Error: ${error.message}`, { error: true });
    }
  }
}
```

### Server Error Response

```json
{
  "error": "Validation Error",
  "message": "Invalid request data",
  "details": [
    {
      "field": "components.0.name",
      "message": "\"name\" is required"
    },
    {
      "field": "metadata.fileKey",
      "message": "\"fileKey\" is required"
    }
  ]
}
```

## Testing Examples

### Component Transformation Test

```javascript
const figmaTransformer = require("../src/services/figmaTransformer");

describe("FigmaTransformer", () => {
  test("should transform simple button component", async () => {
    const mockComponent = {
      id: "123:456",
      name: "Button",
      type: "FRAME",
      absoluteBoundingBox: { width: 120, height: 40 },
      fills: [
        {
          type: "SOLID",
          color: { r: 0, g: 0.48, b: 1, a: 1 },
        },
      ],
      children: [
        {
          id: "123:457",
          name: "Button Text",
          type: "TEXT",
          characters: "Click me",
        },
      ],
    };

    const result = await figmaTransformer.transformComponents([mockComponent]);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Button");
    expect(result[0].code.component).toContain("const Button");
    expect(result[0].props).toContainEqual({
      name: "text",
      type: "string",
      defaultValue: "Click me",
    });
  });
});
```

This examples file provides comprehensive usage patterns and integration examples for the Figma to React Bridge tool.
