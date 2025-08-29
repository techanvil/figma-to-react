import type { Request, Response, NextFunction } from "express";
import type { FigmaNode } from "@/types/index.js";

// Test setup file
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "error";

// Mock external dependencies if needed
jest.mock("ws", () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: new Set(),
    close: jest.fn(),
  })),
}));

// Mock types for test utilities
interface MockRequest extends Partial<Request> {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  ip?: string;
  method?: string;
  path?: string;
  originalUrl?: string;
  get?: jest.Mock;
}

interface MockResponse extends Partial<Response> {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  end: jest.Mock;
}

// Global test utilities
declare global {
  var testUtils: {
    createMockRequest: (overrides?: Partial<MockRequest>) => MockRequest;
    createMockResponse: () => MockResponse;
    createMockNext: () => jest.Mock;
    createMockFigmaComponent: (overrides?: Partial<FigmaNode>) => FigmaNode;
  };
}

global.testUtils = {
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: "127.0.0.1",
    method: "GET",
    path: "/",
    originalUrl: "/",
    get: jest.fn(),
    ...overrides,
  }),

  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };
    return res as MockResponse;
  },

  createMockNext: () => jest.fn(),

  createMockFigmaComponent: (overrides = {}) =>
    ({
      id: "test-component-id",
      name: "Test Component",
      type: "FRAME",
      visible: true,
      locked: false,
      absoluteBoundingBox: {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      fills: [],
      strokes: [],
      children: [],
      ...overrides,
    } as FigmaNode),
};

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});
