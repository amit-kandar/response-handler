# Socket.IO Event Management

Comprehensive guide to managing Socket.IO events with Response Handler.

## Event Handler Setup

### Basic Event Structure

```javascript
const { Server } = require('socket.io');
const { quickSocketSetup } = require('response-handler');

const io = new Server(server);

// Apply Response Handler to Socket.IO
io.use(quickSocketSetup({
  enableLogging: true,
  logLevel: 'info',
  environment: process.env.NODE_ENV || 'development'
}));

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Event handlers
  socket.on('user:join', handleUserJoin);
  socket.on('message:send', handleMessageSend);
  socket.on('room:join', handleRoomJoin);
  socket.on('disconnect', handleDisconnect);
});
```

## Connection Events

### Connection Handling

```javascript
function handleConnection(socket) {
  // Store connection info
  const connectionInfo = {
    socketId: socket.id,
    connectedAt: new Date(),
    userAgent: socket.handshake.headers['user-agent'],
    ip: socket.handshake.address,
    query: socket.handshake.query
  };
  
  // Welcome message
  socket.ok(connectionInfo, 'Connected successfully');
  
  // Send initial data
  socket.emit('server:info', {
    serverTime: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    features: ['chat', 'rooms', 'file-sharing']
  });
}

function handleDisconnect(socket, reason) {
  console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  
  // Clean up user data
  const user = getUserBySocketId(socket.id);
  if (user) {
    removeUserFromAllRooms(user.id);
    notifyUserOffline(user.id);
  }
  
  // Log disconnect reason
  logDisconnection(socket.id, reason);
}

io.on('connection', (socket) => {
  handleConnection(socket);
  
  socket.on('disconnect', (reason) => {
    handleDisconnect(socket, reason);
  });
});
```

### Connection Authentication

```javascript
const jwt = require('jsonwebtoken');

// Authentication middleware for Socket.IO
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Invalid authentication token'));
    }
    
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  });
};

// Apply authentication middleware
io.use(authenticateSocket);

io.on('connection', (socket) => {
  socket.ok({
    userId: socket.userId,
    role: socket.userRole
  }, 'Authenticated successfully');
});
```

## User Events

### User Registration and Login

```javascript
// User join event
socket.on('user:join', async (data) => {
  try {
    const { username, avatar } = data;
    
    // Validation
    if (!username || username.trim().length < 2) {
      return socket.badRequest(
        { username: 'Username must be at least 2 characters' },
        'Invalid username'
      );
    }
    
    // Check if username is taken
    const existingUser = getUserByUsername(username);
    if (existingUser) {
      return socket.conflict(
        { username },
        'Username already taken'
      );
    }
    
    // Create user session
    const user = {
      id: generateUserId(),
      socketId: socket.id,
      username: username.trim(),
      avatar: avatar || getDefaultAvatar(),
      joinedAt: new Date(),
      isOnline: true
    };
    
    // Store user
    addUser(user);
    socket.user = user;
    
    // Join default room
    socket.join('general');
    
    // Notify user
    socket.ok(user, 'Joined successfully');
    
    // Notify others
    socket.to('general').emit('user:joined', {
      user: sanitizeUser(user),
      message: `${username} joined the chat`
    });
    
    // Send current users list
    socket.emit('users:list', {
      users: getOnlineUsers().map(sanitizeUser),
      total: getOnlineUsers().length
    });
    
  } catch (error) {
    socket.error(error, 'Failed to join');
  }
});

// User leave event
socket.on('user:leave', () => {
  try {
    const user = socket.user;
    if (!user) {
      return socket.badRequest({}, 'No active user session');
    }
    
    // Remove user
    removeUser(user.id);
    
    // Notify others
    socket.broadcast.emit('user:left', {
      user: sanitizeUser(user),
      message: `${user.username} left the chat`
    });
    
    socket.ok({}, 'Left successfully');
    
  } catch (error) {
    socket.error(error, 'Failed to leave');
  }
});
```

### User Status Management

```javascript
// Update user status
socket.on('user:status', (data) => {
  try {
    const { status, message } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    const validStatuses = ['online', 'away', 'busy', 'invisible'];
    if (!validStatuses.includes(status)) {
      return socket.badRequest(
        { 
          status,
          validStatuses
        },
        'Invalid status'
      );
    }
    
    // Update user status
    user.status = status;
    user.statusMessage = message || null;
    user.lastActivity = new Date();
    
    updateUser(user);
    
    // Broadcast status change
    socket.broadcast.emit('user:status_changed', {
      userId: user.id,
      username: user.username,
      status,
      message
    });
    
    socket.ok({ status, message }, 'Status updated');
    
  } catch (error) {
    socket.error(error, 'Failed to update status');
  }
});

// Get user profile
socket.on('user:profile', (data) => {
  try {
    const { userId } = data;
    
    if (!userId) {
      // Return own profile
      if (!socket.user) {
        return socket.unauthorized({}, 'User not authenticated');
      }
      
      return socket.ok(sanitizeUser(socket.user), 'Profile retrieved');
    }
    
    // Return other user's profile
    const user = getUserById(userId);
    if (!user) {
      return socket.notFound({ userId }, 'User not found');
    }
    
    socket.ok(sanitizeUser(user), 'Profile retrieved');
    
  } catch (error) {
    socket.error(error, 'Failed to get profile');
  }
});
```

