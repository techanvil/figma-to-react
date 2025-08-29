// Data extraction logic for Figma nodes

import {
  ComponentData,
  FillData,
  PaintData,
  EffectData,
  SelectionData,
} from "./types";
import { convertFontWeightToNumber } from "./utils";

/**
 * Get current selection data with metadata
 */
export function getSelectionData(): SelectionData {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    return {
      hasSelection: false,
      count: 0,
      components: [],
      message: "No components selected",
    };
  }

  const components = selection.map((node) => extractNodeData(node));

  return {
    hasSelection: true,
    count: selection.length,
    components,
    metadata: {
      fileKey: figma.fileKey || "unknown-file-key",
      fileName: figma.root.name || "Untitled",
      currentPage: {
        id: figma.currentPage.id,
        name: figma.currentPage.name,
      },
      user:
        figma.currentUser && figma.currentUser.id
          ? {
              id: figma.currentUser.id,
              name: figma.currentUser.name,
            }
          : null,
      viewport: figma.viewport,
      version: "1.0.0", // figma.version is not available in plugin API
      selectedAt: new Date().toISOString(),
    },
  };
}

/**
 * Extract comprehensive node data
 */
export function extractNodeData(node: SceneNode): ComponentData {
  const baseData: ComponentData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
    removed: node.removed,
    pluginData: node.getPluginData("figma-to-react-bridge") || null,
  };

  // Add bounding box if available
  if ("absoluteBoundingBox" in node && node.absoluteBoundingBox) {
    baseData.absoluteBoundingBox = {
      x: node.absoluteBoundingBox.x,
      y: node.absoluteBoundingBox.y,
      width: node.absoluteBoundingBox.width,
      height: node.absoluteBoundingBox.height,
    };
  }

  // Add layout constraints
  if ("constraints" in node) {
    baseData.constraints = {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical,
    };
  }

  // Extract fills
  if ("fills" in node && node.fills !== figma.mixed) {
    baseData.fills = (node.fills as Paint[]).map((fill) =>
      extractFillData(fill)
    );
  }

  // Extract strokes
  if ("strokes" in node && Array.isArray(node.strokes)) {
    baseData.strokes = (node.strokes as Paint[]).map((stroke) =>
      extractPaintData(stroke)
    );
    if ("strokeWeight" in node && typeof node.strokeWeight === "number") {
      baseData.strokeWeight = node.strokeWeight;
    }
  }

  // Extract corner radius
  if ("cornerRadius" in node && typeof node.cornerRadius === "number") {
    baseData.cornerRadius = node.cornerRadius;
  }

  if (
    "rectangleCornerRadii" in node &&
    Array.isArray(node.rectangleCornerRadii)
  ) {
    baseData.rectangleCornerRadii = node.rectangleCornerRadii;
  }

  // Extract effects
  if ("effects" in node) {
    baseData.effects = node.effects.map((effect) => extractEffectData(effect));
  }

  // Extract text-specific data
  if (node.type === "TEXT") {
    const textNode = node as TextNode;
    baseData.characters = textNode.characters;
    baseData.fontSize = textNode.fontSize;
    baseData.fontName = textNode.fontName;
    baseData.textAlignHorizontal = textNode.textAlignHorizontal;
    baseData.textAlignVertical = textNode.textAlignVertical;
    baseData.letterSpacing = textNode.letterSpacing;
    baseData.lineHeight = textNode.lineHeight;

    // Get text style
    try {
      baseData.style = {
        fontFamily:
          typeof textNode.fontName === "object"
            ? textNode.fontName.family
            : undefined,
        fontSize:
          typeof textNode.fontSize === "number" ? textNode.fontSize : undefined,
        fontWeight:
          typeof textNode.fontName === "object"
            ? convertFontWeightToNumber(textNode.fontName.style)
            : undefined,
        lineHeightPx:
          typeof textNode.lineHeight === "object" &&
          "value" in textNode.lineHeight
            ? (textNode.lineHeight as { value: number }).value
            : undefined,
        letterSpacing:
          typeof textNode.letterSpacing === "object" &&
          "value" in textNode.letterSpacing
            ? (textNode.letterSpacing as { value: number }).value
            : undefined,
        textAlignHorizontal: textNode.textAlignHorizontal,
        textAlignVertical: textNode.textAlignVertical,
      };
    } catch (error) {
      console.warn("Error extracting text style:", error);
    }
  }

  // Extract component data
  if ("mainComponent" in node && node.mainComponent) {
    baseData.componentId = node.mainComponent.id;
    baseData.componentName = node.mainComponent.name;
  }

  // Extract component properties (variants)
  if ("componentProperties" in node) {
    baseData.componentProperties = node.componentProperties;
  }

  // Extract children recursively
  if ("children" in node && node.children.length > 0) {
    baseData.children = node.children.map((child) => extractNodeData(child));
  }

  // Add auto layout properties if available
  if ("layoutMode" in node && node.layoutMode !== "NONE") {
    baseData.layoutMode = node.layoutMode;
    if ("primaryAxisSizingMode" in node) {
      baseData.primaryAxisSizingMode = node.primaryAxisSizingMode;
    }
    if ("counterAxisSizingMode" in node) {
      baseData.counterAxisSizingMode = node.counterAxisSizingMode;
    }
    if ("primaryAxisAlignItems" in node) {
      baseData.primaryAxisAlignItems = node.primaryAxisAlignItems;
    }
    if ("counterAxisAlignItems" in node) {
      baseData.counterAxisAlignItems = node.counterAxisAlignItems;
    }
    if ("paddingLeft" in node) {
      baseData.paddingLeft = node.paddingLeft;
    }
    if ("paddingRight" in node) {
      baseData.paddingRight = node.paddingRight;
    }
    if ("paddingTop" in node) {
      baseData.paddingTop = node.paddingTop;
    }
    if ("paddingBottom" in node) {
      baseData.paddingBottom = node.paddingBottom;
    }
    if ("itemSpacing" in node) {
      baseData.itemSpacing = node.itemSpacing;
    }
  }

  return baseData;
}

