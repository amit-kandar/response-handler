# Socket.IO Room Targeting

Advanced room management and targeting strategies for Socket.IO with Response Handler.

## Room Management System

### Room Creation and Management

```javascript
const { Server } = require('socket.io');
const { quickSocketSetup } = require('response-handler');

class RoomManager {
  constructor() {
    this.rooms = new Map();
    this.userRooms = new Map(); // userId -> Set of roomIds
  }

  createRoom(roomId, options = {}) {
    const room = {
      id: roomId,
      name: options.name || roomId,
      description: options.description || '',
      createdAt: new Date(),
      createdBy: options.createdBy,
      isPrivate: options.isPrivate || false,
      maxUsers: options.maxUsers || 100,
      currentUsers: 0,
      settings: {
        allowFileSharing: options.allowFileSharing !== false,
        allowReactions: options.allowReactions !== false,
        messageHistory: options.messageHistory !== false,
        moderationEnabled: options.moderationEnabled || false,
      },
      metadata: options.metadata || {},
    };

    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  getPublicRooms() {
    return Array.from(this.rooms.values()).filter((room) => !room.isPrivate);
  }

  deleteRoom(roomId) {
    this.rooms.delete(roomId);
  }

  addUserToRoom(userId, roomId) {
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set());
    }
    this.userRooms.get(userId).add(roomId);
  }

  removeUserFromRoom(userId, roomId) {
    const userRooms = this.userRooms.get(userId);
    if (userRooms) {
      userRooms.delete(roomId);
      if (userRooms.size === 0) {
        this.userRooms.delete(userId);
      }
    }
  }

  getUserRooms(userId) {
    return this.userRooms.get(userId) || new Set();
  }
}

const roomManager = new RoomManager();

// Create default rooms
roomManager.createRoom('general', {
  name: 'General Chat',
  description: 'Main chat room for everyone',
  createdBy: 'system',
});

roomManager.createRoom('announcements', {
  name: 'Announcements',
  description: 'Important announcements only',
  createdBy: 'system',
  moderationEnabled: true,
});

module.exports = roomManager;
```

## Room Operations

### Joining Rooms

```javascript
const io = new Server(server);
io.use(quickSocketSetup());

io.on('connection', (socket) => {
  // Join room event
  socket.on('room:join', async (data) => {
    try {
      const { roomId, password } = data;
      const user = socket.user;

      if (!user) {
        return socket.unauthorized({}, 'Authentication required');
      }

      // Validate room ID
      if (!roomId || typeof roomId !== 'string') {
        return socket.badRequest({ roomId, expectedType: 'string' }, 'Invalid room ID');
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        return socket.notFound({ roomId }, 'Room not found');
      }

      // Check if room is private and user has permission
      if (room.isPrivate && !hasRoomAccess(user.id, roomId)) {
        return socket.forbidden(
          { roomId, reason: 'Private room' },
          'Access denied to private room',
        );
      }

      // Check password for password-protected rooms
      if (room.password && room.password !== password) {
        return socket.unauthorized(
          { roomId, reason: 'Incorrect password' },
          'Invalid room password',
        );
      }

      // Check room capacity
      const currentUsers = await getRoomUserCount(roomId);
      if (currentUsers >= room.maxUsers) {
        return socket.tooManyRequests(
          {
            roomId,
            currentUsers,
            maxUsers: room.maxUsers,
          },
          'Room is full',
        );
      }

      // Check if user is already in room
      if (socket.rooms.has(roomId)) {
        return socket.conflict({ roomId }, 'Already in this room');
      }

      // Join the room
      socket.join(roomId);
      roomManager.addUserToRoom(user.id, roomId);

      // Update room user count
      room.currentUsers = await getRoomUserCount(roomId);

      // Notify user
      socket.ok(
        {
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            currentUsers: room.currentUsers,
            maxUsers: room.maxUsers,
            settings: room.settings,
          },
          recentMessages: await getRecentMessages(roomId, 20),
        },
        `Joined ${room.name}`,
      );

      // Notify room members
      socket.to(roomId).emit('room:user_joined', {
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
        roomId,
        message: `${user.username} joined the room`,
        timestamp: new Date(),
      });

      // Send updated user list
      io.to(roomId).emit('room:users_updated', {
        roomId,
        users: await getRoomUsers(roomId),
        count: room.currentUsers,
      });
    } catch (error) {
      socket.error(error, 'Failed to join room');
    }
  });

  // Leave room event
  socket.on('room:leave', async (data) => {
    try {
      const { roomId } = data;
      const user = socket.user;

      if (!user) {
        return socket.unauthorized({}, 'Authentication required');
      }

      if (!roomId) {
        return socket.badRequest({ requiredFields: ['roomId'] }, 'Room ID is required');
      }

      const room = roomManager.getRoom(roomId);
      if (!room) {
        return socket.notFound({ roomId }, 'Room not found');
      }

      // Check if user is in room
      if (!socket.rooms.has(roomId)) {
        return socket.badRequest({ roomId }, 'Not in this room');
      }

      // Leave the room
      socket.leave(roomId);
      roomManager.removeUserFromRoom(user.id, roomId);

      // Update room user count
      room.currentUsers = await getRoomUserCount(roomId);

      // Notify user
      socket.ok({ roomId }, `Left ${room.name}`);

      // Notify room members
      socket.to(roomId).emit('room:user_left', {
        user: {
          id: user.id,
          username: user.username,
        },
        roomId,
        message: `${user.username} left the room`,
        timestamp: new Date(),
      });

      // Send updated user list
      socket.to(roomId).emit('room:users_updated', {
        roomId,
        users: await getRoomUsers(roomId),
        count: room.currentUsers,
      });
    } catch (error) {
      socket.error(error, 'Failed to leave room');
    }
  });
});
```

