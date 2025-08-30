# Cursor Integration Guide

This guide shows how to integrate the Figma to React Bridge with Cursor using MCP (Model Context Protocol).

## 🚀 Quick Setup

### 1. **Start the Figma Bridge Server**

```bash
cd server
npm install
npm run build
npm start
```

The server will run on `http://localhost:3001`

### 2. **Set Up MCP Server for Cursor**

```bash
# Install MCP server dependencies
npm install @modelcontextprotocol/sdk

# Build the MCP server
npx tsc mcp-server-example.ts --outDir dist --module esnext --target es2022

# Or use tsx for development
npx tsx mcp-server-example.ts
```

### 3. **Configure Cursor**

Add to your Cursor MCP configuration (usually in `~/.cursor/mcp_servers.json`):

```json
{
  "figma-bridge": {
    "command": "node",
    "args": ["/path/to/figma-to-react/dist/mcp-server-example.js"],
    "env": {
      "FIGMA_BRIDGE_URL": "http://localhost:3001",
      "FIGMA_BRIDGE_API_KEY": "your-api-key-here"
    }
  }
}
```

## 🎯 Usage Examples

### **Basic Component Creation**

**You ask Cursor:**

> "Create the LoginButton component from Figma in src/components/ with TypeScript and styled-components"

**Cursor calls the MCP tool:**

```json
{
  "tool": "create_figma_component",
  "arguments": {
    "componentName": "LoginButton",
    "outputPath": "src/components/",
    "typescript": true,
    "styling": "styled-components"
  }
}
```

**Result:** Complete React component created in your codebase!

### **Preview Before Creating**

**You ask:**

> "Show me what the ProductCard component from Figma would look like as React code"

**Cursor calls:**

```json
{
  "tool": "preview_figma_component",
  "arguments": {
    "componentName": "ProductCard",
    "typescript": true,
    "styling": "css"
  }
}
```

**Result:** Full preview of the generated code without creating files.

### **Create Component Library**

**You ask:**

> "Create a component library from these Figma components: Button, Card, Input, Modal"

**Cursor calls:**

```json
{
  "tool": "create_component_library",
  "arguments": {
    "componentNames": ["Button", "Card", "Input", "Modal"],
    "outputPath": "src/components/ui/",
    "typescript": true,
    "styling": "tailwind",
    "createIndex": true
  }
}
```

**Result:** Complete component library with index file!

### **Search Components**

**You ask:**

> "What button components are available from Figma?"

**Cursor calls:**

```json
{
  "tool": "search_figma_components",
  "arguments": {
    "query": "button",
    "limit": 10
  }
}
```

**Result:** List of all button-related components from Figma.

## 🛠 Available MCP Tools

### 1. `list_figma_components`

Lists all available Figma components that can be generated.

**Example usage:**

- "What components are available from Figma?"
- "Show me all the components from the design team"

### 2. `create_figma_component`

Generates a React component from Figma and saves it to your codebase.

**Parameters:**

- `componentName` (required): Name of the Figma component
- `outputPath`: Where to create the component (default: `src/components/`)
- `typescript`: Generate TypeScript code (default: `true`)
- `styling`: Styling approach (`css`, `scss`, `styled-components`, `tailwind`, `emotion`)
- `componentNaming`: Naming convention (`pascal`, `camel`, `kebab`)
- `createStorybook`: Generate Storybook story file
- `createTests`: Generate test file

**Example usage:**

- "Create the LoginButton component from Figma"
- "Generate the ProductCard component with styled-components in src/components/ui/"
- "Create the NavigationBar component with Storybook stories and tests"

### 3. `preview_figma_component`

Shows what the generated React code would look like without creating files.

**Example usage:**

- "Preview the Button component from Figma"
- "Show me what the Modal component would look like as React code"

### 4. `search_figma_components`

Searches for components by name or partial match.

**Example usage:**

- "Find all button components from Figma"
- "Search for navigation components"

