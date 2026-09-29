import skillEvidenceService from '../services/skillEvidenceService.js';

/**
 * Controller handling skill evidence endpoints.
 */
export const skillEvidenceController = {
  /**
   * Get summary of all detected skills/technologies for a user.
   * GET /api/github/users/:username/skills
   */
  async getSkills(req, res, next) {
    try {
      const { username } = req.params;
      const data = await skillEvidenceService.getUserSkillsSummary(username);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get traceable evidence detail for a specific technology.
   * GET /api/github/users/:username/skills/:technology
   */
  async getSkillDetail(req, res, next) {
    try {
      const { username, technology } = req.params;
      const data = await skillEvidenceService.getSkillEvidenceDetail(username, technology);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default skillEvidenceController;
