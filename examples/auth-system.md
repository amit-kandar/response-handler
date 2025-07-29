# Authentication System Example

This example demonstrates how to build a complete authentication system using the response handler.

## Complete Authentication Server

```javascript
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { configureResponseHandler } from '@amitkandar/response-handler';

const app = express();

// Configure response handler
app.use(configureResponseHandler({
  logging: {
    enabled: true,
    level: 'info'
  },
  security: {
    enableCors: true,
    rateLimiting: {
      windowMs: 900000, // 15 minutes
      maxRequests: 100
    }
  }
}));

app.use(express.json());

// Mock user database
const users = [];
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Registration endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.sendValidationError([
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' },
        { field: 'name', message: 'Name is required' }
      ]);
    }
    
    // Check if user exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.sendError('USER_EXISTS', 'User with this email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name,
      createdAt: new Date().toISOString()
    };
    
    users.push(user);
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Return success response (exclude password)
    const { password: _, ...userResponse } = user;
    res.sendCreated({
      user: userResponse,
      token
    }, 'User registered successfully');
    
  } catch (error) {
    res.sendError('REGISTRATION_FAILED', 'Failed to register user', error.message);
  }
});

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.sendValidationError([
        { field: 'email', message: 'Email is required' },
        { field: 'password', message: 'Password is required' }
      ]);
    }
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.sendError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.sendError('INVALID_CREDENTIALS', 'Invalid email or password');
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    
    // Return success response
    const { password: _, ...userResponse } = user;
    res.sendSuccess({
      user: userResponse,
      token
    }, 'Login successful');
    
  } catch (error) {
    res.sendError('LOGIN_FAILED', 'Failed to login', error.message);
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.sendError('UNAUTHORIZED', 'Access token required');
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendError('FORBIDDEN', 'Invalid or expired token');
    }
    
    req.user = user;
    next();
  });
};

// Protected profile endpoint
app.get('/auth/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.sendNotFound('User not found');
  }
  
  const { password, ...userProfile } = user;
  res.sendSuccess(userProfile, 'Profile retrieved successfully');
});

// Update profile endpoint
app.put('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.userId;
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.sendNotFound('User not found');
    }
    
    // Check if new email is already taken
    if (email && email !== users[userIndex].email) {
      const emailExists = users.find(u => u.email === email && u.id !== userId);
      if (emailExists) {
        return res.sendError('EMAIL_EXISTS', 'Email already taken by another user');
      }
    }
    
    // Update user
    if (name) users[userIndex].name = name;
    if (email) users[userIndex].email = email;
    users[userIndex].updatedAt = new Date().toISOString();
    
    const { password, ...updatedUser } = users[userIndex];
    res.sendUpdated(updatedUser, 'Profile updated successfully');
    
  } catch (error) {
    res.sendError('UPDATE_FAILED', 'Failed to update profile', error.message);
  }
});

// Change password endpoint
app.post('/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    if (!currentPassword || !newPassword) {
      return res.sendValidationError([
        { field: 'currentPassword', message: 'Current password is required' },
        { field: 'newPassword', message: 'New password is required' }
      ]);
    }
    
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.sendNotFound('User not found');
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[userIndex].password);
    if (!isValidPassword) {
      return res.sendError('INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    users[userIndex].password = hashedNewPassword;
    users[userIndex].updatedAt = new Date().toISOString();
    
    res.sendSuccess(null, 'Password changed successfully');
    
  } catch (error) {
    res.sendError('PASSWORD_CHANGE_FAILED', 'Failed to change password', error.message);
  }
});

// Logout endpoint (token blacklisting would be implemented here)
app.post('/auth/logout', authenticateToken, (req, res) => {
  // In a real application, you would blacklist the token
  // For this example, we'll just return success
  res.sendSuccess(null, 'Logged out successfully');
});

// Refresh token endpoint
app.post('/auth/refresh', authenticateToken, (req, res) => {
  try {
    // Generate new token
    const newToken = jwt.sign(
      { userId: req.user.userId, email: req.user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.sendSuccess({ token: newToken }, 'Token refreshed successfully');
    
  } catch (error) {
    res.sendError('TOKEN_REFRESH_FAILED', 'Failed to refresh token', error.message);
  }
});

// Delete account endpoint
app.delete('/auth/account', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.sendNotFound('User not found');
    }
    
    users.splice(userIndex, 1);
    res.sendDeleted('Account deleted successfully');
    
  } catch (error) {
    res.sendError('DELETE_ACCOUNT_FAILED', 'Failed to delete account', error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Authentication server running on port ${PORT}`);
});
```

## Socket.IO Authentication

```javascript
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createSocketHandler } from '@amitkandar/response-handler';

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Apply response handler
io.use(createSocketHandler());

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    socket.sendError('UNAUTHORIZED', 'Authentication required');
    return next(new Error('Authentication required'));
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      socket.sendError('FORBIDDEN', 'Invalid token');
      return next(new Error('Invalid token'));
    }
    
    socket.user = user;
    next();
  });
});

// Handle connections
io.on('connection', (socket) => {
  console.log(`User ${socket.user.email} connected`);
  
  // Join user to personal room
  socket.join(`user:${socket.user.userId}`);
  
  socket.sendSuccess('connection', {
    userId: socket.user.userId,
    email: socket.user.email
  }, 'Connected successfully');
  
  // Handle profile updates
  socket.on('update_profile', (data) => {
    try {
      // Update user profile logic here
      socket.sendSuccess('profile_updated', data, 'Profile updated');
      
      // Notify other sessions of the same user
      socket.to(`user:${socket.user.userId}`).emit('profile_changed', data);
      
    } catch (error) {
      socket.sendError('UPDATE_FAILED', 'Failed to update profile', error.message);
    }
  });
  
  // Handle logout
  socket.on('logout', () => {
    socket.leave(`user:${socket.user.userId}`);
    socket.sendSuccess('logout', null, 'Logged out successfully');
    socket.disconnect();
  });
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.email} disconnected`);
  });
});
```

## Frontend Integration

```javascript
// React hook for authentication
import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

// Axios interceptor for authentication
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);
  
  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`);
      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (email, password) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.data.token);
      setUser(response.data.data.user);
      return { success: true };
    } else {
      return { success: false, error: response.data.error };
    }
  };
  
  const register = async (email, password, name) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      password,
      name
    });
    
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.data.token);
      setUser(response.data.data.user);
      return { success: true };
    } else {
      return { success: false, error: response.data.error };
    }
  };
  
  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };
  
  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };
};
```

## Key Features

- **Complete authentication flow** with registration, login, logout
- **JWT token management** with refresh capabilities
- **Password hashing** using bcrypt
- **Input validation** and error handling
- **Protected routes** with middleware
- **Socket.IO authentication** for real-time features
- **Frontend integration** with React hooks
- **Security best practices** implemented throughout
