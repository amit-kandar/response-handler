# Response Handler

Unified response and error handling for Express and Socket.IO.

This package provides one entry point for both modern middleware-driven usage and legacy adapter compatibility.

## Installation

```bash
npm install @amitkandar/response-handler
```

## Quick Start

### Express (recommended)

```ts
import express from 'express';
import { quickSetup } from '@amitkandar/response-handler';

const app = express();
app.use(express.json());

const { middleware, errorHandler } = quickSetup({
  mode: 'development',
  logging: { enabled: true, logErrors: true },
  security: {
    sanitizeErrors: true,
    rateLimiting: { windowMs: 60_000, maxRequests: 100 },
  },
  responses: {
    includeRequestId: true,
    includeTimestamp: true,
    includeExecutionTime: true,
  },
  performance: {
    enableCaching: true,
    cacheTTL: 120,
  },
});

app.use(middleware);

app.get('/users', async (_req, res) => {
  const users = await Promise.resolve([{ id: 1, name: 'Amit' }]);
  return res.ok(users, 'Users retrieved');
});

app.get('/users/:id', async (req, res) => {
  if (!req.params.id) return res.badRequest({ field: 'id' }, 'Missing user id');
  return res.notFound({ id: req.params.id }, 'User not found');
});

app.use(errorHandler);
app.listen(3000);
```

### Socket.IO

```ts
import { createSocketHandler } from '@amitkandar/response-handler';

const socketHandler = createSocketHandler({ mode: 'development' });

io.on('connection', (socket) => {
  socket.on('user:get', async (payload) => {
    const response = socketHandler.enhance(socket, 'user:result');

    if (!payload?.id) return response.badRequest({ field: 'id' }, 'Missing id');

    response.ok({ id: payload.id, name: 'Amit' }, 'User loaded');
  });
});
```

## Express API

### Success methods

- `res.ok(data?, message?)` -> `200`
- `res.created(data?, message?)` -> `201`
- `res.accepted(data?, message?)` -> `202`
- `res.noContent(message?)` -> `204` (empty body)

### Error methods

- `res.badRequest(error?, message?)` -> `400`
- `res.unauthorized(error?, message?)` -> `401`
- `res.forbidden(error?, message?)` -> `403`
- `res.notFound(error?, message?)` -> `404`
- `res.conflict(error?, message?)` -> `409`
- `res.unprocessableEntity(error?, message?)` -> `422`
- `res.tooManyRequests(error?, message?)` -> `429`
- `res.internalServerError(error?, message?)` -> `500`
- `res.error(error, statusCode?)` -> auto status from error or fallback `500`

### Generic methods

- `res.respond(statusCode, data?, message?)`
- `res.paginate(data, pagination, message?)`
- `res.downloadFile(path, filename?)`
- `res.streamResponse(stream, contentType?)`

## Socket API

Create a response object with:

- `createSocketHandler(config).enhance(socket, event)`

Methods:

- `ok`, `created`
- `error`, `badRequest`, `unauthorized`, `forbidden`, `notFound`
- `emit(event, data?, statusCode?)`
- `toRoom(room)`
- `toSocket(socketId)`

## Configuration

```ts
const config = {
  mode: 'production', // or development

  logging: {
    enabled: true,
    level: 'info', // error | warn | info | debug
    logErrors: true,
    logRequests: false,
    logResponses: false,
    includeStack: false,
    includeRequest: false,
  },

  responses: {
    includeTimestamp: true,
    includeRequestId: true,
    includeExecutionTime: true,
    customFields: { service: 'api' },
    compression: false,
    compressionThreshold: 1024,
  },

  security: {
    sanitizeErrors: true,
    hideInternalErrors: true,
    allowedErrorFields: ['message', 'type', 'code'],
    corsHeaders: false,
    rateLimiting: {
      windowMs: 60_000,
      maxRequests: 100,
      statusCode: 429,
      message: 'Too many requests',
    },
  },

  performance: {
    enableCaching: false,
    cacheHeaders: false,
    cacheControl: '',
    cacheTTL: 0,
    etag: true,
    compression: false,
    compressionThreshold: 1024,
  },
};
```

## Legacy Adapter Compatibility

Legacy helpers are still exported from the same package entry:

- REST: `sendSuccess`, `sendError`, `errorHandler`
- Socket: `emitSuccess`, `emitError`, `socketWrapper`

They are maintained as thin compatibility adapters over the unified response contract.

## Formatter Customization

You can override the response payload template with:

- `setResponseFormatter(fn)`

Backward-compatible aliases are also exported:

- `configureResponseFormat`
- `formatApiResponse`
- `getFormattedResponse`

## Exports Overview

Main exports from `@amitkandar/response-handler`:

- `quickSetup`, `quickSocketSetup`
- `ResponseHandler`, `createResponseHandler`, `defaultResponseHandler`, `responseHandler`
- `SocketResponseHandler`, `createSocketHandler`
- `ResponseBuilder`, `Logger`
- Error classes: `AppError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`
- Legacy adapters and formatter helpers

## Behavior Notes

- Request IDs are generated with `crypto.randomUUID()` when missing.
- `security.sanitizeErrors` controls whether errors are filtered to allowed fields or preserved in full.
- Production mode can hide internal error details.
- `204 No Content` responses send an empty body.
- `respond(statusCode, ...)` treats `>= 400` as error response semantics.
- Compression uses async gzip when enabled and client accepts `gzip`.
- Rate limiting returns `X-RateLimit-*` headers on allowed/blocked requests and `Retry-After` on `429`.

## Development

```bash
npm run lint
npm run build
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
```

## Documentation

- Docs source: `docs/`
- VitePress config: `.vitepress/config.js`
- Main sections:
  - `docs/guide/`
  - `docs/api/`
  - `docs/examples/`
  - `docs/deployment/`

## License

ISC © Amit Kandar
