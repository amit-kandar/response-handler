# Usage Examples

Comprehensive examples showing how to use the Enhanced Response Handler in real-world scenarios.

## Table of Contents

- [Basic Express Setup](#basic-express-setup)
- [Advanced Configuration](#advanced-configuration)
- [Socket.IO Integration](#socketio-integration)
- [Error Handling Patterns](#error-handling-patterns)
- [Authentication & Authorization](#authentication--authorization)
- [File Operations](#file-operations)
- [Real-time Applications](#real-time-applications)
- [Production Deployment](#production-deployment)

## Basic Express Setup

### Minimal Setup

```javascript
const express = require('express');
const { quickSetup } = require('@amitkandar/response-handler');

const app = express();
app.use(express.json());

// One-line setup
const { middleware, errorHandler } = quickSetup();
app.use(middleware);

// Your routes
app.get('/health', (req, res) => {
  res.ok({ status: 'healthy' });
});

app.use(errorHandler);
app.listen(3000);
```

### Complete CRUD Example

```javascript
const express = require('express');
const { quickSetup } = require('@amitkandar/response-handler');

const app = express();
app.use(express.json());

const { middleware, errorHandler } = quickSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  logging: {
    enabled: true,
    logErrors: true,
    logRequests: true,
  },
  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
  },
});

app.use(middleware);

// In-memory store for demo
let users = [
  { id: 1, name: 'John Doe', email: 'john@example.com' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
];
let nextId = 3;

// GET /users - List all users
app.get('/users', async (req, res) => {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 10));

  res.ok(users, 'Users retrieved successfully');
});

// GET /users/:id - Get specific user
app.get('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.notFound({ userId }, 'User not found');
  }

  res.ok(user, 'User retrieved successfully');
});

// POST /users - Create new user
app.post('/users', async (req, res) => {
  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    return res.badRequest(
      {
        fields: ['name', 'email'],
        provided: req.body,
      },
      'Name and email are required',
    );
  }

  // Check for duplicate email
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.conflict({ email }, 'User with this email already exists');
  }

  // Create user
  const newUser = {
    id: nextId++,
    name,
    email,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  res.created(newUser, 'User created successfully');
});

// PUT /users/:id - Update user
app.put('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.notFound({ userId }, 'User not found');
  }

  const { name, email } = req.body;

  // Validation
  if (!name || !email) {
    return res.badRequest(
      {
        fields: ['name', 'email'],
      },
      'Name and email are required',
    );
  }

  // Update user
  users[userIndex] = {
    ...users[userIndex],
    name,
    email,
    updatedAt: new Date().toISOString(),
  };

  res.ok(users[userIndex], 'User updated successfully');
});

// DELETE /users/:id - Delete user
app.delete('/users/:id', async (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.notFound({ userId }, 'User not found');
  }

  users.splice(userIndex, 1);
  res.noContent('User deleted successfully');
});

app.use(errorHandler);
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Advanced Configuration

### Development vs Production Configuration

```javascript
const { quickSetup } = require('@amitkandar/response-handler');

const config = {
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  logging: {
    enabled: true,
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
    logErrors: true,
    logRequests: process.env.NODE_ENV !== 'production',
    logResponses: process.env.NODE_ENV !== 'production',
    includeStack: process.env.NODE_ENV !== 'production',
    customLogger: (level, message, meta) => {
      // Use your preferred logger (Winston, Bunyan, etc.)
      if (process.env.NODE_ENV === 'production') {
        // Production logging to external service
        console.log(JSON.stringify({ level, message, meta, timestamp: new Date().toISOString() }));
      } else {
        // Development logging
        console.log(
          `[${level.toUpperCase()}] ${message}`,
          meta ? JSON.stringify(meta, null, 2) : '',
        );
      }
    },
  },

  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: {
      version: process.env.npm_package_version || '1.0.0',
      service: 'user-api',
    },
  },

  security: {
    sanitizeErrors: true,
    hideInternalErrors: process.env.NODE_ENV === 'production',
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true,
  },

  performance: {
    enableCaching: process.env.NODE_ENV === 'production',
    cacheHeaders: true,
    etag: true,
    compression: false, // Handled by reverse proxy
  },
};

const { middleware, errorHandler, logger } = quickSetup(config);
```

### Custom Error Types

```javascript
// Define custom error classes
class ValidationError extends Error {
  constructor(details) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.type = 'ValidationError';
    this.statusCode = 422;
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.type = 'NotFoundError';
    this.statusCode = 404;
    this.details = { resource, id };
  }
}

// Use in your routes
app.post('/users', async (req, res) => {
  const errors = {};

  if (!req.body.email) errors.email = 'Required';
  if (!req.body.name) errors.name = 'Required';

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  // ... create user logic
});
```

## Socket.IO Integration

### Basic Socket.IO Setup

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { quickSocketSetup } = require('@amitkandar/response-handler');

const app = express();
const server = createServer(app);
const io = new Server(server);

const { enhance, wrapper, setupServer } = quickSocketSetup({
  mode: 'development',
  logging: { enabled: true },
});

// Setup server-level logging
setupServer(io);

io.on('connection', (socket) => {
  // Simple response pattern
  socket.on('get-user', (data) => {
    const response = enhance(socket, 'user-data');

    if (!data.userId) {
      return response.badRequest({ field: 'userId' }, 'User ID is required');
    }

    // Simulate async operation
    setTimeout(() => {
      const user = { id: data.userId, name: 'John Doe' };
      response.ok(user, 'User data retrieved');
    }, 100);
  });

  // Auto error handling pattern
  socket.on(
    'create-post',
    wrapper(async (socket, response, data) => {
      // Validation
      if (!data.title || !data.content) {
        return response.badRequest(
          { fields: ['title', 'content'] },
          'Title and content are required',
        );
      }

      // Simulate async operation that might throw
      const post = await createPost(data);
      response.created(post, 'Post created successfully');
    }),
  );
});

async function createPost(data) {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 50));

  return {
    id: Date.now(),
    title: data.title,
    content: data.content,
    createdAt: new Date().toISOString(),
  };
}

server.listen(3000);
```

### Advanced Socket.IO with Rooms

```javascript
const { quickSocketSetup } = require('@amitkandar/response-handler');

const { enhance, wrapper } = quickSocketSetup();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join room
  socket.on('join-room', (data) => {
    const response = enhance(socket, 'room-joined');

    if (!data.roomId) {
      return response.badRequest({ field: 'roomId' }, 'Room ID is required');
    }

    socket.join(data.roomId);

    // Notify user
    response.ok({ roomId: data.roomId }, 'Joined room successfully');

    // Notify others in room
    response.toRoom(data.roomId).ok(
      {
        userId: socket.id,
        action: 'joined',
        timestamp: new Date().toISOString(),
      },
      'User joined the room',
    );
  });

  // Room messaging
  socket.on('room-message', (data) => {
    const response = enhance(socket, 'message-received');

    if (!data.roomId || !data.message) {
      return response.badRequest(
        { fields: ['roomId', 'message'] },
        'Room ID and message are required',
      );
    }

    const message = {
      id: Date.now(),
      userId: socket.id,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    // Send to room
    response.toRoom(data.roomId).ok(message, 'New message');

    // Confirm to sender
    enhance(socket, 'message-sent').ok({ messageId: message.id }, 'Message sent successfully');
  });

  // Private messaging
  socket.on('private-message', (data) => {
    const response = enhance(socket, 'private-message-received');

    if (!data.targetSocketId || !data.message) {
      return response.badRequest(
        { fields: ['targetSocketId', 'message'] },
        'Target socket ID and message are required',
      );
    }

    const message = {
      from: socket.id,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    // Send to target
    response.toSocket(data.targetSocketId).ok(message, 'Private message');

    // Confirm to sender
    enhance(socket, 'message-sent').ok({ messageId: Date.now() }, 'Private message sent');
  });
});
```

## Error Handling Patterns

### Centralized Error Handling

```javascript
const { quickSetup } = require('@amitkandar/response-handler');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode = 500, type = 'AppError', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super('Validation failed', 422, 'ValidationError', details);
  }
}

// Setup with error mapping
const { middleware, errorHandler } = quickSetup({
  mode: 'development',
  logging: { logErrors: true },
});

app.use(middleware);

// Validation middleware
const validateUser = (req, res, next) => {
  const errors = {};

  if (!req.body.email) errors.email = 'Required';
  if (!req.body.name) errors.name = 'Required';
  if (req.body.email && !isValidEmail(req.body.email)) {
    errors.email = 'Invalid format';
  }

  if (Object.keys(errors).length > 0) {
    throw new ValidationError(errors);
  }

  next();
};

// Routes with error handling
app.post('/users', validateUser, async (req, res) => {
  try {
    const user = await userService.create(req.body);
    res.created(user, 'User created successfully');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      throw new AppError('User already exists', 409, 'DuplicateError', {
        email: req.body.email,
      });
    }
    throw error; // Re-throw unknown errors
  }
});

// Global error handler
app.use(errorHandler);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

### Async Error Handling

```javascript
// Async wrapper utility
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage with async routes
app.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.notFound({ id: req.params.id }, 'User not found');
    }

    res.ok(user, 'User retrieved successfully');
  }),
);

// Database connection errors
app.get(
  '/users',
  asyncHandler(async (req, res) => {
    try {
      const users = await User.findAll();
      res.ok(users, 'Users retrieved successfully');
    } catch (error) {
      if (error.name === 'SequelizeConnectionError') {
        throw new AppError('Database unavailable', 503, 'DatabaseError');
      }
      throw error;
    }
  }),
);
```

## Authentication & Authorization

### JWT Authentication Example

```javascript
const jwt = require('jsonwebtoken');
const { quickSetup } = require('@amitkandar/response-handler');

const { middleware, errorHandler } = quickSetup();
app.use(middleware);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.unauthorized(null, 'Access token required');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.forbidden({ reason: 'Invalid token' }, 'Token verification failed');
    }

    req.user = user;
    next();
  });
};

