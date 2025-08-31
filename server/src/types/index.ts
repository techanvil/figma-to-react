import type { Request, Response, NextFunction } from "express";
import type { WebSocket } from "ws";

// Express middleware types
export interface AuthenticatedRequest extends Request {
  apiKey?: string;
  user?: {
    id: string;
    name?: string;
  };
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  timestamp: string;
}

export interface SuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

// Middleware function types
export type AsyncMiddleware = (
  req: Request<any, any, any, any>,
  res: Response<any>,
  next: NextFunction
) => Promise<void>;

export type AuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: unknown;
  id?: string;
  timestamp: number;
}

export interface ExtendedWebSocket extends WebSocket {
  id?: string;
  sessionId?: string;
  isAlive?: boolean;
  apiKey?: string;
}

// Figma API types
export interface FigmaNode {
  id: string;
  name: string;
  customName?: string; // User-assigned name for easier reasoning
  type: string;
  children?: FigmaNode[];
  [key: string]: unknown;
}

export interface FigmaFile {
  document: FigmaNode;
  components: Record<string, unknown>;
  styles: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ComponentAnalysis {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  children?: ComponentAnalysis[];
  styles?: Record<string, unknown>;
}

export interface DesignToken {
  name: string;
  value: string | number;
  type: "color" | "typography" | "spacing" | "shadow" | "border";
  category?: string;
}

// Session and storage types
export interface SessionData {
  id: string;
  createdAt: string;
  lastActivity: string;
  status: "active" | "inactive";
}

export interface ComponentEntry {
  id: string;
  sessionId: string;
  components: FigmaNode[];
  metadata: ComponentMetadata;
  status: "received" | "processing" | "completed";
}

export interface ComponentMetadata {
  fileKey: string;
  fileName: string;
  version?: string;
  lastModified?: string;
  author?: {
    id: string;
    name: string;
    email?: string;
  };
  selectedNodes?: string[];
  currentPage?: {
    id: string;
    name: string;
  };
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  figmaVersion?: string;
  receivedAt?: string;
  source?: string;
}

export interface TransformOptions {
  framework: "react" | "vue" | "angular";
  typescript: boolean;
  styling: "css" | "scss" | "styled-components" | "tailwind" | "emotion";
  componentNaming: "pascal" | "camel" | "kebab";
  includeProps: boolean;
  includeTypes: boolean;
  generateStorybook: boolean;
  generateTests: boolean;
  extractTokens: boolean;
  optimizeImages: boolean;
  responsiveBreakpoints?: string[];
  customMappings?: Record<string, unknown>;
}

// Transformed React component structure
export interface TransformedComponent {
  id: string;
  name: string;
  type: string;
  code?: {
    component?: string;
    styles?: string;
    types?: string;
  };
  props?: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: unknown;
  }>;
  reactCode?: string;
  styles?: Record<string, unknown>;
  transformedAt: string;
  error?: string;
  originalComponent?: FigmaNode;
}

export interface TransformEntry {
  id: string;
  sessionId: string;
  originalComponents: FigmaNode[];
  transformedComponents: TransformedComponent[];
  options: TransformOptions;
  transformedAt: string;
}

// Configuration types
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  allowedOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

// Logger types
export interface LogMeta {
  service?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}
