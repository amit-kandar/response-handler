---
layout: home

hero:
  name: 'Response Handler'
  text: 'Consistent API Responses for Express and Socket.IO'
  tagline: 'Single entry point. Modern middleware. Legacy adapter compatibility.'
  actions:
    - theme: brand
      text: Get Started
      link: /guide/quick-start
    - theme: alt
      text: API Docs
      link: /api/
    - theme: alt
      text: View Examples
      link: /examples/

features:
  - title: One Package, Two Paths
    details: Use modern middleware (`quickSetup`) while keeping legacy adapters (`sendSuccess/sendError`, `emitSuccess/emitError`).
  - title: Express + Socket.IO
    details: Apply the same response contract across HTTP and real-time events.
  - title: Production-Safe Defaults
    details: Request IDs, error sanitization, structured metadata, and environment-aware behavior.
  - title: Built-in Controls
    details: Rate limiting, response compression, caching headers, and ETag support.
  - title: TypeScript-First
    details: Strong typings for config, response methods, socket helpers, and custom errors.
  - title: Easy Migration
    details: Move route-by-route from legacy functions to `res.ok(...)` and `res.error(...)`.
---

## Quick Example

```ts
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();
app.use(express.json());

const { middleware, errorHandler } = quickSetup({
  mode: 'development',
  responses: { includeRequestId: true, includeTimestamp: true },
  security: { rateLimiting: { windowMs: 60_000, maxRequests: 100 } },
});

app.use(middleware);

app.get('/users', async (_req, res) => {
  return res.ok([{ id: 1, name: 'Amit' }], 'Users loaded');
});

app.use(errorHandler);
```

## Choose Your Path

### Modern Middleware API

- Start at `/guide/quick-start`
- Express methods: `res.ok`, `res.created`, `res.badRequest`, `res.error`
- Socket methods: `response.ok`, `response.error`, `response.toRoom(...)`

### Legacy Adapter Compatibility

- REST adapters: `sendSuccess`, `sendError`, `errorHandler`
- Socket adapters: `emitSuccess`, `emitError`, `socketWrapper`
- Use `/guide/migration` for step-by-step upgrade

## Documentation Map

- Guide: `/guide/`
- API Reference: `/api/`
- Examples: `/examples/`
- Deployment (Vercel + GitHub Pages): `/deployment/`

## What You Can Configure

- Logging: levels, request/response logs, custom logger
- Responses: timestamps, request IDs, execution time, custom meta fields
- Security: sanitized errors, hidden internal details, rate limiting
- Performance: caching headers, compression, ETag
