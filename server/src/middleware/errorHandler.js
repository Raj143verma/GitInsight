import { config } from '../config/env.js';

/**
 * Centralized error handler middleware.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      ...(config.nodeEnv === 'development' && { stack: err.stack }),
    },
  });
};
