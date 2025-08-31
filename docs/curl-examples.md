# Curl Commands for Figma to React Bridge Server

This document provides practical curl command examples for interacting with the Figma to React Bridge Server API.

## Environment Setup

First, set up some environment variables to make the commands easier to use:

```bash
# Server configuration
export BRIDGE_SERVER="http://localhost:3001"
export API_KEY="your_secure_api_key_here"
export SESSION_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"

# Or for a specific session ID
export SESSION_ID="your-session-id-here"
```

## Health Check

Check if the server is running and healthy:

```bash
curl -X GET "${BRIDGE_SERVER}/health" \
  -H "Content-Type: application/json" \
  | jq '.'
```

## Send Components to Server

Send Figma component data to the bridge server:

```bash
curl -X POST "${BRIDGE_SERVER}/api/figma/components" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "components": [
      {
        "id": "123:456",
        "name": "Button",
        "type": "COMPONENT",
        "width": 120,
        "height": 40,
        "fills": [
          {
            "type": "SOLID",
            "color": {"r": 0, "g": 0.48, "b": 1}
          }
        ],
        "children": [
          {
            "id": "123:457",
            "name": "Text",
            "type": "TEXT",
            "characters": "Click me"
          }
        ]
      }
    ],
    "metadata": {
      "fileKey": "abc123def456",
      "fileName": "Design System",
      "version": "1.0.0"
    },
    "sessionId": "'${SESSION_ID}'"
  }' \
  | jq '.'
```

## Get Components by Session ID

Retrieve components for a specific session:

```bash
curl -X GET "${BRIDGE_SERVER}/api/figma/components/${SESSION_ID}" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  | jq '.'
```

## Transform Components to React

Transform Figma components into React code:

```bash
curl -X POST "${BRIDGE_SERVER}/api/figma/transform" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "components": [
      {
        "id": "123:456",
        "name": "Button",
        "type": "COMPONENT",
        "width": 120,
        "height": 40,
        "fills": [
          {
            "type": "SOLID",
            "color": {"r": 0, "g": 0.48, "b": 1}
          }
        ]
      }
    ],
    "options": {
      "framework": "react",
      "typescript": true,
      "styling": "css"
    }
  }' \
  | jq '.'
```

## Transform with Different Options

### TypeScript + Styled Components

```bash
curl -X POST "${BRIDGE_SERVER}/api/figma/transform" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "components": [...],
    "options": {
      "framework": "react",
      "typescript": true,
      "styling": "styled-components"
    }
  }' \
  | jq '.'
```

### JavaScript + Tailwind CSS

```bash
curl -X POST "${BRIDGE_SERVER}/api/figma/transform" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "components": [...],
    "options": {
      "framework": "react",
      "typescript": false,
      "styling": "tailwind"
    }
  }' \
  | jq '.'
```

## Extract Design Tokens

Extract design tokens from components:

```bash
curl -X POST "${BRIDGE_SERVER}/api/figma/extract/tokens" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "components": [
      {
        "id": "123:456",
        "name": "Button",
        "type": "COMPONENT",
        "fills": [
          {
            "type": "SOLID",
            "color": {"r": 0, "g": 0.48, "b": 1}
          }
        ],
        "cornerRadius": 6,
        "effects": [
          {
            "type": "DROP_SHADOW",
            "color": {"r": 0, "g": 0, "b": 0, "a": 0.25},
            "offset": {"x": 0, "y": 2},
            "radius": 4
          }
        ]
      }
    ]
  }' \
  | jq '.'
```

## Analyze Components

Get component analysis and insights:

```bash
curl -X POST "${BRIDGE_SERVER}/api/figma/analyze" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "components": [
      {
        "id": "123:456",
        "name": "Card",
        "type": "COMPONENT",
        "width": 300,
        "height": 200,
        "children": [
          {
            "id": "123:457",
            "name": "Header",
            "type": "TEXT"
          },
          {
            "id": "123:458",
            "name": "Content",
            "type": "FRAME"
          }
        ]
      }
    ]
  }' \
  | jq '.'
```

## Error Handling Examples

### Test Invalid API Key

```bash
curl -X GET "${BRIDGE_SERVER}/api/figma/components/${SESSION_ID}" \
  -H "X-API-Key: invalid-key" \
  -H "Content-Type: application/json" \
  -v
```

### Test Rate Limiting

```bash
# Send multiple requests quickly to test rate limiting
for i in {1..10}; do
  curl -X GET "${BRIDGE_SERVER}/health" \
    -H "Content-Type: application/json" \
    -w "Request $i: %{http_code}\n" \
    -o /dev/null \
    -s
done
```

## Debugging and Verbose Output

### With verbose output

```bash
curl -X GET "${BRIDGE_SERVER}/health" \
  -H "Content-Type: application/json" \
  -v
```

### Save response to file

```bash
curl -X GET "${BRIDGE_SERVER}/api/figma/components/${SESSION_ID}" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -o components-response.json
```

### Show only HTTP status code

```bash
curl -X GET "${BRIDGE_SERVER}/health" \
  -H "Content-Type: application/json" \
  -w "%{http_code}\n" \
  -o /dev/null \
  -s
```

## Batch Operations

### Send multiple component batches

```bash
# Create a function for sending components
send_components() {
  local session_id=$1
  local component_name=$2

  curl -X POST "${BRIDGE_SERVER}/api/figma/components" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"components\": [{
        \"id\": \"$(date +%s)\",
        \"name\": \"${component_name}\",
        \"type\": \"COMPONENT\"
      }],
      \"sessionId\": \"${session_id}\"
    }" \
    | jq '.sessionId'
}

# Use the function
SESSION_1=$(send_components "session-1" "Button")
SESSION_2=$(send_components "session-2" "Card")
```

## WebSocket Testing

While curl doesn't directly support WebSocket, you can use `websocat` for testing:

```bash
# Install websocat if you haven't already
# brew install websocat  # macOS
# sudo apt install websocat  # Ubuntu

# Connect to WebSocket
echo '{"type": "subscribe-to-session", "sessionId": "'${SESSION_ID}'"}' | \
  websocat "ws://localhost:3002?sessionId=${SESSION_ID}"
```

## Common Response Formats

### Successful Health Check Response

```json
{
  "status": "healthy",
  "uptime": 12345,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Successful Component Send Response

```json
{
  "success": true,
  "sessionId": "abc-123-def-456",
  "componentsCount": 1,
  "message": "Components received and processed"
}
```

### Error Response

```json
{
  "error": "Invalid API key",
  "statusCode": 401,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Tips for Using These Commands

1. **Use jq for pretty-printing**: Install `jq` to format JSON responses nicely
2. **Set environment variables**: Use the variables at the top to avoid repetition
3. **Save common commands**: Create shell aliases or scripts for frequently used commands
4. **Test incrementally**: Start with the health check, then move to more complex operations
5. **Monitor server logs**: Check the server logs when testing to see what's happening server-side

## Troubleshooting

If commands fail, check:

1. **Server is running**: `curl http://localhost:3001/health`
2. **Correct API key**: Check your `.env` file in the server directory
3. **CORS settings**: Make sure your origin is allowed
4. **Rate limits**: You might be hitting rate limits if sending many requests
5. **JSON formatting**: Validate your JSON payload with `jq` before sending
