import express from 'express';
import request from 'supertest';
import { ResponseHandler } from '../../src/middleware/responseHandler';
import { EnhancedRequest, EnhancedResponse } from '../../src/types';
import { testConfigs, TestError, ValidationTestError, NotFoundTestError } from '../helpers/setup';

describe('Express Integration Tests', () => {
  let app: express.Application;
  let handler: ResponseHandler;

  const setupApp = (config: any = testConfigs.development) => {
    app = express();
    app.use(express.json());
    
    handler = new ResponseHandler(config);
    app.use(handler.middleware() as any);

    // Test routes
    app.get('/success', (req, res) => {
      (res as EnhancedResponse).ok({ message: 'Hello World' }, 'Success message');
    });

    app.post('/create', (req, res) => {
      (res as EnhancedResponse).created(req.body, 'Resource created');
    });

    app.get('/error/400', (req, res) => {
      (res as EnhancedResponse).badRequest({ field: 'email' }, 'Validation failed');
    });

    app.get('/error/401', (req, res) => {
      (res as EnhancedResponse).unauthorized(null, 'Token required');
    });

    app.get('/error/404', (req, res) => {
      (res as EnhancedResponse).notFound({ resource: 'user' }, 'User not found');
    });

    app.get('/error/500', (req, res) => {
      (res as EnhancedResponse).internalServerError(new Error('Database error'), 'Server error');
    });

    app.get('/custom/:code', (req, res) => {
      const code = parseInt(req.params.code);
      (res as EnhancedResponse).respond(code, { custom: true }, `Custom ${code} response`);
    });

    app.get('/pagination', (req, res) => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      };
      (res as EnhancedResponse).paginate(data, pagination, 'Paginated data');
    });

    app.get('/throw-error', (req, res) => {
      throw new TestError('Thrown error', 400);
    });

    app.get('/async-error', async (req, res) => {
      throw new ValidationTestError({ email: 'Invalid format' });
    });

    app.get('/request-info', (req, res) => {
      (res as EnhancedResponse).ok({
        requestId: (req as EnhancedRequest).requestId,
        hasStartTime: !!(req as EnhancedRequest).startTime,
        hasContext: !!(req as EnhancedRequest).context,
      });
    });

    // Error handler must be last
    app.use(handler.errorHandler() as any);
  };

  describe('Success Responses', () => {
    beforeEach(() => setupApp());

    it('should return 200 OK response', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { message: 'Hello World' },
        message: 'Success message',
        meta: {
          requestId: expect.any(String),
          timestamp: expect.any(String),
          executionTime: expect.any(Number),
          environment: 'development',
          version: expect.any(String),
        },
      });
    });

    it('should return 201 Created response', async () => {
      const postData = { name: 'John', email: 'john@example.com' };
      
      const response = await request(app)
        .post('/create')
        .send(postData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: postData,
        message: 'Resource created',
      });
    });

    it('should include request ID in headers', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.body.meta.requestId).toBe(response.headers['x-request-id']);
    });

    it('should use provided request ID from header', async () => {
      const customRequestId = 'custom-req-123';
      
      const response = await request(app)
        .get('/success')
        .set('X-Request-ID', customRequestId)
        .expect(200);

      expect(response.headers['x-request-id']).toBe(customRequestId);
      expect(response.body.meta.requestId).toBe(customRequestId);
    });
  });

  describe('Error Responses', () => {
    beforeEach(() => setupApp());

    it('should return 400 Bad Request', async () => {
      const response = await request(app)
        .get('/error/400')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        error: expect.any(Object),
      });
    });

    it('should return 401 Unauthorized', async () => {
      const response = await request(app)
        .get('/error/401')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Token required',
      });
    });

    it('should return 404 Not Found', async () => {
      const response = await request(app)
        .get('/error/404')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 500 Internal Server Error', async () => {
      const response = await request(app)
        .get('/error/500')
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Server error',
      });
    });
  });

  describe('Custom Responses', () => {
    beforeEach(() => setupApp());

    it('should handle custom status codes', async () => {
      const response = await request(app)
        .get('/custom/418')
        .expect(418);

      expect(response.body).toMatchObject({
        success: true,
        data: { custom: true },
        message: 'Custom 418 response',
      });
    });

    it('should handle pagination responses', async () => {
      const response = await request(app)
        .get('/pagination')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: [{ id: 1 }, { id: 2 }],
        message: 'Paginated data',
        meta: {
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        },
      });
    });
  });

  describe('Error Handling Middleware', () => {
    beforeEach(() => setupApp());

    it('should catch thrown errors', async () => {
      const response = await request(app)
        .get('/throw-error')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Thrown error',
      });
    });

    it('should catch async errors', async () => {
      const response = await request(app)
        .get('/async-error')
        .expect(422);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
      });
    });

    it('should handle 404 for undefined routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      // Express default 404 handling
      expect(response.text).toContain('Cannot GET /nonexistent');
    });
  });

  describe('Request Enhancement', () => {
    beforeEach(() => setupApp());

    it('should enhance request with additional properties', async () => {
      const response = await request(app)
        .get('/request-info')
        .expect(200);

      expect(response.body.data).toMatchObject({
        requestId: expect.any(String),
        hasStartTime: true,
        hasContext: true,
      });
    });
  });

  describe('Environment Configurations', () => {
    describe('Development Mode', () => {
      beforeEach(() => setupApp(testConfigs.development));

      it('should include detailed error information', async () => {
        const response = await request(app)
          .get('/error/500')
          .expect(500);

        expect(response.body.meta.environment).toBe('development');
        expect(response.body.error).toBeDefined();
      });
    });

    describe('Production Mode', () => {
      beforeEach(() => setupApp(testConfigs.production));

      it('should sanitize error information', async () => {
        const response = await request(app)
          .get('/error/500')
          .expect(500);

        expect(response.body.meta?.environment).toBeUndefined();
        expect(response.body.message).toBe('An internal error occurred');
      });

      it('should hide internal errors', async () => {
        const response = await request(app)
          .get('/throw-error')
          .expect(400);

        // In production, internal errors might be hidden or sanitized
        expect(response.body.success).toBe(false);
      });
    });

    describe('Minimal Configuration', () => {
      beforeEach(() => setupApp(testConfigs.minimal));

      it('should exclude optional metadata', async () => {
        const response = await request(app)
          .get('/success')
          .expect(200);

        expect(response.body.meta?.timestamp).toBeUndefined();
        expect(response.body.meta?.requestId).toBeUndefined();
      });
    });
  });

  describe('Performance Headers', () => {
    beforeEach(() => {
      setupApp({
        ...testConfigs.development,
        performance: {
          cacheHeaders: true,
          etag: true,
        },
      });
    });

    it('should set cache control headers', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      expect(response.headers['pragma']).toBe('no-cache');
      expect(response.headers['expires']).toBe('0');
    });

    it('should set ETag header', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.headers['etag']).toBeDefined();
      expect(response.headers['etag']).toMatch(/^".*"$/);
    });
  });

  describe('Security Headers', () => {
    beforeEach(() => {
      setupApp({
        ...testConfigs.development,
        security: {
          corsHeaders: true,
        },
      });
    });

    it('should set security headers', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Concurrent Requests', () => {
    beforeEach(() => setupApp());

    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .get('/success')
          .expect(200)
      );

      const responses = await Promise.all(promises);

      // Each response should have a unique request ID
      const requestIds = responses.map(r => r.body.meta.requestId);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(5);

      // All responses should have the same structure
      responses.forEach(response => {
        expect(response.body).toMatchObject({
          success: true,
          data: { message: 'Hello World' },
          message: 'Success message',
        });
      });
    });
  });

  describe('Request/Response Timing', () => {
    beforeEach(() => setupApp());

    it('should track execution time', async () => {
      const response = await request(app)
        .get('/success')
        .expect(200);

      expect(response.body.meta.executionTime).toBeGreaterThanOrEqual(0);
      expect(response.body.meta.executionTime).toBeLessThan(1000); // Should be fast
    });
  });
});
