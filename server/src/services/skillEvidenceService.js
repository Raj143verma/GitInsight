import technologyRegistry from '../config/technologyRegistry.js';
import SkillEvidence from '../models/SkillEvidence.js';
import githubService from './githubService.js';

/**
 * Service to detect observable technology evidence from repositories, languages, and manifests.
 */
export const skillEvidenceService = {
  /**
   * Parse package.json content safely to extract declared dependencies.
   */
  parsePackageJson(content) {
    if (!content) return {};
    try {
      const parsed = JSON.parse(content);
      const deps = {
        ...(parsed.dependencies || {}),
        ...(parsed.devDependencies || {}),
        ...(parsed.peerDependencies || {}),
      };
      return deps;
    } catch {
      return {};
    }
  },

  /**
   * Parse simple requirements.txt lines to extract python packages.
   */
  parseRequirementsTxt(content) {
    if (!content) return {};
    const lines = content.split('\n');
    const packages = {};

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith('-')) continue;

      // Match package name before operators like ==, >=, <=, ~=, <, >
      const match = line.match(/^([a-zA-Z0-9_\-\.]+)/);
      if (match) {
        const pkgName = match[1].toLowerCase();
        packages[pkgName] = line;
      }
    }

    return packages;
  },

  /**
   * Extract evidence records from a single repository.
   */
  extractEvidenceFromRepository(user, repo, { packageJsonContent = null, requirementsContent = null, topics = [], fileExists = {} } = {}) {
    const evidenceList = [];
    const cleanUsername = user.username.toLowerCase().trim();

    const repoLanguages =
      repo.languages instanceof Map
        ? Object.fromEntries(repo.languages)
        : repo.languages || {};

    const npmDeps = packageJsonContent ? this.parsePackageJson(packageJsonContent) : {};
    const pipDeps = requirementsContent ? this.parseRequirementsTxt(requirementsContent) : {};

    for (const tech of technologyRegistry) {
      // 1. Check Language Evidence
      if (tech.languageMatches) {
        let matchedBytes = 0;
        let isPrimary = false;

        for (const langMatch of tech.languageMatches) {
          if (repoLanguages[langMatch]) {
            matchedBytes += Number(repoLanguages[langMatch]) || 0;
          }
          if (
            repo.primaryLanguage &&
            repo.primaryLanguage.toLowerCase() === langMatch.toLowerCase()
          ) {
            isPrimary = true;
          }
        }

        if (matchedBytes > 0 || isPrimary) {
          evidenceList.push({
            githubId: user.githubId,
            username: cleanUsername,
            technology: tech.name,
            technologyKey: tech.key,
            category: tech.category,
            evidenceType: 'language',
            source: 'GitHub repository language distribution',
            description: `Language recorded in repository (${isPrimary ? 'Primary language' : `${matchedBytes.toLocaleString()} bytes`})`,
            strength: 'direct',
            githubRepoId: repo.githubRepoId,
            repositoryName: repo.name,
            repositoryFullName: repo.fullName,
            repositoryUrl: repo.htmlUrl,
            metadata: {
              bytes: matchedBytes,
              isPrimaryLanguage: isPrimary,
            },
          });
        }
      }

      // 2. Check Manifest Dependency Evidence
      if (tech.manifestPackages) {
        // Check npm dependencies
        if (tech.manifestPackages.npm && Object.keys(npmDeps).length > 0) {
          for (const pkg of tech.manifestPackages.npm) {
            if (npmDeps[pkg] !== undefined) {
              evidenceList.push({
                githubId: user.githubId,
                username: cleanUsername,
                technology: tech.name,
                technologyKey: tech.key,
                category: tech.category,
                evidenceType: 'dependency',
                source: 'package.json dependencies',
                description: `Declared '${pkg}' dependency (${npmDeps[pkg]}) in package.json`,
                strength: 'direct',
                githubRepoId: repo.githubRepoId,
                repositoryName: repo.name,
                repositoryFullName: repo.fullName,
                repositoryUrl: repo.htmlUrl,
                metadata: {
                  manifest: 'package.json',
                  package: pkg,
                  versionSpec: npmDeps[pkg],
                },
              });
            }
          }
        }

        // Check pip dependencies
        if (tech.manifestPackages.pip && Object.keys(pipDeps).length > 0) {
          for (const pkg of tech.manifestPackages.pip) {
            const normalizedPkg = pkg.toLowerCase().replace(/_/g, '-');
            if (pipDeps[pkg] !== undefined || pipDeps[normalizedPkg] !== undefined) {
              evidenceList.push({
                githubId: user.githubId,
                username: cleanUsername,
                technology: tech.name,
                technologyKey: tech.key,
                category: tech.category,
                evidenceType: 'dependency',
                source: 'requirements.txt dependencies',
                description: `Declared '${pkg}' dependency in requirements.txt`,
                strength: 'direct',
                githubRepoId: repo.githubRepoId,
                repositoryName: repo.name,
                repositoryFullName: repo.fullName,
                repositoryUrl: repo.htmlUrl,
                metadata: {
                  manifest: 'requirements.txt',
                  package: pkg,
                },
              });
            }
          }
        }
      }

      // 3. Check Known File Matches (e.g. Dockerfile, tsconfig.json, go.mod)
      if (tech.fileMatches) {
        for (const filename of tech.fileMatches) {
          if (fileExists[filename]) {
            evidenceList.push({
              githubId: user.githubId,
              username: cleanUsername,
              technology: tech.name,
              technologyKey: tech.key,
              category: tech.category,
              evidenceType: 'file_manifest',
              source: `Repository file: ${filename}`,
              description: `Configured '${filename}' in repository root`,
              strength: 'direct',
              githubRepoId: repo.githubRepoId,
              repositoryName: repo.name,
              repositoryFullName: repo.fullName,
              repositoryUrl: repo.htmlUrl,
              metadata: {
                filename,
              },
            });
          }
        }
      }

      // 4. Check Repository Topics Metadata
      if (tech.topicMatches && topics.length > 0) {
        const lowerTopics = topics.map((t) => t.toLowerCase());
        for (const topicMatch of tech.topicMatches) {
          if (lowerTopics.includes(topicMatch.toLowerCase())) {
            evidenceList.push({
              githubId: user.githubId,
              username: cleanUsername,
              technology: tech.name,
              technologyKey: tech.key,
              category: tech.category,
              evidenceType: 'repository_metadata',
              source: `Repository topic: ${topicMatch}`,
              description: `Tagged repository with topic '${topicMatch}'`,
              strength: 'supporting',
              githubRepoId: repo.githubRepoId,
              repositoryName: repo.name,
              repositoryFullName: repo.fullName,
              repositoryUrl: repo.htmlUrl,
              metadata: {
                topic: topicMatch,
              },
            });
          }
        }
      }
    }

    return evidenceList;
  },

  /**
   * Extract and persist evidence for all user repositories.
   */
  async extractAndPersistEvidenceForUser({ user, repositories = [] }) {
    if (!user || !user.githubId || !user.username) {
      throw new Error('User profile with valid githubId and username is required for skill evidence');
    }

    const cleanUsername = user.username.toLowerCase().trim();
    let allEvidence = [];

    // Inspect top active repositories for manifests (limit to 10 repos to conserve API rate limits)
    for (const repo of repositories.slice(0, 10)) {
      try {
        const [packageJson, requirements, dockerfile, tsconfig, goMod, topics] = await Promise.all([
          githubService.getRepositoryFileContent(cleanUsername, repo.name, 'package.json'),
          githubService.getRepositoryFileContent(cleanUsername, repo.name, 'requirements.txt'),
          githubService.getRepositoryFileContent(cleanUsername, repo.name, 'Dockerfile'),
          githubService.getRepositoryFileContent(cleanUsername, repo.name, 'tsconfig.json'),
          githubService.getRepositoryFileContent(cleanUsername, repo.name, 'go.mod'),
          githubService.getRepositoryTopics(cleanUsername, repo.name),
        ]);

        const fileExists = {
          'Dockerfile': Boolean(dockerfile),
          'tsconfig.json': Boolean(tsconfig),
          'go.mod': Boolean(goMod),
        };

        const repoEvidence = this.extractEvidenceFromRepository(user, repo, {
          packageJsonContent: packageJson,
          requirementsContent: requirements,
          topics,
          fileExists,
        });

        allEvidence = allEvidence.concat(repoEvidence);
      } catch {
        // Fallback to basic language evidence if network call fails
        const fallbackEvidence = this.extractEvidenceFromRepository(user, repo);
        allEvidence = allEvidence.concat(fallbackEvidence);
      }
    }

    // Also process any remaining repositories for language evidence
    for (const repo of repositories.slice(10)) {
      const basicEvidence = this.extractEvidenceFromRepository(user, repo);
      allEvidence = allEvidence.concat(basicEvidence);
    }

    // Bulk upsert into SkillEvidence collection (preserves observedAt, updates lastObservedAt)
    if (allEvidence.length > 0) {
      const now = new Date();
      const bulkOps = allEvidence.map((ev) => ({
        updateOne: {
          filter: {
            githubId: ev.githubId,
            technologyKey: ev.technologyKey,
            githubRepoId: ev.githubRepoId,
            evidenceType: ev.evidenceType,
            source: ev.source,
          },
          update: {
            $set: {
              username: ev.username,
              technology: ev.technology,
              category: ev.category,
              description: ev.description,
              strength: ev.strength,
              repositoryName: ev.repositoryName,
              repositoryFullName: ev.repositoryFullName,
              repositoryUrl: ev.repositoryUrl,
              lastObservedAt: now,
              metadata: ev.metadata,
            },
            $setOnInsert: {
              observedAt: now,
            },
          },
          upsert: true,
        },
      }));

      await SkillEvidence.bulkWrite(bulkOps, { ordered: false });
    }

    return {
      totalEvidenceCount: allEvidence.length,
      evidenceList: allEvidence,
    };
  },

  /**
   * Get consolidated summary of all detected technologies for a user.
   */
  async getUserSkillsSummary(username) {
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();
    const evidenceList = await SkillEvidence.find({ username: cleanUsername })
      .sort({ lastObservedAt: -1 })
      .lean();

    if (evidenceList.length === 0) {
      return {
        username: cleanUsername,
        count: 0,
        skills: [],
      };
    }

    // Group evidence records by technologyKey
    const skillGroups = new Map();

    for (const ev of evidenceList) {
      if (!skillGroups.has(ev.technologyKey)) {
        skillGroups.set(ev.technologyKey, {
          technology: ev.technology,
          technologyKey: ev.technologyKey,
          category: ev.category,
          evidenceCount: 0,
          evidenceTypes: new Set(),
          repositoriesMap: new Map(),
          lastObservedAt: ev.lastObservedAt || ev.observedAt,
        });
      }

      const group = skillGroups.get(ev.technologyKey);
      group.evidenceCount += 1;
      group.evidenceTypes.add(ev.evidenceType);

      if (!group.repositoriesMap.has(ev.githubRepoId)) {
        group.repositoriesMap.set(ev.githubRepoId, {
          name: ev.repositoryName,
          fullName: ev.repositoryFullName,
          url: ev.repositoryUrl,
        });
      }

      if (new Date(ev.lastObservedAt) > new Date(group.lastObservedAt)) {
        group.lastObservedAt = ev.lastObservedAt;
      }
    }

    const skills = Array.from(skillGroups.values())
      .map((g) => ({
        technology: g.technology,
        technologyKey: g.technologyKey,
        category: g.category,
        evidenceCount: g.evidenceCount,
        repositoryCount: g.repositoriesMap.size,
        evidenceTypes: Array.from(g.evidenceTypes),
        repositories: Array.from(g.repositoriesMap.values()),
        lastObservedAt: g.lastObservedAt,
      }))
      .sort((a, b) => b.evidenceCount - a.evidenceCount || b.repositoryCount - a.repositoryCount);

    return {
      username: cleanUsername,
      count: skills.length,
      skills,
    };
  },

  /**
   * Get specific traceable evidence details for a single technology.
   */
  async getSkillEvidenceDetail(username, technologyKey) {
    if (!username || !technologyKey) {
      const err = new Error('Username and technology key are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanKey = technologyKey.trim().toLowerCase();

    const evidenceRecords = await SkillEvidence.find({
      username: cleanUsername,
      technologyKey: cleanKey,
    })
      .sort({ lastObservedAt: -1 })
      .lean();

    if (evidenceRecords.length === 0) {
      const err = new Error(`No evidence found for technology '${cleanKey}' under user '${cleanUsername}'`);
      err.statusCode = 404;
      throw err;
    }

    const first = evidenceRecords[0];

    return {
      username: cleanUsername,
      technology: first.technology,
      technologyKey: first.technologyKey,
      category: first.category,
      evidenceCount: evidenceRecords.length,
      evidence: evidenceRecords.map((e) => ({
        repository: e.repositoryName,
        repositoryFullName: e.repositoryFullName,
        repositoryUrl: e.repositoryUrl,
        type: e.evidenceType,
        source: e.source,
        description: e.description,
        strength: e.strength,
        observedAt: e.observedAt,
        lastObservedAt: e.lastObservedAt,
        metadata: e.metadata,
      })),
    };
  },
};

export default skillEvidenceService;
