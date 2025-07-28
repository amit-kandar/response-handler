// Test setup and global configurations
import { Request, Response } from 'express';
import { Socket } from 'socket.io';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Enhanced Express mocks with proper typing
export const createMockRequest = (options: any = {}): Partial<Request> => ({
  method: 'GET',
  url: '/',
  path: '/',
  headers: {},
  query: {},
  params: {},
  body: {},
  get: jest.fn((header: string) => {
    const headers: Record<string, string> = {
      'user-agent': 'test-agent',
      'content-type': 'application/json',
      ...options.headers
    };
    return headers[header.toLowerCase()];
  }),
  ip: '127.0.0.1',
  ...options,
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    statusCode: 200,
    headersSent: false,
  };

  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.getHeader = jest.fn();
  res.download = jest.fn();

  return res;
};

// Enhanced Socket.IO mocks
export const createMockSocket = (options: any = {}): Partial<Socket> => ({
  id: options.id || 'test-socket-id',
  emit: jest.fn(),
  to: jest.fn().mockReturnValue({
    emit: jest.fn(),
  }),
  join: jest.fn(),
  leave: jest.fn(),
  disconnect: jest.fn(),
  ...options,
});

// Sample test data
export const testData = {
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
  },
  users: [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ],
  error: {
    message: 'Test error message',
    type: 'TestError',
    code: 'TEST_001',
    details: { field: 'username', value: 'invalid' },
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 50,
    totalPages: 5,
    hasNext: true,
    hasPrev: false,
  },
};

// Mock error classes for testing
export class TestError extends Error {
  type: string;
  code: string;
  statusCode: number;
  details: any;

  constructor(message = 'Test error', statusCode = 400, options: any = {}) {
    super(message);
    this.name = 'TestError';
    this.type = options.type || 'TestError';
    this.code = options.code || 'TEST_ERROR';
    this.statusCode = statusCode;
    this.details = options.details || {};
  }
}

export class ValidationTestError extends TestError {
  constructor(details = {}) {
    super('Validation failed', 422, {
      type: 'ValidationError',
      code: 'VALIDATION_FAILED',
      details,
    });
  }
}

export class NotFoundTestError extends TestError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, {
      type: 'NotFoundError',
      code: 'NOT_FOUND',
      details: { resource },
    });
  }
}

// Test configuration helpers
export const testConfigs = {
  development: {
    mode: 'development' as const,
    logging: {
      enabled: true,
      level: 'debug' as const,
      logErrors: true,
      includeStack: true,
    },
    responses: {
      includeExecutionTime: true,
      includeTimestamp: true,
      includeRequestId: true,
    },
    security: {
      sanitizeErrors: false,
      hideInternalErrors: false,
    },
  },
  production: {
    mode: 'production' as const,
    logging: {
      enabled: true,
      level: 'error' as const,
      logErrors: true,
      includeStack: false,
    },
    security: {
      sanitizeErrors: true,
      hideInternalErrors: true,
    },
  },
  minimal: {
    mode: 'development' as const,
    logging: { enabled: false },
    responses: { includeTimestamp: false, includeRequestId: false },
  },
};

// Async test helpers
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const expectToResolve = async (promise: Promise<any>): Promise<any> => {
  try {
    return await promise;
  } catch (error) {
    throw new Error(`Expected promise to resolve, but it rejected with: ${error}`);
  }
};

export const expectToReject = async (promise: Promise<any>): Promise<any> => {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error) {
    return error;
  }
};

// Assertion helpers
export const expectResponseFormat = (response: any) => {
  expect(response).toHaveProperty('success');
  expect(typeof response.success).toBe('boolean');
  if (response.success) {
    expect(response).toHaveProperty('data');
    expect(response).toHaveProperty('message');
  } else {
    expect(response).toHaveProperty('error');
    expect(response).toHaveProperty('message');
  }
};

export const expectSuccessResponse = (response: any, expectedData?: any) => {
  expectResponseFormat(response);
  expect(response.success).toBe(true);
  if (expectedData !== undefined) {
    expect(response.data).toEqual(expectedData);
  }
};

export const expectErrorResponse = (response: any, expectedError?: any) => {
  expectResponseFormat(response);
  expect(response.success).toBe(false);
  expect(response.error).toBeDefined();
  if (expectedError) {
    expect(response.error).toMatchObject(expectedError);
  }
};

// Environment variable helpers for testing
export const withEnv = (envVars: Record<string, string>, fn: () => void | Promise<void>) => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    process.env = { ...originalEnv, ...envVars };
  });
  
  afterEach(() => {
    process.env = originalEnv;
  });
  
  return fn;
};
