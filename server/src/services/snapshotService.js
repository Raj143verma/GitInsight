import GitHubSnapshot from '../models/GitHubSnapshot.js';
import GitHubRepositorySnapshot from '../models/GitHubRepositorySnapshot.js';

/**
 * Service to manage historical daily snapshots of GitHub profiles, repositories, and aggregate languages.
 */
export const snapshotService = {
  /**
   * Builds and persists a daily historical snapshot for a user.
   * If a snapshot already exists for the UTC day, it updates that day's record (idempotent).
   */
  async buildAndPersistSnapshot({ user, repositories = [], events = [], dateOverride = null }) {
    if (!user || !user.githubId || !user.username) {
      throw new Error('User profile with valid githubId and username is required for snapshot');
    }

    const cleanUsername = user.username.toLowerCase().trim();
    const snapshotDate = dateOverride || new Date().toISOString().split('T')[0];
    const timestamp = dateOverride
      ? new Date(`${dateOverride}T00:00:00.000Z`)
      : new Date();

    // 1. Calculate repository aggregate metrics
    let totalStars = 0;
    let totalForks = 0;
    let totalWatchers = 0;
    let totalOpenIssues = 0;
    let totalSize = 0;
    let forkedReposCount = 0;
    let archivedReposCount = 0;
    const primaryLanguageBreakdown = {};
    const languagesAggregate = {};

    for (const repo of repositories) {
      totalStars += repo.stargazersCount || 0;
      totalForks += repo.forksCount || 0;
      totalWatchers += repo.watchersCount || 0;
      totalOpenIssues += repo.openIssuesCount || 0;
      totalSize += repo.size || 0;

      if (repo.isFork) forkedReposCount += 1;
      if (repo.isArchived) archivedReposCount += 1;

      const lang = repo.primaryLanguage || 'Unknown';
      primaryLanguageBreakdown[lang] = (primaryLanguageBreakdown[lang] || 0) + 1;

      // Sum raw byte counts if repo languages are available
      if (repo.languages) {
        const repoLangs =
          repo.languages instanceof Map
            ? Object.fromEntries(repo.languages)
            : repo.languages;

        for (const [langName, bytes] of Object.entries(repoLangs)) {
          languagesAggregate[langName] =
            (languagesAggregate[langName] || 0) + (Number(bytes) || 0);
        }
      }
    }

    // 2. Aggregate activity metrics from public events
    const recentEventsByType = {};
    for (const event of events) {
      const type = event.type || 'UnknownEvent';
      recentEventsByType[type] = (recentEventsByType[type] || 0) + 1;
    }

    // 3. Upsert daily GitHubSnapshot
    const snapshot = await GitHubSnapshot.findOneAndUpdate(
      { githubId: user.githubId, snapshotDate },
      {
        $set: {
          username: cleanUsername,
          timestamp,
          profileMetrics: {
            publicReposCount: user.publicReposCount || 0,
            publicGistsCount: user.publicGistsCount || 0,
            followersCount: user.followersCount || 0,
            followingCount: user.followingCount || 0,
          },
          repositoryMetrics: {
            totalRepositories: repositories.length,
            totalStars,
            totalForks,
            totalWatchers,
            totalOpenIssues,
            totalSize,
            forkedReposCount,
            archivedReposCount,
            primaryLanguageBreakdown,
          },
          languagesAggregate,
          activityMetrics: {
            publicEventsCount: events.length,
            recentEventsByType,
            dataAvailability: {
              eventsWindow: 'last_300_public_events_or_90_days',
              isCompleteHistory: false,
              privateActivityIncluded: false,
              notes:
                'Observable public events from GitHub REST API. Full historical commit log is not provided by public events endpoint.',
            },
          },
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Bulk upsert daily repository snapshots
    if (repositories.length > 0) {
      const repoSnapshotOps = repositories.map((repo) => ({
        updateOne: {
          filter: {
            githubRepoId: repo.githubRepoId,
            snapshotDate,
          },
          update: {
            $set: {
              ownerUsername: cleanUsername,
              name: repo.name,
              fullName: repo.fullName,
              timestamp,
              stargazersCount: repo.stargazersCount || 0,
              forksCount: repo.forksCount || 0,
              watchersCount: repo.watchersCount || 0,
              openIssuesCount: repo.openIssuesCount || 0,
              size: repo.size || 0,
              primaryLanguage: repo.primaryLanguage || 'Unknown',
              languages: repo.languages || {},
              isArchived: Boolean(repo.isArchived),
              isFork: Boolean(repo.isFork),
              githubPushedAt: repo.githubPushedAt,
              topics: Array.isArray(repo.topics) ? repo.topics : [],
              licenseKey: repo.license?.key || null,
            },
          },
          upsert: true,
        },
      }));

      await GitHubRepositorySnapshot.bulkWrite(repoSnapshotOps, { ordered: false });
    }

    return snapshot;
  },

  /**
   * Retrieve snapshots for a user with optional date filtering and pagination.
   */
  async getSnapshots(username, { from, to, limit = 30, page = 1 } = {}) {
    const cleanUsername = (username || '').toLowerCase().trim();
    const query = { username: cleanUsername };

    if (from || to) {
      query.snapshotDate = {};
      if (from) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
          const err = new Error("Invalid 'from' date format. Expected YYYY-MM-DD");
          err.statusCode = 400;
          throw err;
        }
        query.snapshotDate.$gte = from;
      }
      if (to) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          const err = new Error("Invalid 'to' date format. Expected YYYY-MM-DD");
          err.statusCode = 400;
          throw err;
        }
        query.snapshotDate.$lte = to;
      }
    }

    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const safePage = Math.max(1, parseInt(page, 10) || 1);

    const [snapshots, total] = await Promise.all([
      GitHubSnapshot.find(query)
        .sort({ snapshotDate: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      GitHubSnapshot.countDocuments(query),
    ]);

    return {
      username: cleanUsername,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
      snapshots,
    };
  },

  /**
   * Retrieve the latest snapshot for a user.
   */
  async getLatestSnapshot(username) {
    const cleanUsername = (username || '').toLowerCase().trim();
    const snapshot = await GitHubSnapshot.findOne({ username: cleanUsername })
      .sort({ snapshotDate: -1 })
      .lean();

    if (!snapshot) {
      const err = new Error(`No snapshots found for user '${cleanUsername}'`);
      err.statusCode = 404;
      throw err;
    }

    return snapshot;
  },

  /**
   * Retrieve repository snapshots for a user/repository over time.
   */
  async getRepositoryHistory(username, { repo, from, to, limit = 50 } = {}) {
    const cleanUsername = (username || '').toLowerCase().trim();
    const query = { ownerUsername: cleanUsername };

    if (repo) {
      query.name = repo.trim();
    }

    if (from || to) {
      query.snapshotDate = {};
      if (from) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
          const err = new Error("Invalid 'from' date format. Expected YYYY-MM-DD");
          err.statusCode = 400;
          throw err;
        }
        query.snapshotDate.$gte = from;
      }
      if (to) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(to)) {
          const err = new Error("Invalid 'to' date format. Expected YYYY-MM-DD");
          err.statusCode = 400;
          throw err;
        }
        query.snapshotDate.$lte = to;
      }
    }

    const safeLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));

    const history = await GitHubRepositorySnapshot.find(query)
      .sort({ snapshotDate: -1, stargazersCount: -1 })
      .limit(safeLimit)
      .lean();

    return {
      username: cleanUsername,
      repo: repo || null,
      count: history.length,
      history,
    };
  },

  /**
   * Retrieve language byte trends from user snapshots across time.
   */
  async getLanguageHistory(username, { from, to } = {}) {
    const cleanUsername = (username || '').toLowerCase().trim();
    const query = { username: cleanUsername };

    if (from || to) {
      query.snapshotDate = {};
      if (from) query.snapshotDate.$gte = from;
      if (to) query.snapshotDate.$lte = to;
    }

    const snapshots = await GitHubSnapshot.find(query)
      .select('snapshotDate timestamp languagesAggregate repositoryMetrics.primaryLanguageBreakdown')
      .sort({ snapshotDate: 1 })
      .lean();

    const history = snapshots.map((snap) => ({
      snapshotDate: snap.snapshotDate,
      timestamp: snap.timestamp,
      languagesAggregate: snap.languagesAggregate || {},
      primaryLanguageBreakdown: snap.repositoryMetrics?.primaryLanguageBreakdown || {},
    }));

    return {
      username: cleanUsername,
      count: history.length,
      history,
    };
  },

  /**
   * Compare two snapshots to calculate objective changes across metrics.
   */
  compareSnapshots(snapshotA, snapshotB) {
    if (!snapshotA || !snapshotB) {
      throw new Error('Two valid snapshot objects are required for comparison');
    }

    // Determine chronological order (earlier vs later)
    const [earlier, later] =
      snapshotA.snapshotDate <= snapshotB.snapshotDate
        ? [snapshotA, snapshotB]
        : [snapshotB, snapshotA];

    const earlierDate = new Date(earlier.timestamp || `${earlier.snapshotDate}T00:00:00.000Z`);
    const laterDate = new Date(later.timestamp || `${later.snapshotDate}T00:00:00.000Z`);
    const daysApart = Math.max(
      0,
      Math.round((laterDate.getTime() - earlierDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Profile metric deltas
    const profileDeltas = {
      followersDelta:
        (later.profileMetrics?.followersCount || 0) - (earlier.profileMetrics?.followersCount || 0),
      followingDelta:
        (later.profileMetrics?.followingCount || 0) - (earlier.profileMetrics?.followingCount || 0),
      publicReposDelta:
        (later.profileMetrics?.publicReposCount || 0) -
        (earlier.profileMetrics?.publicReposCount || 0),
    };

    // Repository metric deltas
    const repositoryDeltas = {
      totalRepositoriesDelta:
        (later.repositoryMetrics?.totalRepositories || 0) -
        (earlier.repositoryMetrics?.totalRepositories || 0),
      starsDelta:
        (later.repositoryMetrics?.totalStars || 0) - (earlier.repositoryMetrics?.totalStars || 0),
      forksDelta:
        (later.repositoryMetrics?.totalForks || 0) - (earlier.repositoryMetrics?.totalForks || 0),
      openIssuesDelta:
        (later.repositoryMetrics?.totalOpenIssues || 0) -
        (earlier.repositoryMetrics?.totalOpenIssues || 0),
      sizeDelta:
        (later.repositoryMetrics?.totalSize || 0) - (earlier.repositoryMetrics?.totalSize || 0),
    };

    // Language aggregate byte deltas
    const earlierLangs = earlier.languagesAggregate instanceof Map
      ? Object.fromEntries(earlier.languagesAggregate)
      : earlier.languagesAggregate || {};
    const laterLangs = later.languagesAggregate instanceof Map
      ? Object.fromEntries(later.languagesAggregate)
      : later.languagesAggregate || {};

    const allLangs = new Set([...Object.keys(earlierLangs), ...Object.keys(laterLangs)]);
    const languageDeltas = {};

    for (const lang of allLangs) {
      const eBytes = Number(earlierLangs[lang]) || 0;
      const lBytes = Number(laterLangs[lang]) || 0;
      languageDeltas[lang] = {
        earlierBytes: eBytes,
        laterBytes: lBytes,
        deltaBytes: lBytes - eBytes,
      };
    }

    return {
      earlierSnapshotDate: earlier.snapshotDate,
      laterSnapshotDate: later.snapshotDate,
      daysApart,
      profileDeltas,
      repositoryDeltas,
      languageDeltas,
    };
  },
};

export default snapshotService;
