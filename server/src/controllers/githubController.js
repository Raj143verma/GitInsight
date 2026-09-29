import githubService from '../services/githubService.js';
import syncService from '../services/syncService.js';
import snapshotService from '../services/snapshotService.js';
import {
  normalizeUserProfile,
  normalizeRepositories,
  normalizeActivityEvent,
} from '../utils/githubNormalizer.js';
import GitHubUser from '../models/GitHubUser.js';
import GitHubRepository from '../models/GitHubRepository.js';
import GitHubSnapshot from '../models/GitHubSnapshot.js';

/**
 * Controller handling GitHub API queries, data normalization, persistence, and historical snapshots.
 */
export const githubController = {
  /**
   * Get normalized public GitHub user profile.
   * GET /api/github/users/:username
   */
  async getUser(req, res, next) {
    try {
      const { username } = req.params;
      const rawUser = await githubService.getUserProfile(username);
      const normalizedUser = normalizeUserProfile(rawUser);

      // Check if user has previously been synced into local database
      const dbUser = await GitHubUser.findOne({ username: normalizedUser.username });
      const responseData = {
        ...normalizedUser,
        isSynced: Boolean(dbUser),
        dbLastSyncedAt: dbUser?.lastSyncedAt || null,
      };

      res.status(200).json({
        success: true,
        data: responseData,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get repositories for a user with pagination support.
   * GET /api/github/users/:username/repos?page=1&per_page=30&source=api|db
   */
  async getUserRepos(req, res, next) {
    try {
      const { username } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page, 10) || 30));
      const source = req.query.source === 'db' ? 'db' : 'api';
      const cleanUsername = username.trim().toLowerCase();

      if (source === 'db') {
        const [repos, total] = await Promise.all([
          GitHubRepository.find({ ownerUsername: cleanUsername })
            .sort({ stargazersCount: -1, githubPushedAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .lean(),
          GitHubRepository.countDocuments({ ownerUsername: cleanUsername }),
        ]);

        return res.status(200).json({
          success: true,
          source: 'db',
          pagination: {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage),
          },
          data: repos,
        });
      }

      // Fetch from GitHub REST API directly
      const { repos, count } = await githubService.getUserRepositories(cleanUsername, {
        page,
        perPage,
      });

      const normalizedRepos = normalizeRepositories(repos);

      res.status(200).json({
        success: true,
        source: 'api',
        pagination: {
          page,
          perPage,
          count,
        },
        data: normalizedRepos,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get language byte distribution for a specific repository.
   * GET /api/github/users/:username/repos/:repo/languages
   */
  async getRepoLanguages(req, res, next) {
    try {
      const { username, repo } = req.params;
      const languages = await githubService.getRepositoryLanguages(username, repo);

      res.status(200).json({
        success: true,
        data: {
          owner: username,
          repo,
          languages,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get public activity events for a user.
   * GET /api/github/users/:username/events
   */
  async getUserEvents(req, res, next) {
    try {
      const { username } = req.params;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page, 10) || 30));

      const rawEvents = await githubService.getUserPublicEvents(username, { page, perPage });
      const normalizedEvents = rawEvents.map(normalizeActivityEvent);

      res.status(200).json({
        success: true,
        pagination: {
          page,
          perPage,
          count: normalizedEvents.length,
        },
        data: normalizedEvents,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Trigger complete synchronization for a user profile, repositories, and daily snapshot.
   * POST /api/github/users/:username/sync
   */
  async syncUser(req, res, next) {
    try {
      const { username } = req.params;
      const result = await syncService.syncUser(username);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get historical snapshots for a user.
   * GET /api/github/users/:username/snapshots?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=30
   */
  async getSnapshots(req, res, next) {
    try {
      const { username } = req.params;
      const { from, to, limit, page } = req.query;
      const data = await snapshotService.getSnapshots(username, { from, to, limit, page });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get the latest snapshot for a user.
   * GET /api/github/users/:username/snapshots/latest
   */
  async getLatestSnapshot(req, res, next) {
    try {
      const { username } = req.params;
      const snapshot = await snapshotService.getLatestSnapshot(username);

      res.status(200).json({
        success: true,
        data: snapshot,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Compare two snapshots to calculate metric deltas.
   * GET /api/github/users/:username/snapshots/compare?dateA=YYYY-MM-DD&dateB=YYYY-MM-DD
   */
  async compareSnapshots(req, res, next) {
    try {
      const { username } = req.params;
      const { dateA, dateB } = req.query;
      const cleanUsername = username.toLowerCase().trim();

      let snapA, snapB;

      if (dateA && dateB) {
        [snapA, snapB] = await Promise.all([
          GitHubSnapshot.findOne({ username: cleanUsername, snapshotDate: dateA }).lean(),
          GitHubSnapshot.findOne({ username: cleanUsername, snapshotDate: dateB }).lean(),
        ]);
        if (!snapA || !snapB) {
          const err = new Error(
            `Snapshots not found for comparison (dateA: ${Boolean(snapA)}, dateB: ${Boolean(snapB)})`
          );
          err.statusCode = 404;
          throw err;
        }
      } else {
        // Default: compare the 2 most recent snapshots
        const recentSnapshots = await GitHubSnapshot.find({ username: cleanUsername })
          .sort({ snapshotDate: -1 })
          .limit(2)
          .lean();

        if (recentSnapshots.length < 2) {
          const err = new Error(
            `At least 2 snapshots are required for comparison. Currently found: ${recentSnapshots.length}`
          );
          err.statusCode = 400;
          throw err;
        }
        [snapA, snapB] = recentSnapshots;
      }

      const comparison = snapshotService.compareSnapshots(snapA, snapB);

      res.status(200).json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get repository historical snapshots.
   * GET /api/github/users/:username/repositories/history?repo=name&from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getRepositoryHistory(req, res, next) {
    try {
      const { username } = req.params;
      const { repo, from, to, limit } = req.query;
      const data = await snapshotService.getRepositoryHistory(username, { repo, from, to, limit });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get language byte distribution history.
   * GET /api/github/users/:username/languages/history?from=YYYY-MM-DD&to=YYYY-MM-DD
   */
  async getLanguageHistory(req, res, next) {
    try {
      const { username } = req.params;
      const { from, to } = req.query;
      const data = await snapshotService.getLanguageHistory(username, { from, to });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get GitHub API rate limit status.
   * GET /api/github/rate-limit
   */
  async getRateLimit(req, res, next) {
    try {
      const rateLimitData = await githubService.getRateLimitStatus();
      res.status(200).json({
        success: true,
        data: rateLimitData,
      });
    } catch (error) {
      next(error);
    }
  },
};

export default githubController;
