const logger = require("../utils/logger");

/**
 * Extract design tokens from Figma components
 */
class DesignTokenExtractor {
  /**
   * Extract design tokens from components
   */
  async extract(components, options = {}) {
    logger.info("Starting design token extraction", {
      componentCount: components.length,
      options,
    });

    const tokens = {
      colors: new Map(),
      typography: new Map(),
      spacing: new Map(),
      shadows: new Map(),
      borders: new Map(),
      radii: new Map(),
      metadata: {
        extractedAt: new Date().toISOString(),
        componentCount: components.length,
        tokenCounts: {},
      },
    };

    // Extract tokens from each component
    for (const component of components) {
      this.extractFromComponent(component, tokens);
    }

    // Convert Maps to objects and calculate counts
    const result = {
      colors: this.mapToTokenObject(tokens.colors),
      typography: this.mapToTokenObject(tokens.typography),
      spacing: this.mapToTokenObject(tokens.spacing),
      shadows: this.mapToTokenObject(tokens.shadows),
      borders: this.mapToTokenObject(tokens.borders),
      radii: this.mapToTokenObject(tokens.radii),
      metadata: {
        ...tokens.metadata,
        tokenCounts: {
          colors: tokens.colors.size,
          typography: tokens.typography.size,
          spacing: tokens.spacing.size,
          shadows: tokens.shadows.size,
          borders: tokens.borders.size,
          radii: tokens.radii.size,
        },
      },
    };

    logger.info("Design token extraction completed", result.metadata);
    return result;
  }

  /**
   * Extract tokens from a single component recursively
   */
  extractFromComponent(component, tokens) {
    // Extract color tokens
    this.extractColors(component, tokens.colors);

    // Extract typography tokens
    this.extractTypography(component, tokens.typography);

    // Extract spacing tokens
    this.extractSpacing(component, tokens.spacing);

    // Extract shadow tokens
    this.extractShadows(component, tokens.shadows);

    // Extract border tokens
    this.extractBorders(component, tokens.borders);

    // Extract border radius tokens
    this.extractBorderRadius(component, tokens.radii);

    // Recursively process children
    if (component.children) {
      component.children.forEach((child) =>
        this.extractFromComponent(child, tokens)
      );
    }
  }

  /**
   * Extract color tokens from fills and strokes
   */
  extractColors(component, colorTokens) {
    // Extract fill colors
    if (component.fills) {
      component.fills.forEach((fill, index) => {
        if (fill.type === "SOLID" && fill.color) {
          const colorValue = this.rgbaToString(fill.color);
          const tokenName = this.generateColorTokenName(
            component.name,
            "fill",
            index
          );

          if (!colorTokens.has(colorValue)) {
            colorTokens.set(colorValue, {
              value: colorValue,
              hex: this.rgbaToHex(fill.color),
              rgb: {
                r: Math.round(fill.color.r * 255),
                g: Math.round(fill.color.g * 255),
                b: Math.round(fill.color.b * 255),
                a: fill.color.a || 1,
              },
              usage: [],
              category: "fill",
            });
          }

          colorTokens.get(colorValue).usage.push({
            component: component.name,
            property: "fill",
            tokenName,
          });
        }
      });
    }

    // Extract stroke colors
    if (component.strokes) {
      component.strokes.forEach((stroke, index) => {
        if (stroke.color) {
          const colorValue = this.rgbaToString(stroke.color);
          const tokenName = this.generateColorTokenName(
            component.name,
            "stroke",
            index
          );

          if (!colorTokens.has(colorValue)) {
            colorTokens.set(colorValue, {
              value: colorValue,
              hex: this.rgbaToHex(stroke.color),
              rgb: {
                r: Math.round(stroke.color.r * 255),
                g: Math.round(stroke.color.g * 255),
                b: Math.round(stroke.color.b * 255),
                a: stroke.color.a || 1,
              },
              usage: [],
              category: "stroke",
            });
          }

          colorTokens.get(colorValue).usage.push({
            component: component.name,
            property: "stroke",
            tokenName,
          });
        }
      });
    }
  }

