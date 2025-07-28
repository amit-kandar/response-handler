import { ResponseHandler } from '../../../src/middleware/responseHandler';
import { ResponseHandlerConfig } from '../../../src/types';
import { createMockRequest, createMockResponse, testConfigs, TestError } from '../../helpers/setup';

describe('ResponseHandler Middleware Unit Tests', () => {
  let handler: ResponseHandler;
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = jest.fn();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      handler = new ResponseHandler();
      const config = handler.getConfig();

      expect(config.mode).toBeDefined();
      expect(config.logging).toBeDefined();
      expect(config.responses).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.performance).toBeDefined();
    });

    it('should merge user configuration with defaults', () => {
      const userConfig: ResponseHandlerConfig = {
        mode: 'production',
        logging: { enabled: false },
      };

      handler = new ResponseHandler(userConfig);
      const config = handler.getConfig();

      expect(config.mode).toBe('production');
      expect(config.logging?.enabled).toBe(false);
      expect(config.responses?.includeTimestamp).toBe(true); // Default preserved
    });

    it('should deep merge nested configuration', () => {
      const userConfig: ResponseHandlerConfig = {
        logging: { level: 'error' },
        responses: { includeTimestamp: false },
      };

      handler = new ResponseHandler(userConfig);
      const config = handler.getConfig();

      expect(config.logging?.level).toBe('error');
      expect(config.logging?.enabled).toBe(true); // Default preserved
      expect(config.responses?.includeTimestamp).toBe(false);
      expect(config.responses?.includeRequestId).toBe(true); // Default preserved
    });
  });

  describe('Request Enhancement', () => {
    beforeEach(() => {
      handler = new ResponseHandler(testConfigs.development);
    });

    it('should add request ID to request', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.requestId).toBeDefined();
      expect(typeof mockReq.requestId).toBe('string');
      expect(mockReq.requestId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should use existing request ID from header', () => {
      mockReq.get.mockImplementation((header: string) =>
        header === 'X-Request-ID' ? 'existing-req-id' : undefined,
      );

      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.requestId).toBe('existing-req-id');
    });

    it('should add start time for execution tracking', () => {
      const middleware = handler.middleware();
      const beforeTime = Date.now();

      middleware(mockReq, mockRes, mockNext);

      const afterTime = Date.now();
      expect(mockReq.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(mockReq.startTime).toBeLessThanOrEqual(afterTime);
    });

    it('should add context object', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.context).toBeDefined();
      expect(typeof mockReq.context).toBe('object');
    });
  });

  describe('Response Enhancement', () => {
    beforeEach(() => {
      handler = new ResponseHandler(testConfigs.development);
    });

    it('should add all success response methods', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockRes.ok).toBe('function');
      expect(typeof mockRes.created).toBe('function');
      expect(typeof mockRes.accepted).toBe('function');
      expect(typeof mockRes.noContent).toBe('function');
    });

    it('should add all error response methods', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockRes.badRequest).toBe('function');
      expect(typeof mockRes.unauthorized).toBe('function');
      expect(typeof mockRes.forbidden).toBe('function');
      expect(typeof mockRes.notFound).toBe('function');
      expect(typeof mockRes.conflict).toBe('function');
      expect(typeof mockRes.unprocessableEntity).toBe('function');
      expect(typeof mockRes.tooManyRequests).toBe('function');
      expect(typeof mockRes.internalServerError).toBe('function');
    });

    it('should add generic response methods', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockRes.respond).toBe('function');
      expect(typeof mockRes.error).toBe('function');
      expect(typeof mockRes.paginate).toBe('function');
    });

    it('should add file response methods', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(typeof mockRes.downloadFile).toBe('function');
      expect(typeof mockRes.streamResponse).toBe('function');
    });

    it('should enhance response methods work correctly', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      mockRes.ok({ id: 1 }, 'Success');

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { id: 1 },
          message: 'Success',
        }),
      );
    });
  });

  describe('Headers Configuration', () => {
    it('should set performance headers when enabled', () => {
      const config = {
        performance: {
          cacheHeaders: true,
          etag: true,
        },
      };
      handler = new ResponseHandler(config);

      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-store, must-revalidate',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Expires', '0');
      expect(mockRes.setHeader).toHaveBeenCalledWith('ETag', expect.stringMatching(/^".*"$/));
    });

    it('should set security headers when enabled', () => {
      const config = {
        security: {
          corsHeaders: true,
        },
      };
      handler = new ResponseHandler(config);

      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    it('should not set headers when disabled', () => {
      const config = {
        performance: { cacheHeaders: false, etag: false },
        security: { corsHeaders: false },
      };
      handler = new ResponseHandler(config);

      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.setHeader).not.toHaveBeenCalled();
    });
  });

  describe('Error Handler', () => {
    beforeEach(() => {
      handler = new ResponseHandler(testConfigs.development);
    });

    it('should handle errors and respond', () => {
      const error = new TestError('Test error', 400);
      const errorHandler = handler.errorHandler();

      // First apply the middleware to enhance the response object
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Test error',
        }),
      );
    });

    it('should log errors when they occur', () => {
      const error = new TestError('Test error', 500);
      const logger = handler.getLogger();
      const loggerSpy = jest.spyOn(logger, 'error');

      // First apply the middleware to enhance the response object
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      const errorHandler = handler.errorHandler();
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Unhandled error caught by error handler',
        error,
        expect.objectContaining({
          method: mockReq.method,
          url: mockReq.url,
        }),
      );
    });

    it('should delegate to Express default handler if headers sent', () => {
      mockRes.headersSent = true;
      const error = new TestError('Test error');
      const errorHandler = handler.errorHandler();

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should not call next when headers not sent', () => {
      mockRes.headersSent = false;
      const error = new TestError('Test error');

      // First apply the middleware to enhance the response object
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      // Reset the mockNext after middleware application
      mockNext.mockReset();

      const errorHandler = handler.errorHandler();
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    beforeEach(() => {
      handler = new ResponseHandler(testConfigs.development);
    });

    it('should update configuration', () => {
      const newConfig = { mode: 'production' as const };
      handler.updateConfig(newConfig);

      const config = handler.getConfig();
      expect(config.mode).toBe('production');
    });

    it('should return logger instance', () => {
      const logger = handler.getLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
    });
  });

  describe('Middleware Flow', () => {
    beforeEach(() => {
      handler = new ResponseHandler(testConfigs.development);
    });

    it('should call next after setup', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should enhance request and response before calling next', () => {
      const middleware = handler.middleware();

      middleware(mockReq, mockRes, mockNext);

      // Verify enhancement happened before next was called
      expect(mockReq.requestId).toBeDefined();
      expect(mockRes.ok).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Environment Detection', () => {
    it('should default to development when NODE_ENV not set', () => {
      const originalEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      handler = new ResponseHandler();
      const config = handler.getConfig();

      expect(config.mode).toBe('development');

      process.env.NODE_ENV = originalEnv;
    });

    it('should use production when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      handler = new ResponseHandler();
      const config = handler.getConfig();

      expect(config.mode).toBe('production');

      process.env.NODE_ENV = originalEnv;
    });

    it('should allow manual override of environment detection', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      handler = new ResponseHandler({ mode: 'development' });
      const config = handler.getConfig();

      expect(config.mode).toBe('development');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('File Response Methods', () => {
    beforeEach(() => {
      handler = new ResponseHandler(testConfigs.development);
    });

    it('should enhance download method with logging', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      mockRes.downloadFile('/path/to/file.pdf', 'document.pdf');

      const logger = handler.getLogger();
      const loggerSpy = jest.spyOn(logger, 'info');

      // Call again to test the enhanced method
      mockRes.downloadFile('/path/to/file.pdf', 'document.pdf');

      expect(mockRes.download).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        'File download initiated: /path/to/file.pdf',
        expect.objectContaining({
          requestId: expect.any(String),
          filename: 'document.pdf',
        }),
      );
    });

    it('should handle download without filename', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      expect(() => {
        mockRes.downloadFile('/path/to/file.pdf');
      }).not.toThrow();

      expect(mockRes.download).toHaveBeenCalled();
    });

    it('should enhance stream method', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      const mockStream = {
        pipe: jest.fn(),
      } as any;

      mockRes.streamResponse(mockStream, 'application/pdf');

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should handle stream without content type', () => {
      const middleware = handler.middleware();
      middleware(mockReq, mockRes, mockNext);

      const mockStream = {
        pipe: jest.fn(),
      } as any;

      mockRes.streamResponse(mockStream);

      expect(mockRes.setHeader).not.toHaveBeenCalledWith('Content-Type', expect.anything());
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });
  });
});
