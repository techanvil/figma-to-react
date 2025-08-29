const logger = require("../utils/logger");

/**
 * Transform Figma components to React component structure
 */
class FigmaTransformer {
  /**
   * Transform components with given options
   */
  async transformComponents(components, options = {}) {
    const {
      framework = "react",
      typescript = true,
      styling = "css",
      componentNaming = "pascal",
      includeProps = true,
      includeTypes = true,
    } = options;

    logger.info("Starting component transformation", {
      componentCount: components.length,
      framework,
      typescript,
      styling,
    });

    const transformedComponents = [];

    for (const component of components) {
      try {
        const transformed = await this.transformSingleComponent(
          component,
          options
        );
        transformedComponents.push(transformed);
      } catch (error) {
        logger.error("Error transforming component", {
          componentId: component.id,
          componentName: component.name,
          error: error.message,
        });

        // Add error info to result instead of failing completely
        transformedComponents.push({
          id: component.id,
          name: component.name,
          error: error.message,
          originalComponent: component,
        });
      }
    }

    return transformedComponents;
  }

  /**
   * Transform a single Figma component
   */
  async transformSingleComponent(figmaComponent, options) {
    const componentName = this.formatComponentName(
      figmaComponent.name,
      options.componentNaming
    );

    const transformed = {
      id: figmaComponent.id,
      name: componentName,
      type: "react-component",
      originalFigmaNode: figmaComponent,

      // Component structure
      structure: this.analyzeComponentStructure(figmaComponent),

      // Props analysis
      props: options.includeProps ? this.extractProps(figmaComponent) : [],

      // Styling information
      styling: this.extractStyling(figmaComponent, options.styling),

      // Component code generation
      code: {
        component: this.generateComponentCode(
          figmaComponent,
          componentName,
          options
        ),
        types:
          options.typescript && options.includeTypes
            ? this.generateTypeDefinitions(figmaComponent, componentName)
            : null,
        styles: this.generateStyleCode(figmaComponent, options.styling),
      },

      // Metadata
      metadata: {
        figmaId: figmaComponent.id,
        figmaName: figmaComponent.name,
        componentType: this.determineComponentType(figmaComponent),
        complexity: this.calculateComplexity(figmaComponent),
        transformedAt: new Date().toISOString(),
      },
    };

    return transformed;
  }

