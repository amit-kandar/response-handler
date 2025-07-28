# Basic Configuration

Configure Response Handler with these essential options.

## Quick Setup

```typescript
import { quickSetup } from '@amitkandar/response-handler';

const { middleware, errorHandler } = quickSetup({
  mode: 'development', // or 'production'
  logging: {
    enabled: true,
    logErrors: true,
    logRequests: true,
  },
});
```

## Configuration Options

### Mode

- `development` - Includes detailed error information
- `production` - Sanitizes errors for security

### Logging

- `enabled` - Enable/disable logging
- `logErrors` - Log error details
- `logRequests` - Log incoming requests
- `logResponses` - Log outgoing responses

### Security

- `sanitizeErrors` - Remove sensitive error details
- `hideInternalErrors` - Hide internal error details
- `allowedErrorFields` - Specify which error fields to include

### Responses

- `includeRequestId` - Add request ID to responses
- `includeTimestamp` - Add timestamp to responses
- `includeExecutionTime` - Track request execution time

## Environment Variables

```bash
NODE_ENV=production  # Sets mode automatically
LOG_LEVEL=error     # Override log level
```

For more advanced options, see [Advanced Configuration](/config/advanced).