// Authorization middleware
const requireRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.forbidden(
      { requiredRole: role, userRole: req.user?.role },
      'Insufficient permissions',
    );
  }
  next();
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.badRequest({ fields: ['email', 'password'] }, 'Email and password are required');
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.unauthorized({ email }, 'Invalid email or password');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.ok(
      {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      'Login successful',
    );
  } catch (error) {
    throw error;
  }
});

// Protected routes
app.get('/profile', authenticateToken, (req, res) => {
  res.ok(req.user, 'Profile retrieved successfully');
});

app.delete('/users/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  const userId = req.params.id;
  await User.destroy({ where: { id: userId } });
  res.noContent('User deleted successfully');
});

app.use(errorHandler);
```

## File Operations

### File Upload with Multer

```javascript
const multer = require('multer');
const path = require('path');
const { quickSetup } = require('@amitkandar/response-handler');

const { middleware, errorHandler } = quickSetup();

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

app.use(middleware);

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.badRequest({ field: 'file' }, 'No file uploaded');
  }

  const fileInfo = {
    id: Date.now(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    path: req.file.path,
    uploadedAt: new Date().toISOString(),
  };

  res.created(fileInfo, 'File uploaded successfully');
});

// File download endpoint
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);

  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(filepath)) {
    return res.notFound({ filename }, 'File not found');
  }

  res.downloadFile(filepath, filename);
});

