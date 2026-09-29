import api from './api.js';

/**
 * Service to communicate with GitInsight GitHub API backend endpoints.
 */
export const githubService = {
  /**
   * Fetch normalized GitHub user profile.
   */
  async getUser(username) {
    const response = await api.get(`/github/users/${encodeURIComponent(username)}`);
    return response.data;
  },

  /**
   * Fetch repositories for a GitHub user (supports pagination and source=api|db).
   */
  async getUserRepos(username, { page = 1, perPage = 30, source = 'api' } = {}) {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      source,
    });
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/repos?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Fetch repository language distribution.
   */
  async getRepoLanguages(username, repo) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/repos/${encodeURIComponent(repo)}/languages`
    );
    return response.data;
  },

  /**
   * Trigger complete database synchronization for a GitHub user, repositories, and daily snapshot.
   */
  async syncUser(username) {
    const response = await api.post(`/github/users/${encodeURIComponent(username)}/sync`);
    return response.data;
  },

  /**
   * Fetch historical daily snapshots for a user.
   */
  async getSnapshots(username, { from, to, limit = 30, page = 1 } = {}) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (limit) params.append('limit', String(limit));
    if (page) params.append('page', String(page));

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/snapshots${query}`
    );
    return response.data;
  },

  /**
   * Fetch latest daily snapshot for a user.
   */
  async getLatestSnapshot(username) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/snapshots/latest`
    );
    return response.data;
  },

  /**
   * Compare two snapshots to calculate metric deltas.
   */
  async compareSnapshots(username, { dateA, dateB } = {}) {
    const params = new URLSearchParams();
    if (dateA) params.append('dateA', dateA);
    if (dateB) params.append('dateB', dateB);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/snapshots/compare${query}`
    );
    return response.data;
  },

  /**
   * Fetch repository history across historical snapshots.
   */
  async getRepositoryHistory(username, { repo, from, to, limit = 50 } = {}) {
    const params = new URLSearchParams();
    if (repo) params.append('repo', repo);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (limit) params.append('limit', String(limit));

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/repositories/history${query}`
    );
    return response.data;
  },

  /**
   * Fetch language byte history across historical snapshots.
   */
  async getLanguageHistory(username, { from, to } = {}) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/languages/history${query}`
    );
    return response.data;
  },

  /**
   * Fetch current GitHub API rate limit status.
   */
  async getRateLimit() {
    const response = await api.get('/github/rate-limit');
    return response.data;
  },
};

export default githubService;
