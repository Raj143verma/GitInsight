import api from './api.js';

/**
 * Service to query GitInsight Skill Evidence Engine endpoints.
 */
export const skillEvidenceService = {
  /**
   * Fetch summary of all detected technologies with evidence and repository counts.
   */
  async getUserSkills(username) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/skills`
    );
    return response.data;
  },

  /**
   * Fetch detailed traceable evidence records for a specific technology.
   */
  async getSkillDetail(username, technologyKey) {
    const response = await api.get(
      `/github/users/${encodeURIComponent(username)}/skills/${encodeURIComponent(technologyKey)}`
    );
    return response.data;
  },
};

export default skillEvidenceService;
