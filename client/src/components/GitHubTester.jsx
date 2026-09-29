import React, { useState } from 'react';
import githubService from '../services/githubService.js';
import analyticsService from '../services/analyticsService.js';
import skillEvidenceService from '../services/skillEvidenceService.js';
import repositoryHealthService from '../services/repositoryHealthService.js';
import jobMatchingService from '../services/jobMatchingService.js';
import './GitHubTester.scss';

export const GitHubTester = () => {
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [activeTab, setActiveTab] = useState('jobMatching'); // 'jobMatching' | 'health' | 'skills' | 'analytics' | 'profile' | 'snapshots' | 'languages' | 'repoHistory'

  // Data states
  const [repositories, setRepositories] = useState([]);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoSource, setRepoSource] = useState('api');

  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [comparison, setComparison] = useState(null);

  const [languageHistory, setLanguageHistory] = useState([]);
  const [repoHistory, setRepoHistory] = useState([]);

  // Analytics state
  const [overviewAnalytics, setOverviewAnalytics] = useState(null);
  const [growthAnalytics, setGrowthAnalytics] = useState(null);
  const [repoActivityAnalytics, setRepoActivityAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Skill Evidence state
  const [skills, setSkills] = useState([]);
  const [skillsLoading, setSkillsLoading] = useState(false);
  const [selectedSkillDetail, setSelectedSkillDetail] = useState(null);
  const [skillDetailLoading, setSkillDetailLoading] = useState(false);

  // Repository Health state
  const [portfolioHealth, setPortfolioHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthStatusFilter, setHealthStatusFilter] = useState('');
  const [healthLangFilter, setHealthLangFilter] = useState('');
  const [healthArchivedFilter, setHealthArchivedFilter] = useState('');
  const [selectedRepoHealth, setSelectedRepoHealth] = useState(null);
  const [singleHealthLoading, setSingleHealthLoading] = useState(false);

  // Job Matching state
  const [jobTitleInput, setJobTitleInput] = useState('');
  const [jobDescriptionInput, setJobDescriptionInput] = useState('');
  const [jobMatchResult, setJobMatchResult] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [jobMatchHistory, setJobMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [jobRequirementFilter, setJobRequirementFilter] = useState('all'); // 'all' | 'matched' | 'no_evidence' | 'required' | 'preferred'
  const [matchError, setMatchError] = useState(null);

  const [error, setError] = useState(null);

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    if (!usernameInput.trim()) return;

    setLoading(true);
    setError(null);
    setSyncResult(null);
    setRepositories([]);
    setSnapshots([]);
    setComparison(null);
    setOverviewAnalytics(null);
    setSkills([]);
    setSelectedSkillDetail(null);
    setPortfolioHealth(null);
    setSelectedRepoHealth(null);

    const cleanUser = usernameInput.trim();

    try {
      const response = await githubService.getUser(cleanUser);
      setUserProfile(response.data);

      fetchRepos(cleanUser, 'api');
      fetchSnapshots(cleanUser);
      if (response.data.isSynced) {
        fetchAnalytics(cleanUser);
        fetchSkills(cleanUser);
        fetchHealthData(cleanUser);
      }
    } catch (err) {
      setError(err.message || 'Failed to lookup GitHub user');
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!usernameInput.trim()) return;

    setSyncing(true);
    setError(null);

    const cleanUser = usernameInput.trim();

    try {
      const response = await githubService.syncUser(cleanUser);
      setSyncResult(response.summary);
      if (response.user) {
        setUserProfile((prev) => ({
          ...prev,
          ...response.user,
          isSynced: true,
          dbLastSyncedAt: response.user.lastSyncedAt,
        }));
      }
      fetchRepos(cleanUser, 'db');
      fetchSnapshots(cleanUser);
      fetchAnalytics(cleanUser);
      fetchSkills(cleanUser);
      fetchHealthData(cleanUser);
    } catch (err) {
      setError(err.message || 'Synchronization failed');
    } finally {
      setSyncing(false);
    }
  };

  const fetchRepos = async (username, source) => {
    setRepoLoading(true);
    setRepoSource(source);
    try {
      const response = await githubService.getUserRepos(username, {
        page: 1,
        perPage: 15,
        source,
      });
      setRepositories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
    } finally {
      setRepoLoading(false);
    }
  };

  const fetchSnapshots = async (username) => {
    setSnapshotsLoading(true);
    try {
      const response = await githubService.getSnapshots(username, { limit: 15 });
      const snapList = response.data?.snapshots || [];
      setSnapshots(snapList);

      if (snapList.length >= 2) {
        try {
          const compRes = await githubService.compareSnapshots(username);
          setComparison(compRes.data);
        } catch {
          setComparison(null);
        }
      } else {
        setComparison(null);
      }

      fetchHistories(username);
    } catch (err) {
      console.error('Failed to fetch snapshots:', err);
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const fetchHistories = async (username) => {
    try {
      const [langRes, repoRes] = await Promise.all([
        githubService.getLanguageHistory(username),
        githubService.getRepositoryHistory(username, { limit: 15 }),
      ]);
      setLanguageHistory(langRes.data?.history || []);
      setRepoHistory(repoRes.data?.history || []);
    } catch (err) {
      console.error('Failed to fetch historical trends:', err);
    }
  };

  const fetchAnalytics = async (username) => {
    setAnalyticsLoading(true);
    try {
      const [overviewRes, growthRes, activityRes] = await Promise.all([
        analyticsService.getOverview(username),
        analyticsService.getRepositoryGrowth(username),
        analyticsService.getRepositoryActivity(username),
      ]);
      setOverviewAnalytics(overviewRes.data);
      setGrowthAnalytics(growthRes.data);
      setRepoActivityAnalytics(activityRes.data);
    } catch (err) {
      console.warn('Analytics unavailable for user:', err.message);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchSkills = async (username) => {
    setSkillsLoading(true);
    try {
      const response = await skillEvidenceService.getUserSkills(username);
      setSkills(response.data?.skills || []);
    } catch (err) {
      console.warn('Skills unavailable for user:', err.message);
    } finally {
      setSkillsLoading(false);
    }
  };

  const inspectSkillDetail = async (username, techKey) => {
    setSkillDetailLoading(true);
    try {
      const response = await skillEvidenceService.getSkillDetail(username, techKey);
      setSelectedSkillDetail(response.data);
    } catch (err) {
      console.error('Failed to fetch skill detail:', err);
    } finally {
      setSkillDetailLoading(false);
    }
  };

  const fetchHealthData = async (username, customFilters = null) => {
    setHealthLoading(true);
    try {
      const filters = customFilters || {
        status: healthStatusFilter || undefined,
        language: healthLangFilter || undefined,
        archived: healthArchivedFilter !== '' ? healthArchivedFilter : undefined,
      };
      const response = await repositoryHealthService.getPortfolioHealth(username, filters);
      setPortfolioHealth(response.data);
    } catch (err) {
      console.warn('Repository health unavailable for user:', err.message);
    } finally {
      setHealthLoading(false);
    }
  };

  const inspectRepoHealth = async (username, repoName) => {
    setSingleHealthLoading(true);
    try {
      const response = await repositoryHealthService.getSingleRepositoryHealth(username, repoName);
      setSelectedRepoHealth(response.data);
    } catch (err) {
      console.error('Failed to fetch repository health details:', err);
    } finally {
      setSingleHealthLoading(false);
    }
  };

  const fetchJobMatchHistory = async (username) => {
    setHistoryLoading(true);
    try {
      const response = await jobMatchingService.getUserJobMatches(username);
      setJobMatchHistory(response.data?.matches || []);
    } catch (err) {
      console.warn('Job match history unavailable:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSubmitJobMatch = async (e) => {
    if (e) e.preventDefault();
    if (!userProfile?.username || !jobDescriptionInput.trim()) return;

    setMatchingLoading(true);
    setMatchError(null);

    try {
      const response = await jobMatchingService.matchJobDescription(userProfile.username, {
        title: jobTitleInput.trim() || 'Untitled Job Description',
        jobDescription: jobDescriptionInput.trim(),
      });
      setJobMatchResult(response.data);
      fetchJobMatchHistory(userProfile.username);
    } catch (err) {
      setMatchError(err.message || 'Failed to generate Job Description match');
    } finally {
      setMatchingLoading(false);
    }
  };

  const loadJobMatch = async (matchId) => {
    if (!userProfile?.username || !matchId) return;
    setMatchingLoading(true);
    setMatchError(null);
    try {
      const response = await jobMatchingService.getJobMatchById(userProfile.username, matchId);
      setJobMatchResult(response.data);
      if (response.data.title) setJobTitleInput(response.data.title);
      if (response.data.rawText) setJobDescriptionInput(response.data.rawText);
    } catch (err) {
      setMatchError(err.message || 'Failed to load past job match');
    } finally {
      setMatchingLoading(false);
    }
  };

  const applySampleJd = (presetType) => {
    if (presetType === 'fullstack') {
      setJobTitleInput('Full Stack Developer (React & Node.js)');
      setJobDescriptionInput(`# Full Stack Developer

Requirements:
- Strong proficiency in JavaScript, TypeScript, and React.js.
- Solid experience building backend REST APIs with Node.js and Express.js.
- Hands-on experience with MongoDB and PostgreSQL databases.
- Familiarity with Docker for containerized development.

Preferred Qualifications:
- Experience with Next.js is a plus.
- Knowledge of Redis caching and Python/FastAPI is nice to have.
- Exposure to Kubernetes and CI/CD pipelines.`);
    } else if (presetType === 'backend') {
      setJobTitleInput('Backend Python & Database Engineer');
      setJobDescriptionInput(`# Backend Python Engineer

Requirements:
- Strong proficiency in Python (3.x) with FastAPI or Django.
- Experience with relational databases like PostgreSQL and MySQL.
- Containerization experience using Docker.
- Understanding of Git version control.

Preferred Qualifications:
- Experience with Redis and background task workers.
- Familiarity with AWS or GCP cloud services.
- Basic understanding of TypeScript and React.`);
    } else if (presetType === 'frontend') {
      setJobTitleInput('Senior Frontend Engineer (React/TypeScript)');
      setJobDescriptionInput(`# Senior Frontend Engineer

Requirements:
- In-depth mastery of modern JavaScript, TypeScript, HTML, CSS, and SCSS.
- Extensive production experience with React.js and component architecture.
- Experience consuming REST APIs and writing unit tests.

Preferred Qualifications:
- Experience with Next.js or Vue.js is a plus.
- Familiarity with Docker and Node.js build tooling.
- Knowledge of GraphQL and Tailwind CSS.`);
    }
  };

  return (
    <section className="github-tester">
      <div className="github-tester__header">
        <div>
          <h2 className="github-tester__title">GitHub Integration, Skill Evidence &amp; Job Description Matching</h2>
          <p className="github-tester__desc">
            Extract verified technology evidence from codebases, evaluate repository health indicators, and map job description requirements to observable GitHub evidence.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleLookup} className="github-tester__form">
        <div className="github-tester__input-group">
          <input
            type="text"
            className="github-tester__input"
            placeholder="Enter GitHub username (e.g. torvalds, octocat)"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            disabled={loading || syncing}
          />
          <button
            type="submit"
            className="btn btn--primary github-tester__btn"
            disabled={loading || syncing || !usernameInput.trim()}
          >
            {loading ? 'Fetching...' : 'Lookup Profile'}
          </button>
          <button
            type="button"
            onClick={handleSync}
            className="btn btn--secondary github-tester__btn"
            disabled={loading || syncing || !usernameInput.trim()}
          >
            {syncing ? 'Syncing & Extracting Evidence...' : 'Sync & Extract Evidence'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="github-tester__error">
          <strong>Request Error:</strong> {error}
        </div>
      )}

      {/* Sync Success Summary */}
      {syncResult && (
        <div className="github-tester__sync-banner">
          <div className="github-tester__sync-badge">
            <span className="badge badge--success">Synced &amp; Evidence Extracted</span>
          </div>
          <p className="github-tester__sync-text">
            Stored <strong>{syncResult.repositoriesCount}</strong> repositories, captured snapshot{' '}
            <code>{syncResult.snapshotDate}</code>, and verified{' '}
            <strong>{syncResult.skillEvidenceCount || 0}</strong> observable skill evidence records.
          </p>
        </div>
      )}

      {/* Profile & Historical Tabs */}
      {userProfile && (
        <div className="github-tester__profile-card">
          {/* Header Profile Row */}
          <div className="github-tester__profile-main">
            {userProfile.avatarUrl && (
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.username}
                className="github-tester__avatar"
              />
            )}
            <div className="github-tester__profile-details">
              <div className="github-tester__name-row">
                <h3 className="github-tester__name">{userProfile.name || userProfile.username}</h3>
                <span className="github-tester__username">@{userProfile.username}</span>
                {userProfile.isSynced && (
                  <span className="badge badge--success">Persisted in DB</span>
                )}
              </div>
              {userProfile.bio && <p className="github-tester__bio">{userProfile.bio}</p>}
              <div className="github-tester__meta-row">
                {userProfile.company && (
                  <span className="github-tester__meta-item">
                    <strong>Company:</strong> {userProfile.company}
                  </span>
                )}
                {userProfile.location && (
                  <span className="github-tester__meta-item">
                    <strong>Location:</strong> {userProfile.location}
                  </span>
                )}
                {userProfile.profileUrl && (
                  <a
                    href={userProfile.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="github-tester__profile-link"
                  >
                    View on GitHub &rarr;
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="github-tester__stats-grid">
            <div className="github-tester__stat">
              <span className="github-tester__stat-label">Public Repos</span>
              <span className="github-tester__stat-value">{userProfile.publicReposCount}</span>
            </div>
            <div className="github-tester__stat">
              <span className="github-tester__stat-label">Followers</span>
              <span className="github-tester__stat-value">{userProfile.followersCount}</span>
            </div>
            <div className="github-tester__stat">
              <span className="github-tester__stat-label">Following</span>
              <span className="github-tester__stat-value">{userProfile.followingCount}</span>
            </div>
            <div className="github-tester__stat">
              <span className="github-tester__stat-label">Skills Detected</span>
              <span className="github-tester__stat-value">{skills.length}</span>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="github-tester__tabs">
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'jobMatching' ? 'github-tester__tab--active' : ''}`}
              onClick={() => {
                setActiveTab('jobMatching');
                if (userProfile?.username && jobMatchHistory.length === 0) {
                  fetchJobMatchHistory(userProfile.username);
                }
              }}
            >
              Job Matching {jobMatchResult ? `(${jobMatchResult.summary.matchedCount}/${jobMatchResult.summary.totalRequirements})` : ''}
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'health' ? 'github-tester__tab--active' : ''}`}
              onClick={() => {
                setActiveTab('health');
                if (userProfile.username && !portfolioHealth) {
                  fetchHealthData(userProfile.username);
                }
              }}
            >
              Repository Health ({portfolioHealth ? portfolioHealth.repositoriesCount : '...'})
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'skills' ? 'github-tester__tab--active' : ''}`}
              onClick={() => {
                setActiveTab('skills');
                if (userProfile.username && skills.length === 0) {
                  fetchSkills(userProfile.username);
                }
              }}
            >
              Skill Evidence ({skills.length})
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'analytics' ? 'github-tester__tab--active' : ''}`}
              onClick={() => {
                setActiveTab('analytics');
                if (userProfile.username && !overviewAnalytics) {
                  fetchAnalytics(userProfile.username);
                }
              }}
            >
              Analytics Engine
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'profile' ? 'github-tester__tab--active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              Repositories ({repositories.length})
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'snapshots' ? 'github-tester__tab--active' : ''}`}
              onClick={() => setActiveTab('snapshots')}
            >
              Historical Snapshots ({snapshots.length})
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'languages' ? 'github-tester__tab--active' : ''}`}
              onClick={() => setActiveTab('languages')}
            >
              Language Distribution
            </button>
            <button
              type="button"
              className={`github-tester__tab ${activeTab === 'repoHistory' ? 'github-tester__tab--active' : ''}`}
              onClick={() => setActiveTab('repoHistory')}
            >
              Repository History
            </button>
          </div>

          {/* Tab: Job Description Matching & Evidence Mapping */}
          {activeTab === 'jobMatching' && (
            <div className="github-tester__tab-content">
              <div className="github-tester__disclaimer-box">
                <strong>Observable Evidence Mapping:</strong> Compares explicit technology requirements in a Job Description against verified GitHub evidence in MongoDB.
                <p className="github-tester__disclaimer-text">
                  GitInsight reports observable evidence only. It does not predict candidate suitability, employability ratings, hiring probability, or assign subjective scores.
                </p>
              </div>

              {/* JD Input & Presets */}
              <div className="github-tester__jd-input-card">
                <div className="github-tester__jd-presets-row">
                  <span className="github-tester__jd-presets-label">Sample Presets:</span>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => applySampleJd('fullstack')}
                    disabled={matchingLoading}
                  >
                    Full Stack (React/Node)
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => applySampleJd('backend')}
                    disabled={matchingLoading}
                  >
                    Backend (Python/FastAPI)
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => applySampleJd('frontend')}
                    disabled={matchingLoading}
                  >
                    Frontend (React/TS)
                  </button>
                </div>

                <form onSubmit={handleSubmitJobMatch} className="github-tester__jd-form">
                  <div className="github-tester__jd-title-row">
                    <input
                      type="text"
                      className="github-tester__input"
                      placeholder="Target Job Title (e.g. Full Stack Developer Intern)"
                      value={jobTitleInput}
                      onChange={(e) => setJobTitleInput(e.target.value)}
                      disabled={matchingLoading}
                    />
                  </div>
                  <textarea
                    className="github-tester__jd-textarea"
                    rows={8}
                    placeholder="Paste full Job Description text here (e.g. Requirements, preferred qualifications, technologies needed)..."
                    value={jobDescriptionInput}
                    onChange={(e) => setJobDescriptionInput(e.target.value)}
                    disabled={matchingLoading}
                  />
                  <div className="github-tester__jd-actions">
                    <button
                      type="submit"
                      className="btn btn--primary"
                      disabled={matchingLoading || !jobDescriptionInput.trim()}
                    >
                      {matchingLoading ? 'Comparing Requirements...' : 'Compare Against Stored Evidence'}
                    </button>
                    {jobMatchHistory.length > 0 && (
                      <span className="github-tester__history-count-text">
                        {jobMatchHistory.length} previous match(es) recorded
                      </span>
                    )}
                  </div>
                </form>

                {matchError && (
                  <div className="github-tester__error" style={{ marginTop: '0.75rem' }}>
                    <strong>Matching Error:</strong> {matchError}
                  </div>
                )}
              </div>

              {/* Match Results View */}
              {jobMatchResult && (
                <div className="github-tester__jd-results-layout">
                  {/* Summary Header */}
                  <div className="github-tester__analytics-section">
                    <div className="github-tester__jd-result-head">
                      <div>
                        <h4 className="github-tester__analytics-title">
                          Match Results: <strong>{jobMatchResult.title}</strong>
                        </h4>
                        <p className="github-tester__jd-meta-text">
                          Evaluated against observable GitHub evidence &bull;{' '}
                          {new Date(jobMatchResult.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="github-tester__stats-grid">
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Total Requirements</span>
                        <span className="github-tester__stat-value">
                          {jobMatchResult.summary.totalRequirements}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Matched with Evidence</span>
                        <span className="github-tester__stat-value text-pos">
                          {jobMatchResult.summary.matchedCount}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">No Observable Evidence</span>
                        <span className="github-tester__stat-value text-neg">
                          {jobMatchResult.summary.noEvidenceCount}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Required Skills Matched</span>
                        <span className="github-tester__stat-value">
                          {jobMatchResult.summary.matchedRequiredCount} / {jobMatchResult.summary.requiredCount}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Preferred Skills Matched</span>
                        <span className="github-tester__stat-value">
                          {jobMatchResult.summary.matchedPreferredCount} / {jobMatchResult.summary.preferredCount}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Evidence Coverage</span>
                        <span className="github-tester__stat-value">
                          {jobMatchResult.summary.coveragePercentage}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Requirements Filter Tabs */}
                  <div className="github-tester__jd-filter-pills">
                    <button
                      type="button"
                      className={`github-tester__jd-pill ${jobRequirementFilter === 'all' ? 'github-tester__jd-pill--active' : ''}`}
                      onClick={() => setJobRequirementFilter('all')}
                    >
                      All ({jobMatchResult.summary.totalRequirements})
                    </button>
                    <button
                      type="button"
                      className={`github-tester__jd-pill ${jobRequirementFilter === 'matched' ? 'github-tester__jd-pill--active' : ''}`}
                      onClick={() => setJobRequirementFilter('matched')}
                    >
                      Matched with Evidence ({jobMatchResult.summary.matchedCount})
                    </button>
                    <button
                      type="button"
                      className={`github-tester__jd-pill ${jobRequirementFilter === 'no_evidence' ? 'github-tester__jd-pill--active' : ''}`}
                      onClick={() => setJobRequirementFilter('no_evidence')}
                    >
                      No Observable Evidence ({jobMatchResult.summary.noEvidenceCount})
                    </button>
                    <button
                      type="button"
                      className={`github-tester__jd-pill ${jobRequirementFilter === 'required' ? 'github-tester__jd-pill--active' : ''}`}
                      onClick={() => setJobRequirementFilter('required')}
                    >
                      Required Only ({jobMatchResult.summary.requiredCount})
                    </button>
                    <button
                      type="button"
                      className={`github-tester__jd-pill ${jobRequirementFilter === 'preferred' ? 'github-tester__jd-pill--active' : ''}`}
                      onClick={() => setJobRequirementFilter('preferred')}
                    >
                      Preferred Only ({jobMatchResult.summary.preferredCount})
                    </button>
                  </div>

                  {/* Requirements Cards List */}
                  <div className="github-tester__jd-requirements-list">
                    {jobMatchResult.requirements
                      .filter((r) => {
                        if (jobRequirementFilter === 'matched') return r.matchStatus === 'matched';
                        if (jobRequirementFilter === 'no_evidence')
                          return r.matchStatus === 'no_observable_evidence';
                        if (jobRequirementFilter === 'required') return r.category === 'required';
                        if (jobRequirementFilter === 'preferred') return r.category === 'preferred';
                        return true;
                      })
                      .map((req, idx) => {
                        const isMatched = req.matchStatus === 'matched';
                        const isUnrecognized = req.recognitionStatus === 'unrecognized';

                        let categoryBadgeClass = 'badge--neutral';
                        if (req.category === 'required') categoryBadgeClass = 'badge--danger';
                        else if (req.category === 'preferred') categoryBadgeClass = 'badge--info';

                        return (
                          <div
                            key={`${req.technologyKey}-${idx}`}
                            className={`github-tester__jd-req-card ${isMatched ? 'github-tester__jd-req-card--matched' : 'github-tester__jd-req-card--unmatched'}`}
                          >
                            <div className="github-tester__jd-req-head">
                              <div className="github-tester__jd-req-title-group">
                                <h4 className="github-tester__jd-req-name">{req.technology}</h4>
                                <span className={`badge ${categoryBadgeClass}`}>
                                  {req.category.toUpperCase()}
                                </span>
                                {isUnrecognized && (
                                  <span className="badge badge--neutral">Unrecognized Tech</span>
                                )}
                              </div>

                              <span
                                className={`badge ${isMatched ? 'badge--success' : 'badge--neutral'}`}
                              >
                                {isMatched
                                  ? `✓ Observable Evidence (${req.evidenceCount} records in ${req.repositoryCount} repos)`
                                  : isUnrecognized
                                    ? 'Unrecognized Requirement'
                                    : 'No Observable GitHub Evidence'}
                              </span>
                            </div>

                            {/* Extracted Context */}
                            {req.sampleSnippets && req.sampleSnippets.length > 0 && (
                              <div className="github-tester__jd-req-snippets">
                                <span className="github-tester__jd-snippet-label">JD Context:</span>
                                {req.sampleSnippets.map((snippet, sIdx) => (
                                  <p key={sIdx} className="github-tester__jd-snippet-line">
                                    &ldquo;{snippet}&rdquo;
                                  </p>
                                ))}
                              </div>
                            )}

                            {/* Observable Evidence Proof Trail */}
                            {isMatched && req.repositories && req.repositories.length > 0 && (
                              <div className="github-tester__jd-evidence-trail">
                                <span className="github-tester__jd-trail-title">
                                  Supporting Repositories:
                                </span>
                                <div className="github-tester__jd-repos-list">
                                  {req.repositories.map((repo, rIdx) => (
                                    <div key={rIdx} className="github-tester__jd-repo-item">
                                      <a
                                        href={repo.repositoryUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="github-tester__jd-repo-link"
                                      >
                                        {repo.repository} &rarr;
                                      </a>
                                      <div className="github-tester__evidence-pills">
                                        {repo.evidenceTypes.map((type) => (
                                          <span
                                            key={type}
                                            className="github-tester__evidence-pill"
                                          >
                                            {type}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Previous Match History Drawer */}
                  {jobMatchHistory.length > 1 && (
                    <div className="github-tester__jd-history-box">
                      <h4 className="github-tester__analytics-title">Previous Matches for User</h4>
                      <div className="github-tester__jd-history-list">
                        {jobMatchHistory.map((pastMatch) => (
                          <div key={pastMatch.id} className="github-tester__jd-history-item">
                            <div>
                              <strong>{pastMatch.title}</strong>
                              <span className="github-tester__jd-history-date">
                                {new Date(pastMatch.createdAt).toLocaleDateString()}
                              </span>
                              <span className="github-tester__jd-history-summary">
                                {pastMatch.summary?.matchedCount || 0} /{' '}
                                {pastMatch.summary?.totalRequirements || 0} matched (
                                {pastMatch.summary?.coveragePercentage || 0}%)
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => loadJobMatch(pastMatch.id)}
                            >
                              Load Match
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Repository Health & Maintenance Analytics */}
          {activeTab === 'health' && (
            <div className="github-tester__tab-content">
              <div className="github-tester__disclaimer-box">
                <strong>Observable Repository Health:</strong> Reports observable maintenance recency, project activity, and documentation signals.
                <p className="github-tester__disclaimer-text">
                  GitInsight reports observable evidence only. It does not calculate arbitrary numeric "health scores" or judge code quality.
                </p>
              </div>

              {healthLoading ? (
                <p className="github-tester__repo-loading">Computing repository health indicators...</p>
              ) : !portfolioHealth ? (
                <p className="github-tester__repo-empty">
                  Repository health available after syncing. Click "Sync &amp; Extract Evidence" above.
                </p>
              ) : (
                <div className="github-tester__health-layout">
                  {/* Portfolio Overview Summary */}
                  <div className="github-tester__analytics-section">
                    <h4 className="github-tester__analytics-title">Portfolio Maintenance Overview</h4>
                    <div className="github-tester__stats-grid">
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Total Repos</span>
                        <span className="github-tester__stat-value">{portfolioHealth.portfolio.totalRepositories}</span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Active / Recent</span>
                        <span className="github-tester__stat-value text-pos">
                          {portfolioHealth.portfolio.activeRepositories}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Low Activity</span>
                        <span className="github-tester__stat-value">
                          {portfolioHealth.portfolio.lowActivityRepositories}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Inactive (&gt;1yr)</span>
                        <span className="github-tester__stat-value">
                          {portfolioHealth.portfolio.inactiveRepositories}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Archived</span>
                        <span className="github-tester__stat-value">
                          {portfolioHealth.portfolio.archivedRepositories}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">With Topics</span>
                        <span className="github-tester__stat-value">
                          {portfolioHealth.portfolio.repositoriesWithTopics}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">With License</span>
                        <span className="github-tester__stat-value">
                          {portfolioHealth.portfolio.repositoriesWithLicense}
                        </span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Open Issues</span>
                        <span className="github-tester__stat-value">
                          {portfolioHealth.portfolio.totalOpenIssues}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filter Controls Bar */}
                  <div className="github-tester__health-filters">
                    <div className="github-tester__filter-group">
                      <label htmlFor="health-status-select" className="github-tester__filter-label">Maintenance Status:</label>
                      <select
                        id="health-status-select"
                        className="github-tester__filter-select"
                        value={healthStatusFilter}
                        onChange={(e) => {
                          setHealthStatusFilter(e.target.value);
                          fetchHealthData(userProfile.username, {
                            status: e.target.value || undefined,
                            language: healthLangFilter || undefined,
                            archived: healthArchivedFilter !== '' ? healthArchivedFilter : undefined,
                          });
                        }}
                      >
                        <option value="">All Statuses</option>
                        <option value="recently_active">Recently Active (&le; 30d)</option>
                        <option value="active">Active (31&ndash;90d)</option>
                        <option value="low_recent_activity">Low Recent Activity (91&ndash;365d)</option>
                        <option value="inactive">Inactive (&gt; 365d)</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="github-tester__filter-group">
                      <label htmlFor="health-lang-input" className="github-tester__filter-label">Language:</label>
                      <input
                        id="health-lang-input"
                        type="text"
                        placeholder="e.g. JavaScript, Python"
                        className="github-tester__filter-input"
                        value={healthLangFilter}
                        onChange={(e) => setHealthLangFilter(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            fetchHealthData(userProfile.username, {
                              status: healthStatusFilter || undefined,
                              language: healthLangFilter || undefined,
                              archived: healthArchivedFilter !== '' ? healthArchivedFilter : undefined,
                            });
                          }
                        }}
                      />
                    </div>

                    <div className="github-tester__filter-group">
                      <label htmlFor="health-archived-select" className="github-tester__filter-label">Archived:</label>
                      <select
                        id="health-archived-select"
                        className="github-tester__filter-select"
                        value={healthArchivedFilter}
                        onChange={(e) => {
                          setHealthArchivedFilter(e.target.value);
                          fetchHealthData(userProfile.username, {
                            status: healthStatusFilter || undefined,
                            language: healthLangFilter || undefined,
                            archived: e.target.value !== '' ? e.target.value : undefined,
                          });
                        }}
                      >
                        <option value="">All Repos</option>
                        <option value="false">Exclude Archived</option>
                        <option value="true">Archived Only</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="btn btn--secondary btn--sm github-tester__filter-btn"
                      onClick={() => {
                        fetchHealthData(userProfile.username, {
                          status: healthStatusFilter || undefined,
                          language: healthLangFilter || undefined,
                          archived: healthArchivedFilter !== '' ? healthArchivedFilter : undefined,
                        });
                      }}
                    >
                      Apply Filter
                    </button>

                    {(healthStatusFilter || healthLangFilter || healthArchivedFilter !== '') && (
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm github-tester__filter-btn"
                        onClick={() => {
                          setHealthStatusFilter('');
                          setHealthLangFilter('');
                          setHealthArchivedFilter('');
                          fetchHealthData(userProfile.username, {});
                        }}
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>

                  {/* Repositories Health List */}
                  <div className="github-tester__health-list-header">
                    <h4>
                      Repositories ({portfolioHealth.repositories.length} of {portfolioHealth.totalRepositories})
                    </h4>
                  </div>

                  {portfolioHealth.repositories.length === 0 ? (
                    <p className="github-tester__repo-empty">No repositories match the selected filters.</p>
                  ) : (
                    <div className="github-tester__health-grid">
                      {portfolioHealth.repositories.map((item) => {
                        const { repository, maintenance, documentation, activity } = item;
                        const isSelected = selectedRepoHealth?.repository?.name === repository.name;

                        let statusBadgeClass = 'badge--neutral';
                        if (maintenance.status === 'recently_active') statusBadgeClass = 'badge--success';
                        else if (maintenance.status === 'active') statusBadgeClass = 'badge--info';
                        else if (maintenance.status === 'low_recent_activity') statusBadgeClass = 'badge--warning';
                        else if (maintenance.status === 'archived') statusBadgeClass = 'badge--danger';

                        return (
                          <div
                            key={repository.id || repository.name}
                            className={`github-tester__health-card ${isSelected ? 'github-tester__health-card--active' : ''}`}
                          >
                            <div className="github-tester__health-card-head">
                              <div className="github-tester__health-title-group">
                                <a
                                  href={repository.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="github-tester__health-repo-name"
                                >
                                  {repository.name}
                                </a>
                                <span className="badge badge--neutral">{repository.primaryLanguage}</span>
                                {repository.isFork && <span className="badge badge--neutral">Fork</span>}
                              </div>
                              <span className={`badge ${statusBadgeClass}`}>
                                {maintenance.status}
                                {maintenance.daysSinceLastPush !== null
                                  ? ` (${maintenance.daysSinceLastPush}d ago)`
                                  : ''}
                              </span>
                            </div>

                            {repository.description && (
                              <p className="github-tester__health-card-desc">{repository.description}</p>
                            )}

                            {/* Documentation & Metadata Signals */}
                            <div className="github-tester__signals-row">
                              <span
                                className={`github-tester__signal-tag ${documentation.hasDescription ? 'github-tester__signal-tag--yes' : 'github-tester__signal-tag--no'}`}
                              >
                                {documentation.hasDescription ? '✓ Desc' : '✗ No Desc'}
                              </span>
                              <span
                                className={`github-tester__signal-tag ${documentation.hasHomepage ? 'github-tester__signal-tag--yes' : 'github-tester__signal-tag--no'}`}
                              >
                                {documentation.hasHomepage ? '✓ Web' : '✗ No Web'}
                              </span>
                              <span
                                className={`github-tester__signal-tag ${documentation.hasLicense ? 'github-tester__signal-tag--yes' : 'github-tester__signal-tag--no'}`}
                              >
                                ⚖ {documentation.license}
                              </span>
                              <span
                                className={`github-tester__signal-tag ${documentation.hasTopics ? 'github-tester__signal-tag--yes' : 'github-tester__signal-tag--no'}`}
                              >
                                🏷 {documentation.topics.length} topics
                              </span>
                              {documentation.hasReadme !== null && (
                                <span
                                  className={`github-tester__signal-tag ${documentation.hasReadme ? 'github-tester__signal-tag--yes' : 'github-tester__signal-tag--no'}`}
                                >
                                  {documentation.hasReadme ? '✓ README' : '✗ No README'}
                                </span>
                              )}
                            </div>

                            {/* Activity Counters & Action */}
                            <div className="github-tester__health-card-foot">
                              <div className="github-tester__health-counters">
                                <span>★ {activity.stars}</span>
                                <span>⑂ {activity.forks}</span>
                                <span>Issues: {activity.openIssues}</span>
                                <span>{(activity.sizeKB / 1024).toFixed(1)} MB</span>
                              </div>
                              <button
                                type="button"
                                className="btn btn--secondary btn--sm github-tester__inspect-health-btn"
                                onClick={() => inspectRepoHealth(userProfile.username, repository.name)}
                              >
                                Details &amp; History &rarr;
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Selected Repository History & Details Drawer */}
                  {selectedRepoHealth && (
                    <div className="github-tester__repo-detail-panel">
                      <div className="github-tester__repo-detail-header">
                        <div>
                          <h4>
                            Repository Health Indicators: <strong>{selectedRepoHealth.repository.name}</strong>
                          </h4>
                          <p className="github-tester__repo-detail-subtitle">
                            {selectedRepoHealth.repository.fullName} &bull; Primary Language:{' '}
                            {selectedRepoHealth.repository.primaryLanguage}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn--secondary github-tester__close-btn"
                          onClick={() => setSelectedRepoHealth(null)}
                        >
                          &times; Close
                        </button>
                      </div>

                      {singleHealthLoading ? (
                        <p className="github-tester__repo-loading">Loading repository indicators...</p>
                      ) : (
                        <div className="github-tester__repo-detail-body">
                          {/* Current Observable Signals */}
                          <div className="github-tester__health-detail-grid">
                            <div className="github-tester__detail-box">
                              <h5>Maintenance State</h5>
                              <p>
                                <strong>Status:</strong>{' '}
                                <code>{selectedRepoHealth.current.maintenance.status}</code>
                              </p>
                              <p>
                                <strong>Push Recency:</strong>{' '}
                                {selectedRepoHealth.current.maintenance.daysSinceLastPush !== null
                                  ? `${selectedRepoHealth.current.maintenance.daysSinceLastPush} days ago`
                                  : 'Date unavailable'}
                              </p>
                              <p>
                                <strong>Last Push (UTC):</strong>{' '}
                                <code>
                                  {selectedRepoHealth.current.maintenance.lastPushedAt || 'Unavailable'}
                                </code>
                              </p>
                              <p>
                                <strong>Archived:</strong>{' '}
                                {selectedRepoHealth.repository.isArchived ? 'Yes' : 'No'}
                              </p>
                            </div>

                            <div className="github-tester__detail-box">
                              <h5>Documentation Signals</h5>
                              <p>
                                <strong>Description:</strong>{' '}
                                {selectedRepoHealth.current.documentation.hasDescription ? 'Present' : 'None'}
                              </p>
                              <p>
                                <strong>Homepage:</strong>{' '}
                                {selectedRepoHealth.current.documentation.hasHomepage ? 'Present' : 'None'}
                              </p>
                              <p>
                                <strong>License:</strong> {selectedRepoHealth.current.documentation.license}
                              </p>
                              <p>
                                <strong>Topics:</strong>{' '}
                                {selectedRepoHealth.current.documentation.topics.length > 0
                                  ? selectedRepoHealth.current.documentation.topics.join(', ')
                                  : 'None'}
                              </p>
                            </div>

                            <div className="github-tester__detail-box">
                              <h5>Activity Counters</h5>
                              <p>
                                <strong>Open Issues:</strong> {selectedRepoHealth.current.activity.openIssues}
                              </p>
                              <p>
                                <strong>Stargazers:</strong> ★ {selectedRepoHealth.current.activity.stars}
                              </p>
                              <p>
                                <strong>Forks:</strong> ⑂ {selectedRepoHealth.current.activity.forks}
                              </p>
                              <p>
                                <strong>Repository Size:</strong>{' '}
                                {(selectedRepoHealth.current.activity.sizeKB / 1024).toFixed(1)} MB
                              </p>
                            </div>
                          </div>

                          {/* Historical Maintenance Trends */}
                          <div className="github-tester__history-section">
                            <h5>Historical Repository Snapshots ({selectedRepoHealth.history.length})</h5>
                            {selectedRepoHealth.history.length === 0 ? (
                              <p className="github-tester__repo-empty">
                                No historical repository snapshots recorded yet.
                              </p>
                            ) : (
                              <div className="github-tester__table-wrap">
                                <table className="github-tester__table">
                                  <thead>
                                    <tr>
                                      <th>Snapshot Date</th>
                                      <th>Stars</th>
                                      <th>Forks</th>
                                      <th>Open Issues</th>
                                      <th>Watchers</th>
                                      <th>Size</th>
                                      <th>Last Pushed At</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedRepoHealth.history.map((snap) => (
                                      <tr key={snap.date}>
                                        <td>
                                          <code>{snap.date}</code>
                                        </td>
                                        <td>★ {snap.stars}</td>
                                        <td>⑂ {snap.forks}</td>
                                        <td>{snap.openIssues}</td>
                                        <td>{snap.watchers}</td>
                                        <td>{(snap.sizeKB / 1024).toFixed(1)} MB</td>
                                        <td className="github-tester__table-time">
                                          {snap.lastPushedAt
                                            ? new Date(snap.lastPushedAt).toLocaleDateString()
                                            : 'N/A'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Skill Evidence Engine */}
          {activeTab === 'skills' && (
            <div className="github-tester__tab-content">
              <div className="github-tester__disclaimer-box">
                <strong>Observable Evidence Principle:</strong> Technologies below are detected strictly through observable repository evidence (manifest dependencies, language distribution, file configurations, and topics).
                <p className="github-tester__disclaimer-text">
                  GitInsight preserves transparent proof trails linking each technology to its source repositories. This does not represent an arbitrary skill score.
                </p>
              </div>

              {skillsLoading ? (
                <p className="github-tester__repo-loading">Detecting skill evidence...</p>
              ) : skills.length === 0 ? (
                <p className="github-tester__repo-empty">
                  No skill evidence records found. Click "Sync &amp; Extract Evidence" above.
                </p>
              ) : (
                <div className="github-tester__skills-layout">
                  <div className="github-tester__skills-grid">
                    {skills.map((skill) => (
                      <div
                        key={skill.technologyKey}
                        className={`github-tester__skill-card ${
                          selectedSkillDetail?.technologyKey === skill.technologyKey
                            ? 'github-tester__skill-card--active'
                            : ''
                        }`}
                        onClick={() => inspectSkillDetail(userProfile.username, skill.technologyKey)}
                      >
                        <div className="github-tester__skill-header">
                          <h4 className="github-tester__skill-title">{skill.technology}</h4>
                          <span className="badge badge--neutral">{skill.category}</span>
                        </div>
                        <div className="github-tester__skill-stats">
                          <span>
                            <strong>{skill.evidenceCount}</strong> evidence records
                          </span>
                          <span>
                            in <strong>{skill.repositoryCount}</strong> repos
                          </span>
                        </div>
                        <div className="github-tester__evidence-pills">
                          {skill.evidenceTypes.map((type) => (
                            <span key={type} className="github-tester__evidence-pill">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Evidence Trail Box */}
                  {selectedSkillDetail && (
                    <div className="github-tester__skill-detail-panel">
                      <div className="github-tester__skill-detail-header">
                        <div>
                          <h4>
                            Evidence Trail: <strong>{selectedSkillDetail.technology}</strong>
                          </h4>
                          <p className="github-tester__skill-detail-subtitle">
                            {selectedSkillDetail.evidenceCount} verified evidence records
                          </p>
                        </div>
                        <button
                          type="button"
                          className="btn btn--secondary github-tester__close-btn"
                          onClick={() => setSelectedSkillDetail(null)}
                        >
                          &times; Close
                        </button>
                      </div>

                      {skillDetailLoading ? (
                        <p className="github-tester__repo-loading">Loading evidence details...</p>
                      ) : (
                        <div className="github-tester__evidence-list">
                          {selectedSkillDetail.evidence.map((item, idx) => (
                            <div key={idx} className="github-tester__evidence-item">
                              <div className="github-tester__evidence-item-head">
                                <span className="badge badge--neutral">{item.type}</span>
                                <a
                                  href={item.repositoryUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="github-tester__evidence-repo-link"
                                >
                                  {item.repository} &rarr;
                                </a>
                              </div>
                              <p className="github-tester__evidence-desc">{item.description}</p>
                              <div className="github-tester__evidence-meta">
                                <span>
                                  <strong>Source:</strong> {item.source}
                                </span>
                                <span>
                                  <strong>Observed:</strong>{' '}
                                  {new Date(item.lastObservedAt || item.observedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Analytics Engine */}
          {activeTab === 'analytics' && (
            <div className="github-tester__tab-content">
              {analyticsLoading ? (
                <p className="github-tester__repo-loading">Computing analytics...</p>
              ) : !overviewAnalytics ? (
                <p className="github-tester__repo-empty">
                  Analytics available after syncing to MongoDB. Click "Sync &amp; Extract Evidence" above.
                </p>
              ) : (
                <div className="github-tester__analytics-grid">
                  <div className="github-tester__analytics-section">
                    <h4 className="github-tester__analytics-title">Repository Aggregate Overview</h4>
                    <div className="github-tester__stats-grid">
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Total Stars</span>
                        <span className="github-tester__stat-value">★ {overviewAnalytics.repositories.totalStars}</span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Total Forks</span>
                        <span className="github-tester__stat-value">⑂ {overviewAnalytics.repositories.totalForks}</span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Open Issues</span>
                        <span className="github-tester__stat-value">{overviewAnalytics.repositories.totalOpenIssues}</span>
                      </div>
                      <div className="github-tester__stat">
                        <span className="github-tester__stat-label">Total Size</span>
                        <span className="github-tester__stat-value">
                          {(overviewAnalytics.repositories.totalSizeKB / 1024).toFixed(1)} MB
                        </span>
                      </div>
                    </div>
                  </div>

                  {growthAnalytics?.growthSummary && (
                    <div className="github-tester__comparison-card">
                      <h4 className="github-tester__comparison-title">
                        Period Growth Deltas ({growthAnalytics.growthSummary.observedPeriod.from} &rarr;{' '}
                        {growthAnalytics.growthSummary.observedPeriod.to})
                      </h4>
                      <div className="github-tester__comparison-grid">
                        <div className="github-tester__delta-item">
                          <span>Stars Growth</span>
                          <strong className={growthAnalytics.growthSummary.starsGrowth.absoluteChange >= 0 ? 'text-pos' : 'text-neg'}>
                            {growthAnalytics.growthSummary.starsGrowth.absoluteChange >= 0 ? '+' : ''}
                            {growthAnalytics.growthSummary.starsGrowth.absoluteChange} ({growthAnalytics.growthSummary.starsGrowth.percentageChange}%)
                          </strong>
                        </div>
                        <div className="github-tester__delta-item">
                          <span>Followers Growth</span>
                          <strong className={growthAnalytics.growthSummary.followersGrowth.absoluteChange >= 0 ? 'text-pos' : 'text-neg'}>
                            {growthAnalytics.growthSummary.followersGrowth.absoluteChange >= 0 ? '+' : ''}
                            {growthAnalytics.growthSummary.followersGrowth.absoluteChange} ({growthAnalytics.growthSummary.followersGrowth.percentageChange}%)
                          </strong>
                        </div>
                        <div className="github-tester__delta-item">
                          <span>Repositories Growth</span>
                          <strong className={growthAnalytics.growthSummary.repositoriesGrowth.absoluteChange >= 0 ? 'text-pos' : 'text-neg'}>
                            {growthAnalytics.growthSummary.repositoriesGrowth.absoluteChange >= 0 ? '+' : ''}
                            {growthAnalytics.growthSummary.repositoriesGrowth.absoluteChange}
                          </strong>
                        </div>
                        <div className="github-tester__delta-item">
                          <span>Forks Growth</span>
                          <strong className={growthAnalytics.growthSummary.forksGrowth.absoluteChange >= 0 ? 'text-pos' : 'text-neg'}>
                            {growthAnalytics.growthSummary.forksGrowth.absoluteChange >= 0 ? '+' : ''}
                            {growthAnalytics.growthSummary.forksGrowth.absoluteChange}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {overviewAnalytics.languages.distribution.length > 0 && (
                    <div className="github-tester__analytics-section">
                      <h4 className="github-tester__analytics-title">Repository Language Breakdown</h4>
                      <div className="github-tester__lang-bars">
                        {overviewAnalytics.languages.distribution.map((lang) => (
                          <div key={lang.name} className="github-tester__lang-bar-row">
                            <div className="github-tester__lang-bar-info">
                              <span className="github-tester__lang-name">{lang.name}</span>
                              <span className="github-tester__lang-percent">
                                {lang.percentage}% ({(lang.value / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <div className="github-tester__progress-track">
                              <div
                                className="github-tester__progress-fill"
                                style={{ width: `${Math.max(2, lang.percentage)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {repoActivityAnalytics && (
                    <div className="github-tester__analytics-section">
                      <h4 className="github-tester__analytics-title">Repository Push Activity Freshness</h4>
                      <div className="github-tester__activity-freshness-grid">
                        <div className="github-tester__freshness-badge">
                          <span>Active &le; 30 Days</span>
                          <strong>{repoActivityAnalytics.activityFreshness.pushedLast30Days} repos</strong>
                        </div>
                        <div className="github-tester__freshness-badge">
                          <span>Active &le; 90 Days</span>
                          <strong>{repoActivityAnalytics.activityFreshness.pushedLast90Days} repos</strong>
                        </div>
                        <div className="github-tester__freshness-badge">
                          <span>Active &le; 365 Days</span>
                          <strong>{repoActivityAnalytics.activityFreshness.pushedLast365Days} repos</strong>
                        </div>
                        <div className="github-tester__freshness-badge">
                          <span>Inactive &gt; 1 Year</span>
                          <strong>{repoActivityAnalytics.activityFreshness.inactiveOverYear} repos</strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="github-tester__disclaimer-box">
                    <strong>Observable Public Activity:</strong> {overviewAnalytics.activity.observablePublicEventsCount} recent public events observed.
                    <p className="github-tester__disclaimer-text">
                      {overviewAnalytics.activity.dataAvailability?.notes ||
                        'Scope limited to public events exposed by GitHub REST API.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Current Repositories */}
          {activeTab === 'profile' && (
            <div className="github-tester__tab-content">
              <div className="github-tester__repos-header">
                <h4>Repositories ({repositories.length})</h4>
                <div className="github-tester__source-toggle">
                  <span className="github-tester__source-label">Source:</span>
                  <button
                    type="button"
                    className={`github-tester__source-btn ${
                      repoSource === 'api' ? 'github-tester__source-btn--active' : ''
                    }`}
                    onClick={() => fetchRepos(userProfile.username, 'api')}
                    disabled={repoLoading}
                  >
                    GitHub REST API
                  </button>
                  <button
                    type="button"
                    className={`github-tester__source-btn ${
                      repoSource === 'db' ? 'github-tester__source-btn--active' : ''
                    }`}
                    onClick={() => fetchRepos(userProfile.username, 'db')}
                    disabled={repoLoading}
                  >
                    MongoDB Storage
                  </button>
                </div>
              </div>

              {repoLoading ? (
                <p className="github-tester__repo-loading">Loading repositories...</p>
              ) : repositories.length === 0 ? (
                <p className="github-tester__repo-empty">No repositories found.</p>
              ) : (
                <div className="github-tester__repos-list">
                  {repositories.map((repo) => (
                    <div key={repo.githubRepoId || repo._id} className="github-tester__repo-item">
                      <div className="github-tester__repo-info">
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="github-tester__repo-name"
                        >
                          {repo.name}
                        </a>
                        {repo.description && (
                          <p className="github-tester__repo-desc">{repo.description}</p>
                        )}
                      </div>
                      <div className="github-tester__repo-meta">
                        <span className="badge badge--neutral">
                          {repo.primaryLanguage || 'Unknown'}
                        </span>
                        <span className="github-tester__repo-stars">★ {repo.stargazersCount}</span>
                        <span className="github-tester__repo-forks">⑂ {repo.forksCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Historical Snapshots & Deltas */}
          {activeTab === 'snapshots' && (
            <div className="github-tester__tab-content">
              {comparison && (
                <div className="github-tester__comparison-card">
                  <h4 className="github-tester__comparison-title">
                    Snapshot Delta Analysis ({comparison.earlierSnapshotDate} &rarr; {comparison.laterSnapshotDate})
                  </h4>
                  <p className="github-tester__comparison-subtitle">
                    Difference across {comparison.daysApart} day(s) interval.
                  </p>
                  <div className="github-tester__comparison-grid">
                    <div className="github-tester__delta-item">
                      <span>Followers &Delta;</span>
                      <strong className={comparison.profileDeltas.followersDelta >= 0 ? 'text-pos' : 'text-neg'}>
                        {comparison.profileDeltas.followersDelta >= 0 ? '+' : ''}
                        {comparison.profileDeltas.followersDelta}
                      </strong>
                    </div>
                    <div className="github-tester__delta-item">
                      <span>Stars &Delta;</span>
                      <strong className={comparison.repositoryDeltas.starsDelta >= 0 ? 'text-pos' : 'text-neg'}>
                        {comparison.repositoryDeltas.starsDelta >= 0 ? '+' : ''}
                        {comparison.repositoryDeltas.starsDelta}
                      </strong>
                    </div>
                    <div className="github-tester__delta-item">
                      <span>Forks &Delta;</span>
                      <strong className={comparison.repositoryDeltas.forksDelta >= 0 ? 'text-pos' : 'text-neg'}>
                        {comparison.repositoryDeltas.forksDelta >= 0 ? '+' : ''}
                        {comparison.repositoryDeltas.forksDelta}
                      </strong>
                    </div>
                    <div className="github-tester__delta-item">
                      <span>Repositories &Delta;</span>
                      <strong className={comparison.repositoryDeltas.totalRepositoriesDelta >= 0 ? 'text-pos' : 'text-neg'}>
                        {comparison.repositoryDeltas.totalRepositoriesDelta >= 0 ? '+' : ''}
                        {comparison.repositoryDeltas.totalRepositoriesDelta}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {snapshotsLoading ? (
                <p className="github-tester__repo-loading">Loading snapshots...</p>
              ) : snapshots.length === 0 ? (
                <p className="github-tester__repo-empty">
                  No historical snapshots recorded yet. Click "Sync &amp; Extract Evidence" to create one.
                </p>
              ) : (
                <div className="github-tester__table-wrap">
                  <table className="github-tester__table">
                    <thead>
                      <tr>
                        <th>Date (UTC)</th>
                        <th>Repos</th>
                        <th>Stars</th>
                        <th>Forks</th>
                        <th>Followers</th>
                        <th>Public Events</th>
                        <th>Captured At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((snap) => (
                        <tr key={snap._id || snap.snapshotDate}>
                          <td>
                            <code>{snap.snapshotDate}</code>
                          </td>
                          <td>{snap.repositoryMetrics?.totalRepositories || 0}</td>
                          <td>★ {snap.repositoryMetrics?.totalStars || 0}</td>
                          <td>⑂ {snap.repositoryMetrics?.totalForks || 0}</td>
                          <td>{snap.profileMetrics?.followersCount || 0}</td>
                          <td>{snap.activityMetrics?.publicEventsCount || 0}</td>
                          <td className="github-tester__table-time">
                            {new Date(snap.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Language Distribution */}
          {activeTab === 'languages' && (
            <div className="github-tester__tab-content">
              {snapshots.length > 0 && snapshots[0].languagesAggregate ? (
                <div className="github-tester__languages-view">
                  <h4>Aggregated Language Bytes (Snapshot: {snapshots[0].snapshotDate})</h4>
                  <div className="github-tester__table-wrap">
                    <table className="github-tester__table">
                      <thead>
                        <tr>
                          <th>Language</th>
                          <th>Raw Bytes</th>
                          <th>Formatted Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(snapshots[0].languagesAggregate).map(([lang, bytes]) => (
                          <tr key={lang}>
                            <td>
                              <strong>{lang}</strong>
                            </td>
                            <td>
                              <code>{bytes.toLocaleString()} bytes</code>
                            </td>
                            <td>{(bytes / 1024).toFixed(1)} KB</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="github-tester__repo-empty">
                  No language aggregate data in latest snapshot.
                </p>
              )}
            </div>
          )}

          {/* Tab: Repository History */}
          {activeTab === 'repoHistory' && (
            <div className="github-tester__tab-content">
              {repoHistory.length === 0 ? (
                <p className="github-tester__repo-empty">No repository history snapshots recorded yet.</p>
              ) : (
                <div className="github-tester__table-wrap">
                  <table className="github-tester__table">
                    <thead>
                      <tr>
                        <th>Repository</th>
                        <th>Snapshot Date</th>
                        <th>Language</th>
                        <th>Stars</th>
                        <th>Forks</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repoHistory.map((item) => (
                        <tr key={item._id || `${item.githubRepoId}-${item.snapshotDate}`}>
                          <td>
                            <strong>{item.name}</strong>
                          </td>
                          <td>
                            <code>{item.snapshotDate}</code>
                          </td>
                          <td>{item.primaryLanguage}</td>
                          <td>★ {item.stargazersCount}</td>
                          <td>⑂ {item.forksCount}</td>
                          <td>{item.openIssuesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default GitHubTester;