  /**
   * Extract typography tokens
   */
  extractTypography(component, typographyTokens) {
    if (component.type === "TEXT" && component.style) {
      const style = component.style;
      const tokenKey = this.generateTypographyTokenKey(style);

      if (!typographyTokens.has(tokenKey)) {
        typographyTokens.set(tokenKey, {
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeightPx,
          letterSpacing: style.letterSpacing,
          textAlign: style.textAlignHorizontal,
          textDecoration: style.textDecoration,
          usage: [],
          css: this.generateTypographyCSS(style),
        });
      }

      typographyTokens.get(tokenKey).usage.push({
        component: component.name,
        text: component.characters,
      });
    }
  }

  /**
   * Extract spacing tokens from component dimensions and positions
   */
  extractSpacing(component, spacingTokens) {
    if (component.absoluteBoundingBox) {
      const { width, height } = component.absoluteBoundingBox;

      // Add width as spacing token
      if (width && !spacingTokens.has(width)) {
        spacingTokens.set(width, {
          value: width,
          px: `${width}px`,
          rem: `${(width / 16).toFixed(3)}rem`,
          usage: [],
        });
      }
      if (width) {
        spacingTokens.get(width).usage.push({
          component: component.name,
          property: "width",
        });
      }

      // Add height as spacing token
      if (height && !spacingTokens.has(height)) {
        spacingTokens.set(height, {
          value: height,
          px: `${height}px`,
          rem: `${(height / 16).toFixed(3)}rem`,
          usage: [],
        });
      }
      if (height) {
        spacingTokens.get(height).usage.push({
          component: component.name,
          property: "height",
        });
      }
    }

    // Extract padding from layout constraints (if available)
    if (
      component.paddingLeft ||
      component.paddingTop ||
      component.paddingRight ||
      component.paddingBottom
    ) {
      [
        component.paddingLeft,
        component.paddingTop,
        component.paddingRight,
        component.paddingBottom,
      ]
        .filter(Boolean)
        .forEach((padding) => {
          if (!spacingTokens.has(padding)) {
            spacingTokens.set(padding, {
              value: padding,
              px: `${padding}px`,
              rem: `${(padding / 16).toFixed(3)}rem`,
              usage: [],
            });
          }

          spacingTokens.get(padding).usage.push({
            component: component.name,
            property: "padding",
          });
        });
    }
  }

  /**
   * Extract shadow tokens from effects
   */
  extractShadows(component, shadowTokens) {
    if (component.effects) {
      component.effects
        .filter(
          (effect) =>
            effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW"
        )
        .forEach((effect, index) => {
          const shadowKey = this.generateShadowTokenKey(effect);

          if (!shadowTokens.has(shadowKey)) {
            shadowTokens.set(shadowKey, {
              type: effect.type,
              offset: {
                x: effect.offset?.x || 0,
                y: effect.offset?.y || 0,
              },
              radius: effect.radius || 0,
              spread: effect.spread || 0,
              color: effect.color
                ? this.rgbaToString(effect.color)
                : "transparent",
              css: this.generateShadowCSS(effect),
              usage: [],
            });
          }

          shadowTokens.get(shadowKey).usage.push({
            component: component.name,
            effectIndex: index,
          });
        });
    }
  }

  /**
   * Extract border tokens
   */
  extractBorders(component, borderTokens) {
    if (component.strokes && component.strokeWeight) {
      const borderKey = `${component.strokeWeight}px-solid`;

      if (!borderTokens.has(borderKey)) {
        borderTokens.set(borderKey, {
          width: component.strokeWeight,
          style: "solid", // Figma doesn't have dashed/dotted info easily accessible
          css: `${component.strokeWeight}px solid`,
          usage: [],
        });
      }

      borderTokens.get(borderKey).usage.push({
        component: component.name,
        property: "border",
      });
    }
  }

