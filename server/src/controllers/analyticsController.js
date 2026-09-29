import analyticsService from '../services/analyticsService.js';

/**
 * Controller handling developer analytics endpoints.
 */
export const analyticsController = {
  /**
   * Get consolidated developer overview analytics.
   * GET /api/github/users/:username/analytics/overview
   */
  async getOverview(req, res, next) {
    try {
      const { username } = req.params;
      const data = await analyticsService.getDeveloperOverview(username);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get historical repository growth metrics time-series.
   * GET /api/github/users/:username/analytics/repositories?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getRepositoryGrowth(req, res, next) {
    try {
      const { username } = req.params;
      const { from, to } = req.query;
      const data = await analyticsService.getRepositoryGrowth(username, { from, to });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get language byte distribution and historical trend.
   * GET /api/github/users/:username/analytics/languages?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getLanguageAnalytics(req, res, next) {
    try {
      const { username } = req.params;
      const { from, to } = req.query;
      const data = await analyticsService.getLanguageAnalytics(username, { from, to });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get repository activity freshness and composition patterns.
   * GET /api/github/users/:username/analytics/repositories/activity
   */
  async getRepositoryActivity(req, res, next) {
    try {
      const { username } = req.params;
      const data = await analyticsService.getRepositoryActivity(username);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get observable activity trends time-series.
   * GET /api/github/users/:username/analytics/activity?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getActivityTrends(req, res, next) {
    try {
      const { username } = req.params;
      const { from, to } = req.query;
      const data = await analyticsService.getActivityTrends(username, { from, to });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default analyticsController;