// File streaming endpoint
app.get('/stream/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);

  const fs = require('fs');
  if (!fs.existsSync(filepath)) {
    return res.notFound({ filename }, 'File not found');
  }

  const stream = fs.createReadStream(filepath);
  const ext = path.extname(filename).toLowerCase();

  let contentType = 'application/octet-stream';
  if (ext === '.pdf') contentType = 'application/pdf';
  if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg';
  if (ext === '.png') contentType = 'image/png';

  res.streamResponse(stream, contentType);
});

// Handle multer errors
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.badRequest({ maxSize: '5MB' }, 'File too large');
    }
    return res.badRequest({ error: error.message }, 'File upload error');
  }
  next(error);
});

app.use(errorHandler);
```

## Real-time Applications

### Chat Application

```javascript
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { quickSetup, quickSocketSetup } = require('@amitkandar/response-handler');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// Express setup
const { middleware, errorHandler } = quickSetup();
app.use(express.json());
app.use(middleware);

// Socket.IO setup
const { enhance, wrapper, setupServer } = quickSocketSetup();
setupServer(io);

// In-memory stores (use Redis in production)
const rooms = new Map();
const users = new Map();

// Express routes for room management
app.get('/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    name: room.name,
    userCount: room.users.length,
    createdAt: room.createdAt,
  }));

  res.ok(roomList, 'Rooms retrieved successfully');
});

