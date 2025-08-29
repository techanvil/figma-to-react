// Type definitions for Figma to React Bridge Plugin

export interface BridgeConfig {
  serverUrl: string;
  wsUrl: string;
  apiKey: string;
  autoConnect: boolean;
}

export interface UIMessage {
  type: string;
  data?: unknown;
  timestamp?: number;
}

export interface ComponentData {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
  removed: boolean;
  pluginData: string | null;
  absoluteBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  fills?: FillData[];
  strokes?: PaintData[];
  strokeWeight?: number;
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  effects?: EffectData[];
  characters?: string;
  fontSize?: number | typeof figma.mixed;
  fontName?: FontName | typeof figma.mixed;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  letterSpacing?: LetterSpacing | typeof figma.mixed;
  lineHeight?: LineHeight | typeof figma.mixed;
  style?: CustomTextStyle;
  componentId?: string;
  componentName?: string;
  componentProperties?: ComponentProperties;
  children?: ComponentData[];
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
}

export interface FillData {
  type: string;
  visible?: boolean;
  opacity?: number;
  blendMode?: string;
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  gradientStops?: GradientStop[];
  gradientTransform?: Transform;
  imageHash?: string;
  scaleMode?: string;
  imageTransform?: Transform;
}

export interface PaintData extends FillData {}

export interface GradientStop {
  position: number;
  color: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
}

export interface EffectData {
  type: string;
  visible: boolean;
  radius?: number;
  spread?: number;
  offset?: {
    x: number;
    y: number;
  };
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  blendMode?: string;
}

export interface CustomTextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeightPx?: number;
  letterSpacing?: number;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
}

export interface SelectionData {
  hasSelection: boolean;
  count: number;
  components: ComponentData[];
  message?: string;
  metadata?: {
    fileKey: string;
    fileName: string;
    currentPage: {
      id: string;
      name: string;
    };
    user: {
      id: string;
      name: string;
    } | null;
    viewport: {
      center: Vector;
      zoom: number;
    };
    version: string;
    selectedAt: string;
  };
}

export interface BridgePayload {
  components: ComponentData[];
  metadata: SelectionData["metadata"];
  sessionId: string;
  timestamp: string;
  pluginVersion?: string;
}

export interface BridgeResponse {
  success: boolean;
  sessionId?: string;
  componentCount?: number;
  error?: string;
}

// Server response format (for reference)
export interface ServerResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface TestConnectionData {
  serverUrl: string;
  apiKey: string;
}