  /**
   * Format component name based on naming convention
   */
  formatComponentName(name, convention = "pascal") {
    // Clean the name
    const cleanName = name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    switch (convention) {
      case "pascal":
        return cleanName
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join("");

      case "camel":
        const pascalCase = this.formatComponentName(cleanName, "pascal");
        return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);

      case "kebab":
        return cleanName.toLowerCase().replace(/\s+/g, "-");

      default:
        return cleanName;
    }
  }

  /**
   * Analyze component structure and hierarchy
   */
  analyzeComponentStructure(component) {
    const structure = {
      type: component.type,
      hasChildren: !!(component.children && component.children.length > 0),
      childCount: component.children?.length || 0,
      depth: this.calculateDepth(component),
      layout: this.analyzeLayout(component),
    };

    if (component.children) {
      structure.children = component.children.map((child) =>
        this.analyzeComponentStructure(child)
      );
    }

    return structure;
  }

  /**
   * Extract potential props from component
   */
  extractProps(component) {
    const props = [];

    // Extract text content as potential props
    if (component.type === "TEXT" && component.characters) {
      props.push({
        name: "text",
        type: "string",
        defaultValue: component.characters,
        description: "Text content",
      });
    }

    // Extract variant properties
    if (component.componentProperties) {
      Object.entries(component.componentProperties).forEach(([key, value]) => {
        props.push({
          name: this.formatPropName(key),
          type: this.inferPropType(value),
          defaultValue: value,
          description: `Component property: ${key}`,
        });
      });
    }

    // Extract boolean props from visibility, etc.
    if (typeof component.visible !== "undefined") {
      props.push({
        name: "visible",
        type: "boolean",
        defaultValue: component.visible,
        description: "Component visibility",
      });
    }

    return props;
  }

  /**
   * Extract styling information
   */
  extractStyling(component, stylingType) {
    const styling = {
      type: stylingType,
      properties: {},
    };

    // Extract layout properties
    if (component.absoluteBoundingBox) {
      styling.properties.width = component.absoluteBoundingBox.width;
      styling.properties.height = component.absoluteBoundingBox.height;
    }

    // Extract fill colors
    if (component.fills && component.fills.length > 0) {
      const fill = component.fills[0];
      if (fill.type === "SOLID" && fill.color) {
        styling.properties.backgroundColor = this.rgbaToHex(fill.color);
      }
    }

    // Extract stroke properties
    if (component.strokes && component.strokes.length > 0) {
      const stroke = component.strokes[0];
      if (stroke.color) {
        styling.properties.borderColor = this.rgbaToHex(stroke.color);
        styling.properties.borderWidth = component.strokeWeight || 1;
      }
    }

    // Extract corner radius
    if (component.cornerRadius) {
      styling.properties.borderRadius = component.cornerRadius;
    }

    // Extract text styling
    if (component.style) {
      if (component.style.fontFamily)
        styling.properties.fontFamily = component.style.fontFamily;
      if (component.style.fontSize)
        styling.properties.fontSize = component.style.fontSize;
      if (component.style.fontWeight)
        styling.properties.fontWeight = component.style.fontWeight;
      if (component.style.lineHeightPx)
        styling.properties.lineHeight = `${component.style.lineHeightPx}px`;
      if (component.style.letterSpacing)
        styling.properties.letterSpacing = component.style.letterSpacing;
      if (component.style.textAlignHorizontal)
        styling.properties.textAlign =
          component.style.textAlignHorizontal.toLowerCase();
    }

    return styling;
  }

  /**
   * Generate React component code
   */
  generateComponentCode(component, componentName, options) {
    const { typescript, includeProps } = options;
    const props = includeProps ? this.extractProps(component) : [];

    // Generate imports
    const imports = typescript
      ? "import React from 'react';\nimport { FC } from 'react';"
      : "import React from 'react';";

    // Generate props interface (TypeScript)
    let propsInterface = "";
    if (typescript && props.length > 0) {
      propsInterface = `\ninterface ${componentName}Props {\n`;
      props.forEach((prop) => {
        propsInterface += `  ${prop.name}${prop.required ? "" : "?"}: ${
          prop.type
        };\n`;
      });
      propsInterface += "}\n";
    }

    // Generate component
    const componentDeclaration = typescript
      ? `const ${componentName}: FC<${
          props.length > 0 ? `${componentName}Props` : "{}"
        }> = (${props.length > 0 ? "props" : ""}) => {`
      : `const ${componentName} = (${props.length > 0 ? "props" : ""}) => {`;

    // Generate JSX
    const jsx = this.generateJSX(component, options);

    const componentCode = `${imports}${propsInterface}

${componentDeclaration}
  return (
    ${jsx}
  );
};

export default ${componentName};`;

    return componentCode;
  }

  /**
   * Generate JSX for a component
   */
  generateJSX(component, options, depth = 0) {
    const indent = "  ".repeat(depth + 1);
    const styling = this.extractStyling(component, options.styling);

    // Determine JSX element type
    let elementType = "div";
    if (component.type === "TEXT") {
      elementType = "span";
    } else if (component.type === "FRAME" || component.type === "GROUP") {
      elementType = "div";
    }

    // Generate style prop
    const styleProps = this.generateStyleProps(
      styling.properties,
      options.styling
    );
    const styleAttr = styleProps ? ` style={${styleProps}}` : "";

    // Generate content
    let content = "";
    if (component.type === "TEXT" && component.characters) {
      content = component.characters;
    } else if (component.children && component.children.length > 0) {
      content =
        "\n" +
        component.children
          .map(
            (child) =>
              indent + "  " + this.generateJSX(child, options, depth + 1)
          )
          .join("\n") +
        "\n" +
        indent;
    }

    return `<${elementType}${styleAttr}>${content}</${elementType}>`;
  }

  /**
   * Generate style props based on styling type
   */
  generateStyleProps(styleProperties, stylingType) {
    if (Object.keys(styleProperties).length === 0) return null;

    switch (stylingType) {
      case "styled-components":
        // For styled-components, we'd generate a styled component instead
        return null;

      case "tailwind":
        // Convert to Tailwind classes (simplified)
        return null;

      case "css":
      case "scss":
      default:
        // Generate inline styles object
        const styleEntries = Object.entries(styleProperties)
          .map(
            ([key, value]) =>
              `${key}: ${typeof value === "string" ? `'${value}'` : value}`
          )
          .join(", ");
        return `{${styleEntries}}`;
    }
  }

  /**
   * Generate TypeScript type definitions
   */
  generateTypeDefinitions(component, componentName) {
    const props = this.extractProps(component);

    if (props.length === 0) return null;

    let types = `export interface ${componentName}Props {\n`;
    props.forEach((prop) => {
      types += `  /** ${prop.description} */\n`;
      types += `  ${prop.name}${prop.required ? "" : "?"}: ${prop.type};\n`;
    });
    types += "}\n";

    return types;
  }

  /**
   * Generate style code based on styling type
   */
  generateStyleCode(component, stylingType) {
    const styling = this.extractStyling(component, stylingType);

    switch (stylingType) {
      case "css":
        return this.generateCSS(component, styling.properties);

      case "scss":
        return this.generateSCSS(component, styling.properties);

      case "styled-components":
        return this.generateStyledComponents(component, styling.properties);

      default:
        return null;
    }
  }

  /**
   * Generate CSS styles
   */
  generateCSS(component, styleProperties) {
    const className = this.formatComponentName(
      component.name,
      "kebab"
    ).toLowerCase();

    let css = `.${className} {\n`;
    Object.entries(styleProperties).forEach(([property, value]) => {
      const cssProperty = property.replace(/([A-Z])/g, "-$1").toLowerCase();
      css += `  ${cssProperty}: ${
        typeof value === "string" ? value : `${value}px`
      };\n`;
    });
    css += "}\n";

    return css;
  }

  /**
   * Generate SCSS styles
   */
  generateSCSS(component, styleProperties) {
    // For now, same as CSS - could be enhanced with nesting, variables, etc.
    return this.generateCSS(component, styleProperties);
  }

  /**
   * Generate styled-components code
   */
  generateStyledComponents(component, styleProperties) {
    const componentName = this.formatComponentName(component.name, "pascal");

    let styledComponent = `const Styled${componentName} = styled.div\`\n`;
    Object.entries(styleProperties).forEach(([property, value]) => {
      const cssProperty = property.replace(/([A-Z])/g, "-$1").toLowerCase();
      styledComponent += `  ${cssProperty}: ${
        typeof value === "string" ? value : `${value}px`
      };\n`;
    });
    styledComponent += "`;\n";

    return styledComponent;
  }

  // Helper methods

  formatPropName(name) {
    return name
      .replace(/[^a-zA-Z0-9]/g, "")
      .replace(/^./, (str) => str.toLowerCase());
  }

  inferPropType(value) {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (typeof value === "string") return "string";
    if (Array.isArray(value)) return "any[]";
    return "any";
  }

  calculateDepth(component, depth = 0) {
    if (!component.children || component.children.length === 0) {
      return depth;
    }

    return Math.max(
      ...component.children.map((child) =>
        this.calculateDepth(child, depth + 1)
      )
    );
  }

  analyzeLayout(component) {
    // Simplified layout analysis
    return {
      hasFixedSize: !!(
        component.absoluteBoundingBox?.width &&
        component.absoluteBoundingBox?.height
      ),
      isContainer: !!(component.children && component.children.length > 0),
      layoutType: component.type === "FRAME" ? "flex" : "block",
    };
  }

  determineComponentType(component) {
    if (component.type === "TEXT") return "text";
    if (component.type === "FRAME") return "container";
    if (component.componentId) return "component-instance";
    return "element";
  }

  calculateComplexity(component) {
    let complexity = 1;

    if (component.children) {
      complexity += component.children.reduce(
        (sum, child) => sum + this.calculateComplexity(child),
        0
      );
    }

    // Add complexity for styling
    if (component.fills?.length > 0) complexity += 1;
    if (component.strokes?.length > 0) complexity += 1;
    if (component.effects?.length > 0) complexity += 1;

    return complexity;
  }

  rgbaToHex(color) {
    const { r, g, b, a = 1 } = color;
    const toHex = (n) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, "0");

    if (a < 1) {
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
        b * 255
      )}, ${a})`;
    }

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

module.exports = new FigmaTransformer();