## Message Events

### Message Sending

```javascript
// Send message event
socket.on('message:send', async (data) => {
  try {
    const { roomId, content, type = 'text', replyTo } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    // Validation
    if (!roomId) {
      return socket.badRequest(
        { requiredFields: ['roomId'] },
        'Room ID is required'
      );
    }
    
    if (!content || content.trim().length === 0) {
      return socket.badRequest(
        { content: 'Message cannot be empty' },
        'Invalid message content'
      );
    }
    
    if (content.length > 1000) {
      return socket.badRequest(
        { 
          maxLength: 1000,
          currentLength: content.length
        },
        'Message too long'
      );
    }
    
    // Check if user is in room
    const isInRoom = socket.rooms.has(roomId);
    if (!isInRoom) {
      return socket.forbidden(
        { roomId },
        'You are not a member of this room'
      );
    }
    
    // Rate limiting for messages
    const lastMessage = getLastMessageByUser(user.id);
    if (lastMessage && Date.now() - lastMessage.timestamp < 1000) {
      return socket.tooManyRequests(
        { cooldown: 1000 },
        'Please wait before sending another message'
      );
    }
    
    // Create message
    const message = {
      id: generateMessageId(),
      roomId,
      userId: user.id,
      username: user.username,
      content: content.trim(),
      type,
      replyTo,
      timestamp: new Date(),
      edited: false
    };
    
    // Save message
    await saveMessage(message);
    
    // Update user activity
    updateUserActivity(user.id);
    
    // Send to room
    io.to(roomId).emit('message:received', message);
    
    socket.ok({ messageId: message.id }, 'Message sent');
    
  } catch (error) {
    socket.error(error, 'Failed to send message');
  }
});

// Edit message event
socket.on('message:edit', async (data) => {
  try {
    const { messageId, content } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    const message = await getMessage(messageId);
    if (!message) {
      return socket.notFound({ messageId }, 'Message not found');
    }
    
    // Check ownership
    if (message.userId !== user.id) {
      return socket.forbidden(
        { messageId },
        'Can only edit your own messages'
      );
    }
    
    // Check if message is too old (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.timestamp < fiveMinutesAgo) {
      return socket.forbidden(
        { 
          messageId,
          ageLimit: '5 minutes'
        },
        'Message too old to edit'
      );
    }
    
    // Update message
    message.content = content.trim();
    message.edited = true;
    message.editedAt = new Date();
    
    await updateMessage(message);
    
    // Broadcast update
    io.to(message.roomId).emit('message:updated', message);
    
    socket.ok({ messageId }, 'Message updated');
    
  } catch (error) {
    socket.error(error, 'Failed to edit message');
  }
});
```

### Message Reactions

```javascript
// Add reaction to message
socket.on('message:react', async (data) => {
  try {
    const { messageId, emoji } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    const message = await getMessage(messageId);
    if (!message) {
      return socket.notFound({ messageId }, 'Message not found');
    }
    
    // Validate emoji
    const validEmojis = ['👍', '👎', '❤️', '😂', '😮', '😢', '😡'];
    if (!validEmojis.includes(emoji)) {
      return socket.badRequest(
        { 
          emoji,
          validEmojis
        },
        'Invalid emoji'
      );
    }
    
    // Add reaction
    const reaction = await addReaction(messageId, user.id, emoji);
    
    // Broadcast reaction
    io.to(message.roomId).emit('message:reaction_added', {
      messageId,
      userId: user.id,
      username: user.username,
      emoji,
      reactionId: reaction.id
    });
    
    socket.ok({ reactionId: reaction.id }, 'Reaction added');
    
  } catch (error) {
    socket.error(error, 'Failed to add reaction');
  }
});

// Remove reaction from message
socket.on('message:unreact', async (data) => {
  try {
    const { messageId, reactionId } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    const reaction = await getReaction(reactionId);
    if (!reaction) {
      return socket.notFound({ reactionId }, 'Reaction not found');
    }
    
    if (reaction.userId !== user.id) {
      return socket.forbidden(
        { reactionId },
        'Can only remove your own reactions'
      );
    }
    
    await removeReaction(reactionId);
    
    // Broadcast reaction removal
    const message = await getMessage(messageId);
    io.to(message.roomId).emit('message:reaction_removed', {
      messageId,
      userId: user.id,
      reactionId
    });
    
    socket.ok({ reactionId }, 'Reaction removed');
    
  } catch (error) {
    socket.error(error, 'Failed to remove reaction');
  }
});
```