app.post('/rooms', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.badRequest({ field: 'name' }, 'Room name is required');
  }

  const roomId = Date.now().toString();
  const room = {
    id: roomId,
    name,
    users: [],
    messages: [],
    createdAt: new Date().toISOString(),
  };

  rooms.set(roomId, room);
  res.created(room, 'Room created successfully');
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // User authentication
  socket.on(
    'authenticate',
    wrapper(async (socket, response, data) => {
      if (!data.username) {
        return response.badRequest({ field: 'username' }, 'Username is required');
      }

      const user = {
        id: socket.id,
        username: data.username,
        joinedAt: new Date().toISOString(),
      };

      users.set(socket.id, user);
      response.ok(user, 'Authentication successful');
    }),
  );

  // Join room
  socket.on('join-room', (data) => {
    const response = enhance(socket, 'room-joined');
    const user = users.get(socket.id);

    if (!user) {
      return response.unauthorized(null, 'Please authenticate first');
    }

    if (!data.roomId) {
      return response.badRequest({ field: 'roomId' }, 'Room ID is required');
    }

    const room = rooms.get(data.roomId);
    if (!room) {
      return response.notFound({ roomId: data.roomId }, 'Room not found');
    }

    // Join socket room
    socket.join(data.roomId);

    // Add user to room
    if (!room.users.find((u) => u.id === socket.id)) {
      room.users.push(user);
    }

    // Notify user
    response.ok(
      {
        room: { id: room.id, name: room.name },
        users: room.users,
      },
      'Joined room successfully',
    );

    // Notify others
    response.toRoom(data.roomId).ok(
      {
        user,
        action: 'joined',
        timestamp: new Date().toISOString(),
      },
      'User joined the room',
    );
  });

  // Send message
  socket.on('send-message', (data) => {
    const response = enhance(socket, 'message-received');
    const user = users.get(socket.id);

    if (!user) {
      return response.unauthorized(null, 'Please authenticate first');
    }

    if (!data.roomId || !data.message) {
      return response.badRequest(
        { fields: ['roomId', 'message'] },
        'Room ID and message are required',
      );
    }

    const room = rooms.get(data.roomId);
    if (!room) {
      return response.notFound({ roomId: data.roomId }, 'Room not found');
    }

    const message = {
      id: Date.now(),
      userId: socket.id,
      username: user.username,
      message: data.message,
      timestamp: new Date().toISOString(),
    };

    // Store message
    room.messages.push(message);

    // Send to room
    response.toRoom(data.roomId).ok(message, 'New message');

    // Confirm to sender
    enhance(socket, 'message-sent').ok({ messageId: message.id }, 'Message sent successfully');
  });

  // Leave room
  socket.on('leave-room', (data) => {
    const response = enhance(socket, 'room-left');
    const user = users.get(socket.id);

    if (!data.roomId) {
      return response.badRequest({ field: 'roomId' }, 'Room ID is required');
    }

    const room = rooms.get(data.roomId);
    if (room) {
      // Remove user from room
      room.users = room.users.filter((u) => u.id !== socket.id);

      // Leave socket room
      socket.leave(data.roomId);

      // Notify others
      response.toRoom(data.roomId).ok(
        {
          user,
          action: 'left',
          timestamp: new Date().toISOString(),
        },
        'User left the room',
      );
    }

    response.ok({ roomId: data.roomId }, 'Left room successfully');
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      // Remove user from all rooms
      rooms.forEach((room, roomId) => {
        const userIndex = room.users.findIndex((u) => u.id === socket.id);
        if (userIndex !== -1) {
          room.users.splice(userIndex, 1);

          // Notify room users
          socket.to(roomId).emit('user-disconnected', {
            user,
            timestamp: new Date().toISOString(),
          });
        }
      });

      users.delete(socket.id);
    }
  });
});

app.use(errorHandler);
server.listen(3000, () => {
  console.log('Chat server running on port 3000');
});
```

## Production Deployment

### Production Configuration

```javascript
const { quickSetup } = require('@amitkandar/response-handler');
const winston = require('winston');

// Production logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: 'user-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

// Production configuration
const config = {
  mode: 'production',

  logging: {
    enabled: true,
    level: 'error',
    logErrors: true,
    logRequests: false,
    logResponses: false,
    includeStack: false,
    customLogger: (level, message, meta) => {
      logger.log(level, message, meta);
    },
  },

  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: false,
    customFields: {
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV,
    },
  },

  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: true,
  },

  performance: {
    enableCaching: true,
    cacheHeaders: true,
    etag: true,
    compression: false, // Handled by nginx
  },
};

const { middleware, errorHandler } = quickSetup(config);

// Health check endpoint
app.get('/health', (req, res) => {
  res.ok({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    uptime: process.uptime(),
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
```

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

USER node

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./logs:/app/logs
    depends_on:
      - redis
      - postgres
    restart: unless-stopped

  redis:
    image: redis:alpine
    restart: unless-stopped

  postgres:
    image: postgres:13
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

This examples guide provides comprehensive real-world usage patterns for the Enhanced Response Handler, covering everything from basic setup to production deployment scenarios.
