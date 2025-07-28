# Testing Strategies

Comprehensive testing approaches for applications using Response Handler.

## Unit Testing

### Testing Express Routes

Test individual route handlers:

```javascript
const request = require('supertest');
const express = require('express');
const { quickSetup } = require('response-handler');

describe('User API', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(quickSetup({
      enableLogging: false,
      environment: 'test'
    }));
    
    // Mock route
    app.get('/api/users/:id', async (req, res) => {
      const user = await getUserById(req.params.id);
      if (user) {
        res.ok(user, 'User found');
      } else {
        res.notFound({}, 'User not found');
      }
    });
  });
  
  it('should return user when found', async () => {
    const mockUser = { id: 1, name: 'John Doe' };
    jest.spyOn(global, 'getUserById').mockResolvedValue(mockUser);
    
    const response = await request(app)
      .get('/api/users/1')
      .expect(200);
      
    expect(response.body).toEqual({
      success: true,
      message: 'User found',
      data: mockUser,
      timestamp: expect.any(String),
      executionTime: expect.any(String)
    });
  });
  
  it('should return 404 when user not found', async () => {
    jest.spyOn(global, 'getUserById').mockResolvedValue(null);
    
    const response = await request(app)
      .get('/api/users/999')
      .expect(404);
      
    expect(response.body).toEqual({
      success: false,
      message: 'User not found',
      error: {},
      timestamp: expect.any(String),
      executionTime: expect.any(String)
    });
  });
});
```

### Testing Response Methods

Test response handler methods in isolation:

```javascript
const { ResponseBuilder } = require('response-handler');

describe('ResponseBuilder', () => {
  let mockRes;
  let responseBuilder;
  
  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn()
    };
    
    responseBuilder = new ResponseBuilder({
      enableLogging: false,
      environment: 'test'
    });
  });
  
  it('should create success response', () => {
    const data = { id: 1, name: 'Test' };
    const message = 'Success';
    
    responseBuilder.success(mockRes, data, message);
    
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: true,
      message,
      data,
      timestamp: expect.any(String),
      executionTime: expect.any(String)
    });
  });
  
  it('should create error response', () => {
    const error = new Error('Test error');
    const message = 'Something went wrong';
    
    responseBuilder.error(mockRes, error, message);
    
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      message,
      error: expect.any(Object),
      timestamp: expect.any(String),
      executionTime: expect.any(String)
    });
  });
});
```

## Integration Testing

### Testing with Real Database

Test complete request-response cycle:

```javascript
const request = require('supertest');
const app = require('../app');
const { setupTestDB, teardownTestDB } = require('./helpers/database');

describe('User API Integration', () => {
  beforeAll(async () => {
    await setupTestDB();
  });
  
  afterAll(async () => {
    await teardownTestDB();
  });
  
  beforeEach(async () => {
    await clearDatabase();
  });
  
  it('should create and retrieve user', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123'
    };
    
    // Create user
    const createResponse = await request(app)
      .post('/api/users')
      .send(userData)
      .expect(201);
      
    expect(createResponse.body.success).toBe(true);
    const userId = createResponse.body.data.id;
    
    // Retrieve user
    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);
      
    expect(getResponse.body.data).toMatchObject({
      id: userId,
      name: userData.name,
      email: userData.email
    });
    expect(getResponse.body.data.password).toBeUndefined();
  });
  
  it('should handle validation errors', async () => {
    const invalidData = {
      name: '',
      email: 'invalid-email'
    };
    
    const response = await request(app)
      .post('/api/users')
      .send(invalidData)
      .expect(400);
      
    expect(response.body.success).toBe(false);
    expect(response.body.error.validationErrors).toBeDefined();
  });
});
```

### Testing Authentication Flow

Test complete authentication scenarios:

```javascript
describe('Authentication Integration', () => {
  it('should complete login flow', async () => {
    // Register user
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };
    
    await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201);
    
    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      })
      .expect(200);
      
    const token = loginResponse.body.data.token;
    expect(token).toBeDefined();
    
    // Access protected route
    const profileResponse = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
      
    expect(profileResponse.body.data.email).toBe(userData.email);
  });
  
  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
      .expect(401);
      
    expect(response.body.success).toBe(false);
  });
});
```

## Socket.IO Testing

### Testing Socket Events

Test Socket.IO event handlers:

