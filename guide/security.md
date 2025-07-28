# Security Best Practices

Implement robust security measures when using Response Handler in production environments.

## Input Validation & Sanitization

### Request Validation

Always validate incoming requests:

```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(50).required(),
});

app.post('/api/users', async (req, res) => {
  try {
    const { error, value } = userSchema.validate(req.body);

    if (error) {
      return res.badRequest({ validationErrors: error.details }, 'Invalid input data');
    }

    const user = await createUser(value);
    res.created(user, 'User created successfully');
  } catch (error) {
    res.error(error, 'Failed to create user');
  }
});
```

### XSS Protection

Sanitize output to prevent XSS attacks:

```javascript
const xss = require('xss');

const config = {
  enableSecurity: true,
  xss: {
    enabled: true,
    options: {
      allowList: {
        a: ['href', 'title'],
        b: [],
        i: [],
      },
    },
  },
};

app.use(quickSetup(config));

app.post('/api/comments', (req, res) => {
  const sanitizedComment = xss(req.body.comment);

  const comment = {
    id: generateId(),
    content: sanitizedComment,
    author: req.user.id,
    createdAt: new Date(),
  };

  res.created(comment, 'Comment created');
});
```

## Authentication & Authorization

### JWT Token Validation

Implement secure JWT authentication:

```javascript
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.unauthorized({}, 'Access token required');
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.forbidden({}, 'Invalid or expired token');
    }

    req.user = user;
    next();
  });
};

app.get('/api/profile', authenticateToken, (req, res) => {
  res.ok(req.user, 'Profile retrieved');
});
```

### Role-Based Access Control

Implement RBAC for fine-grained permissions:

```javascript
const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.unauthorized({}, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return res.forbidden({}, 'Insufficient permissions');
    }

    next();
  };
};

app.delete('/api/users/:id', authenticateToken, authorize(['admin', 'moderator']), (req, res) => {
  // Delete user logic
  res.ok({}, 'User deleted successfully');
});
```

## Data Protection

### Password Security

Hash passwords securely:

```javascript
const bcrypt = require('bcrypt');

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.conflict({}, 'User already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await createUser({
      email,
      password: hashedPassword,
      name,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.created(userWithoutPassword, 'User registered successfully');
  } catch (error) {
    res.error(error, 'Registration failed');
  }
});
```

### Data Encryption

Encrypt sensitive data:

```javascript
const crypto = require('crypto');

const encrypt = (text) => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('response-handler', 'utf8'));

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

app.post('/api/sensitive-data', (req, res) => {
  const encryptedData = encrypt(req.body.sensitiveInfo);

  // Store encrypted data
  const record = {
    id: generateId(),
    data: encryptedData,
    createdAt: new Date(),
  };

  res.created({ id: record.id }, 'Data stored securely');
});
```

## Rate Limiting & DDoS Protection

### Request Rate Limiting

Implement rate limiting to prevent abuse:

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  handler: (req, res) => {
    res.tooManyRequests({}, 'Rate limit exceeded');
  },
});

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // limit each IP to 5 requests per windowMs
  handler: (req, res) => {
    res.tooManyRequests({}, 'Too many authentication attempts');
  },
});

app.use(globalLimiter);
app.use('/api/auth', authLimiter);
```

### Advanced Rate Limiting

Implement user-based rate limiting:

```javascript
const Redis = require('redis');
const client = Redis.createClient();

const userRateLimit = async (req, res, next) => {
  if (!req.user) return next();

  const key = `rate_limit:${req.user.id}`;
  const requests = await client.incr(key);

  if (requests === 1) {
    await client.expire(key, 3600); // 1 hour window
  }

  const limit = req.user.plan === 'premium' ? 1000 : 100;

  if (requests > limit) {
    return res.tooManyRequests({ limit, remaining: 0 }, 'API rate limit exceeded');
  }

  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', limit - requests);

  next();
};

app.use('/api', authenticateToken, userRateLimit);
```

## SQL Injection Prevention

### Parameterized Queries

Always use parameterized queries:

```javascript
// ❌ Vulnerable to SQL injection
app.get('/api/users', (req, res) => {
  const query = `SELECT * FROM users WHERE name = '${req.query.name}'`;
  // DON'T DO THIS!
});

// ✅ Safe parameterized query
app.get('/api/users', async (req, res) => {
  try {
    const query = 'SELECT * FROM users WHERE name = $1';
    const result = await pool.query(query, [req.query.name]);

    res.ok(result.rows, 'Users retrieved');
  } catch (error) {
    res.error(error, 'Failed to retrieve users');
  }
});
```

### ORM Usage

Use ORM for additional security:

```javascript
const { User } = require('./models');

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password', 'resetToken'] },
    });

    if (!user) {
      return res.notFound({}, 'User not found');
    }

    res.ok(user, 'User retrieved');
  } catch (error) {
    res.error(error, 'Failed to retrieve user');
  }
});
```

## Error Handling Security

### Information Disclosure Prevention

Sanitize error messages in production:

```javascript
const config = {
  enableSecurity: true,
  environment: process.env.NODE_ENV,
  errorSanitization: {
    enabled: true,
    hideStackTrace: process.env.NODE_ENV === 'production',
    sanitizeMessages: true,
  },
};

app.use(quickSetup(config));

// Custom error handler
app.use((error, req, res, next) => {
  // Log full error details for debugging
  console.error('Full error:', error);

  // Send sanitized error to client
  if (process.env.NODE_ENV === 'production') {
    res.error({}, 'An error occurred');
  } else {
    res.error(error, 'Development error details');
  }
});
```

## CORS Security

### Secure CORS Configuration

Configure CORS properly:

```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

## Session Security

### Secure Session Configuration

Configure sessions securely:

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict',
    },
  }),
);
```

## Security Headers

### Helmet Integration

Use Helmet for security headers:

```javascript
const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);
```

## Environment Security

### Environment Variables

Secure environment configuration:

```javascript
// .env.example
/*
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
ENCRYPTION_KEY=your-256-bit-encryption-key-in-hex
DATABASE_URL=postgresql://user:pass@localhost/db
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
*/

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'ENCRYPTION_KEY', 'DATABASE_URL'];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

## Monitoring & Alerting

### Security Event Logging

Log security-relevant events:

```javascript
const securityLogger = require('./securityLogger');

app.use((req, res, next) => {
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script>/i, // XSS attempts
    /union.*select/i, // SQL injection attempts
  ];

  const isSuspicious = suspiciousPatterns.some(
    (pattern) => pattern.test(req.url) || pattern.test(JSON.stringify(req.body)),
  );

  if (isSuspicious) {
    securityLogger.warn('Suspicious request detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      body: req.body,
    });
  }

  next();
});
```

## Security Checklist

✅ **Input Validation**

- Validate all incoming data
- Sanitize user inputs
- Use parameterized queries

✅ **Authentication**

- Implement strong password policies
- Use secure JWT tokens
- Enable multi-factor authentication

✅ **Authorization**

- Implement role-based access control
- Use principle of least privilege
- Validate permissions on every request

✅ **Data Protection**

- Encrypt sensitive data
- Hash passwords with bcrypt
- Use HTTPS everywhere

✅ **Rate Limiting**

- Implement global rate limiting
- Add stricter limits for auth endpoints
- Monitor for abuse patterns

✅ **Error Handling**

- Sanitize error messages
- Don't expose stack traces in production
- Log security events

✅ **Headers & CORS**

- Configure security headers
- Set proper CORS policies
- Use secure session cookies

✅ **Environment**

- Secure environment variables
- Regular security updates
- Monitor for vulnerabilities