### 5. `extract_design_tokens`

Extracts design tokens (colors, typography, spacing) from Figma components.

**Example usage:**

- "Extract design tokens from the Button component"
- "Generate CSS variables from all Figma components"

### 6. `create_component_library`

Generates multiple React components at once, creating a complete component library.

**Example usage:**

- "Create a component library from Button, Input, Card, and Modal components"
- "Generate all the form components from Figma with TypeScript and Tailwind"

## 🎨 Workflow Examples

### **Designer → Developer Handoff**

1. **Designer** (in Figma):

   - Selects "Login Button" component
   - Opens Figma plugin
   - Names it "LoginButton"
   - Sends to bridge server

2. **Developer** (in Cursor):
   - Asks: _"Create the LoginButton component from Figma in src/components/ with TypeScript and styled-components"_
   - Component is automatically generated with proper styling and types
   - Ready to use immediately!

### **Building a Design System**

**You ask Cursor:**

> "Create a complete design system from Figma with all the button, input, card, and navigation components using TypeScript and Tailwind CSS"

**Cursor automatically:**

1. Lists available components from Figma
2. Generates each component with consistent styling
3. Creates an index file for easy imports
4. Extracts design tokens as CSS variables
5. Sets up proper TypeScript types

**Result:** Complete, production-ready design system!

### **Rapid Prototyping**

**You ask:**

> "I need to quickly prototype a login form. Get the LoginButton, EmailInput, and PasswordInput components from Figma and create a LoginForm component that uses them"

**Cursor:**

1. Fetches the three components from Figma
2. Generates React components with proper types
3. Creates a new LoginForm component that combines them
4. Adds proper form handling and validation

## 🔧 Configuration Options

### Environment Variables

```bash
# Bridge server URL
FIGMA_BRIDGE_URL=http://localhost:3001

# API key for authentication
FIGMA_BRIDGE_API_KEY=your-api-key

# Optional: Default styling preference
DEFAULT_STYLING=styled-components

# Optional: Default TypeScript preference
DEFAULT_TYPESCRIPT=true
```

### MCP Server Configuration

The MCP server can be configured with various options:

```json
{
  "figma-bridge": {
    "command": "node",
    "args": ["/path/to/dist/mcp-server-example.js"],
    "env": {
      "FIGMA_BRIDGE_URL": "http://localhost:3001",
      "FIGMA_BRIDGE_API_KEY": "your-api-key",
      "DEFAULT_OUTPUT_PATH": "src/components/",
      "DEFAULT_STYLING": "styled-components",
      "DEFAULT_TYPESCRIPT": "true"
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"Component not found"**

   - Check if the component was sent from Figma plugin
   - Verify the component name matches exactly
   - Use `search_figma_components` to find available components

2. **"Bridge server connection failed"**

   - Ensure the bridge server is running on port 3001
   - Check the `FIGMA_BRIDGE_URL` environment variable
   - Verify API key is correct

3. **"Generated code has errors"**
   - Check if all required dependencies are installed
   - Verify TypeScript configuration if using TypeScript
   - Review the generated component for any manual adjustments needed

### Debug Mode

Enable debug logging by setting:

```bash
export DEBUG=figma-bridge:*
```

## 🎉 Benefits

### **For Developers:**

- **Instant component generation** from Figma designs
- **No manual translation** from design to code
- **Consistent styling** across all components
- **Type-safe** React components with proper TypeScript
- **Automated testing** and Storybook setup

### **For Designers:**

- **Direct impact** on codebase without developer bottleneck
- **Consistent implementation** of designs
- **Rapid iteration** cycles
- **Design system maintenance** made easy

### **For Teams:**

- **Faster development** cycles
- **Reduced design-dev handoff time**
- **Consistent UI** across the application
- **Scalable component libraries**
- **Automated design system updates**

This integration transforms Figma designs into production-ready React components with a single Cursor command! 🚀
