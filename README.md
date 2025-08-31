# Figma to React Bridge

A comprehensive bridge tool that connects Figma designs to React component generation through a Node.js server and Figma plugin architecture.

## Overview

This tool consists of two main components:

1. **Node.js Bridge Server** - Handles communication between Figma plugin and your MCP server
2. **Figma Plugin** - Extracts component data from Figma and sends it to the bridge server

The bridge server provides RESTful APIs and WebSocket connections for real-time communication, component transformation, design token extraction, and component analysis.

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│             │    │                  │    │                 │
│ Figma Plugin│◄──►│ Bridge Server    │◄──►│ Your MCP Server │
│             │    │ (Node.js)        │    │                 │
└─────────────┘    └──────────────────┘    └─────────────────┘
      │                      │                       │
      │                      │                       │
   WebSocket              REST API              Component Data
 Communication          & WebSocket              & Transformations
```

## Features

### Bridge Server

- ✅ RESTful API endpoints for component operations
- ✅ WebSocket server for real-time communication
- ✅ Component transformation to React code
- ✅ Design token extraction
- ✅ Component analysis and pattern detection
- ✅ Comprehensive validation and error handling
- ✅ Configurable authentication and rate limiting
- ✅ Docker support for easy deployment

### Figma Plugin

- ✅ Extract comprehensive component data from Figma
- ✅ Real-time selection monitoring
- ✅ Configurable server connection
- ✅ Progress tracking and error handling
- ✅ Modern, intuitive UI

## Quick Start

### 1. Set up the Bridge Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit configuration
nano .env

# Start the server
npm start
```

### 2. Install the Figma Plugin

1. Open Figma
2. Go to Plugins → Development → Import plugin from manifest
3. Select the `plugin/manifest.json` file
4. Configure the plugin with your server URL and API key

### 3. Use the Bridge

1. Select components in Figma
2. Open the Bridge plugin
3. Configure server settings
4. Send components to bridge server
5. Your MCP server can now fetch the transformed data

## API Documentation

### REST Endpoints

#### Health Check

```http
GET /health
```

Returns server health status and uptime information.

#### Send Components

```http
POST /api/figma/components
Headers: X-API-Key: your-api-key
Content-Type: application/json

{
  "components": [...], // Figma component data
  "metadata": {...},   // File and session metadata
  "sessionId": "uuid"  // Optional session identifier
}
```

#### Get Components

```http
GET /api/figma/components/:sessionId
Headers: X-API-Key: your-api-key
```

#### Transform to React

```http
POST /api/figma/transform
Headers: X-API-Key: your-api-key
Content-Type: application/json

{
  "components": [...],
  "options": {
    "framework": "react",
    "typescript": true,
    "styling": "css"
  }
}
```

#### Extract Design Tokens

```http
POST /api/figma/extract/tokens
Headers: X-API-Key: your-api-key
Content-Type: application/json

{
  "components": [...]
}
```

#### Analyze Components

```http
POST /api/figma/analyze
Headers: X-API-Key: your-api-key
Content-Type: application/json

{
  "components": [...]
}
```

### WebSocket Connection

Connect to `ws://localhost:3002?sessionId=your-session-id`

#### Message Types

**Client to Server:**

- `ping` - Keep-alive ping
- `subscribe-to-session` - Subscribe to session updates
- `figma-plugin-data` - Forward data from plugin
- `request-status` - Request current status

**Server to Client:**

- `pong` - Ping response
- `connection-established` - Connection confirmation
- `components-received` - New components received
- `transformation-complete` - Transformation finished
- `session-deleted` - Session was deleted

## Configuration

### Server Environment Variables

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://www.figma.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket Configuration
WS_PORT=3002

# Security
API_KEY=your_secure_api_key_here

# Logging
LOG_LEVEL=info
```

### Plugin Configuration

Configure in the plugin UI:

- **Server URL**: Your bridge server URL (e.g., `http://localhost:3001`)
- **API Key**: Authentication key matching server configuration
- **Auto-connect**: Automatically connect on plugin startup

## Development

### Server Development

```bash
cd server

# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Plugin Development

1. Make changes to plugin files
2. Reload plugin in Figma (Plugins → Development → Reload)
3. Test with bridge server

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test src/controllers/figma.test.js
```

## Deployment

### Docker Deployment

```bash
# Build and start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f figma-bridge-server

# Stop services
docker-compose down
```

### Manual Deployment

```bash
# Production build
npm run build

# Start with PM2
pm2 start server.js --name figma-bridge

# Monitor
pm2 monit
```

## Component Transformation

The bridge server can transform Figma components into React code with various options:

### Transformation Options

- **Framework**: React, Vue, Angular
- **TypeScript**: Enable/disable TypeScript generation
- **Styling**: CSS, SCSS, Styled Components, Tailwind
- **Component Naming**: PascalCase, camelCase, kebab-case
- **Props**: Extract component properties
- **Types**: Generate TypeScript type definitions

### Example Output

Input Figma component transforms to:

```typescript
import React from "react";
import { FC } from "react";

interface ButtonProps {
  text?: string;
  visible?: boolean;
}

const Button: FC<ButtonProps> = (props) => {
  return (
    <div
      style={{
        width: 120,
        height: 40,
        backgroundColor: "#007bff",
        borderRadius: 6,
      }}
    >
      <span>{props.text || "Button"}</span>
    </div>
  );
};

export default Button;
```

## Design Token Extraction

Automatically extracts design tokens from Figma components:

- **Colors**: Fill colors, stroke colors, gradients
- **Typography**: Font families, sizes, weights, line heights
- **Spacing**: Widths, heights, padding, margins
- **Shadows**: Drop shadows, inner shadows
- **Borders**: Border widths, styles
- **Border Radius**: Corner radius values

## Component Analysis

Provides insights for React component generation:

- **Component Types**: Containers, text elements, interactive components
- **Design Patterns**: Cards, lists, navigation, forms, grids
- **Complexity Analysis**: Node count, depth, styling complexity
- **Reusability Scoring**: Variant support, parametric design
- **Accessibility Checks**: Missing alt text, color contrast
- **Performance Metrics**: Estimated render cost, optimization opportunities

## Integration with MCP Server

Your MCP server can integrate with this bridge by:

1. **Polling for new sessions**:

   ```http
   GET /api/figma/sessions
   ```

2. **Fetching component data**:

   ```http
   GET /api/figma/components/:sessionId
   ```

3. **Requesting transformations**:

   ```http
   POST /api/figma/transform
   ```

4. **WebSocket integration** for real-time updates

## Security Considerations

- API key authentication for all endpoints
- CORS configuration for allowed origins
- Rate limiting to prevent abuse
- Input validation and sanitization
- Error handling without information leakage
- Non-root Docker container execution

## Troubleshooting

### Common Issues

1. **Plugin can't connect to server**

   - Check server is running on correct port
   - Verify API key configuration
   - Check CORS settings for Figma origins

2. **Components not transforming properly**

   - Verify component data structure
   - Check transformation options
   - Review server logs for errors

3. **WebSocket connection issues**
   - Ensure WebSocket port is accessible
   - Check firewall settings
   - Verify session ID format

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review server logs
3. Create an issue in the repository
4. Include relevant error messages and configuration