### Creating Custom Rooms

```javascript
// Create room event
socket.on('room:create', async (data) => {
  try {
    const { name, description, isPrivate, maxUsers, password, settings } = data;
    const user = socket.user;

    if (!user) {
      return socket.unauthorized({}, 'Authentication required');
    }

    // Validation
    if (!name || name.trim().length < 3) {
      return socket.badRequest(
        {
          name,
          minLength: 3,
        },
        'Room name must be at least 3 characters',
      );
    }

    if (name.length > 50) {
      return socket.badRequest(
        {
          name,
          maxLength: 50,
        },
        'Room name too long',
      );
    }

    // Generate room ID
    const roomId = generateRoomId(name);

    // Check if room already exists
    if (roomManager.getRoom(roomId)) {
      return socket.conflict({ roomId, name }, 'Room with this name already exists');
    }

    // Check user permissions (can create rooms)
    if (!canCreateRoom(user)) {
      return socket.forbidden({ reason: 'Insufficient permissions' }, 'You cannot create rooms');
    }

    // Create room
    const room = roomManager.createRoom(roomId, {
      name: name.trim(),
      description: description?.trim() || '',
      isPrivate: isPrivate || false,
      maxUsers: Math.min(maxUsers || 50, 100),
      password: password?.trim() || null,
      createdBy: user.id,
      allowFileSharing: settings?.allowFileSharing !== false,
      allowReactions: settings?.allowReactions !== false,
      messageHistory: settings?.messageHistory !== false,
      moderationEnabled: settings?.moderationEnabled || false,
    });

    // Creator automatically joins
    socket.join(roomId);
    roomManager.addUserToRoom(user.id, roomId);
    room.currentUsers = 1;

    // Add creator as admin
    await addRoomAdmin(roomId, user.id);

    // Notify creator
    socket.created(
      {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          isPrivate: room.isPrivate,
          maxUsers: room.maxUsers,
          currentUsers: room.currentUsers,
          settings: room.settings,
          role: 'admin',
        },
      },
      'Room created successfully',
    );

    // Broadcast new room to all users (if public)
    if (!room.isPrivate) {
      socket.broadcast.emit('room:created', {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          currentUsers: room.currentUsers,
          maxUsers: room.maxUsers,
          createdBy: user.username,
        },
      });
    }
  } catch (error) {
    socket.error(error, 'Failed to create room');
  }
});
```

## Advanced Room Targeting

### Selective Broadcasting

```javascript
// Broadcast to specific users in a room
function broadcastToUsersInRoom(io, roomId, userIds, event, data) {
  const sockets = io.sockets.adapter.rooms.get(roomId);

  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.user && userIds.includes(socket.user.id)) {
        socket.emit(event, data);
      }
    }
  }
}

// Broadcast to all except specific users
function broadcastToRoomExcept(io, roomId, excludeUserIds, event, data) {
  const sockets = io.sockets.adapter.rooms.get(roomId);

  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.user && !excludeUserIds.includes(socket.user.id)) {
        socket.emit(event, data);
      }
    }
  }
}

// Role-based broadcasting
function broadcastToRole(io, roomId, role, event, data) {
  const sockets = io.sockets.adapter.rooms.get(roomId);

  if (sockets) {
    for (const socketId of sockets) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && socket.user && socket.user.role === role) {
        socket.emit(event, data);
      }
    }
  }
}

// Usage examples
socket.on('admin:announcement', (data) => {
  const { roomId, message } = data;

  if (!isRoomAdmin(socket.user.id, roomId)) {
    return socket.forbidden({}, 'Admin privileges required');
  }

  // Send to all users in room
  io.to(roomId).emit('announcement', {
    message,
    from: 'admin',
    timestamp: new Date(),
  });

  socket.ok({}, 'Announcement sent');
});
```

