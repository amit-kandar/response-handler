# Installation

Install Response Handler in your Node.js project.

## Requirements

- Node.js 16+
- npm, yarn, or pnpm

## Install via NPM

```bash
npm install @amit-kandar/response-handler
```

## Install via Yarn

```bash
yarn add @amit-kandar/response-handler
```

## Install via PNPM

```bash
pnpm add @amit-kandar/response-handler
```

## Verify Installation

Create a simple test file to verify the installation:

```typescript
// test.js
import { quickSetup } from '@amit-kandar/response-handler';

console.log('Response Handler installed successfully!');
```

```bash
node test.js
```

## TypeScript Support

Response Handler includes full TypeScript definitions out of the box. No additional `@types` packages needed.

```typescript
// TypeScript works automatically
import { quickSetup, ResponseHandlerConfig } from '@amit-kandar/response-handler';

const config: ResponseHandlerConfig = {
  mode: 'development',
  logging: { enabled: true },
};
```

## Next Steps

- [Quick Start Guide](/guide/quick-start) - Get up and running in minutes
- [Configuration](/guide/basic) - Learn about configuration options
- [Examples](/examples/express) - See practical examples

## Troubleshooting

### CommonJS Issues

If you're using CommonJS, import like this:

```javascript
const { quickSetup } = require('@amit-kandar/response-handler');
```

### ESM Issues

Make sure your `package.json` has:

```json
{
  "type": "module"
}
```

Or use `.mjs` file extensions.
