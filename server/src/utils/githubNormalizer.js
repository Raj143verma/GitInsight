/**
 * Normalizes raw GitHub API user payload into GitInsight's internal domain structure.
 * Strips away redundant GitHub API fields and standardizes naming conventions.
 */
export const normalizeUserProfile = (rawUser) => {
  if (!rawUser) return null;

  return {
    githubId: rawUser.id,
    username: (rawUser.login || '').toLowerCase().trim(),
    name: rawUser.name || rawUser.login || '',
    avatarUrl: rawUser.avatar_url || '',
    bio: rawUser.bio || '',
    company: rawUser.company || '',
    location: rawUser.location || '',
    blog: rawUser.blog || '',
    profileUrl: rawUser.html_url || '',
    publicReposCount: rawUser.public_repos || 0,
    publicGistsCount: rawUser.public_gists || 0,
    followersCount: rawUser.followers || 0,
    followingCount: rawUser.following || 0,
    githubCreatedAt: rawUser.created_at ? new Date(rawUser.created_at) : null,
    githubUpdatedAt: rawUser.updated_at ? new Date(rawUser.updated_at) : null,
    lastSyncedAt: new Date(),
  };
};

/**
 * Normalizes a single GitHub repository payload.
 */
export const normalizeRepository = (rawRepo, languages = {}) => {
  if (!rawRepo) return null;

  return {
    githubRepoId: rawRepo.id,
    ownerUsername: (rawRepo.owner?.login || '').toLowerCase().trim(),
    name: rawRepo.name || '',
    fullName: rawRepo.full_name || '',
    description: rawRepo.description || '',
    isPrivate: Boolean(rawRepo.private),
    isFork: Boolean(rawRepo.fork),
    isArchived: Boolean(rawRepo.archived),
    primaryLanguage: rawRepo.language || 'Unknown',
    stargazersCount: rawRepo.stargazers_count || 0,
    forksCount: rawRepo.forks_count || 0,
    watchersCount: rawRepo.watchers_count || 0,
    openIssuesCount: rawRepo.open_issues_count || 0,
    defaultBranch: rawRepo.default_branch || 'main',
    htmlUrl: rawRepo.html_url || '',
    homepage: rawRepo.homepage || '',
    size: rawRepo.size || 0,
    topics: Array.isArray(rawRepo.topics) ? rawRepo.topics : [],
    license: rawRepo.license
      ? {
          key: rawRepo.license.key || null,
          name: rawRepo.license.name || null,
          spdxId: rawRepo.license.spdx_id || null,
        }
      : null,
    hasReadme: rawRepo.hasReadme !== undefined ? rawRepo.hasReadme : null,
    languages: languages || {},
    githubCreatedAt: rawRepo.created_at ? new Date(rawRepo.created_at) : null,
    githubUpdatedAt: rawRepo.updated_at ? new Date(rawRepo.updated_at) : null,
    githubPushedAt: rawRepo.pushed_at ? new Date(rawRepo.pushed_at) : null,
    lastSyncedAt: new Date(),
  };
};

/**
 * Normalizes an array of repositories.
 */
export const normalizeRepositories = (rawRepos = []) => {
  if (!Array.isArray(rawRepos)) return [];
  return rawRepos.map((repo) => normalizeRepository(repo));
};

/**
 * Normalizes public activity events.
 */
export const normalizeActivityEvent = (rawEvent) => {
  if (!rawEvent) return null;

  return {
    eventId: rawEvent.id,
    type: rawEvent.type || 'UnknownEvent',
    actorUsername: (rawEvent.actor?.login || '').toLowerCase().trim(),
    repoName: rawEvent.repo?.name || '',
    createdAt: rawEvent.created_at ? new Date(rawEvent.created_at) : null,
  };
};
