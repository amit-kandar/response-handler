# Real-time Chat Application

Complete example of building a real-time chat application using Socket.IO with Response Handler.

## Server Setup

### Express + Socket.IO Server

```javascript
// server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { quickSetup, quickSocketSetup } = require('response-handler');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production' ? ['https://yourapp.com'] : ['http://localhost:3000'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Response Handler for REST endpoints
app.use(
  quickSetup({
    enableLogging: true,
    logLevel: 'info',
    environment: process.env.NODE_ENV || 'development',
  }),
);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
});

// Socket.IO Response Handler
io.use(
  quickSocketSetup({
    enableLogging: true,
    logLevel: 'info',
    environment: process.env.NODE_ENV || 'development',
  }),
);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io, httpServer };
```

## User Management

### User Session Management

```javascript
// models/User.js
class ChatUser {
  constructor(id, username, socketId) {
    this.id = id;
    this.username = username;
    this.socketId = socketId;
    this.joinedAt = new Date();
    this.lastSeen = new Date();
    this.isOnline = true;
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      joinedAt: this.joinedAt,
      lastSeen: this.lastSeen,
      isOnline: this.isOnline,
    };
  }
}

// Store for connected users
class UserManager {
  constructor() {
    this.users = new Map(); // socketId -> User
    this.usersByName = new Map(); // username -> User
  }

  addUser(socketId, username) {
    // Check if username is already taken
    if (this.usersByName.has(username)) {
      return { error: 'Username already taken' };
    }

    const user = new ChatUser(Date.now().toString(), username, socketId);

    this.users.set(socketId, user);
    this.usersByName.set(username, user);

    return { user };
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      this.usersByName.delete(user.username);
      return user;
    }
    return null;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getUserByName(username) {
    return this.usersByName.get(username);
  }

  getAllUsers() {
    return Array.from(this.users.values()).map((user) => user.toJSON());
  }

  updateLastSeen(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      user.lastSeen = new Date();
    }
  }
}

const userManager = new UserManager();
module.exports = { ChatUser, UserManager, userManager };
```

## Room Management

### Chat Rooms

```javascript
// models/Room.js
class ChatRoom {
  constructor(id, name, createdBy) {
    this.id = id;
    this.name = name;
    this.createdBy = createdBy;
    this.createdAt = new Date();
    this.members = new Set();
    this.messages = [];
    this.isPrivate = false;
    this.maxMembers = 100;
  }

  addMember(userId) {
    if (this.members.size >= this.maxMembers) {
      return { error: 'Room is full' };
    }

    this.members.add(userId);
    return { success: true };
  }

  removeMember(userId) {
    this.members.delete(userId);
  }

  addMessage(message) {
    this.messages.push({
      id: Date.now().toString(),
      ...message,
      timestamp: new Date(),
    });

    // Keep only last 100 messages in memory
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
  }

  getRecentMessages(limit = 50) {
    return this.messages.slice(-limit);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      memberCount: this.members.size,
      isPrivate: this.isPrivate,
      maxMembers: this.maxMembers,
    };
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.createDefaultRooms();
  }

  createDefaultRooms() {
    this.createRoom('general', 'General Chat', 'system');
    this.createRoom('random', 'Random', 'system');
  }

  createRoom(id, name, createdBy) {
    if (this.rooms.has(id)) {
      return { error: 'Room already exists' };
    }

    const room = new ChatRoom(id, name, createdBy);
    this.rooms.set(id, room);
    return { room };
  }

  getRoom(id) {
    return this.rooms.get(id);
  }

  getAllRooms() {
    return Array.from(this.rooms.values()).map((room) => room.toJSON());
  }

  deleteRoom(id) {
    return this.rooms.delete(id);
  }
}

const roomManager = new RoomManager();
module.exports = { ChatRoom, RoomManager, roomManager };
```

## Socket Event Handlers

### Connection Management