```javascript
const Client = require('socket.io-client');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { quickSocketSetup } = require('response-handler');

describe('Socket.IO Events', () => {
  let httpServer;
  let io;
  let clientSocket;
  
  beforeAll((done) => {
    httpServer = createServer();
    io = new Server(httpServer);
    
    io.use(quickSocketSetup({
      enableLogging: false,
      environment: 'test'
    }));
    
    io.on('connection', (socket) => {
      socket.on('get-user', async (userId) => {
        try {
          const user = await getUserById(userId);
          if (user) {
            socket.ok(user, 'User found');
          } else {
            socket.notFound({}, 'User not found');
          }
        } catch (error) {
          socket.error(error, 'Failed to get user');
        }
      });
    });
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      clientSocket = Client(`http://localhost:${port}`);
      clientSocket.on('connect', done);
    });
  });
  
  afterAll(() => {
    io.close();
    clientSocket.close();
    httpServer.close();
  });
  
  it('should return user data', (done) => {
    const mockUser = { id: 1, name: 'John Doe' };
    jest.spyOn(global, 'getUserById').mockResolvedValue(mockUser);
    
    clientSocket.on('response', (response) => {
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUser);
      done();
    });
    
    clientSocket.emit('get-user', 1);
  });
  
  it('should handle user not found', (done) => {
    jest.spyOn(global, 'getUserById').mockResolvedValue(null);
    
    clientSocket.on('response', (response) => {
      expect(response.success).toBe(false);
      expect(response.message).toBe('User not found');
      done();
    });
    
    clientSocket.emit('get-user', 999);
  });
});
```

## Load Testing

### Using Artillery

Load test your API endpoints:

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Normal load"
    - duration: 60
      arrivalRate: 100
      name: "High load"
  processor: "./test-functions.js"

scenarios:
  - name: "User API Load Test"
    weight: 70
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            json: "$.data.token"
            as: "token"
      - get:
          url: "/api/users"
          headers:
            Authorization: "Bearer {{ token }}"
      - get:
          url: "/api/users/{{ $randomInt(1, 100) }}"
          headers:
            Authorization: "Bearer {{ token }}"
```

### Load Test Functions

```javascript
// test-functions.js
module.exports = {
  generateRandomUser: function(context, events, done) {
    context.vars.randomUser = {
      name: `User ${Math.random().toString(36).substring(7)}`,
      email: `user${Math.random().toString(36).substring(7)}@example.com`,
      password: 'password123'
    };
    return done();
  },
  
  logResponse: function(context, events, done) {
    console.log('Response time:', context.stats.latency);
    return done();
  }
};
```

## End-to-End Testing

### Using Playwright

Test complete user workflows:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('User Management E2E', () => {
  test('should complete user registration and login flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:3000/register');
    
    // Fill registration form
    await page.fill('[data-testid="name"]', 'John Doe');
    await page.fill('[data-testid="email"]', 'john@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    
    // Submit form
    await page.click('[data-testid="register-button"]');
    
    // Check success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toContainText('Registration successful');
    
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('[data-testid="email"]', 'john@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Check redirect to dashboard
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('[data-testid="welcome-message"]'))
      .toContainText('Welcome, John Doe');
  });
});
```

## Testing Configuration

### Jest Configuration

Complete Jest setup for testing:

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testMatch: [
    '<rootDir>/test/**/*.test.js',
    '<rootDir>/src/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.test.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test/integration/setup.js']
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/test/e2e/setup.js'],
      testTimeout: 30000
    }
  ]
};
```

### Test Setup

Global test setup and utilities:

```javascript
// test/setup.js
const { setupTestEnvironment } = require('./helpers/environment');

// Global setup
beforeAll(async () => {
  await setupTestEnvironment();
});

// Mock external dependencies
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    quit: jest.fn()
  }))
}));

// Global test utilities
global.createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn()
  };
  
  // Add response handler methods
  res.ok = jest.fn();
  res.created = jest.fn();
  res.badRequest = jest.fn();
  res.unauthorized = jest.fn();
  res.forbidden = jest.fn();
  res.notFound = jest.fn();
  res.error = jest.fn();
  
  return res;
};
```

## Testing Best Practices

### 1. Test Structure

Follow AAA pattern (Arrange, Act, Assert):

```javascript
it('should create user successfully', async () => {
  // Arrange
  const userData = { name: 'John', email: 'john@example.com' };
  const mockUser = { id: 1, ...userData };
  jest.spyOn(userService, 'create').mockResolvedValue(mockUser);
  
  // Act
  const response = await request(app)
    .post('/api/users')
    .send(userData);
  
  // Assert
  expect(response.status).toBe(201);
  expect(response.body.data).toEqual(mockUser);
  expect(userService.create).toHaveBeenCalledWith(userData);
});
```

### 2. Test Data Management

Use factories for consistent test data:

```javascript
// test/factories/userFactory.js
const userFactory = {
  build: (overrides = {}) => ({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
    ...overrides
  }),
  
  buildList: (count, overrides = {}) => {
    return Array.from({ length: count }, (_, i) => 
      userFactory.build({ 
        email: `user${i}@example.com`,
        ...overrides 
      })
    );
  }
};

module.exports = userFactory;
```

### 3. Error Testing

Test error scenarios thoroughly:

```javascript
describe('Error Handling', () => {
  it('should handle database connection errors', async () => {
    jest.spyOn(database, 'query').mockRejectedValue(
      new Error('Connection timeout')
    );
    
    const response = await request(app)
      .get('/api/users')
      .expect(500);
      
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('error');
  });
  
  it('should handle validation errors', async () => {
    const invalidData = { email: 'invalid-email' };
    
    const response = await request(app)
      .post('/api/users')
      .send(invalidData)
      .expect(400);
      
    expect(response.body.error.validationErrors).toBeDefined();
  });
});
```

### 4. Performance Testing

Include performance assertions:

```javascript
it('should respond within acceptable time', async () => {
  const startTime = Date.now();
  
  await request(app)
    .get('/api/users')
    .expect(200);
    
  const responseTime = Date.now() - startTime;
  expect(responseTime).toBeLessThan(1000); // 1 second
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:6
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Run integration tests
      run: npm run test:integration
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost/test
        REDIS_URL: redis://localhost:6379
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

Testing ensures your Response Handler implementation is robust, reliable, and performs well under various conditions.