## Typing Indicators

### Typing Events

```javascript
// Start typing indicator
socket.on('typing:start', (data) => {
  try {
    const { roomId } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    if (!roomId) {
      return socket.badRequest(
        { requiredFields: ['roomId'] },
        'Room ID is required'
      );
    }
    
    // Check if user is in room
    if (!socket.rooms.has(roomId)) {
      return socket.forbidden(
        { roomId },
        'Not a member of this room'
      );
    }
    
    // Broadcast typing indicator to room (except sender)
    socket.to(roomId).emit('typing:user_started', {
      userId: user.id,
      username: user.username,
      roomId
    });
    
    // Set timeout to auto-stop typing after 5 seconds
    clearTimeout(socket.typingTimeout);
    socket.typingTimeout = setTimeout(() => {
      socket.to(roomId).emit('typing:user_stopped', {
        userId: user.id,
        username: user.username,
        roomId
      });
    }, 5000);
    
    socket.ok({}, 'Typing indicator started');
    
  } catch (error) {
    socket.error(error, 'Failed to start typing indicator');
  }
});

// Stop typing indicator
socket.on('typing:stop', (data) => {
  try {
    const { roomId } = data;
    const user = socket.user;
    
    if (!user) return;
    
    // Clear timeout
    clearTimeout(socket.typingTimeout);
    
    // Broadcast stop typing to room
    socket.to(roomId).emit('typing:user_stopped', {
      userId: user.id,
      username: user.username,
      roomId
    });
    
    socket.ok({}, 'Typing indicator stopped');
    
  } catch (error) {
    socket.error(error, 'Failed to stop typing indicator');
  }
});
```

## File Sharing Events

### File Upload Events

```javascript
// File upload event
socket.on('file:upload', async (data) => {
  try {
    const { roomId, fileName, fileSize, fileType, fileData } = data;
    const user = socket.user;
    
    if (!user) {
      return socket.unauthorized({}, 'User not authenticated');
    }
    
    // Validation
    if (!roomId || !fileName || !fileData) {
      return socket.badRequest(
        { 
          requiredFields: ['roomId', 'fileName', 'fileData']
        },
        'Missing required fields'
      );
    }
    
    // File size limit (10MB)
    if (fileSize > 10 * 1024 * 1024) {
      return socket.badRequest(
        { 
          maxSize: '10MB',
          receivedSize: fileSize
        },
        'File too large'
      );
    }
    
    // Allowed file types
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'];
    if (!allowedTypes.includes(fileType)) {
      return socket.badRequest(
        { 
          fileType,
          allowedTypes
        },
        'File type not allowed'
      );
    }
    
    // Save file
    const file = await saveFile({
      fileName,
      fileSize,
      fileType,
      fileData,
      uploadedBy: user.id,
      roomId
    });
    
    // Create file message
    const message = {
      id: generateMessageId(),
      roomId,
      userId: user.id,
      username: user.username,
      type: 'file',
      content: fileName,
      file: {
        id: file.id,
        name: fileName,
        size: fileSize,
        type: fileType,
        url: file.url
      },
      timestamp: new Date()
    };
    
    await saveMessage(message);
    
    // Broadcast file message
    io.to(roomId).emit('message:received', message);
    
    socket.ok({
      messageId: message.id,
      fileId: file.id,
      fileUrl: file.url
    }, 'File uploaded successfully');
    
  } catch (error) {
    socket.error(error, 'Failed to upload file');
  }
});
```

## Event Monitoring and Analytics

### Event Tracking

```javascript
// Event middleware for tracking
const trackEvent = (eventName) => {
  return (socket, data, next) => {
    const user = socket.user;
    
    // Log event
    console.log(`Event: ${eventName}`, {
      socketId: socket.id,
      userId: user?.id,
      username: user?.username,
      data: data,
      timestamp: new Date()
    });
    
    // Send to analytics service
    if (process.env.NODE_ENV === 'production') {
      sendEventToAnalytics(eventName, {
        userId: user?.id,
        socketId: socket.id,
        data
      });
    }
    
    next();
  };
};

// Apply tracking to events
socket.use(trackEvent('socket_event'));

// Custom event tracking
socket.on('message:send', trackEvent('message_sent'), handleMessageSend);
socket.on('room:join', trackEvent('room_joined'), handleRoomJoin);
```

This comprehensive event management system provides structured handling of all Socket.IO events with proper validation, error handling, and Response Handler integration.