```javascript
// handlers/connectionHandler.js
const { userManager } = require('../models/User');
const { roomManager } = require('../models/Room');

function handleConnection(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User join
    socket.on('user:join', (data) => {
      try {
        const { username } = data;

        if (!username || username.trim().length < 2) {
          return socket.badRequest(
            { username: 'Username must be at least 2 characters' },
            'Invalid username',
          );
        }

        const result = userManager.addUser(socket.id, username.trim());

        if (result.error) {
          return socket.conflict({ username }, result.error);
        }

        const user = result.user;

        // Join default room
        socket.join('general');
        roomManager.getRoom('general').addMember(user.id);

        // Notify user
        socket.ok(user.toJSON(), 'Successfully joined chat');

        // Broadcast to room
        socket.to('general').emit('user:joined', {
          user: user.toJSON(),
          message: `${username} joined the chat`,
        });

        // Send room info
        socket.emit('room:joined', {
          roomId: 'general',
          roomName: 'General Chat',
          members: roomManager.getRoom('general').members.size,
          recentMessages: roomManager.getRoom('general').getRecentMessages(20),
        });
      } catch (error) {
        socket.error(error, 'Failed to join chat');
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        const user = userManager.removeUser(socket.id);

        if (user) {
          // Remove from all rooms
          for (const room of roomManager.rooms.values()) {
            room.removeMember(user.id);
          }

          // Notify others
          socket.broadcast.emit('user:left', {
            user: user.toJSON(),
            message: `${user.username} left the chat`,
          });

          console.log(`User ${user.username} disconnected`);
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
}

module.exports = handleConnection;
```

### Message Handling

```javascript
// handlers/messageHandler.js
const { userManager } = require('../models/User');
const { roomManager } = require('../models/Room');

function handleMessages(io) {
  io.on('connection', (socket) => {
    // Send message
    socket.on('message:send', (data) => {
      try {
        const { roomId, content, type = 'text' } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.notFound({}, 'Room not found');
        }

        if (!room.members.has(user.id)) {
          return socket.forbidden({}, 'Not a member of this room');
        }

        // Validate message
        if (!content || content.trim().length === 0) {
          return socket.badRequest(
            { content: 'Message cannot be empty' },
            'Invalid message content',
          );
        }

        if (content.length > 1000) {
          return socket.badRequest(
            { content: 'Message too long' },
            'Message must be under 1000 characters',
          );
        }

        // Create message
        const message = {
          id: Date.now().toString(),
          userId: user.id,
          username: user.username,
          content: content.trim(),
          type,
          roomId,
          timestamp: new Date(),
        };

        // Add to room
        room.addMessage(message);

        // Update user activity
        userManager.updateLastSeen(socket.id);

        // Send to all room members
        io.to(roomId).emit('message:received', message);

        // Confirm to sender
        socket.ok({ messageId: message.id }, 'Message sent successfully');
      } catch (error) {
        socket.error(error, 'Failed to send message');
      }
    });

    // Edit message
    socket.on('message:edit', (data) => {
      try {
        const { messageId, content, roomId } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.notFound({}, 'Room not found');
        }

        const message = room.messages.find((m) => m.id === messageId);
        if (!message) {
          return socket.notFound({}, 'Message not found');
        }

        if (message.userId !== user.id) {
          return socket.forbidden({}, 'Can only edit your own messages');
        }

        // Check if message is too old (5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (message.timestamp < fiveMinutesAgo) {
          return socket.forbidden({}, 'Message too old to edit');
        }

        // Update message
        message.content = content.trim();
        message.editedAt = new Date();

        // Broadcast update
        io.to(roomId).emit('message:updated', message);

        socket.ok({ messageId }, 'Message updated successfully');
      } catch (error) {
        socket.error(error, 'Failed to edit message');
      }
    });

    // Delete message
    socket.on('message:delete', (data) => {
      try {
        const { messageId, roomId } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.notFound({}, 'Room not found');
        }

        const messageIndex = room.messages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) {
          return socket.notFound({}, 'Message not found');
        }

        const message = room.messages[messageIndex];
        if (message.userId !== user.id) {
          return socket.forbidden({}, 'Can only delete your own messages');
        }

        // Remove message
        room.messages.splice(messageIndex, 1);

        // Broadcast deletion
        io.to(roomId).emit('message:deleted', { messageId, roomId });

        socket.ok({ messageId }, 'Message deleted successfully');
      } catch (error) {
        socket.error(error, 'Failed to delete message');
      }
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      const { roomId } = data;
      const user = userManager.getUser(socket.id);

      if (user && roomId) {
        socket.to(roomId).emit('typing:user_started', {
          userId: user.id,
          username: user.username,
          roomId,
        });
      }
    });

    socket.on('typing:stop', (data) => {
      const { roomId } = data;
      const user = userManager.getUser(socket.id);

      if (user && roomId) {
        socket.to(roomId).emit('typing:user_stopped', {
          userId: user.id,
          username: user.username,
          roomId,
        });
      }
    });
  });
}

module.exports = handleMessages;
```