### Room-Specific Message Types

```javascript
// Enhanced message sending with room targeting
socket.on('message:send', async (data) => {
  try {
    const { roomId, content, type, target } = data;
    const user = socket.user;

    // Standard validation...

    const message = {
      id: generateMessageId(),
      roomId,
      userId: user.id,
      username: user.username,
      content,
      type,
      timestamp: new Date(),
    };

    // Handle different targeting strategies
    switch (target?.type) {
      case 'all':
        // Send to all users in room
        io.to(roomId).emit('message:received', message);
        break;

      case 'role':
        // Send to users with specific role
        broadcastToRole(io, roomId, target.role, 'message:received', message);
        break;

      case 'users':
        // Send to specific users
        broadcastToUsersInRoom(io, roomId, target.userIds, 'message:received', message);
        break;

      case 'except':
        // Send to all except specific users
        broadcastToRoomExcept(io, roomId, target.excludeUserIds, 'message:received', message);
        break;

      default:
        // Default: send to all
        io.to(roomId).emit('message:received', message);
    }

    socket.ok({ messageId: message.id }, 'Message sent');
  } catch (error) {
    socket.error(error, 'Failed to send message');
  }
});
```

## Room Permissions and Moderation

### Permission System

```javascript
// Room permissions
const ROOM_PERMISSIONS = {
  SEND_MESSAGES: 'send_messages',
  DELETE_MESSAGES: 'delete_messages',
  KICK_USERS: 'kick_users',
  BAN_USERS: 'ban_users',
  MANAGE_ROOM: 'manage_room',
  INVITE_USERS: 'invite_users',
};

// Check room permission
function hasRoomPermission(userId, roomId, permission) {
  const userRole = getRoomUserRole(userId, roomId);
  const permissions = getRolePermissions(userRole);
  return permissions.includes(permission);
}

// Kick user from room
socket.on('room:kick', async (data) => {
  try {
    const { roomId, userId, reason } = data;
    const moderator = socket.user;

    if (!moderator) {
      return socket.unauthorized({}, 'Authentication required');
    }

    // Check permissions
    if (!hasRoomPermission(moderator.id, roomId, ROOM_PERMISSIONS.KICK_USERS)) {
      return socket.forbidden(
        {
          permission: ROOM_PERMISSIONS.KICK_USERS,
          userRole: getRoomUserRole(moderator.id, roomId),
        },
        'Insufficient permissions to kick users',
      );
    }

    // Find target user's socket
    const targetSocket = findUserSocket(io, userId);
    if (!targetSocket) {
      return socket.notFound({ userId }, 'User not found or not online');
    }

    // Check if user is in the room
    if (!targetSocket.rooms.has(roomId)) {
      return socket.badRequest({ userId, roomId }, 'User is not in this room');
    }

    // Cannot kick admins or users with higher role
    const targetRole = getRoomUserRole(userId, roomId);
    const moderatorRole = getRoomUserRole(moderator.id, roomId);

    if (getRoleLevel(targetRole) >= getRoleLevel(moderatorRole)) {
      return socket.forbidden(
        {
          targetRole,
          moderatorRole,
        },
        'Cannot kick user with equal or higher privileges',
      );
    }

    // Kick user from room
    targetSocket.leave(roomId);
    roomManager.removeUserFromRoom(userId, roomId);

    // Notify kicked user
    targetSocket.emit('room:kicked', {
      roomId,
      reason: reason || 'No reason provided',
      kickedBy: moderator.username,
      timestamp: new Date(),
    });

    // Notify room
    io.to(roomId).emit('room:user_kicked', {
      userId,
      username: targetSocket.user?.username,
      kickedBy: moderator.username,
      reason,
      timestamp: new Date(),
    });

    // Log moderation action
    await logModerationAction({
      type: 'kick',
      roomId,
      targetUserId: userId,
      moderatorId: moderator.id,
      reason,
      timestamp: new Date(),
    });

    socket.ok(
      {
        userId,
        roomId,
        reason,
      },
      'User kicked successfully',
    );
  } catch (error) {
    socket.error(error, 'Failed to kick user');
  }
});
```

