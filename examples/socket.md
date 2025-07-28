# Socket.IO Examples

Practical examples for using Response Handler with Socket.IO.

## Basic Socket.IO Server

```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const { enhance, wrapper } = quickSocketSetup({
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  logging: { enabled: true, logErrors: true }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Basic event handling
  socket.on('get-status', (data) => {
    const response = enhance(socket, 'status-response');
    response.ok({ status: 'online', timestamp: Date.now() }, 'Status retrieved');
  });
});

httpServer.listen(3001, () => {
  console.log('Socket.IO server running on port 3001');
});
```

## Real-time Chat Application

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(httpServer);
const { enhance, wrapper } = quickSocketSetup({
  mode: 'development',
  logging: { enabled: true }
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  // User authentication
  socket.on('authenticate', wrapper(async (socket, response, data) => {
    const { token, username } = data;
    
    if (!token || !username) {
      return response.badRequest(
        { missingFields: ['token', 'username'] },
        'Authentication credentials required'
      );
    }
    
    try {
      const user = await validateToken(token);
      socket.userId = user.id;
      socket.username = username;
      
      connectedUsers.set(socket.id, {
        id: user.id,
        username,
        joinedAt: new Date().toISOString()
      });
      
      response.ok({
        id: user.id,
        username,
        connectedUsers: Array.from(connectedUsers.values())
      }, 'Authentication successful');
      
      // Notify others
      socket.broadcast.emit('user-joined', {
        id: user.id,
        username,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      response.unauthorized(error, 'Invalid authentication token');
    }
  }));
  
  // Join chat room
  socket.on('join-room', wrapper(async (socket, response, data) => {
    const { roomId } = data;
    
    if (!socket.userId) {
      return response.unauthorized(null, 'Please authenticate first');
    }
    
    if (!roomId) {
      return response.badRequest({ field: 'roomId' }, 'Room ID required');
    }
    
    await socket.join(roomId);
    socket.currentRoom = roomId;
    
    response.ok({ roomId }, `Joined room ${roomId}`);
    
    // Notify room members
    response.toRoom(roomId).emit('user-joined-room', {
      userId: socket.userId,
      username: socket.username,
      roomId,
      timestamp: new Date().toISOString()
    });
  }));
  
  // Send message
  socket.on('send-message', wrapper(async (socket, response, data) => {
    const { message, roomId } = data;
    
    if (!socket.userId) {
      return response.unauthorized(null, 'Please authenticate first');
    }
    
    if (!message || !roomId) {
      return response.badRequest(
        { missingFields: ['message', 'roomId'] },
        'Message and room ID required'
      );
    }
    
    const messageObj = {
      id: generateMessageId(),
      message,
      userId: socket.userId,
      username: socket.username,
      roomId,
      timestamp: new Date().toISOString()
    };
    
    // Save to database (optional)
    await saveMessage(messageObj);
    
    // Broadcast to room
    response.toRoom(roomId).emit('new-message', messageObj);
    
    // Confirm to sender
    response.ok({ messageId: messageObj.id }, 'Message sent');
  }));
  
  // Private message
  socket.on('send-private-message', wrapper(async (socket, response, data) => {
    const { message, targetUserId } = data;
    
    const targetSocket = findSocketByUserId(targetUserId);
    if (!targetSocket) {
      return response.notFound(
        { userId: targetUserId },
        'User not online'
      );
    }
    
    const privateMessage = {
      id: generateMessageId(),
      message,
      from: {
        id: socket.userId,
        username: socket.username
      },
      timestamp: new Date().toISOString()
    };
    
    // Send to target user
    response.toSocket(targetSocket.id).emit('private-message', privateMessage);
    
    // Confirm to sender
    response.ok({ messageId: privateMessage.id }, 'Private message sent');
  }));
  
  // Disconnect handling
  socket.on('disconnect', () => {
    connectedUsers.delete(socket.id);
    
    if (socket.userId && socket.username) {
      socket.broadcast.emit('user-left', {
        id: socket.userId,
        username: socket.username,
        timestamp: new Date().toISOString()
      });
    }
  });
});

// Helper functions
function generateMessageId() {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function findSocketByUserId(userId) {
  for (const [socketId, socketObj] of io.sockets.sockets) {
    if (socketObj.userId === userId) {
      return socketObj;
    }
  }
  return null;
}
```

## Gaming Server Example

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(httpServer);
const { enhance, wrapper } = quickSocketSetup({
  mode: 'development',
  logging: { enabled: true }
});

// Game state
const games = new Map();
const waitingPlayers = [];

io.on('connection', (socket) => {
  // Join game queue
  socket.on('join-queue', wrapper(async (socket, response, data) => {
    const { playerName, gameType } = data;
    
    if (!playerName) {
      return response.badRequest({ field: 'playerName' }, 'Player name required');
    }
    
    const player = {
      id: socket.id,
      name: playerName,
      gameType: gameType || 'standard',
      joinedAt: Date.now()
    };
    
    waitingPlayers.push(player);
    socket.playerInfo = player;
    
    response.ok({ position: waitingPlayers.length }, 'Added to queue');
    
    // Try to match players
    tryMatchPlayers();
  }));
  
  // Make game move
  socket.on('make-move', wrapper(async (socket, response, data) => {
    const { gameId, move } = data;
    
    if (!socket.gameId) {
      return response.badRequest(null, 'Not in a game');
    }
    
    const game = games.get(gameId);
    if (!game) {
      return response.notFound({ gameId }, 'Game not found');
    }
    
    // Validate move
    if (!isValidMove(game, socket.id, move)) {
      return response.badRequest({ move }, 'Invalid move');
    }
    
    // Apply move
    applyMove(game, socket.id, move);
    
    // Check game state
    const gameState = checkGameState(game);
    
    // Broadcast game update
    response.toRoom(`game-${gameId}`).emit('game-update', {
      gameId,
      move,
      playerId: socket.id,
      gameState: game.state,
      timestamp: Date.now()
    });
    
    response.ok({ gameState }, 'Move accepted');
    
    // Handle game end
    if (gameState.finished) {
      endGame(game);
    }
  }));
  
  // Leave game
  socket.on('leave-game', wrapper(async (socket, response, data) => {
    if (socket.gameId) {
      const game = games.get(socket.gameId);
      if (game) {
        // Notify other players
        response.toRoom(`game-${socket.gameId}`).emit('player-left', {
          playerId: socket.id,
          timestamp: Date.now()
        });
        
        // End game
        endGame(game);
      }
      
      socket.leave(`game-${socket.gameId}`);
      socket.gameId = null;
    }
    
    response.ok(null, 'Left game');
  }));
  
  socket.on('disconnect', () => {
    // Remove from waiting queue
    const index = waitingPlayers.findIndex(p => p.id === socket.id);
    if (index !== -1) {
      waitingPlayers.splice(index, 1);
    }
    
    // Handle game disconnect
    if (socket.gameId) {
      const game = games.get(socket.gameId);
      if (game) {
        socket.to(`game-${socket.gameId}`).emit('player-disconnected', {
          playerId: socket.id,
          timestamp: Date.now()
        });
        endGame(game);
      }
    }
  });
});

function tryMatchPlayers() {
  while (waitingPlayers.length >= 2) {
    const player1 = waitingPlayers.shift();
    const player2 = waitingPlayers.shift();
    
    createGame(player1, player2);
  }
}

function createGame(player1, player2) {
  const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const game = {
    id: gameId,
    players: [player1, player2],
    state: initializeGameState(),
    createdAt: Date.now(),
    status: 'active'
  };
  
  games.set(gameId, game);
  
  // Join game room
  const socket1 = io.sockets.sockets.get(player1.id);
  const socket2 = io.sockets.sockets.get(player2.id);
  
  if (socket1 && socket2) {
    socket1.join(`game-${gameId}`);
    socket2.join(`game-${gameId}`);
    socket1.gameId = gameId;
    socket2.gameId = gameId;
    
    // Notify players
    io.to(`game-${gameId}`).emit('game-started', {
      gameId,
      players: [player1, player2],
      gameState: game.state,
      timestamp: Date.now()
    });
  }
}
```

## Real-time Collaboration Example

```typescript
import { Server } from 'socket.io';
import { quickSocketSetup } from '@amitkandar/response-handler';

const io = new Server(httpServer);
const { enhance, wrapper } = quickSocketSetup({
  mode: 'development',
  logging: { enabled: true }
});

// Document state
const documents = new Map();

io.on('connection', (socket) => {
  // Join document
  socket.on('join-document', wrapper(async (socket, response, data) => {
    const { documentId, userId } = data;
    
    if (!documentId || !userId) {
      return response.badRequest(
        { missingFields: ['documentId', 'userId'] },
        'Document ID and user ID required'
      );
    }
    
    // Get or create document
    let doc = documents.get(documentId);
    if (!doc) {
      doc = {
        id: documentId,
        content: '',
        collaborators: new Map(),
        operations: [],
        version: 0
      };
      documents.set(documentId, doc);
    }
    
    // Add collaborator
    doc.collaborators.set(socket.id, {
      userId,
      joinedAt: Date.now(),
      cursor: { line: 0, column: 0 }
    });
    
    socket.join(`doc-${documentId}`);
    socket.documentId = documentId;
    socket.userId = userId;
    
    response.ok({
      document: {
        id: documentId,
        content: doc.content,
        version: doc.version,
        collaborators: Array.from(doc.collaborators.values())
      }
    }, 'Joined document');
    
    // Notify other collaborators
    response.toRoom(`doc-${documentId}`).emit('collaborator-joined', {
      userId,
      socketId: socket.id,
      timestamp: Date.now()
    });
  }));
  
  // Text operation
  socket.on('text-operation', wrapper(async (socket, response, data) => {
    const { operation, version } = data;
    
    if (!socket.documentId) {
      return response.badRequest(null, 'Not in a document');
    }
    
    const doc = documents.get(socket.documentId);
    if (!doc) {
      return response.notFound({ documentId: socket.documentId }, 'Document not found');
    }
    
    // Version check for operational transformation
    if (version !== doc.version) {
      return response.conflict(
        { expectedVersion: doc.version, receivedVersion: version },
        'Version conflict - please refresh'
      );
    }
    
    // Apply operation
    try {
      const transformedOp = applyOperation(doc, operation);
      doc.version++;
      
      // Broadcast to other collaborators
      response.toRoom(`doc-${socket.documentId}`).emit('operation-applied', {
        operation: transformedOp,
        version: doc.version,
        authorId: socket.userId,
        timestamp: Date.now()
      });
      
      response.ok({ 
        version: doc.version,
        operation: transformedOp 
      }, 'Operation applied');
      
    } catch (error) {
      response.badRequest(error, 'Invalid operation');
    }
  }));
  
  // Cursor position update
  socket.on('cursor-update', (data) => {
    if (!socket.documentId) return;
    
    const doc = documents.get(socket.documentId);
    if (doc && doc.collaborators.has(socket.id)) {
      const collaborator = doc.collaborators.get(socket.id);
      collaborator.cursor = data.cursor;
      
      // Broadcast cursor position
      socket.to(`doc-${socket.documentId}`).emit('cursor-moved', {
        userId: socket.userId,
        cursor: data.cursor,
        timestamp: Date.now()
      });
    }
  });
  
  // Selection update
  socket.on('selection-update', (data) => {
    if (!socket.documentId) return;
    
    socket.to(`doc-${socket.documentId}`).emit('selection-changed', {
      userId: socket.userId,
      selection: data.selection,
      timestamp: Date.now()
    });
  });
  
  socket.on('disconnect', () => {
    if (socket.documentId) {
      const doc = documents.get(socket.documentId);
      if (doc) {
        doc.collaborators.delete(socket.id);
        
        // Notify other collaborators
        socket.to(`doc-${socket.documentId}`).emit('collaborator-left', {
          userId: socket.userId,
          timestamp: Date.now()
        });
        
        // Clean up empty documents
        if (doc.collaborators.size === 0) {
          documents.delete(socket.documentId);
        }
      }
    }
  });
});

function applyOperation(doc, operation) {
  // Simplified operational transformation
  switch (operation.type) {
    case 'insert':
      doc.content = doc.content.slice(0, operation.position) + 
                   operation.text + 
                   doc.content.slice(operation.position);
      break;
    case 'delete':
      doc.content = doc.content.slice(0, operation.position) + 
                   doc.content.slice(operation.position + operation.length);
      break;
    default:
      throw new Error('Unknown operation type');
  }
  
  doc.operations.push(operation);
  return operation;
}
```

## Socket.IO Client Examples

### Basic Client
```typescript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
  
  // Send authentication
  socket.emit('authenticate', {
    token: 'your-jwt-token',
    username: 'john_doe'
  });
});

socket.on('auth-result', (data) => {
  if (data.success) {
    console.log('Authenticated successfully:', data.data);
  } else {
    console.error('Authentication failed:', data.message);
  }
});

socket.on('new-message', (message) => {
  console.log('New message:', message);
});
```

### React Client
```typescript
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);
    
    newSocket.on('new-message', (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    return () => newSocket.close();
  }, []);
  
  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit('send-message', {
        message: newMessage,
        roomId: 'general'
      });
      setNewMessage('');
    }
  };
  
  return (
    <div>
      <div>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.username}:</strong> {msg.message}
          </div>
        ))}
      </div>
      <input
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

## Error Handling Patterns

```typescript
// Centralized error handling
socket.on('error-event', (data) => {
  switch (data.error.type) {
    case 'ValidationError':
      showValidationError(data.error.message);
      break;
    case 'AuthenticationError':
      redirectToLogin();
      break;
    case 'RateLimitError':
      showRateLimitWarning();
      break;
    default:
      showGenericError(data.message);
  }
});

// Retry logic
function sendMessageWithRetry(messageData, maxRetries = 3) {
  let retries = 0;
  
  const send = () => {
    socket.emit('send-message', messageData);
    
    const timeout = setTimeout(() => {
      if (retries < maxRetries) {
        retries++;
        console.log(`Retry attempt ${retries}`);
        send();
      } else {
        console.error('Max retries reached');
      }
    }, 1000 * Math.pow(2, retries)); // Exponential backoff
    
    socket.once('message-sent', () => {
      clearTimeout(timeout);
    });
  };
  
  send();
}
```

This comprehensive set of examples covers the most common Socket.IO use cases with Response Handler, providing a solid foundation for building real-time applications.
