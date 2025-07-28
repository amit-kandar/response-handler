---
layout: home

hero:
  name: "Response Handler"
  text: "Unified Response & Error Handler"
  tagline: "Modern, type-safe response handling for REST APIs and Socket.IO with comprehensive logging and error management"
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: View on GitHub
      link: https://github.com/amit-kandar/response-handler

features:
  - title: 🚀 Modern API Design
    details: Intuitive methods like res.ok(), res.created(), res.error() for Express and Socket.IO responses
  - title: 🛡️ Production Ready
    details: Environment-aware error sanitization, security headers, and comprehensive logging
  - title: 📝 TypeScript Support
    details: Full TypeScript support with enhanced request/response types
  - title: ⚡ Performance Optimized
    details: Built-in caching, ETags, execution time tracking, and request correlation
  - title: 🔧 Flexible Configuration
    details: Middleware-based setup with quickSetup() for instant configuration
  - title: 📊 Comprehensive Logging
    details: Request/response logging, error tracking, and performance monitoring
---

## Quick Example

### Express Setup

```typescript
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();
const { middleware, errorHandler } = quickSetup({
  mode: 'development',
  logging: { enabled: true }
});

app.use(middleware);

app.get('/users', (req, res) => {
  res.ok([{ id: 1, name: 'John' }], 'Users retrieved');
});

app.use(errorHandler);
```

### Socket.IO Setup

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(server);
const { enhance, wrapper } = quickSocketSetup({
  mode: 'development'
});

io.on('connection', (socket) => {
  socket.on('get-data', wrapper(async (socket, response, data) => {
    const result = await fetchData(data.id);
    response.ok(result, 'Data retrieved successfully');
  }));
});
```

## Features

- ✅ **Express & Socket.IO Support** - Unified API for both REST and real-time applications
- ✅ **TypeScript First** - Full type safety with enhanced request/response objects
- ✅ **Production Security** - Error sanitization, security headers, CORS support
- ✅ **Performance Monitoring** - Request tracking, execution timing, caching
- ✅ **Flexible Logging** - Configurable logging with multiple levels and formats
- ✅ **Error Handling** - Centralized error management with custom error types
- ✅ **Easy Setup** - One-line configuration with sensible defaults

## Installation

```bash
npm install @amitkandar/response-handler
```

## Why Response Handler?

Modern applications need consistent, secure, and performant response handling. Response Handler provides:

- **Consistency** - Same API patterns for REST and Socket.IO
- **Security** - Production-ready error sanitization and security headers  
- **Performance** - Built-in optimizations and monitoring
- **Developer Experience** - TypeScript support and intuitive APIs
- **Maintainability** - Centralized configuration and error handling

[Get Started](/guide/quick-start) today and streamline your API responses!