  /**
   * Extract border radius tokens
   */
  extractBorderRadius(component, radiusTokens) {
    if (component.cornerRadius !== undefined) {
      const radius = component.cornerRadius;

      if (!radiusTokens.has(radius)) {
        radiusTokens.set(radius, {
          value: radius,
          px: `${radius}px`,
          usage: [],
        });
      }

      radiusTokens.get(radius).usage.push({
        component: component.name,
        property: "borderRadius",
      });
    }

    // Handle individual corner radii if available
    if (component.rectangleCornerRadii) {
      component.rectangleCornerRadii.forEach((radius, index) => {
        if (radius > 0 && !radiusTokens.has(radius)) {
          radiusTokens.set(radius, {
            value: radius,
            px: `${radius}px`,
            usage: [],
          });
        }

        if (radius > 0) {
          const corners = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
          radiusTokens.get(radius).usage.push({
            component: component.name,
            property: `border${corners[index]}Radius`,
          });
        }
      });
    }
  }

  // Helper methods

  generateColorTokenName(componentName, type, index) {
    const cleanName = componentName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return `${cleanName}-${type}-${index}`;
  }

  generateTypographyTokenKey(style) {
    return `${style.fontFamily || "default"}-${style.fontSize || 16}-${
      style.fontWeight || 400
    }`;
  }

  generateShadowTokenKey(effect) {
    const x = effect.offset?.x || 0;
    const y = effect.offset?.y || 0;
    const blur = effect.radius || 0;
    const spread = effect.spread || 0;
    return `shadow-${x}-${y}-${blur}-${spread}`;
  }

  generateTypographyCSS(style) {
    const css = [];

    if (style.fontFamily) css.push(`font-family: '${style.fontFamily}'`);
    if (style.fontSize) css.push(`font-size: ${style.fontSize}px`);
    if (style.fontWeight) css.push(`font-weight: ${style.fontWeight}`);
    if (style.lineHeightPx) css.push(`line-height: ${style.lineHeightPx}px`);
    if (style.letterSpacing)
      css.push(`letter-spacing: ${style.letterSpacing}px`);
    if (style.textAlignHorizontal)
      css.push(`text-align: ${style.textAlignHorizontal.toLowerCase()}`);

    return css.join("; ");
  }

  generateShadowCSS(effect) {
    const x = effect.offset?.x || 0;
    const y = effect.offset?.y || 0;
    const blur = effect.radius || 0;
    const spread = effect.spread || 0;
    const color = effect.color
      ? this.rgbaToString(effect.color)
      : "rgba(0, 0, 0, 0.1)";
    const inset = effect.type === "INNER_SHADOW" ? "inset " : "";

    return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
  }

  rgbaToString(color) {
    const { r, g, b, a = 1 } = color;
    const red = Math.round(r * 255);
    const green = Math.round(g * 255);
    const blue = Math.round(b * 255);

    if (a < 1) {
      return `rgba(${red}, ${green}, ${blue}, ${a})`;
    }

    return `rgb(${red}, ${green}, ${blue})`;
  }

  rgbaToHex(color) {
    const { r, g, b } = color;
    const toHex = (n) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  mapToTokenObject(tokenMap) {
    const obj = {};
    tokenMap.forEach((value, key) => {
      // Create a readable token name
      const tokenName = this.createTokenName(key, value);
      obj[tokenName] = value;
    });
    return obj;
  }

  createTokenName(key, value) {
    // Generate meaningful token names
    if (value.category === "fill" || value.category === "stroke") {
      return `color-${key.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}`;
    }

    if (value.fontFamily) {
      return `typography-${value.fontFamily
        .toLowerCase()
        .replace(/\s+/g, "-")}-${value.fontSize || "default"}`;
    }

    if (value.px) {
      return `spacing-${value.value}`;
    }

    if (value.type === "DROP_SHADOW" || value.type === "INNER_SHADOW") {
      return `shadow-${key}`;
    }

    return `token-${key}`.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
  }
}

module.exports = new DesignTokenExtractor();
