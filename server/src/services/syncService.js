import githubService from './githubService.js';
import snapshotService from './snapshotService.js';
import skillEvidenceService from './skillEvidenceService.js';
import { normalizeUserProfile, normalizeRepository } from '../utils/githubNormalizer.js';
import GitHubUser from '../models/GitHubUser.js';
import GitHubRepository from '../models/GitHubRepository.js';

/**
 * Service to orchestrate synchronization between GitHub API, MongoDB, historical snapshots, and skill evidence.
 */
export const syncService = {
  /**
   * Synchronize a GitHub user's profile, repositories, daily historical snapshot, and skill evidence.
   * Uses idempotent upserts to avoid duplicate records across repeated syncs.
   */
  async syncUser(username) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();

    // 1. Retrieve raw user profile from GitHub API
    const rawUser = await githubService.getUserProfile(cleanUsername);
    const normalizedUser = normalizeUserProfile(rawUser);

    // 2. Persist/update user profile in MongoDB
    const userRecord = await GitHubUser.findOneAndUpdate(
      { githubId: normalizedUser.githubId },
      { $set: normalizedUser },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 3. Retrieve all user public repositories (paginated)
    const rawRepos = await githubService.getAllUserRepositories(cleanUsername);

    // 4. Fetch languages for active repositories (up to first 10 to conserve rate limits if unauthenticated)
    const languagePromises = rawRepos.slice(0, 10).map(async (repo) => {
      try {
        const languages = await githubService.getRepositoryLanguages(cleanUsername, repo.name);
        return { repoId: repo.id, languages };
      } catch {
        return { repoId: repo.id, languages: {} };
      }
    });

    const repoLanguageResults = await Promise.all(languagePromises);
    const languageMap = new Map(repoLanguageResults.map((r) => [r.repoId, r.languages]));

    // 5. Normalize repository records with language byte counts
    const normalizedRepos = rawRepos.map((repo) =>
      normalizeRepository(repo, languageMap.get(repo.id) || {})
    );

    // 6. Bulk upsert repositories to prevent duplicates by unique githubRepoId
    let processedReposCount = 0;
    if (normalizedRepos.length > 0) {
      const bulkOps = normalizedRepos.map((repo) => ({
        updateOne: {
          filter: { githubRepoId: repo.githubRepoId },
          update: { $set: repo },
          upsert: true,
        },
      }));

      await GitHubRepository.bulkWrite(bulkOps, { ordered: false });
      processedReposCount = normalizedRepos.length;
    }

    // 7. Retrieve recent public activity events (safe catch if events unavailable)
    let publicEvents = [];
    try {
      publicEvents = await githubService.getUserPublicEvents(cleanUsername, { page: 1, perPage: 50 });
    } catch (eventsErr) {
      console.warn(`[Sync] Could not fetch public events for ${cleanUsername}: ${eventsErr.message}`);
    }

    // 8. Generate and persist daily historical snapshot
    const snapshot = await snapshotService.buildAndPersistSnapshot({
      user: normalizedUser,
      repositories: normalizedRepos,
      events: publicEvents,
    });

    // 9. Extract and persist observable skill evidence
    let skillEvidenceCount = 0;
    try {
      const skillResult = await skillEvidenceService.extractAndPersistEvidenceForUser({
        user: normalizedUser,
        repositories: normalizedRepos,
      });
      skillEvidenceCount = skillResult.totalEvidenceCount;
    } catch (skillErr) {
      console.warn(`[Sync] Skill evidence extraction warning for ${cleanUsername}: ${skillErr.message}`);
    }

    return {
      success: true,
      message: `Successfully synchronized GitHub user '${cleanUsername}', ${processedReposCount} repositories, snapshot, and skill evidence`,
      summary: {
        username: normalizedUser.username,
        name: normalizedUser.name,
        githubId: normalizedUser.githubId,
        profileSynced: true,
        repositoriesCount: processedReposCount,
        snapshotDate: snapshot.snapshotDate,
        totalStars: snapshot.repositoryMetrics.totalStars,
        totalForks: snapshot.repositoryMetrics.totalForks,
        skillEvidenceCount,
        syncedAt: userRecord.lastSyncedAt || new Date().toISOString(),
      },
      user: userRecord,
      snapshot,
    };
  },
};

export default syncService;
