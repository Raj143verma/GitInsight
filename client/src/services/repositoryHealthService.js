import api from './api.js';

/**
 * Service to query GitInsight Repository Health & Maintenance Analytics endpoints.
 */
export const repositoryHealthService = {
  /**
   * Fetch portfolio health summary and filtered repositories for a user.
   */
  async getPortfolioHealth(username, filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.language) params.append('language', filters.language);
    if (filters.archived !== undefined && filters.archived !== '') {
      params.append('archived', String(filters.archived));
    }
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/repository-health${queryString}`
    );
    return response.data;
  },

  /**
   * Fetch detailed observable health indicators and historical snapshot records for a single repository.
   */
  async getSingleRepositoryHealth(username, repository) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/repository-health/${encodeURIComponent(repository)}`
    );
    return response.data;
  },
};

export default repositoryHealthService;
