import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mtaaha';

let io: SocketIOServer;

export const initializeSocket = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.data.userId}`);

    // Join user's personal room for notifications
    socket.join(`user:${socket.data.userId}`);

    // Join task room
    socket.on('join:task', (taskId: string) => {
      socket.join(`task:${taskId}`);
      console.log(`User ${socket.data.userId} joined task room: ${taskId}`);
    });

    // Leave task room
    socket.on('leave:task', (taskId: string) => {
      socket.leave(`task:${taskId}`);
      console.log(`User ${socket.data.userId} left task room: ${taskId}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.data.userId}`);
    });
  });

  console.log('✅ Socket.IO initialized');
  
  return io;
};

// Emit task-related events
export const emitTaskEvent = (event: string, data: any) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  // Emit to all connected clients
  if (event === 'task:created' || event === 'task:deleted') {
    io.emit(event, data);
  }
  
  // Emit to specific task room
  if (event === 'task:updated' || event === 'bid:created') {
    const taskId = data.taskId || data.id;
    if (taskId) {
      io.to(`task:${taskId}`).emit(event, data);
    }
  }

  // Emit bid accepted to specific user
  if (event === 'bid:accepted' && data.bidderId) {
    io.to(`user:${data.bidderId}`).emit(event, data);
  }
};

// Emit notification to specific user
export const emitNotification = (userId: string, notification: any) => {
  if (!io) {
    console.warn('Socket.IO not initialized');
    return;
  }

  io.to(`user:${userId}`).emit('notification:new', notification);
};

// Get IO instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export default { initializeSocket, emitTaskEvent, emitNotification, getIO };