### Room Management Events

```javascript
// handlers/roomHandler.js
const { userManager } = require('../models/User');
const { roomManager } = require('../models/Room');

function handleRooms(io) {
  io.on('connection', (socket) => {
    // Join room
    socket.on('room:join', (data) => {
      try {
        const { roomId } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.notFound({}, 'Room not found');
        }

        // Add user to room
        const result = room.addMember(user.id);
        if (result.error) {
          return socket.badRequest({}, result.error);
        }

        // Join socket room
        socket.join(roomId);

        // Notify room members
        socket.to(roomId).emit('room:user_joined', {
          user: user.toJSON(),
          roomId,
          message: `${user.username} joined ${room.name}`,
        });

        // Send room data to user
        socket.ok(
          {
            room: room.toJSON(),
            recentMessages: room.getRecentMessages(20),
            members: room.members.size,
          },
          `Joined ${room.name}`,
        );
      } catch (error) {
        socket.error(error, 'Failed to join room');
      }
    });

    // Leave room
    socket.on('room:leave', (data) => {
      try {
        const { roomId } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.notFound({}, 'Room not found');
        }

        // Remove user from room
        room.removeMember(user.id);
        socket.leave(roomId);

        // Notify room members
        socket.to(roomId).emit('room:user_left', {
          user: user.toJSON(),
          roomId,
          message: `${user.username} left ${room.name}`,
        });

        socket.ok({ roomId }, `Left ${room.name}`);
      } catch (error) {
        socket.error(error, 'Failed to leave room');
      }
    });

    // Create room
    socket.on('room:create', (data) => {
      try {
        const { name, isPrivate = false } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        if (!name || name.trim().length < 3) {
          return socket.badRequest(
            { name: 'Room name must be at least 3 characters' },
            'Invalid room name',
          );
        }

        const roomId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        const result = roomManager.createRoom(roomId, name.trim(), user.id);
        if (result.error) {
          return socket.conflict({}, result.error);
        }

        const room = result.room;
        room.isPrivate = isPrivate;

        // Creator automatically joins
        room.addMember(user.id);
        socket.join(roomId);

        // Broadcast new room to all users
        if (!isPrivate) {
          io.emit('room:created', room.toJSON());
        }

        socket.created(room.toJSON(), 'Room created successfully');
      } catch (error) {
        socket.error(error, 'Failed to create room');
      }
    });

    // Get room list
    socket.on('room:list', () => {
      try {
        const rooms = roomManager.getAllRooms();
        socket.ok(rooms, 'Rooms retrieved successfully');
      } catch (error) {
        socket.error(error, 'Failed to get room list');
      }
    });

    // Get room messages
    socket.on('room:messages', (data) => {
      try {
        const { roomId, limit = 50 } = data;

        const user = userManager.getUser(socket.id);
        if (!user) {
          return socket.unauthorized({}, 'User not authenticated');
        }

        const room = roomManager.getRoom(roomId);
        if (!room) {
          return socket.notFound({}, 'Room not found');
        }

        if (!room.members.has(user.id)) {
          return socket.forbidden({}, 'Not a member of this room');
        }

        const messages = room.getRecentMessages(Math.min(limit, 100));

        socket.ok(
          {
            roomId,
            messages,
            total: room.messages.length,
          },
          'Messages retrieved successfully',
        );
      } catch (error) {
        socket.error(error, 'Failed to get messages');
      }
    });
  });
}

module.exports = handleRooms;
```

