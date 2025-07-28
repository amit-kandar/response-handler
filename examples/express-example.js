const express = require('express');
const { quickSetup } = require('../dist/newIndex');

const app = express();
app.use(express.json());

// Setup the enhanced response handler
const { middleware, errorHandler, logger } = quickSetup({
  mode: 'development', // or 'production'
  logging: {
    enabled: true,
    level: 'info',
    logErrors: true,
    logRequests: true,
    logResponses: true,
  },
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
  },
  security: {
    sanitizeErrors: true,
    hideInternalErrors: false, // true in production
  },
});

// Use the middleware
app.use(middleware);

// Routes using the new modern API
app.get('/users', async (req, res) => {
  try {
    // Simulate fetching users
    const users = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    // Just use res.ok() - that's it!
    return res.ok(users, 'Users retrieved successfully');
  } catch (error) {
    // The error handler will catch this automatically
    throw error;
  }
});

app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.badRequest(
        {
          fields: ['name', 'email'],
        },
        'Name and email are required',
      );
    }

    // Simulate creating user
    const newUser = { id: 3, name, email };

    return res.created(newUser, 'User created successfully');
  } catch (error) {
    throw error;
  }
});

app.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Simulate user lookup
    if (id === '999') {
      return res.notFound(null, 'User not found');
    }

    const user = { id: parseInt(id), name: 'John Doe', email: 'john@example.com' };
    return res.ok(user);
  } catch (error) {
    throw error;
  }
});

app.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Simulate deletion
    return res.noContent('User deleted successfully');
  } catch (error) {
    throw error;
  }
});

// Pagination example
app.get('/posts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // Simulate data
    const posts = Array.from({ length: limit }, (_, i) => ({
      id: (page - 1) * limit + i + 1,
      title: `Post ${(page - 1) * limit + i + 1}`,
      content: 'Lorem ipsum...',
    }));

    const pagination = {
      page,
      limit,
      total: 100,
      totalPages: Math.ceil(100 / limit),
      hasNext: page < Math.ceil(100 / limit),
      hasPrev: page > 1,
    };

    return res.paginate(posts, pagination, 'Posts retrieved successfully');
  } catch (error) {
    throw error;
  }
});

// Error demonstration
app.get('/error', (req, res) => {
  // This will be caught by the error handler
  throw new Error('Something went wrong!');
});

// Validation error example
app.post('/validate', (req, res) => {
  const errors = {
    email: 'Invalid email format',
    password: 'Password must be at least 8 characters',
  };

  return res.unprocessableEntity(errors, 'Validation failed');
});

// Custom status code
app.get('/custom', (req, res) => {
  return res.respond(418, { teapot: true }, "I'm a teapot");
});

// Use the error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`
🚀 Server is running on http://localhost:${PORT}

Try these endpoints:
GET    /users           - Get all users
POST   /users           - Create a user (send JSON with name and email)
GET    /users/:id       - Get user by ID (try 999 for not found)
DELETE /users/:id       - Delete user
GET    /posts?page=1&limit=5  - Paginated posts
GET    /error           - Trigger an error
POST   /validate        - Validation error example
GET    /custom          - Custom status code example
  `);
});

module.exports = app;
