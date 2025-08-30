#!/usr/bin/env node

/**
 * Example MCP Server for Figma to React Bridge Integration
 * This demonstrates how to integrate the Figma bridge with Cursor via MCP
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

// Configuration
const FIGMA_BRIDGE_URL =
  process.env.FIGMA_BRIDGE_URL || "http://localhost:3001";
const FIGMA_BRIDGE_API_KEY = process.env.FIGMA_BRIDGE_API_KEY || "";

interface FigmaComponent {
  name: string;
  originalName?: string;
  sessionId: string;
  componentId: string;
  lastUpdated?: string;
}

interface GeneratedCode {
  componentName: string;
  originalFigmaName: string;
  customName: string;
  code: {
    component: string;
    styles?: string;
    types?: string;
  };
  props: Array<{
    name: string;
    type: string;
    defaultValue?: any;
    description?: string;
  }>;
}

class FigmaBridgeMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "figma-bridge",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_figma_components",
          description:
            "List all available Figma components that can be generated into React code",
          inputSchema: {
            type: "object",
            properties: {
              search: {
                type: "string",
                description: "Optional search term to filter components",
              },
            },
          },
        },
        {
          name: "create_figma_component",
          description:
            "Generate a React component from a Figma design and save it to the specified location",
          inputSchema: {
            type: "object",
            properties: {
              componentName: {
                type: "string",
                description: "Name of the Figma component to generate",
              },
              outputPath: {
                type: "string",
                description:
                  "Directory path where the component should be created",
                default: "src/components/",
              },
              typescript: {
                type: "boolean",
                description: "Generate TypeScript code with type definitions",
                default: true,
              },
              styling: {
                type: "string",
                enum: [
                  "css",
                  "scss",
                  "styled-components",
                  "tailwind",
                  "emotion",
                ],
                description: "Styling approach to use for the component",
                default: "css",
              },
              componentNaming: {
                type: "string",
                enum: ["pascal", "camel", "kebab"],
                description: "Naming convention for the generated component",
                default: "pascal",
              },
              createStorybook: {
                type: "boolean",
                description: "Generate Storybook story file for the component",
                default: false,
              },
              createTests: {
                type: "boolean",
                description: "Generate test file for the component",
                default: false,
              },
            },
            required: ["componentName"],
          },
        },
        {
          name: "preview_figma_component",
          description:
            "Preview the generated React code for a Figma component without creating files",
          inputSchema: {
            type: "object",
            properties: {
              componentName: {
                type: "string",
                description: "Name of the Figma component to preview",
              },
              typescript: {
                type: "boolean",
                description: "Preview TypeScript code",
                default: true,
              },
              styling: {
                type: "string",
                enum: [
                  "css",
                  "scss",
                  "styled-components",
                  "tailwind",
                  "emotion",
                ],
                description: "Styling approach for preview",
                default: "css",
              },
            },
            required: ["componentName"],
          },
        },
        {
          name: "search_figma_components",
          description: "Search for Figma components by name or partial match",
          inputSchema: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "Search query",
              },
              limit: {
                type: "integer",
                description: "Maximum number of results to return",
                default: 10,
                minimum: 1,
                maximum: 50,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "extract_design_tokens",
          description:
            "Extract design tokens from Figma components and generate CSS variables or design system files",
          inputSchema: {
            type: "object",
            properties: {
              componentName: {
                type: "string",
                description:
                  "Name of the Figma component to extract tokens from",
              },
              outputPath: {
                type: "string",
                description: "Path where design tokens should be saved",
                default: "src/styles/",
              },
              format: {
                type: "string",
                enum: ["css", "scss", "js", "json", "tailwind"],
                description: "Output format for design tokens",
                default: "css",
              },
            },
            required: ["componentName"],
          },
        },
        {
          name: "create_component_library",
          description: "Generate multiple React components from Figma at once",
          inputSchema: {
            type: "object",
            properties: {
              componentNames: {
                type: "array",
                items: { type: "string" },
                description: "List of Figma component names to generate",
              },
              outputPath: {
                type: "string",
                description: "Base directory for the component library",
                default: "src/components/",
              },
              typescript: {
                type: "boolean",
                description: "Generate TypeScript components",
                default: true,
              },
              styling: {
                type: "string",
                enum: [
                  "css",
                  "scss",
                  "styled-components",
                  "tailwind",
                  "emotion",
                ],
                description: "Consistent styling approach for all components",
                default: "css",
              },
              createIndex: {
                type: "boolean",
                description: "Create index.ts file to export all components",
                default: true,
              },
            },
            required: ["componentNames"],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "list_figma_components":
            return await this.listFigmaComponents(args);

          case "create_figma_component":
            return await this.createFigmaComponent(args);

          case "preview_figma_component":
            return await this.previewFigmaComponent(args);

          case "search_figma_components":
            return await this.searchFigmaComponents(args);

          case "extract_design_tokens":
            return await this.extractDesignTokens(args);

          case "create_component_library":
            return await this.createComponentLibrary(args);

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });
  }

  private async listFigmaComponents(args: any) {
    const { search } = args;

    try {
      let url = `${FIGMA_BRIDGE_URL}/api/figma/available`;

      const response = await fetch(url, {
        headers: {
          "X-API-Key": FIGMA_BRIDGE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch components: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      let components = data.data.components as FigmaComponent[];

      // Apply search filter if provided
      if (search) {
        components = components.filter(
          (comp) =>
            comp.name.toLowerCase().includes(search.toLowerCase()) ||
            comp.originalName?.toLowerCase().includes(search.toLowerCase())
        );
      }

      return {
        content: [
          {
            type: "text",
            text:
              `Found ${components.length} available Figma components:\n\n` +
              components
                .map(
                  (comp) =>
                    `• **${comp.name}** ${
                      comp.originalName && comp.originalName !== comp.name
                        ? `(${comp.originalName})`
                        : ""
                    }`
                )
                .join("\n") +
              `\n\nUse \`create_figma_component\` to generate any of these components.`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to list components: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async createFigmaComponent(args: any) {
    const {
      componentName,
      outputPath = "src/components/",
      typescript = true,
      styling = "css",
      componentNaming = "pascal",
      createStorybook = false,
      createTests = false,
    } = args;

    try {
      // Generate component code from Figma bridge
      const url = new URL(`${FIGMA_BRIDGE_URL}/api/figma/generate`);
      url.searchParams.set("name", componentName);
      url.searchParams.set("typescript", typescript.toString());
      url.searchParams.set("styling", styling);
      url.searchParams.set("componentNaming", componentNaming);

      const response = await fetch(url, {
        headers: {
          "X-API-Key": FIGMA_BRIDGE_API_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Failed to generate component: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const generatedCode = data.data as GeneratedCode;

      // Ensure output directory exists
      await fs.mkdir(outputPath, { recursive: true });

      const files: string[] = [];
      const fileExtension = typescript ? "tsx" : "jsx";
      const componentFileName = `${generatedCode.componentName}.${fileExtension}`;
      const componentFilePath = path.join(outputPath, componentFileName);

      // Write main component file
      await fs.writeFile(componentFilePath, generatedCode.code.component);
      files.push(componentFilePath);

      // Write styles file if needed
      if (generatedCode.code.styles && styling !== "tailwind") {
        const styleExtension = styling === "styled-components" ? "ts" : styling;
        const styleFileName = `${generatedCode.componentName}.styles.${styleExtension}`;
        const styleFilePath = path.join(outputPath, styleFileName);
        await fs.writeFile(styleFilePath, generatedCode.code.styles);
        files.push(styleFilePath);
      }

      // Write types file if TypeScript and separate types
      if (typescript && generatedCode.code.types) {
        const typesFileName = `${generatedCode.componentName}.types.ts`;
        const typesFilePath = path.join(outputPath, typesFileName);
        await fs.writeFile(typesFilePath, generatedCode.code.types);
        files.push(typesFilePath);
      }

      // Create Storybook story if requested
      if (createStorybook) {
        const storyContent = this.generateStorybookStory(
          generatedCode,
          typescript
        );
        const storyFileName = `${generatedCode.componentName}.stories.${
          typescript ? "ts" : "js"
        }`;
        const storyFilePath = path.join(outputPath, storyFileName);
        await fs.writeFile(storyFilePath, storyContent);
        files.push(storyFilePath);
      }

      // Create test file if requested
      if (createTests) {
        const testContent = this.generateTestFile(generatedCode, typescript);
        const testFileName = `${generatedCode.componentName}.test.${
          typescript ? "tsx" : "jsx"
        }`;
        const testFilePath = path.join(outputPath, testFileName);
        await fs.writeFile(testFilePath, testContent);
        files.push(testFilePath);
      }

      return {
        content: [
          {
            type: "text",
            text:
              `✅ Successfully created **${generatedCode.componentName}** component from Figma!\n\n` +
              `**Files created:**\n${files
                .map((f) => `• ${f}`)
                .join("\n")}\n\n` +
              `**Component details:**\n` +
              `• Original Figma name: ${generatedCode.originalFigmaName}\n` +
              `• Custom name: ${generatedCode.customName}\n` +
              `• Props: ${generatedCode.props.length} detected\n` +
              `• Styling: ${styling}\n` +
              `• TypeScript: ${typescript ? "Yes" : "No"}\n\n` +
              `The component is ready to use! Import it with:\n\`\`\`typescript\nimport ${generatedCode.componentName} from '${outputPath}${generatedCode.componentName}';\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create component: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async previewFigmaComponent(args: any) {
    const { componentName, typescript = true, styling = "css" } = args;

    try {
      const url = new URL(`${FIGMA_BRIDGE_URL}/api/figma/generate`);
      url.searchParams.set("name", componentName);
      url.searchParams.set("typescript", typescript.toString());
      url.searchParams.set("styling", styling);

      const response = await fetch(url, {
        headers: {
          "X-API-Key": FIGMA_BRIDGE_API_KEY,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to preview component: ${response.status}`
        );
      }

      const data = await response.json();
      const generatedCode = data.data as GeneratedCode;

      let preview = `# Preview: ${generatedCode.componentName}\n\n`;
      preview += `**Original Figma name:** ${generatedCode.originalFigmaName}\n`;
      preview += `**Custom name:** ${generatedCode.customName}\n`;
      preview += `**Props detected:** ${generatedCode.props.length}\n\n`;

      if (generatedCode.props.length > 0) {
        preview += `## Props\n`;
        generatedCode.props.forEach((prop) => {
          preview += `• **${prop.name}**: \`${prop.type}\``;
          if (prop.defaultValue !== undefined) {
            preview += ` (default: \`${prop.defaultValue}\`)`;
          }
          if (prop.description) {
            preview += ` - ${prop.description}`;
          }
          preview += "\n";
        });
        preview += "\n";
      }

      preview += `## Component Code\n\`\`\`${
        typescript ? "typescript" : "javascript"
      }\n${generatedCode.code.component}\n\`\`\`\n\n`;

      if (generatedCode.code.styles) {
        preview += `## Styles\n\`\`\`${styling}\n${generatedCode.code.styles}\n\`\`\`\n\n`;
      }

      if (generatedCode.code.types) {
        preview += `## Types\n\`\`\`typescript\n${generatedCode.code.types}\n\`\`\`\n`;
      }

      return {
        content: [
          {
            type: "text",
            text: preview,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to preview component: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async searchFigmaComponents(args: any) {
    const { query, limit = 10 } = args;

    try {
      const url = new URL(`${FIGMA_BRIDGE_URL}/api/figma/search`);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", limit.toString());

      const response = await fetch(url, {
        headers: {
          "X-API-Key": FIGMA_BRIDGE_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Search failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      const results = data.data.results;

      if (results.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No components found matching "${query}". Try a different search term.`,
            },
          ],
        };
      }

      const resultText =
        `Found ${results.length} components matching "${query}":\n\n` +
        results
          .map(
            (result: any, index: number) =>
              `${index + 1}. **${result.customName || result.originalName}** (${
                result.matchType
              } match)\n` +
              `   • Original name: ${result.originalName}\n` +
              `   • Session: ${result.sessionId}\n`
          )
          .join("\n");

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Search failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async extractDesignTokens(args: any) {
    const { componentName, outputPath = "src/styles/", format = "css" } = args;

    try {
      // First get the component
      const componentUrl = new URL(
        `${FIGMA_BRIDGE_URL}/api/figma/components/by-name/${componentName}`
      );
      const componentResponse = await fetch(componentUrl, {
        headers: { "X-API-Key": FIGMA_BRIDGE_API_KEY },
      });

      if (!componentResponse.ok) {
        throw new Error(`Component not found: ${componentName}`);
      }

      const componentData = await componentResponse.json();

      // Extract design tokens
      const tokensResponse = await fetch(
        `${FIGMA_BRIDGE_URL}/api/figma/extract/tokens`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": FIGMA_BRIDGE_API_KEY,
          },
          body: JSON.stringify({
            components: [componentData.data.component],
          }),
        }
      );

      if (!tokensResponse.ok) {
        throw new Error("Failed to extract design tokens");
      }

      const tokensData = await tokensResponse.json();
      const tokens = tokensData.data.designTokens;

      // Generate tokens file based on format
      const tokenContent = this.formatDesignTokens(tokens, format);
      const fileName = `design-tokens.${format}`;
      const filePath = path.join(outputPath, fileName);

      await fs.mkdir(outputPath, { recursive: true });
      await fs.writeFile(filePath, tokenContent);

      return {
        content: [
          {
            type: "text",
            text:
              `✅ Design tokens extracted from **${componentName}** and saved to **${filePath}**\n\n` +
              `**Tokens extracted:**\n` +
              `• Colors: ${Object.keys(tokens.colors || {}).length}\n` +
              `• Typography: ${Object.keys(tokens.typography || {}).length}\n` +
              `• Spacing: ${Object.keys(tokens.spacing || {}).length}\n` +
              `• Shadows: ${Object.keys(tokens.shadows || {}).length}\n` +
              `• Borders: ${Object.keys(tokens.borders || {}).length}\n` +
              `• Radii: ${Object.keys(tokens.radii || {}).length}\n`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to extract design tokens: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private async createComponentLibrary(args: any) {
    const {
      componentNames,
      outputPath = "src/components/",
      typescript = true,
      styling = "css",
      createIndex = true,
    } = args;

    try {
      const results = [];
      const createdFiles = [];

      // Generate each component
      for (const componentName of componentNames) {
        try {
          const result = await this.createFigmaComponent({
            componentName,
            outputPath,
            typescript,
            styling,
            componentNaming: "pascal",
          });
          results.push(`✅ ${componentName}: Success`);

          // Extract file paths from result
          const content = result.content[0].text;
          const fileMatches = content.match(/• (.+)/g);
          if (fileMatches) {
            createdFiles.push(
              ...fileMatches.map((match) => match.replace("• ", ""))
            );
          }
        } catch (error) {
          results.push(
            `❌ ${componentName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }

      // Create index file if requested
      if (createIndex && results.some((r) => r.includes("✅"))) {
        const indexContent = this.generateIndexFile(componentNames, typescript);
        const indexFileName = `index.${typescript ? "ts" : "js"}`;
        const indexFilePath = path.join(outputPath, indexFileName);
        await fs.writeFile(indexFilePath, indexContent);
        createdFiles.push(indexFilePath);
      }

      return {
        content: [
          {
            type: "text",
            text:
              `🚀 Component library generation complete!\n\n` +
              `**Results:**\n${results.join("\n")}\n\n` +
              `**Total files created:** ${createdFiles.length}\n\n` +
              `Your component library is ready to use!`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to create component library: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  // Helper methods
  private generateStorybookStory(
    component: GeneratedCode,
    typescript: boolean
  ): string {
    const importExt = typescript ? "" : ".js";
    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${component.componentName} } from './${
      component.componentName
    }${importExt}';

const meta: Meta<typeof ${component.componentName}> = {
  title: 'Components/${component.componentName}',
  component: ${component.componentName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    ${component.props
      .map(
        (prop) =>
          `${prop.name}: { control: '${this.getStorybookControl(prop.type)}' }`
      )
      .join(",\n    ")}
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ${component.props
      .map((prop) => `${prop.name}: ${JSON.stringify(prop.defaultValue)}`)
      .join(",\n    ")}
  },
};
`;
  }

  private generateTestFile(
    component: GeneratedCode,
    typescript: boolean
  ): string {
    return `import { render, screen } from '@testing-library/react';
import { ${component.componentName} } from './${component.componentName}';

describe('${component.componentName}', () => {
  it('renders without crashing', () => {
    render(<${component.componentName} />);
  });

  ${component.props
    .filter((prop) => prop.type === "string")
    .map(
      (prop) => `
  it('renders with ${prop.name} prop', () => {
    const test${
      prop.name.charAt(0).toUpperCase() + prop.name.slice(1)
    } = 'test ${prop.name}';
    render(<${component.componentName} ${prop.name}={test${
        prop.name.charAt(0).toUpperCase() + prop.name.slice(1)
      }} />);
    expect(screen.getByText(test${
      prop.name.charAt(0).toUpperCase() + prop.name.slice(1)
    })).toBeInTheDocument();
  });`
    )
    .join("")}
});
`;
  }

  private generateIndexFile(
    componentNames: string[],
    typescript: boolean
  ): string {
    const exports = componentNames
      .map((name) => `export { default as ${name} } from './${name}';`)
      .join("\n");

    return `// Auto-generated component library index\n${exports}\n`;
  }

  private formatDesignTokens(tokens: any, format: string): string {
    switch (format) {
      case "css":
        return this.generateCSSTokens(tokens);
      case "scss":
        return this.generateSCSSTokens(tokens);
      case "js":
        return `export const designTokens = ${JSON.stringify(
          tokens,
          null,
          2
        )};`;
      case "json":
        return JSON.stringify(tokens, null, 2);
      default:
        return JSON.stringify(tokens, null, 2);
    }
  }

  private generateCSSTokens(tokens: any): string {
    let css = ":root {\n";

    // Colors
    if (tokens.colors) {
      css += "  /* Colors */\n";
      Object.entries(tokens.colors).forEach(([name, token]: [string, any]) => {
        css += `  --${name}: ${token.hex || token.value};\n`;
      });
      css += "\n";
    }

    // Typography
    if (tokens.typography) {
      css += "  /* Typography */\n";
      Object.entries(tokens.typography).forEach(
        ([name, token]: [string, any]) => {
          if (token.fontFamily)
            css += `  --font-${name}: '${token.fontFamily}';\n`;
          if (token.fontSize)
            css += `  --font-size-${name}: ${token.fontSize}px;\n`;
        }
      );
      css += "\n";
    }

    // Spacing
    if (tokens.spacing) {
      css += "  /* Spacing */\n";
      Object.entries(tokens.spacing).forEach(([name, token]: [string, any]) => {
        css += `  --${name}: ${token.px};\n`;
      });
    }

    css += "}\n";
    return css;
  }

  private generateSCSSTokens(tokens: any): string {
    let scss = "";

    if (tokens.colors) {
      scss += "// Colors\n";
      Object.entries(tokens.colors).forEach(([name, token]: [string, any]) => {
        scss += `$${name}: ${token.hex || token.value};\n`;
      });
      scss += "\n";
    }

    return scss;
  }

  private getStorybookControl(type: string): string {
    switch (type) {
      case "boolean":
        return "boolean";
      case "number":
        return "number";
      case "string":
        return "text";
      default:
        return "text";
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Figma Bridge MCP server running on stdio");
  }
}

const server = new FigmaBridgeMCPServer();
server.run().catch(console.error);
