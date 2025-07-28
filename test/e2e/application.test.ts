import express, { Request, Response, RequestHandler } from 'express';
import request from 'supertest';
import { quickSetup } from '../../src/newIndex';
import { EnhancedRequest, EnhancedResponse } from '../../src/types';

describe('E2E Application Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup a complete application with response handler
    app = express();
    app.use(express.json());

    const { middleware, errorHandler } = quickSetup({
      mode: 'development',
      logging: {
        enabled: false, // Reduce noise in tests
        logErrors: true,
      },
      responses: {
        includeRequestId: true,
        includeTimestamp: true,
        includeExecutionTime: true,
      },
      security: {
        sanitizeErrors: false,
        hideInternalErrors: false,
      },
    });

    app.use(middleware);

    // Real-world API routes
    app.get('/api/health', (req, res) => {
      (res as EnhancedResponse).ok(
        {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
        'Service is healthy',
      );
    });

    app.get('/api/users', (req, res) => {
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ];
      (res as EnhancedResponse).ok(users, 'Users retrieved successfully');
    });

    app.post('/api/users', ((req, res) => {
      const { name, email } = req.body;

      if (!name || !email) {
        return (res as EnhancedResponse).badRequest(
          { missingFields: ['name', 'email'].filter((field) => !req.body[field]) },
          'Missing required fields',
        );
      }

      const newUser = {
        id: Date.now(),
        name,
        email,
        createdAt: new Date().toISOString(),
      };

      (res as EnhancedResponse).created(newUser, 'User created successfully');
    }) as RequestHandler);

    app.get('/api/users/:id', ((req, res) => {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return (res as EnhancedResponse).badRequest(
          { field: 'id', value: req.params.id },
          'Invalid user ID',
        );
      }

      if (id === 404) {
        return (res as EnhancedResponse).notFound({ userId: id }, 'User not found');
      }

      const user = {
        id,
        name: 'Test User',
        email: 'test@example.com',
        lastLogin: new Date().toISOString(),
      };

      (res as EnhancedResponse).ok(user, 'User retrieved successfully');
    }) as RequestHandler);

    app.delete('/api/users/:id', (req, res) => {
      const id = parseInt(req.params.id);
      (res as EnhancedResponse).noContent('User deleted successfully');
    });

    // Error simulation routes
    app.get('/api/error/500', (req, res) => {
      throw new Error('Simulated server error');
    });

    app.get('/api/error/timeout', async (req, res) => {
      // Simulate long operation
      await new Promise((resolve) => setTimeout(resolve, 100));
      (res as EnhancedResponse).ok({ result: 'completed' }, 'Long operation completed');
    });

    // Performance test route
    app.get('/api/performance', (req, res) => {
      const startTime = Date.now();

      // Simulate some work
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += Math.random();
      }

      const executionTime = Date.now() - startTime;

      (res as EnhancedResponse).ok(
        {
          result: result.toFixed(2),
          computationTime: executionTime,
        },
        'Performance test completed',
      );
    });

    // Add error handler last
    app.use(errorHandler);
  });

  describe('API Health and Basic Functionality', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        }),
        message: 'Service is healthy',
        meta: expect.objectContaining({
          requestId: expect.any(String),
          timestamp: expect.any(String),
          executionTime: expect.any(Number),
        }),
      });
    });
  });

  describe('CRUD Operations', () => {
    it('should handle complete user CRUD workflow', async () => {
      // 1. List users
      const listResponse = await request(app).get('/api/users').expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(Array.isArray(listResponse.body.data)).toBe(true);

      // 2. Create user
      const createResponse = await request(app)
        .post('/api/users')
        .send({ name: 'Test User', email: 'test@example.com' })
        .expect(201);

      expect(createResponse.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(Number),
          name: 'Test User',
          email: 'test@example.com',
        }),
        message: 'User created successfully',
      });

      const userId = createResponse.body.data.id;

      // 3. Get user
      const getResponse = await request(app).get(`/api/users/${userId}`).expect(200);

      expect(getResponse.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: userId,
          name: 'Test User',
        }),
      });

      // 4. Delete user
      await request(app).delete(`/api/users/${userId}`).expect(204);
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ name: 'John' }) // Missing email
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Missing required fields',
        error: expect.objectContaining({
          type: 'Error',
        }),
      });
    });

    it('should handle not found errors', async () => {
      const response = await request(app).get('/api/users/404').expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'User not found',
        error: expect.objectContaining({
          type: 'Error',
        }),
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle server errors', async () => {
      const response = await request(app).get('/api/error/500').expect(500);

      expect(response.body).toMatchObject({
        success: false,
        message: expect.any(String),
        error: expect.objectContaining({
          type: expect.any(String),
        }),
      });
    });

    it('should handle invalid input', async () => {
      const response = await request(app).get('/api/users/invalid').expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid user ID',
        error: expect.objectContaining({
          type: 'Error',
        }),
      });
    });
  });

  describe('Performance and Load', () => {
    it('should handle performance-intensive operations', async () => {
      const response = await request(app).get('/api/performance').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          result: expect.any(String),
          computationTime: expect.any(Number),
        }),
        message: 'Performance test completed',
      });

      // Should complete in reasonable time
      expect(response.body.meta.executionTime).toBeLessThan(1000);
    });

    it('should handle multiple concurrent requests', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => request(app).get('/api/health').expect(200));

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach((response) => {
        expect(response.body.success).toBe(true);
        expect(response.body.meta).toHaveProperty('requestId');
      });

      // Request IDs should be unique
      const requestIds = responses.map((r) => r.body.meta.requestId);
      const uniqueIds = new Set(requestIds);
      expect(uniqueIds.size).toBe(10);
    });

    it('should handle timeout scenarios', async () => {
      const response = await request(app).get('/api/error/timeout').expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { result: 'completed' },
        message: 'Long operation completed',
      });
    });
  });

  describe('Response Metadata', () => {
    it('should include consistent metadata in all responses', async () => {
      const response = await request(app).get('/api/users').expect(200);

      expect(response.body.meta).toMatchObject({
        requestId: expect.any(String),
        timestamp: expect.any(String),
        executionTime: expect.any(Number),
      });

      // Request ID should be included in headers
      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('should track execution time accurately', async () => {
      const start = Date.now();

      const response = await request(app).get('/api/error/timeout').expect(200);

      const end = Date.now();
      const actualTime = end - start;

      expect(response.body.meta.executionTime).toBeGreaterThanOrEqual(0);
      expect(response.body.meta.executionTime).toBeLessThan(actualTime + 50); // Allow some margin
    });
  });
});
