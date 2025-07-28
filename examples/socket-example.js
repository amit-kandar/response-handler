const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { quickSocketSetup } = require('../dist/newIndex');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Setup enhanced socket response handler
const { enhance, wrapper, setupServer, logger } = quickSocketSetup({
  mode: 'development',
  logging: {
    enabled: true,
    level: 'info',
    logErrors: true,
  },
  responses: {
    includeTimestamp: true,
  },
  security: {
    sanitizeErrors: true,
  },
});

// Setup server-level socket logging
setupServer(io);

// Socket event handlers with the new modern API
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Simple handler using enhance method
  socket.on('get-user', (data) => {
    const response = enhance(socket, 'user-data');

    try {
      if (!data.userId) {
        return response.badRequest({ field: 'userId' }, 'User ID is required');
      }

      // Simulate user fetch
      const user = {
        id: data.userId,
        name: 'John Doe',
        email: 'john@example.com',
        lastSeen: new Date().toISOString(),
      };

      response.ok(user, 'User data retrieved');
    } catch (error) {
      response.error(error);
    }
  });

  // Using wrapper for automatic error handling
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

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 100));

      const post = {
        id: Date.now(),
        title: data.title,
        content: data.content,
        createdAt: new Date().toISOString(),
      };

      response.created(post, 'Post created successfully');
    }),
  );

  // Room-based messaging
  socket.on('join-room', (data) => {
    const response = enhance(socket, 'room-joined');

    if (!data.roomId) {
      return response.badRequest({ field: 'roomId' }, 'Room ID is required');
    }

    socket.join(data.roomId);

    // Notify the user
    response.ok({ roomId: data.roomId }, 'Joined room successfully');

    // Notify others in the room
    response
      .toRoom(data.roomId)
      .ok({ userId: socket.id, action: 'joined' }, 'User joined the room');
  });

  socket.on('send-message', (data) => {
    const response = enhance(socket, 'message-sent');

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
    response.ok({ messageId: message.id }, 'Message sent');
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

    // Send to target socket
    response.toSocket(data.targetSocketId).ok(message, 'Private message');

    // Confirm to sender
    enhance(socket, 'message-sent').ok({ messageId: Date.now() }, 'Private message sent');
  });

  // File upload simulation
  socket.on(
    'upload-file',
    wrapper(async (socket, response, data) => {
      if (!data.filename || !data.content) {
        return response.badRequest(
          { fields: ['filename', 'content'] },
          'Filename and content are required',
        );
      }

      // Simulate file processing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (data.filename.includes('invalid')) {
        return response.unprocessableEntity(
          { reason: 'Invalid file format' },
          'File processing failed',
        );
      }

      const file = {
        id: Date.now(),
        filename: data.filename,
        size: data.content.length,
        uploadedAt: new Date().toISOString(),
        url: `/files/${Date.now()}-${data.filename}`,
      };

      response.created(file, 'File uploaded successfully');
    }),
  );

  // Authentication example
  socket.on('authenticate', (data) => {
    const response = enhance(socket, 'auth-result');

    if (!data.token) {
      return response.unauthorized({ reason: 'Missing token' }, 'Authentication token required');
    }

    // Simulate token validation
    if (data.token === 'invalid') {
      return response.unauthorized({ reason: 'Invalid token' }, 'Authentication failed');
    }

    if (data.token === 'expired') {
      return response.unauthorized({ reason: 'Token expired' }, 'Token has expired');
    }

    // Success
    const user = {
      id: 'user-123',
      name: 'John Doe',
      role: 'admin',
      authenticated: true,
    };

    response.ok(user, 'Authentication successful');
  });

  // Error demonstration
  socket.on('trigger-error', () => {
    // This will be caught by the wrapper's error handling
    throw new Error('Intentional socket error for demonstration');
  });

  // Not found example
  socket.on('get-missing-resource', (data) => {
    const response = enhance(socket, 'resource-result');
    response.notFound({ resourceId: data.resourceId }, 'Resource not found');
  });

  // Rate limiting example
  let requestCount = 0;
  socket.on('rate-limited-action', (data) => {
    const response = enhance(socket, 'action-result');

    requestCount++;
    if (requestCount > 5) {
      return response.tooManyRequests(
        { limit: 5, reset: Date.now() + 60000 },
        'Rate limit exceeded',
      );
    }

    response.ok({ success: true }, 'Action completed');
  });

  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id}`, { reason });
  });
});

// Serve a simple HTML page for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Socket.IO Response Handler Demo</title>
        <script src="/socket.io/socket.io.js"></script>
    </head>
    <body>
        <h1>Socket.IO Response Handler Demo</h1>
        <div id="messages"></div>
        <script>
            const socket = io();
            const messages = document.getElementById('messages');
            
            function addMessage(type, data) {
                const div = document.createElement('div');
                div.innerHTML = \`<strong>\${type}:</strong> \${JSON.stringify(data, null, 2)}\`;
                div.style.margin = '10px 0';
                div.style.padding = '10px';
                div.style.backgroundColor = type.includes('error') ? '#ffebee' : '#e8f5e8';
                messages.appendChild(div);
            }
            
            // Listen for responses
            socket.on('user-data', (data) => addMessage('User Data', data));
            socket.on('room-joined', (data) => addMessage('Room Joined', data));
            socket.on('message-sent', (data) => addMessage('Message Sent', data));
            socket.on('auth-result', (data) => addMessage('Auth Result', data));
            
            // Example usage
            setTimeout(() => {
                socket.emit('get-user', { userId: 123 });
                socket.emit('authenticate', { token: 'valid-token' });
                socket.emit('join-room', { roomId: 'general' });
            }, 1000);
        </script>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Socket server running on port ${PORT}`);
  console.log(`
🚀 Socket.IO server is running on http://localhost:${PORT}

Socket Events Available:
- get-user           { userId: number }
- create-post        { title: string, content: string }
- join-room          { roomId: string }
- send-message       { roomId: string, message: string }
- private-message    { targetSocketId: string, message: string }
- upload-file        { filename: string, content: string }
- authenticate       { token: string }
- trigger-error      (no data)
- get-missing-resource { resourceId: string }
- rate-limited-action (no data, try multiple times)

Open http://localhost:${PORT} in your browser to test!
  `);
});

module.exports = { app, server, io };
