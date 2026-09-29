import mongoose from 'mongoose';
import { config } from './env.js';

/**
 * Connect to MongoDB instance using Mongoose.
 * Non-blocking error handling ensures the API server can still respond to health checks
 * even if the database is temporarily unreachable or starting up.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[Database] MongoDB connection error: ${error.message}`);
    // Do not crash server process; report status in health endpoint
    return null;
  }
};

/**
 * Helper to inspect the current connection state.
 */
export const getDatabaseState = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};
