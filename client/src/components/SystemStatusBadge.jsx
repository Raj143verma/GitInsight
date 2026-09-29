import React, { useEffect, useState } from 'react';
import healthService from '../services/healthService.js';
import './SystemStatusBadge.scss';

export const SystemStatusBadge = ({ onStatusChange }) => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [healthData, setHealthData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkHealth = async () => {
      try {
        const data = await healthService.getHealth();
        if (isMounted) {
          setStatus('connected');
          setHealthData(data);
          if (onStatusChange) onStatusChange({ connected: true, data });
        }
      } catch (err) {
        if (isMounted) {
          setStatus('disconnected');
          setHealthData(null);
          if (onStatusChange) onStatusChange({ connected: false, error: err });
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [onStatusChange]);

  return (
    <div className={`status-badge status-badge--${status}`} title={`API Health: ${status}`}>
      <span className="status-badge__dot" />
      <span className="status-badge__label">
        {status === 'connected' && 'API Online'}
        {status === 'disconnected' && 'API Offline'}
        {status === 'checking' && 'Checking API...'}
      </span>
    </div>
  );
};

export default SystemStatusBadge;
