import GitHubRepository from '../models/GitHubRepository.js';
import GitHubRepositorySnapshot from '../models/GitHubRepositorySnapshot.js';
import GitHubUser from '../models/GitHubUser.js';

/**
 * Standard thresholds for repository activity recency (in days).
 * Evaluated strictly in UTC against observable GitHub push timestamps.
 */
export const MAINTENANCE_THRESHOLDS = {
  RECENTLY_ACTIVE_DAYS: 30,
  ACTIVE_DAYS: 90,
  LOW_ACTIVITY_DAYS: 365,
};

/**
 * Centrally defined maintenance classification statuses.
 * These classifications describe observable activity recency only, NOT code quality.
 */
export const MAINTENANCE_STATUSES = {
  RECENTLY_ACTIVE: 'recently_active',
  ACTIVE: 'active',
  LOW_RECENT_ACTIVITY: 'low_recent_activity',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
  UNKNOWN: 'unknown',
};

export const repositoryHealthService = {
  /**
   * Calculates days since last observable push and assigns maintenance status.
   * Handles missing/null dates safely without converting them to 0 days.
   */
  calculateActivityRecency(githubPushedAt, isArchived = false, referenceDate = new Date()) {
    if (isArchived) {
      const days = githubPushedAt
        ? Math.max(
            0,
            Math.floor(
              (referenceDate.getTime() - new Date(githubPushedAt).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : null;

      return {
        lastPushedAt: githubPushedAt ? new Date(githubPushedAt).toISOString() : null,
        daysSinceLastPush: days,
        status: MAINTENANCE_STATUSES.ARCHIVED,
        availability: githubPushedAt ? 'available' : 'unavailable',
      };
    }

    if (!githubPushedAt) {
      return {
        lastPushedAt: null,
        daysSinceLastPush: null,
        status: MAINTENANCE_STATUSES.UNKNOWN,
        availability: 'unavailable',
      };
    }

    const pushTime = new Date(githubPushedAt).getTime();
    if (isNaN(pushTime)) {
      return {
        lastPushedAt: null,
        daysSinceLastPush: null,
        status: MAINTENANCE_STATUSES.UNKNOWN,
        availability: 'invalid_date',
      };
    }

    const days = Math.max(
      0,
      Math.floor((referenceDate.getTime() - pushTime) / (1000 * 60 * 60 * 24))
    );

    let status = MAINTENANCE_STATUSES.INACTIVE;
    if (days <= MAINTENANCE_THRESHOLDS.RECENTLY_ACTIVE_DAYS) {
      status = MAINTENANCE_STATUSES.RECENTLY_ACTIVE;
    } else if (days <= MAINTENANCE_THRESHOLDS.ACTIVE_DAYS) {
      status = MAINTENANCE_STATUSES.ACTIVE;
    } else if (days <= MAINTENANCE_THRESHOLDS.LOW_ACTIVITY_DAYS) {
      status = MAINTENANCE_STATUSES.LOW_RECENT_ACTIVITY;
    }

    return {
      lastPushedAt: new Date(githubPushedAt).toISOString(),
      daysSinceLastPush: days,
      status,
      availability: 'available',
    };
  },

  /**
   * Extracts observable documentation signals from stored repository metadata.
   * Explicitly distinguishes boolean presence from uninspected/unavailable metadata.
   */
  extractDocumentationSignals(repo) {
    const hasDescription = Boolean(repo.description && repo.description.trim().length > 0);
    const hasHomepage = Boolean(repo.homepage && repo.homepage.trim().length > 0);
    const topics = Array.isArray(repo.topics) ? repo.topics : [];
    const hasTopics = topics.length > 0;

    let hasLicense = null;
    let licenseName = 'Unavailable';
    let licenseSpdxId = null;

    if (repo.license !== undefined) {
      if (repo.license && repo.license.key) {
        hasLicense = true;
        licenseName = repo.license.name || repo.license.key;
        licenseSpdxId = repo.license.spdxId || null;
      } else {
        hasLicense = false;
        licenseName = 'None';
      }
    }

    const hasReadme =
      repo.hasReadme !== undefined && repo.hasReadme !== null ? repo.hasReadme : null;
    const hasReadmeAvailability = hasReadme !== null ? 'available' : 'unavailable';

    return {
      hasReadme,
      hasReadmeAvailability,
      hasDescription,
      hasHomepage,
      hasTopics,
      topicsCount: topics.length,
      topics,
      hasLicense,
      license: licenseName,
      licenseSpdxId,
    };
  },

  /**
   * Formats a single stored repository into a normalized health representation.
   */
  formatRepositoryHealth(repo, referenceDate = new Date()) {
    const recency = this.calculateActivityRecency(
      repo.githubPushedAt,
      Boolean(repo.isArchived),
      referenceDate
    );
    const docSignals = this.extractDocumentationSignals(repo);

    return {
      repository: {
        id: repo.githubRepoId,
        name: repo.name,
        fullName: repo.fullName,
        url: repo.htmlUrl,
        homepage: repo.homepage || null,
        primaryLanguage: repo.primaryLanguage || 'Unknown',
        isFork: Boolean(repo.isFork),
        isArchived: Boolean(repo.isArchived),
        createdAt: repo.githubCreatedAt ? new Date(repo.githubCreatedAt).toISOString() : null,
        updatedAt: repo.githubUpdatedAt ? new Date(repo.githubUpdatedAt).toISOString() : null,
      },
      maintenance: {
        lastPushedAt: recency.lastPushedAt,
        daysSinceLastPush: recency.daysSinceLastPush,
        status: recency.status,
        availability: recency.availability,
      },
      documentation: {
        hasReadme: docSignals.hasReadme,
        hasReadmeAvailability: docSignals.hasReadmeAvailability,
        hasDescription: docSignals.hasDescription,
        hasHomepage: docSignals.hasHomepage,
        hasTopics: docSignals.hasTopics,
        topics: docSignals.topics,
        hasLicense: docSignals.hasLicense,
        license: docSignals.license,
        licenseSpdxId: docSignals.licenseSpdxId,
      },
      activity: {
        openIssues: repo.openIssuesCount || 0,
        stars: repo.stargazersCount || 0,
        forks: repo.forksCount || 0,
        watchers: repo.watchersCount || 0,
        sizeKB: repo.size || 0,
      },
    };
  },

  /**
   * Computes portfolio-level aggregate indicators across a list of normalized repositories.
   */
  computePortfolioSummary(formattedRepos = []) {
    const summary = {
      totalRepositories: formattedRepos.length,
      activeRepositories: 0,
      recentlyActiveRepositories: 0,
      lowActivityRepositories: 0,
      inactiveRepositories: 0,
      archivedRepositories: 0,
      forkedRepositories: 0,
      recentlyPushedRepositories: 0,
      repositoriesWithReadme: 0,
      repositoriesWithDescription: 0,
      repositoriesWithHomepage: 0,
      repositoriesWithTopics: 0,
      repositoriesWithLicense: 0,
      repositoriesWithOpenIssues: 0,
      totalOpenIssues: 0,
      totalStars: 0,
      totalForks: 0,
      totalWatchers: 0,
    };

    for (const item of formattedRepos) {
      const { repository, maintenance, documentation, activity } = item;

      if (repository.isFork) summary.forkedRepositories += 1;
      if (repository.isArchived) summary.archivedRepositories += 1;

      if (maintenance.status === MAINTENANCE_STATUSES.RECENTLY_ACTIVE) {
        summary.recentlyActiveRepositories += 1;
        summary.activeRepositories += 1;
        summary.recentlyPushedRepositories += 1;
      } else if (maintenance.status === MAINTENANCE_STATUSES.ACTIVE) {
        summary.activeRepositories += 1;
      } else if (maintenance.status === MAINTENANCE_STATUSES.LOW_RECENT_ACTIVITY) {
        summary.lowActivityRepositories += 1;
      } else if (maintenance.status === MAINTENANCE_STATUSES.INACTIVE) {
        summary.inactiveRepositories += 1;
      }

      if (documentation.hasReadme === true) summary.repositoriesWithReadme += 1;
      if (documentation.hasDescription) summary.repositoriesWithDescription += 1;
      if (documentation.hasHomepage) summary.repositoriesWithHomepage += 1;
      if (documentation.hasTopics) summary.repositoriesWithTopics += 1;
      if (documentation.hasLicense === true) summary.repositoriesWithLicense += 1;

      if (activity.openIssues > 0) {
        summary.repositoriesWithOpenIssues += 1;
        summary.totalOpenIssues += activity.openIssues;
      }
      summary.totalStars += activity.stars;
      summary.totalForks += activity.forks;
      summary.totalWatchers += activity.watchers;
    }

    return summary;
  },

  /**
   * Retrieves repository health summary and filtered repository list for a user.
   * Purely operates on stored MongoDB data.
   */
  async getPortfolioHealth(username, filters = {}) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();

    // Check if user exists in database
    const userExists = await GitHubUser.findOne({ username: cleanUsername }).lean();
    if (!userExists) {
      const err = new Error(
        `User '${cleanUsername}' has not been synced. Run synchronization first to inspect repository health.`
      );
      err.statusCode = 404;
      throw err;
    }

    // Query all stored repositories for the user
    const dbRepos = await GitHubRepository.find({ ownerUsername: cleanUsername })
      .sort({ githubPushedAt: -1, stargazersCount: -1 })
      .lean();

    const now = new Date();
    const allFormattedRepos = dbRepos.map((repo) => this.formatRepositoryHealth(repo, now));
    const portfolioSummary = this.computePortfolioSummary(allFormattedRepos);

    // Apply optional filters
    let filteredRepos = [...allFormattedRepos];
    const filtersApplied = {};

    if (filters.status) {
      const validStatuses = Object.values(MAINTENANCE_STATUSES);
      const requestedStatus = filters.status.trim().toLowerCase();

      if (!validStatuses.includes(requestedStatus)) {
        const err = new Error(
          `Invalid status filter '${filters.status}'. Allowed values: ${validStatuses.join(', ')}`
        );
        err.statusCode = 400;
        throw err;
      }

      filtersApplied.status = requestedStatus;
      filteredRepos = filteredRepos.filter((r) => r.maintenance.status === requestedStatus);
    }

    if (filters.language) {
      const requestedLang = filters.language.trim().toLowerCase();
      filtersApplied.language = filters.language.trim();
      filteredRepos = filteredRepos.filter(
        (r) => r.repository.primaryLanguage.toLowerCase() === requestedLang
      );
    }

    if (filters.archived !== undefined && filters.archived !== '') {
      const isArchived =
        filters.archived === true ||
        filters.archived === 'true' ||
        filters.archived === '1';
      filtersApplied.archived = isArchived;
      filteredRepos = filteredRepos.filter((r) => r.repository.isArchived === isArchived);
    }

    if (filters.from || filters.to) {
      const fromDate = filters.from ? new Date(`${filters.from}T00:00:00.000Z`) : null;
      const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : null;

      if (filters.from) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.from) || isNaN(fromDate?.getTime())) {
          const err = new Error("Invalid 'from' date format. Expected YYYY-MM-DD");
          err.statusCode = 400;
          throw err;
        }
        filtersApplied.from = filters.from;
      }

      if (filters.to) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(filters.to) || isNaN(toDate?.getTime())) {
          const err = new Error("Invalid 'to' date format. Expected YYYY-MM-DD");
          err.statusCode = 400;
          throw err;
        }
        filtersApplied.to = filters.to;
      }

      filteredRepos = filteredRepos.filter((r) => {
        if (!r.maintenance.lastPushedAt) return false;
        const pushDate = new Date(r.maintenance.lastPushedAt);
        if (fromDate && pushDate < fromDate) return false;
        if (toDate && pushDate > toDate) return false;
        return true;
      });
    }

    return {
      username: cleanUsername,
      portfolio: portfolioSummary,
      repositoriesCount: filteredRepos.length,
      totalRepositories: allFormattedRepos.length,
      filtersApplied,
      repositories: filteredRepos,
    };
  },

  /**
   * Retrieves detailed observable health, documentation signals, and historical trends for a single repository.
   */
  async getSingleRepositoryHealth(username, repositoryName) {
    if (!username || !repositoryName) {
      const err = new Error('Username and repository name are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanRepoName = repositoryName.trim();

    // Query repository from MongoDB
    const repo = await GitHubRepository.findOne({
      ownerUsername: cleanUsername,
      name: { $regex: new RegExp(`^${cleanRepoName}$`, 'i') },
    }).lean();

    if (!repo) {
      const err = new Error(
        `Repository '${cleanRepoName}' was not found in stored records for user '${cleanUsername}'. Sync repository first.`
      );
      err.statusCode = 404;
      throw err;
    }

    const formatted = this.formatRepositoryHealth(repo, new Date());

    // Retrieve historical snapshots for this repository
    const historicalSnapshots = await GitHubRepositorySnapshot.find({
      ownerUsername: cleanUsername,
      name: repo.name,
    })
      .sort({ snapshotDate: 1 })
      .lean();

    const history = historicalSnapshots.map((snap) => ({
      date: snap.snapshotDate,
      stars: snap.stargazersCount || 0,
      forks: snap.forksCount || 0,
      openIssues: snap.openIssuesCount || 0,
      watchers: snap.watchersCount || 0,
      sizeKB: snap.size || 0,
      primaryLanguage: snap.primaryLanguage || 'Unknown',
      isArchived: Boolean(snap.isArchived),
      isFork: Boolean(snap.isFork),
      lastPushedAt: snap.githubPushedAt ? new Date(snap.githubPushedAt).toISOString() : null,
    }));

    return {
      repository: formatted.repository,
      current: {
        maintenance: formatted.maintenance,
        documentation: formatted.documentation,
        activity: formatted.activity,
      },
      history,
      snapshotsCount: history.length,
    };
  },
};

export default repositoryHealthService;
