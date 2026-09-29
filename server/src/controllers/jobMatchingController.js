import jobMatchingService from '../services/jobMatchingService.js';

/**
 * Controller handling Job Description matching and evidence mapping queries.
 */
export const jobMatchingController = {
  /**
   * Submit Job Description text and match against stored Skill Evidence.
   * POST /api/github/users/:username/job-matches
   */
  async createMatch(req, res, next) {
    try {
      const { username } = req.params;
      const { title, jobDescription } = req.body;

      const data = await jobMatchingService.matchJobDescription(username, {
        title,
        jobDescription,
      });

      res.status(201).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get list of previously saved job matches for a user.
   * GET /api/github/users/:username/job-matches?limit=20&page=1
   */
  async getMatches(req, res, next) {
    try {
      const { username } = req.params;
      const { limit, page } = req.query;

      const data = await jobMatchingService.getUserJobMatches(username, {
        limit,
        page,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get a single saved job match by ID with resolved evidence trails.
   * GET /api/github/users/:username/job-matches/:id
   */
  async getMatchById(req, res, next) {
    try {
      const { username, id } = req.params;

      const data = await jobMatchingService.getJobMatchById(username, id);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default jobMatchingController;
