import api from './api.js';

/**
 * Service to query GitInsight developer analytics endpoints.
 */
export const analyticsService = {
  /**
   * Fetch consolidated developer overview analytics.
   */
  async getOverview(username) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/analytics/overview`
    );
    return response.data;
  },

  /**
   * Fetch repository growth time-series and period deltas.
   */
  async getRepositoryGrowth(username, { from, to } = {}) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/analytics/repositories${query}`
    );
    return response.data;
  },

  /**
   * Fetch repository push activity patterns and freshness.
   */
  async getRepositoryActivity(username) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/analytics/repositories/activity`
    );
    return response.data;
  },

  /**
   * Fetch language byte distribution and historical trends.
   */
  async getLanguageAnalytics(username, { from, to } = {}) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/analytics/languages${query}`
    );
    return response.data;
  },

  /**
   * Fetch observable activity trends time-series.
   */
  async getActivityTrends(username, { from, to } = {}) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/analytics/activity${query}`
    );
    return response.data;
  },
};

export default analyticsService;
