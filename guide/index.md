# Guide

Welcome to the Response Handler guide. This section will help you get started with using the library effectively.

## Quick Links

- [Installation](./installation) - How to install and set up the library
- [Quick Start](./quick-start) - Get up and running quickly
- [Migration](./migration) - Migrating from other response libraries

## What is Response Handler?

Response Handler is a unified response and error handler for REST APIs and Socket.IO applications. It provides:

- **Consistent Response Format**: Standardized JSON responses across your application
- **Express Middleware**: Easy integration with Express.js applications
- **Socket.IO Support**: Enhanced Socket.IO responses with the same consistent format
- **Error Handling**: Comprehensive error handling with customizable error responses
- **Logging**: Built-in logging capabilities with customizable levels
- **TypeScript Support**: Full TypeScript support with type definitions

## Getting Started

1. **Install** the package using npm or yarn
2. **Configure** the middleware for Express or Socket.IO
3. **Use** the enhanced response methods in your routes and handlers

```javascript
// Express example
app.use(quickSetup());

app.get('/users', (req, res) => {
  res.ok({ users: [] }, 'Users fetched successfully');
});

// Socket.IO example
io.use(quickSocketSetup());

io.on('connection', (socket) => {
  socket.on('get-users', () => {
    socket.ok({ users: [] }, 'Users fetched successfully');
  });
});
```

## Next Steps

- Check out the [Quick Start](./quick-start) guide to begin using the library
- Explore the [API Reference](../api/) for detailed documentation
- See [Examples](../examples/) for real-world usage scenarios
