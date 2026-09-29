import { getDatabaseState } from '../config/db.js';
import { config } from '../config/env.js';

/**
 * Controller to handle system health check requests.
 */
export const getHealth = (req, res) => {
  const dbState = getDatabaseState();

  res.status(200).json({
    status: 'ok',
    service: 'GitInsight API',
    environment: config.nodeEnv,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbState,
    },
  });
};
