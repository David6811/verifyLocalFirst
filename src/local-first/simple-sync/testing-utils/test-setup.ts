/**
 * Test setup for simple-sync tests
 * Configures global mocks and test environment
 */

// Mock Chrome APIs
const mockChromeStorage = {
  get: jest.fn().mockResolvedValue({}),
  set: jest.fn().mockResolvedValue(undefined),
  remove: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined)
};

global.chrome = {
  storage: {
    local: mockChromeStorage
  }
} as any;

// Mock console methods to reduce noise in tests (optional)
global.console = {
  ...console,
  log: process.env.NODE_ENV === 'test' ? jest.fn() : console.log,
  warn: process.env.NODE_ENV === 'test' ? jest.fn() : console.warn,
  error: process.env.NODE_ENV === 'test' ? jest.fn() : console.error
};

// Setup test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

export { mockChromeStorage };