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

// Global test utilities
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
    return res;
  },

  createMockNext: () => jest.fn(),

  createMockFigmaComponent: (overrides = {}) => ({
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
  }),
};

// Clean up after tests
afterEach(() => {
  jest.clearAllMocks();
});
