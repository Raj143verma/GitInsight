import React, { useState, useEffect, useCallback } from 'react';
import healthService from '../services/healthService.js';
import GitHubTester from '../components/GitHubTester.jsx';
import './HomePage.scss';

export const HomePage = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthService.getHealth();
      setHealthData(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message || 'Failed to reach API server');
      setHealthData(null);
      setLastChecked(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="home-page container">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero__badge">
          <span className="badge badge--neutral">
            Phase 7: Job Description Matching &amp; Evidence Mapping Active
          </span>
        </div>
        <h1 className="hero__title">
          GitHub Developer Growth &amp; Career Intelligence
        </h1>
        <p className="hero__subtitle">
          GitInsight provides structured activity analytics, skill evidence extraction,
          and career growth insights for developers and technical recruiters.
        </p>
      </section>

      {/* System Status & Verification Panel */}
      <section className="status-panel">
        <div className="status-panel__header">
          <div>
            <h2 className="status-panel__title">System Connectivity</h2>
            <p className="status-panel__desc">
              Verifying client-to-server communication and database readiness.
            </p>
          </div>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="btn btn--secondary status-panel__refresh-btn"
          >
            {loading ? 'Pinging API...' : 'Ping /api/health'}
          </button>
        </div>

        <div className="status-panel__body">
          <div className="status-card">
            <span className="status-card__label">Frontend Client</span>
            <div className="status-card__value">
              <span className="badge badge--success">Operational</span>
            </div>
            <span className="status-card__meta">React + Vite + SCSS</span>
          </div>

          <div className="status-card">
            <span className="status-card__label">Backend API</span>
            <div className="status-card__value">
              {loading ? (
                <span className="badge badge--warning">Checking...</span>
              ) : healthData ? (
                <span className="badge badge--success">Connected</span>
              ) : (
                <span className="badge badge--danger">Unreachable</span>
              )}
            </div>
            <span className="status-card__meta">Express.js (Port 5000)</span>
          </div>

          <div className="status-card">
            <span className="status-card__label">Database State</span>
            <div className="status-card__value">
              {healthData?.database?.status === 'connected' ? (
                <span className="badge badge--success">Connected</span>
              ) : healthData?.database?.status ? (
                <span className="badge badge--warning">
                  {healthData.database.status}
                </span>
              ) : (
                <span className="badge badge--neutral">Unknown</span>
              )}
            </div>
            <span className="status-card__meta">Mongoose / MongoDB</span>
          </div>

          <div className="status-card">
            <span className="status-card__label">Last Ping</span>
            <div className="status-card__value status-card__value--text">
              {lastChecked || 'Not checked yet'}
            </div>
            <span className="status-card__meta">
              {healthData?.uptime !== undefined
                ? `Uptime: ${healthData.uptime}s`
                : error ? 'Connection error' : 'Awaiting status'}
            </span>
          </div>
        </div>

        {healthData && (
          <div className="status-panel__raw">
            <div className="status-panel__raw-header">
              <span>GET /api/health Response</span>
              <span>HTTP 200 OK</span>
            </div>
            <pre className="status-panel__raw-body">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}

        {error && (
          <div className="status-panel__error">
            <strong>Connection Error:</strong> {error}
            <p className="status-panel__error-hint">
              Ensure the backend server is running on port 5000 (`npm run dev` in `server/`).
            </p>
          </div>
        )}
      </section>

      {/* GitHub Integration Test Suite */}
      <GitHubTester />

      {/* Planned Architecture Pillars */}
      <section className="pillars-section">
        <h2 className="pillars-section__title">Platform Pillars</h2>
        <p className="pillars-section__desc">
          Core capabilities planned for subsequent implementation phases.
        </p>

        <div className="pillars-grid">
          <div className="pillar-card">
            <div className="pillar-card__header">
              <span className="pillar-card__num">01</span>
              <h3 className="pillar-card__title">Activity &amp; History</h3>
            </div>
            <p className="pillar-card__desc">
              Longitudinal tracking of development activity, language distribution, and commit patterns over time.
            </p>
            <ul className="pillar-card__list">
              <li>Profile &amp; historical analytics</li>
              <li>Language and technology trends</li>
              <li>Contribution velocity tracking</li>
            </ul>
          </div>

          <div className="pillar-card">
            <div className="pillar-card__header">
              <span className="pillar-card__num">02</span>
              <h3 className="pillar-card__title">Skill Evidence &amp; Repository Health</h3>
            </div>
            <p className="pillar-card__desc">
              Objective skill assessment derived directly from repository structure, tests, and documentation.
            </p>
            <ul className="pillar-card__list">
              <li>Skill verification from codebases</li>
              <li>Repository health indicators</li>
              <li>Architecture maintainability scoring</li>
            </ul>
          </div>

          <div className="pillar-card">
            <div className="pillar-card__header">
              <span className="pillar-card__num">03</span>
              <h3 className="pillar-card__title">Job Matching &amp; Insights</h3>
            </div>
            <p className="pillar-card__desc">
              Actionable career intelligence matching developer profiles against target job requirements.
            </p>
            <ul className="pillar-card__list">
              <li>Job-description alignment</li>
              <li>Targeted skill gap insights</li>
              <li>Actionable developer growth plans</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