/**
 * Extract fill/paint data
 */
export function extractFillData(fill: Paint): FillData {
  const fillData: FillData = {
    type: fill.type,
    visible: fill.visible,
    opacity: fill.opacity,
    blendMode: fill.blendMode,
  };

  if (fill.type === "SOLID") {
    const solidFill = fill as SolidPaint;
    fillData.color = {
      r: solidFill.color.r,
      g: solidFill.color.g,
      b: solidFill.color.b,
      a: solidFill.opacity || 1,
    };
  } else if (
    fill.type === "GRADIENT_LINEAR" ||
    fill.type === "GRADIENT_RADIAL" ||
    fill.type === "GRADIENT_ANGULAR" ||
    fill.type === "GRADIENT_DIAMOND"
  ) {
    const gradientFill = fill as GradientPaint;
    fillData.gradientStops = gradientFill.gradientStops.map((stop) => ({
      position: stop.position,
      color: {
        r: stop.color.r,
        g: stop.color.g,
        b: stop.color.b,
        a: stop.color.a || 1,
      },
    }));

    if (gradientFill.gradientTransform) {
      fillData.gradientTransform = gradientFill.gradientTransform;
    }
  } else if (fill.type === "IMAGE") {
    const imageFill = fill as ImagePaint;
    fillData.imageHash = imageFill.imageHash || undefined;
    fillData.scaleMode = imageFill.scaleMode;
    fillData.imageTransform = imageFill.imageTransform;
  }

  return fillData;
}

/**
 * Extract paint data (same as fill data for now)
 */
export function extractPaintData(paint: Paint): PaintData {
  return extractFillData(paint);
}

/**
 * Extract effect data
 */
export function extractEffectData(effect: Effect): EffectData {
  const effectData: EffectData = {
    type: effect.type,
    visible: effect.visible,
  };

  // Handle shadow effects
  if (effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW") {
    const shadowEffect = effect as DropShadowEffect | InnerShadowEffect;
    effectData.radius = shadowEffect.radius;
    effectData.spread = shadowEffect.spread;
    effectData.offset = {
      x: shadowEffect.offset.x,
      y: shadowEffect.offset.y,
    };
    effectData.color = {
      r: shadowEffect.color.r,
      g: shadowEffect.color.g,
      b: shadowEffect.color.b,
      a: shadowEffect.color.a || 1,
    };
    effectData.blendMode = shadowEffect.blendMode;
  }
  // Handle blur effects
  else if (effect.type === "LAYER_BLUR" || effect.type === "BACKGROUND_BLUR") {
    const blurEffect = effect as BlurEffect;
    effectData.radius = blurEffect.radius;
  }

  return effectData;
}