### Room Settings Management

```javascript
// Update room settings
socket.on('room:settings', async (data) => {
  try {
    const { roomId, settings } = data;
    const user = socket.user;

    if (!user) {
      return socket.unauthorized({}, 'Authentication required');
    }

    // Check permissions
    if (!hasRoomPermission(user.id, roomId, ROOM_PERMISSIONS.MANAGE_ROOM)) {
      return socket.forbidden(
        { permission: ROOM_PERMISSIONS.MANAGE_ROOM },
        'Insufficient permissions to manage room',
      );
    }

    const room = roomManager.getRoom(roomId);
    if (!room) {
      return socket.notFound({ roomId }, 'Room not found');
    }

    // Validate settings
    const validSettings = {
      allowFileSharing:
        typeof settings.allowFileSharing === 'boolean'
          ? settings.allowFileSharing
          : room.settings.allowFileSharing,
      allowReactions:
        typeof settings.allowReactions === 'boolean'
          ? settings.allowReactions
          : room.settings.allowReactions,
      messageHistory:
        typeof settings.messageHistory === 'boolean'
          ? settings.messageHistory
          : room.settings.messageHistory,
      moderationEnabled:
        typeof settings.moderationEnabled === 'boolean'
          ? settings.moderationEnabled
          : room.settings.moderationEnabled,
      slowMode: settings.slowMode
        ? Math.max(0, Math.min(settings.slowMode, 300))
        : room.settings.slowMode || 0,
    };

    // Update room settings
    room.settings = { ...room.settings, ...validSettings };
    await updateRoomSettings(roomId, room.settings);

    // Notify room members
    io.to(roomId).emit('room:settings_updated', {
      roomId,
      settings: room.settings,
      updatedBy: user.username,
      timestamp: new Date(),
    });

    socket.ok(
      {
        roomId,
        settings: room.settings,
      },
      'Room settings updated',
    );
  } catch (error) {
    socket.error(error, 'Failed to update room settings');
  }
});
```

## Multi-Room User Management

### User Room Status

```javascript
// Get user's room list
socket.on('user:rooms', async () => {
  try {
    const user = socket.user;

    if (!user) {
      return socket.unauthorized({}, 'Authentication required');
    }

    const userRoomIds = roomManager.getUserRooms(user.id);
    const rooms = [];

    for (const roomId of userRoomIds) {
      const room = roomManager.getRoom(roomId);
      if (room) {
        const unreadCount = await getUnreadMessageCount(user.id, roomId);
        const lastMessage = await getLastMessage(roomId);

        rooms.push({
          id: room.id,
          name: room.name,
          description: room.description,
          isPrivate: room.isPrivate,
          currentUsers: room.currentUsers,
          maxUsers: room.maxUsers,
          unreadCount,
          lastMessage,
          userRole: getRoomUserRole(user.id, roomId),
          settings: room.settings
        });
      }
    }

    socket.ok({
      rooms,
      totalRooms: rooms.length
    }, 'User rooms retrieved');

  } catch (error) {
    socket.error(error, 'Failed to get user rooms');
  }
});

// Switch active room
socket.on('user:switch_room', (data) => {
  try {
    const { roomId } = data;
    const user = socket.user;

    if (!user) {
      return socket.unauthorized({}, 'Authentication required');
    }

    // Validate room exists and user is member
    if (!socket.rooms.has(roomId)) {
      return socket.forbidden(
        { roomId },
        'Not a member of this room'
      );
    }

    // Update user's active room
    socket.activeRoom = roomId;

    // Mark messages as read
    markMessagesAsRead(user.id, roomId);

    // Get room data
    const room = roomManager.getRoom(roomId);
    const recentMessages = await getRecentMessages(roomId, 50);
    const roomUsers = await getRoomUsers(roomId);

    socket.ok({
      room: {
        id: room.id,
        name: room.name,
        description: room.description,
        settings: room.settings,
        currentUsers: room.currentUsers
      },
      recentMessages,
      users: roomUsers
    }, `Switched to ${room.name}`);

  } catch (error) {
    socket.error(error, 'Failed to switch room');
  }
});
```

This comprehensive room targeting system provides sophisticated room management capabilities with proper permissions, moderation tools, and flexible broadcasting options.
