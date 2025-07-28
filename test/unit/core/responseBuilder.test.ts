import ResponseBuilder from '../../../src/core/responseBuilder';
import Logger from '../../../src/core/logger';
import { ResponseHandlerConfig } from '../../../src/types';
import { createMockRequest, createMockResponse, testData, TestError } from '../../helpers/setup';

describe('ResponseBuilder Unit Tests', () => {
  let mockReq: any;
  let mockRes: any;
  let mockLogger: jest.Mocked<Logger>;
  let config: ResponseHandlerConfig;
  let builder: ResponseBuilder;

  beforeEach(() => {
    mockReq = createMockRequest({
      requestId: 'test-req-123',
      startTime: Date.now() - 100,
    });

    mockRes = createMockResponse();

    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      logRequest: jest.fn(),
      logResponse: jest.fn(),
      logEvent: jest.fn(),
      updateConfig: jest.fn(),
    } as any;

    config = {
      mode: 'development',
      logging: {
        enabled: true,
        includeStack: true,
        logErrors: true,
      },
      responses: {
        includeTimestamp: true,
        includeRequestId: true,
        includeExecutionTime: true,
      },
      security: {
        sanitizeErrors: false,
        hideInternalErrors: false,
      },
    };

    builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);
  });

  describe('Success Responses', () => {
    it('should create ok response (200)', () => {
      const result = builder.ok(testData.user, 'User retrieved');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData.user,
        message: 'User retrieved',
        meta: expect.objectContaining({
          requestId: 'test-req-123',
          timestamp: expect.any(String),
          executionTime: expect.any(Number),
        }),
      });
      expect(result).toBe(mockRes);
    });

    it('should create created response (201)', () => {
      builder.created(testData.user, 'User created');

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: testData.user,
          message: 'User created',
        }),
      );
    });

    it('should create accepted response (202)', () => {
      builder.accepted(testData.user, 'Request accepted');

      expect(mockRes.status).toHaveBeenCalledWith(202);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Request accepted',
        }),
      );
    });

    it('should create no content response (204)', () => {
      builder.noContent('Resource deleted');

      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Resource deleted',
        }),
      );
    });

    it('should use default messages when not provided', () => {
      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Success',
        }),
      );
    });
  });

  describe('Error Responses', () => {
    it('should create bad request response (400)', () => {
      const error = { field: 'email', message: 'Invalid email' };
      builder.badRequest(error, 'Validation failed');

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        error: expect.objectContaining({
          message: 'Invalid email', // Error object has message property
        }),
        meta: expect.any(Object),
      });
    });

    it('should create unauthorized response (401)', () => {
      const error = new TestError('Invalid token', 401);
      builder.unauthorized(error);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Unauthorized',
        }),
      );
    });

    it('should create forbidden response (403)', () => {
      builder.forbidden(null, 'Access denied');

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied',
        }),
      );
    });

    it('should create not found response (404)', () => {
      builder.notFound({ resource: 'user', id: 123 });

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Not found',
        }),
      );
    });

    it('should create internal server error response (500)', () => {
      const error = new TestError('Database connection failed', 500);
      builder.internalServerError(error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Internal server error occurred',
        error,
        expect.any(Object),
      );
    });
  });

  describe('Generic Responses', () => {
    it('should create custom status response', () => {
      builder.respond(418, { teapot: true }, "I'm a teapot");

      expect(mockRes.status).toHaveBeenCalledWith(418);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { teapot: true },
          message: "I'm a teapot",
        }),
      );
    });

    it('should handle error with auto status detection', () => {
      const error = new TestError('Custom error', 422);
      builder.error(error);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Custom error',
        }),
      );
    });

    it('should use default status (500) for errors without statusCode', () => {
      const error = new Error('Unknown error');
      builder.error(error);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Pagination', () => {
    it('should create paginated response', () => {
      builder.paginate(testData.users, testData.pagination, 'Users retrieved');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: testData.users,
        message: 'Users retrieved',
        meta: expect.objectContaining({
          pagination: testData.pagination,
          requestId: 'test-req-123',
        }),
      });
    });
  });

  describe('Meta Generation', () => {
    it('should include request ID when configured', () => {
      config.responses!.includeRequestId = true;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'test-req-123',
          }),
        }),
      );
    });

    it('should include timestamp when configured', () => {
      config.responses!.includeTimestamp = true;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            timestamp: expect.any(String),
          }),
        }),
      );
    });

    it('should include execution time when configured', () => {
      config.responses!.includeExecutionTime = true;
      mockReq.startTime = Date.now() - 100;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            executionTime: expect.any(Number),
          }),
        }),
      );
    });

    it('should include custom fields when configured', () => {
      config.responses!.customFields = { version: '1.0.0', service: 'api' };
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            version: '1.0.0',
            service: 'api',
          }),
        }),
      );
    });

    it('should include environment info in development mode', () => {
      config.mode = 'development';
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            environment: 'development',
            version: expect.any(String),
          }),
        }),
      );
    });

    it('should not include meta when no fields are configured', () => {
      config.responses = {
        includeTimestamp: false,
        includeRequestId: false,
        includeExecutionTime: false,
      };
      config.mode = 'production';
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.not.objectContaining({
          meta: expect.anything(),
        }),
      );
    });
  });

  describe('Error Sanitization', () => {
    beforeEach(() => {
      config.mode = 'production';
      config.security = {
        sanitizeErrors: true,
        hideInternalErrors: true,
        allowedErrorFields: ['message', 'type', 'code'],
      };
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);
    });

    it('should sanitize errors in production mode', () => {
      const error = new TestError('Database connection failed', 500);
      error.stack = 'Error: Database connection failed\n    at...';

      builder.internalServerError(error);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.stack).toBeUndefined();
      expect(response.message).toBe('An internal error occurred');
    });

    it('should hide internal error details in production', () => {
      const error = new Error('Internal system error');

      builder.error(error);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.message).toBe('An internal error occurred');
    });

    it('should preserve allowed error fields', () => {
      const error = new TestError('Validation error', 422);

      builder.unprocessableEntity(error);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('type');
      expect(response.error).toHaveProperty('code');
    });

    it('should show detailed errors in development mode', () => {
      config.mode = 'development';
      config.logging!.includeStack = true;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      const error = new TestError('Detailed error', 500);
      error.stack = 'Error: Detailed error\n    at...';

      builder.internalServerError(error);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.error.stack).toBeDefined();
      expect(response.message).toBe('Internal server error');
    });
  });

  describe('Logging Integration', () => {
    it('should log responses', () => {
      builder.ok(testData.user, 'Success');

      expect(mockLogger.logResponse).toHaveBeenCalledWith(
        mockReq,
        { statusCode: 200 },
        expect.any(Object),
        expect.any(Number),
      );
    });

    it('should log events', () => {
      builder.ok(testData.user, 'Success');

      expect(mockLogger.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          statusCode: 200,
          method: mockReq.method,
          path: mockReq.path,
          requestId: mockReq.requestId,
        }),
      );
    });

    it('should log internal server errors', () => {
      config.logging!.logErrors = true;
      const error = new TestError('Critical error', 500);

      builder.internalServerError(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Internal server error occurred',
        error,
        expect.objectContaining({
          method: mockReq.method,
          url: mockReq.url,
          requestId: mockReq.requestId,
        }),
      );
    });
  });

  describe('Headers', () => {
    it('should set request ID header when configured', () => {
      config.responses!.includeRequestId = true;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Request-ID', 'test-req-123');
    });

    it('should set security headers when configured', () => {
      config.security!.corsHeaders = true;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined data', () => {
      builder.ok(undefined, 'Success');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Success',
        }),
      );
    });

    it('should handle null error', () => {
      builder.badRequest(null, 'Bad request');

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Bad request',
        }),
      );
    });

    it('should handle missing request startTime', () => {
      delete mockReq.startTime;
      builder = new ResponseBuilder(config, mockLogger, mockReq, mockRes);

      builder.ok(testData.user);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.meta.executionTime).toBeUndefined();
    });
  });
});
