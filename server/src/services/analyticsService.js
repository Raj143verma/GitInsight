import GitHubUser from '../models/GitHubUser.js';
import GitHubRepository from '../models/GitHubRepository.js';
import GitHubSnapshot from '../models/GitHubSnapshot.js';
import {
  calculateDelta,
  calculateDistribution,
  validateDateRange,
} from '../utils/trendCalculator.js';

/**
 * Service providing descriptive historical analytics over stored GitHub data and snapshots.
 * Does not communicate with external GitHub APIs directly.
 */
export const analyticsService = {
  /**
   * Get a consolidated developer overview analytics payload.
   */
  async getDeveloperOverview(username) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();

    // 1. Fetch user profile from database
    const user = await GitHubUser.findOne({ username: cleanUsername }).lean();
    if (!user) {
      const err = new Error(
        `User '${cleanUsername}' not found in database. Synchronize user before generating analytics.`
      );
      err.statusCode = 404;
      throw err;
    }

    // 2. Fetch current repositories & snapshots concurrently
    const [repositories, latestSnapshot, snapshotCount, earliestSnapshot] = await Promise.all([
      GitHubRepository.find({ ownerUsername: cleanUsername }).lean(),
      GitHubSnapshot.findOne({ username: cleanUsername }).sort({ snapshotDate: -1 }).lean(),
      GitHubSnapshot.countDocuments({ username: cleanUsername }),
      GitHubSnapshot.findOne({ username: cleanUsername }).sort({ snapshotDate: 1 }).lean(),
    ]);

    // 3. Aggregate current repository metrics
    let totalStars = 0;
    let totalForks = 0;
    let totalWatchers = 0;
    let totalOpenIssues = 0;
    let totalSizeKB = 0;
    let forkedCount = 0;
    let archivedCount = 0;
    const primaryLanguageCounts = {};

    for (const repo of repositories) {
      totalStars += repo.stargazersCount || 0;
      totalForks += repo.forksCount || 0;
      totalWatchers += repo.watchersCount || 0;
      totalOpenIssues += repo.openIssuesCount || 0;
      totalSizeKB += repo.size || 0;

      if (repo.isFork) forkedCount += 1;
      if (repo.isArchived) archivedCount += 1;

      const lang = repo.primaryLanguage || 'Unknown';
      primaryLanguageCounts[lang] = (primaryLanguageCounts[lang] || 0) + 1;
    }

    const primaryLanguageDistribution = calculateDistribution(primaryLanguageCounts);

    // 4. Determine latest language bytes distribution
    const latestLangBytes = latestSnapshot?.languagesAggregate || {};
    const languageByteDistribution = calculateDistribution(latestLangBytes);

    return {
      profile: {
        username: user.username,
        name: user.name || user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        company: user.company,
        location: user.location,
        profileUrl: user.profileUrl,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        githubCreatedAt: user.githubCreatedAt,
        lastSyncedAt: user.lastSyncedAt,
      },
      repositories: {
        total: repositories.length,
        totalStars,
        totalForks,
        totalWatchers,
        totalOpenIssues,
        totalSizeKB,
        forkedCount,
        archivedCount,
        primaryLanguages: primaryLanguageDistribution.items,
      },
      languages: {
        totalBytes: languageByteDistribution.total,
        distribution: languageByteDistribution.items,
      },
      activity: {
        observablePublicEventsCount: latestSnapshot?.activityMetrics?.publicEventsCount || 0,
        recentEventsByType: latestSnapshot?.activityMetrics?.recentEventsByType || {},
        dataAvailability: latestSnapshot?.activityMetrics?.dataAvailability || {
          eventsWindow: 'last_300_public_events_or_90_days',
          isCompleteHistory: false,
          privateActivityIncluded: false,
        },
      },
      history: {
        totalSnapshots: snapshotCount,
        earliestSnapshotDate: earliestSnapshot?.snapshotDate || null,
        latestSnapshotDate: latestSnapshot?.snapshotDate || null,
      },
    };
  },

  /**
   * Get repository growth and historical metric time-series.
   */
  async getRepositoryGrowth(username, { from, to } = {}) {
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    validateDateRange(from, to);
    const cleanUsername = username.trim().toLowerCase();

    const query = { username: cleanUsername };
    if (from || to) {
      query.snapshotDate = {};
      if (from) query.snapshotDate.$gte = from;
      if (to) query.snapshotDate.$lte = to;
    }

    const snapshots = await GitHubSnapshot.find(query).sort({ snapshotDate: 1 }).lean();

    if (snapshots.length === 0) {
      return {
        username: cleanUsername,
        count: 0,
        timeSeries: [],
        growthSummary: null,
      };
    }

    const timeSeries = snapshots.map((snap) => ({
      date: snap.snapshotDate,
      timestamp: snap.timestamp,
      repositories: snap.repositoryMetrics?.totalRepositories || 0,
      stars: snap.repositoryMetrics?.totalStars || 0,
      forks: snap.repositoryMetrics?.totalForks || 0,
      watchers: snap.repositoryMetrics?.totalWatchers || 0,
      openIssues: snap.repositoryMetrics?.totalOpenIssues || 0,
      followers: snap.profileMetrics?.followersCount || 0,
      following: snap.profileMetrics?.followingCount || 0,
      size: snap.repositoryMetrics?.totalSize || 0,
    }));

    // Growth deltas across the selected period
    let growthSummary = null;
    if (timeSeries.length >= 2) {
      const first = timeSeries[0];
      const last = timeSeries[timeSeries.length - 1];

      growthSummary = {
        observedPeriod: {
          from: first.date,
          to: last.date,
        },
        starsGrowth: calculateDelta(first.stars, last.stars),
        forksGrowth: calculateDelta(first.forks, last.forks),
        followersGrowth: calculateDelta(first.followers, last.followers),
        repositoriesGrowth: calculateDelta(first.repositories, last.repositories),
        openIssuesGrowth: calculateDelta(first.openIssues, last.openIssues),
      };
    }

    return {
      username: cleanUsername,
      count: timeSeries.length,
      timeSeries,
      growthSummary,
    };
  },

  /**
   * Get language byte trends over time and latest distribution.
   */
  async getLanguageAnalytics(username, { from, to } = {}) {
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    validateDateRange(from, to);
    const cleanUsername = username.trim().toLowerCase();

    const query = { username: cleanUsername };
    if (from || to) {
      query.snapshotDate = {};
      if (from) query.snapshotDate.$gte = from;
      if (to) query.snapshotDate.$lte = to;
    }

    const snapshots = await GitHubSnapshot.find(query).sort({ snapshotDate: 1 }).lean();

    if (snapshots.length === 0) {
      return {
        username: cleanUsername,
        count: 0,
        latestDistribution: [],
        trend: {
          dates: [],
          languages: {},
          percentageTrends: {},
        },
        languageDeltas: {},
      };
    }

    // 1. Determine all unique languages present across snapshots
    const allLanguageNames = new Set();
    for (const snap of snapshots) {
      const langs = snap.languagesAggregate || {};
      for (const lang of Object.keys(langs)) {
        allLanguageNames.add(lang);
      }
    }

    // 2. Build time-series matrix for dates, raw bytes, and percentages
    const dates = snapshots.map((s) => s.snapshotDate);
    const languagesTimeSeries = {};
    const percentageTrends = {};

    for (const lang of allLanguageNames) {
      languagesTimeSeries[lang] = [];
      percentageTrends[lang] = [];
    }

    for (const snap of snapshots) {
      const snapLangs = snap.languagesAggregate || {};
      const snapTotalBytes = Object.values(snapLangs).reduce(
        (sum, bytes) => sum + (Number(bytes) || 0),
        0
      );

      for (const lang of allLanguageNames) {
        const bytes = Number(snapLangs[lang]) || 0;
        languagesTimeSeries[lang].push(bytes);
        const percentage =
          snapTotalBytes > 0 ? Number(((bytes / snapTotalBytes) * 100).toFixed(2)) : 0;
        percentageTrends[lang].push(percentage);
      }
    }

    // 3. Latest distribution calculation
    const latestSnapshot = snapshots[snapshots.length - 1];
    const latestDist = calculateDistribution(latestSnapshot.languagesAggregate || {});

    // 4. Language deltas across the period (if >= 2 points)
    const languageDeltas = {};
    if (snapshots.length >= 2) {
      const firstSnap = snapshots[0].languagesAggregate || {};
      const lastSnap = latestSnapshot.languagesAggregate || {};

      for (const lang of allLanguageNames) {
        const startBytes = Number(firstSnap[lang]) || 0;
        const endBytes = Number(lastSnap[lang]) || 0;
        languageDeltas[lang] = calculateDelta(startBytes, endBytes);
      }
    }

    return {
      username: cleanUsername,
      count: snapshots.length,
      latestDistribution: latestDist.items,
      totalBytes: latestDist.total,
      trend: {
        dates,
        languages: languagesTimeSeries,
        percentageTrends,
      },
      languageDeltas,
    };
  },

  /**
   * Get descriptive repository activity patterns and push freshness indicators.
   */
  async getRepositoryActivity(username) {
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();
    const repos = await GitHubRepository.find({ ownerUsername: cleanUsername })
      .sort({ githubPushedAt: -1 })
      .lean();

    const now = new Date();
    const msInDay = 1000 * 60 * 60 * 24;

    let pushedLast30Days = 0;
    let pushedLast90Days = 0;
    let pushedLast180Days = 0;
    let pushedLast365Days = 0;
    let inactiveOverYear = 0;
    let withOpenIssues = 0;
    let archivedCount = 0;
    let forkedCount = 0;

    const repositorySummaries = repos.map((repo) => {
      if (repo.isArchived) archivedCount += 1;
      if (repo.isFork) forkedCount += 1;
      if ((repo.openIssuesCount || 0) > 0) withOpenIssues += 1;

      let daysSincePush = null;
      if (repo.githubPushedAt) {
        const pushDate = new Date(repo.githubPushedAt);
        daysSincePush = Math.max(0, Math.floor((now.getTime() - pushDate.getTime()) / msInDay));

        if (daysSincePush <= 30) pushedLast30Days += 1;
        if (daysSincePush <= 90) pushedLast90Days += 1;
        if (daysSincePush <= 180) pushedLast180Days += 1;
        if (daysSincePush <= 365) pushedLast365Days += 1;
        else inactiveOverYear += 1;
      } else {
        inactiveOverYear += 1;
      }

      return {
        githubRepoId: repo.githubRepoId,
        name: repo.name,
        fullName: repo.fullName,
        primaryLanguage: repo.primaryLanguage,
        stargazersCount: repo.stargazersCount,
        forksCount: repo.forksCount,
        openIssuesCount: repo.openIssuesCount,
        isArchived: repo.isArchived,
        isFork: repo.isFork,
        htmlUrl: repo.htmlUrl,
        githubPushedAt: repo.githubPushedAt,
        daysSincePush,
      };
    });

    return {
      username: cleanUsername,
      totalRepositories: repos.length,
      activityFreshness: {
        pushedLast30Days,
        pushedLast90Days,
        pushedLast180Days,
        pushedLast365Days,
        inactiveOverYear,
      },
      composition: {
        forkedCount,
        archivedCount,
        withOpenIssues,
      },
      recentlyPushedRepositories: repositorySummaries.slice(0, 10),
    };
  },

  /**
   * Get observable activity trends time-series from historical snapshots.
   */
  async getActivityTrends(username, { from, to } = {}) {
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    validateDateRange(from, to);
    const cleanUsername = username.trim().toLowerCase();

    const query = { username: cleanUsername };
    if (from || to) {
      query.snapshotDate = {};
      if (from) query.snapshotDate.$gte = from;
      if (to) query.snapshotDate.$lte = to;
    }

    const snapshots = await GitHubSnapshot.find(query).sort({ snapshotDate: 1 }).lean();

    const timeSeries = snapshots.map((snap) => ({
      date: snap.snapshotDate,
      timestamp: snap.timestamp,
      publicEvents: snap.activityMetrics?.publicEventsCount || 0,
      eventsByType: snap.activityMetrics?.recentEventsByType || {},
    }));

    return {
      username: cleanUsername,
      count: timeSeries.length,
      timeSeries,
      dataAvailability: {
        observedScope: 'Public GitHub Events API',
        eventsWindow: 'last_300_public_events_or_90_days',
        isCompleteHistory: false,
        privateActivityIncluded: false,
        disclaimer:
          'Data represents observable public activity events captured during daily snapshots. Commits on private repositories or events outside the public 90-day window are not accessible via public GitHub REST APIs.',
      },
    };
  },
};

export default analyticsService;
