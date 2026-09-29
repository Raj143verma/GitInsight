import repositoryHealthService from '../services/repositoryHealthService.js';

/**
 * Controller exposing observable repository health, maintenance indicators, and historical trends.
 */
export const repositoryHealthController = {
  /**
   * Get repository health and maintenance summary across user's portfolio.
   * GET /api/github/users/:username/repository-health?status=active&language=JavaScript&archived=false&from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getRepositoryHealthSummary(req, res, next) {
    try {
      const { username } = req.params;
      const filters = {
        status: req.query.status,
        language: req.query.language,
        archived: req.query.archived,
        from: req.query.from,
        to: req.query.to,
      };

      const data = await repositoryHealthService.getPortfolioHealth(username, filters);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get detailed observable health and historical trends for a single repository.
   * GET /api/github/users/:username/repository-health/:repository
   */
  async getSingleRepositoryHealth(req, res, next) {
    try {
      const { username, repository } = req.params;
      const data = await repositoryHealthService.getSingleRepositoryHealth(username, repository);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default repositoryHealthController;