## Client Integration

### JavaScript Client

```javascript
// client/chat.js
class ChatClient {
  constructor(serverUrl) {
    this.socket = io(serverUrl);
    this.currentUser = null;
    this.currentRoom = null;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    // Response events
    this.socket.on('response', (response) => {
      this.handleResponse(response);
    });

    // Message events
    this.socket.on('message:received', (message) => {
      this.displayMessage(message);
    });

    // User events
    this.socket.on('user:joined', (data) => {
      this.displayUserJoined(data);
    });

    this.socket.on('user:left', (data) => {
      this.displayUserLeft(data);
    });

    // Typing events
    this.socket.on('typing:user_started', (data) => {
      this.showTypingIndicator(data);
    });

    this.socket.on('typing:user_stopped', (data) => {
      this.hideTypingIndicator(data);
    });
  }

  joinChat(username) {
    this.socket.emit('user:join', { username });
  }

  sendMessage(content, roomId = this.currentRoom) {
    if (!roomId) {
      console.error('No room selected');
      return;
    }

    this.socket.emit('message:send', {
      roomId,
      content,
      type: 'text',
    });
  }

  joinRoom(roomId) {
    this.socket.emit('room:join', { roomId });
  }

  startTyping(roomId = this.currentRoom) {
    if (roomId) {
      this.socket.emit('typing:start', { roomId });
    }
  }

  stopTyping(roomId = this.currentRoom) {
    if (roomId) {
      this.socket.emit('typing:stop', { roomId });
    }
  }

  handleResponse(response) {
    if (response.success) {
      console.log('Success:', response.message);
    } else {
      console.error('Error:', response.message, response.error);
    }
  }

  displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.innerHTML = `
      <span class="username">${message.username}</span>
      <span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
      <div class="content">${this.escapeHtml(message.content)}</div>
    `;

    document.getElementById('messages').appendChild(messageElement);
    this.scrollToBottom();
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  scrollToBottom() {
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;
  }
}

// Initialize chat
const chat = new ChatClient('http://localhost:3000');

// UI event handlers
document.getElementById('join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  if (username) {
    chat.joinChat(username);
  }
});

document.getElementById('message-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const content = document.getElementById('message-input').value.trim();
  if (content) {
    chat.sendMessage(content);
    document.getElementById('message-input').value = '';
  }
});
```

## Complete Application

### Main Server File

```javascript
// index.js
const { app, io, httpServer } = require('./server');
const handleConnection = require('./handlers/connectionHandler');
const handleMessages = require('./handlers/messageHandler');
const handleRooms = require('./handlers/roomHandler');

// Set up Socket.IO event handlers
handleConnection(io);
handleMessages(io);
handleRooms(io);

// REST API endpoints
app.get('/api/health', (req, res) => {
  res.ok(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      connections: io.engine.clientsCount,
    },
    'Chat server is healthy',
  );
});

app.get('/api/stats', (req, res) => {
  const { userManager, roomManager } = require('./models/User');

  res.ok(
    {
      totalUsers: userManager.users.size,
      totalRooms: roomManager.rooms.size,
      connections: io.engine.clientsCount,
    },
    'Server statistics',
  );
});

console.log('Chat application started successfully');
```

This chat application demonstrates a complete real-time messaging system with user management, room functionality, message handling, and proper error responses using Response Handler.
