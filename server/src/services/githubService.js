import { config } from '../config/env.js';

/**
 * Build headers for GitHub REST API requests.
 */
const getHeaders = () => {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'GitInsight-App',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (config.githubToken && config.githubToken.trim() !== '') {
    headers.Authorization = `Bearer ${config.githubToken.trim()}`;
  }

  return headers;
};

/**
 * Handle and format GitHub API error responses with actionable context.
 */
const handleGitHubError = async (response, resourceContext) => {
  let errorData;
  try {
    errorData = await response.json();
  } catch {
    errorData = { message: response.statusText };
  }

  const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
  const rateLimitReset = response.headers.get('x-ratelimit-reset');

  const error = new Error();
  error.statusCode = response.status;

  if (response.status === 404) {
    error.message = `${resourceContext || 'GitHub resource'} not found`;
  } else if (response.status === 403 || response.status === 429) {
    const isRateLimit =
      rateLimitRemaining === '0' ||
      errorData.message?.toLowerCase().includes('rate limit');

    if (isRateLimit) {
      const resetTime = rateLimitReset
        ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString()
        : 'shortly';
      error.message = `GitHub API rate limit exceeded. Resets at ${resetTime}.`;
      error.rateLimit = {
        remaining: 0,
        resetAt: resetTime,
      };
    } else {
      error.message = errorData.message || 'Access to GitHub API was forbidden';
    }
  } else if (response.status === 401) {
    error.message = 'GitHub API authentication failed. Verify GITHUB_TOKEN in server configuration.';
  } else {
    error.message = errorData.message || `GitHub API error (${response.status})`;
  }

  return error;
};

export const githubService = {
  /**
   * Fetch public user profile from GitHub.
   */
  async getUserProfile(username) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim();
    const url = `${config.githubApiUrl}/users/${encodeURIComponent(cleanUsername)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await handleGitHubError(response, `User '${cleanUsername}'`);
    }

    return await response.json();
  },

  /**
   * Fetch paginated list of repositories for a user.
   */
  async getUserRepositories(username, { page = 1, perPage = 30, sort = 'updated', direction = 'desc' } = {}) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim();
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      sort,
      direction,
      type: 'owner',
    });

    const url = `${config.githubApiUrl}/users/${encodeURIComponent(cleanUsername)}/repos?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await handleGitHubError(response, `Repositories for '${cleanUsername}'`);
    }

    const repos = await response.json();
    return {
      repos,
      page: Number(page),
      perPage: Number(perPage),
      count: repos.length,
    };
  },

  /**
   * Fetch ALL public repositories for a user by automatically handling pagination.
   */
  async getAllUserRepositories(username) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim();
    const perPage = 100;
    let page = 1;
    let allRepos = [];
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        sort: 'updated',
        direction: 'desc',
        type: 'owner',
      });

      const url = `${config.githubApiUrl}/users/${encodeURIComponent(cleanUsername)}/repos?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw await handleGitHubError(response, `Repositories for '${cleanUsername}'`);
      }

      const repos = await response.json();
      allRepos = allRepos.concat(repos);

      if (repos.length < perPage) {
        hasMore = false;
      } else {
        page += 1;
        // Safety upper limit to avoid runaway pagination in extreme edge cases
        if (page > 30) {
          hasMore = false;
        }
      }
    }

    return allRepos;
  },

  /**
   * Fetch language byte distribution for a specific repository.
   */
  async getRepositoryLanguages(owner, repo) {
    if (!owner || !repo) {
      const err = new Error('Repository owner and name are required');
      err.statusCode = 400;
      throw err;
    }

    const url = `${config.githubApiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await handleGitHubError(response, `Languages for repository '${owner}/${repo}'`);
    }

    return await response.json();
  },

  /**
   * Fetch public activity events for a user.
   */
  async getUserPublicEvents(username, { page = 1, perPage = 30 } = {}) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim();
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });

    const url = `${config.githubApiUrl}/users/${encodeURIComponent(cleanUsername)}/events/public?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await handleGitHubError(response, `Events for '${cleanUsername}'`);
    }

    return await response.json();
  },

  /**
   * Fetch contents of a repository manifest/config file (e.g. package.json, requirements.txt).
   * Returns null if file does not exist (non-fatal).
   */
  async getRepositoryFileContent(owner, repo, filePath) {
    if (!owner || !repo || !filePath) return null;

    try {
      const url = `${config.githubApiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(filePath)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data && data.content && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      return null;
    } catch {
      return null;
    }
  },

  /**
   * Fetch repository topics.
   */
  async getRepositoryTopics(owner, repo) {
    if (!owner || !repo) return [];

    try {
      const url = `${config.githubApiUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/topics`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) return [];

      const data = await response.json();
      return Array.isArray(data.names) ? data.names : [];
    } catch {
      return [];
    }
  },

  /**
   * Query GitHub API rate limit status.
   */
  async getRateLimitStatus() {
    const url = `${config.githubApiUrl}/rate_limit`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      throw await handleGitHubError(response, 'Rate limit status');
    }

    return await response.json();
  },
};

export default githubService;
