import api from './api.js';

/**
 * Service to query GitInsight Job Description Matching & Evidence Mapping endpoints.
 */
export const jobMatchingService = {
  /**
   * Submit Job Description text and compute match against user's SkillEvidence.
   */
  async matchJobDescription(username, { title, jobDescription }) {
    const response = await api.post(
      `/github/users/${encodeURIComponent(username)}/job-matches`,
      { title, jobDescription }
    );
    return response.data;
  },

  /**
   * Retrieve list of previously saved job matches for a user.
   */
  async getUserJobMatches(username, { limit = 20, page = 1 } = {}) {
    const params = new URLSearchParams({
      limit: String(limit),
      page: String(page),
    });
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/job-matches?${params.toString()}`
    );
    return response.data;
  },

  /**
   * Retrieve a specific job match by ID with resolved evidence.
   */
  async getJobMatchById(username, matchId) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/job-matches/${encodeURIComponent(matchId)}`
    );
    return response.data;
  },
};

export default jobMatchingService;
