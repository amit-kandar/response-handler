# Express Examples

Practical examples for using Response Handler with Express.

## Basic REST API

```typescript
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();
app.use(express.json());

const { middleware, errorHandler } = quickSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  logging: { enabled: true }
});

app.use(middleware);

// Users API
app.get('/api/users', async (req, res) => {
  const users = await User.findAll();
  res.ok(users, 'Users retrieved successfully');
});

app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.notFound({ id: req.params.id }, 'User not found');
  }
  
  res.ok(user, 'User retrieved successfully');
});

app.post('/api/users', async (req, res) => {
  const { name, email } = req.body;
  
  // Validation
  if (!name || !email) {
    return res.badRequest(
      { missingFields: ['name', 'email'].filter(f => !req.body[f]) },
      'Missing required fields'
    );
  }
  
  try {
    const user = await User.create({ name, email });
    res.created(user, 'User created successfully');
  } catch (error) {
    if (error.code === 'DUPLICATE_EMAIL') {
      return res.conflict({ email }, 'Email already exists');
    }
    throw error; // Will be caught by error handler
  }
});

app.use(errorHandler);
app.listen(3000);
```

## Authentication & Authorization

```typescript
// Authentication middleware
app.use('/api/protected', (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.unauthorized(null, 'Authentication token required');
  }
  
  try {
    const user = jwt.verify(token, SECRET);
    req.user = user;
    next();
  } catch (error) {
    res.unauthorized({ reason: 'Invalid token' }, 'Invalid authentication token');
  }
});

// Authorization middleware
const requireRole = (role) => (req, res, next) => {
  if (req.user.role !== role) {
    return res.forbidden(
      { required: role, actual: req.user.role },
      `${role} access required`
    );
  }
  next();
};

app.get('/api/protected/admin', requireRole('admin'), (req, res) => {
  res.ok({ message: 'Admin area accessed' });
});
```

## Validation with Joi

```typescript
import Joi from 'joi';

const validateBody = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);
  
  if (error) {
    return res.badRequest(
      { 
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      },
      'Validation failed'
    );
  }
  
  req.body = value;
  next();
};

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(18).max(100)
});

app.post('/api/users', validateBody(userSchema), async (req, res) => {
  const user = await User.create(req.body);
  res.created(user, 'User created successfully');
});
```

## Pagination

```typescript
app.get('/api/posts', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const { posts, total } = await Post.findAndCountAll({
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });
  
  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page < Math.ceil(total / limit),
    hasPrev: page > 1
  };
  
  res.paginate(posts, pagination, 'Posts retrieved successfully');
});
```

## File Upload & Download

```typescript
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.badRequest({ field: 'file' }, 'File is required');
  }
  
  const fileInfo = {
    id: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedAt: new Date().toISOString()
  };
  
  res.created(fileInfo, 'File uploaded successfully');
});

app.get('/api/download/:id', (req, res) => {
  const filePath = path.join('uploads', req.params.id);
  
  if (!fs.existsSync(filePath)) {
    return res.notFound({ id: req.params.id }, 'File not found');
  }
  
  res.downloadFile(filePath, 'document.pdf');
});
```

## Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  handler: (req, res) => {
    res.tooManyRequests(
      { 
        limit: 100,
        windowMs: 15 * 60 * 1000,
        retryAfter: Math.round(req.rateLimit.resetTime / 1000)
      },
      'Too many requests, please try again later'
    );
  }
});

app.use('/api/', limiter);
```

## Error Handling

```typescript
// Custom error types
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

class NotFoundError extends Error {
  constructor(resource, id) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
    this.statusCode = 404;
  }
}

// Service layer
class UserService {
  static async findById(id) {
    const user = await User.findById(id);
    if (!user) {
      throw new NotFoundError('User', id);
    }
    return user;
  }
  
  static async create(userData) {
    if (!userData.email) {
      throw new ValidationError('Email is required', 'email');
    }
    
    return await User.create(userData);
  }
}

// Controller
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const user = await UserService.findById(req.params.id);
    res.ok(user, 'User retrieved successfully');
  } catch (error) {
    next(error); // Will be handled by error handler
  }
});
```

## Testing

```typescript
import request from 'supertest';
import { quickSetup } from '@amitkandar/response-handler';

describe('Users API', () => {
  let app;
  
  beforeEach(() => {
    app = express();
    const { middleware, errorHandler } = quickSetup({ mode: 'test' });
    app.use(middleware);
    // ... setup routes
    app.use(errorHandler);
  });
  
  it('should create user successfully', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John', email: 'john@example.com' })
      .expect(201);
      
    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        name: 'John',
        email: 'john@example.com'
      }),
      message: 'User created successfully'
    });
  });
  
  it('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John' }) // Missing email
      .expect(400);
      
    expect(response.body).toMatchObject({
      success: false,
      message: expect.stringContaining('Missing required fields'),
      error: expect.any(Object)
    });
  });
});
```
