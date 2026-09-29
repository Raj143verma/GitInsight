import JobMatch from '../models/JobMatch.js';
import GitHubUser from '../models/GitHubUser.js';
import SkillEvidence from '../models/SkillEvidence.js';
import jobDescriptionService from './jobDescriptionService.js';

/**
 * Service to execute evidence-based matching between Job Descriptions and stored Skill Evidence.
 * Operates purely on stored MongoDB data without making GitHub API calls.
 */
export const jobMatchingService = {
  /**
   * Compare Job Description text against verified GitHub skill evidence.
   */
  async matchJobDescription(username, { title = '', jobDescription = '' } = {}) {
    if (!username || typeof username !== 'string' || username.trim() === '') {
      const err = new Error('A valid GitHub username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();

    // Verify user exists in local database
    const userExists = await GitHubUser.findOne({ username: cleanUsername }).lean();
    if (!userExists) {
      const err = new Error(
        `User '${cleanUsername}' has not been synced. Run synchronization first to match Job Descriptions.`
      );
      err.statusCode = 404;
      throw err;
    }

    const rawText = (jobDescription || '').trim();
    if (!rawText || rawText.length < 10) {
      const err = new Error(
        'A valid Job Description text is required (minimum 10 characters)'
      );
      err.statusCode = 400;
      throw err;
    }

    const cleanTitle = (title || '').trim() || 'Untitled Job Description';

    // 1. Extract technology mentions and required/preferred status
    const extraction = jobDescriptionService.extractRequirements(rawText);

    // 2. Query verified SkillEvidence for the user from MongoDB
    const evidenceRecords = await SkillEvidence.find({ username: cleanUsername })
      .sort({ lastObservedAt: -1 })
      .lean();

    // Group evidence by technologyKey
    const evidenceByKey = new Map();
    for (const ev of evidenceRecords) {
      if (!evidenceByKey.has(ev.technologyKey)) {
        evidenceByKey.set(ev.technologyKey, []);
      }
      evidenceByKey.get(ev.technologyKey).push(ev);
    }

    // 3. Map extracted requirements to observable GitHub evidence
    const matchedRequirements = extraction.requirements.map((req) => {
      if (req.recognitionStatus === 'unrecognized') {
        return {
          technologyKey: req.technologyKey,
          technology: req.displayName,
          category: req.category,
          recognitionStatus: 'unrecognized',
          matchStatus: 'unrecognized_technology',
          evidenceCount: 0,
          repositoryCount: 0,
          repositories: [],
          evidence: [],
          matchedText: req.matchedText,
          sampleSnippets: req.sampleSnippets || [],
        };
      }

      const evList = evidenceByKey.get(req.technologyKey) || [];

      if (evList.length > 0) {
        // Group evidence by repository
        const repoMap = new Map();
        for (const ev of evList) {
          if (!repoMap.has(ev.githubRepoId)) {
            repoMap.set(ev.githubRepoId, {
              repository: ev.repositoryName,
              repositoryFullName: ev.repositoryFullName,
              repositoryUrl: ev.repositoryUrl,
              evidenceTypes: new Set(),
              sources: new Set(),
            });
          }
          const r = repoMap.get(ev.githubRepoId);
          r.evidenceTypes.add(ev.evidenceType);
          r.sources.add(ev.source);
        }

        const repositories = Array.from(repoMap.values()).map((r) => ({
          repository: r.repository,
          repositoryFullName: r.repositoryFullName,
          repositoryUrl: r.repositoryUrl,
          evidenceTypes: Array.from(r.evidenceTypes),
          sources: Array.from(r.sources),
        }));

        return {
          technologyKey: req.technologyKey,
          technology: req.displayName,
          category: req.category,
          recognitionStatus: 'recognized',
          matchStatus: 'matched',
          evidenceCount: evList.length,
          repositoryCount: repositories.length,
          repositories,
          evidence: evList.map((e) => ({
            repository: e.repositoryName,
            repositoryFullName: e.repositoryFullName,
            repositoryUrl: e.repositoryUrl,
            evidenceType: e.evidenceType,
            source: e.source,
            description: e.description,
            strength: e.strength,
            lastObservedAt: e.lastObservedAt || e.observedAt,
          })),
          matchedText: req.matchedText,
          sampleSnippets: req.sampleSnippets || [],
        };
      }

      return {
        technologyKey: req.technologyKey,
        technology: req.displayName,
        category: req.category,
        recognitionStatus: 'recognized',
        matchStatus: 'no_observable_evidence',
        evidenceCount: 0,
        repositoryCount: 0,
        repositories: [],
        evidence: [],
        matchedText: req.matchedText,
        sampleSnippets: req.sampleSnippets || [],
      };
    });

    // 4. Compute descriptive summary metrics
    const totalRequirements = matchedRequirements.length;
    const requiredCount = matchedRequirements.filter((r) => r.category === 'required').length;
    const preferredCount = matchedRequirements.filter((r) => r.category === 'preferred').length;
    const unspecifiedCount = matchedRequirements.filter((r) => r.category === 'unspecified').length;
    const matchedCount = matchedRequirements.filter((r) => r.matchStatus === 'matched').length;
    const noEvidenceCount = matchedRequirements.filter(
      (r) => r.matchStatus === 'no_observable_evidence'
    ).length;
    const recognizedCount = matchedRequirements.filter((r) => r.recognitionStatus === 'recognized').length;
    const unrecognizedCount = matchedRequirements.filter(
      (r) => r.recognitionStatus === 'unrecognized'
    ).length;
    const matchedRequiredCount = matchedRequirements.filter(
      (r) => r.matchStatus === 'matched' && r.category === 'required'
    ).length;
    const matchedPreferredCount = matchedRequirements.filter(
      (r) => r.matchStatus === 'matched' && r.category === 'preferred'
    ).length;

    const coveragePercentage =
      totalRequirements > 0 ? Math.round((matchedCount / totalRequirements) * 100) : 0;

    const summary = {
      totalRequirements,
      requiredCount,
      preferredCount,
      unspecifiedCount,
      matchedCount,
      noEvidenceCount,
      recognizedCount,
      unrecognizedCount,
      matchedRequiredCount,
      matchedPreferredCount,
      coveragePercentage,
    };

    // 5. Persist JobMatch document in MongoDB
    const jobMatchDoc = await JobMatch.create({
      username: cleanUsername,
      title: cleanTitle,
      rawText,
      extractedRequirements: extraction.requirements,
      summary,
    });

    return {
      matchId: jobMatchDoc._id,
      username: cleanUsername,
      title: cleanTitle,
      createdAt: jobMatchDoc.createdAt,
      summary,
      requirements: matchedRequirements,
      rawTextPreview: rawText.length > 240 ? rawText.slice(0, 240) + '...' : rawText,
    };
  },

  /**
   * Retrieve list of previously saved job matches for a user.
   */
  async getUserJobMatches(username, { limit = 20, page = 1 } = {}) {
    if (!username) {
      const err = new Error('Username is required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const safePage = Math.max(1, parseInt(page, 10) || 1);

    const [matches, total] = await Promise.all([
      JobMatch.find({ username: cleanUsername })
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      JobMatch.countDocuments({ username: cleanUsername }),
    ]);

    return {
      username: cleanUsername,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
      matches: matches.map((m) => ({
        id: m._id,
        title: m.title,
        createdAt: m.createdAt,
        summary: m.summary,
        totalExtracted: m.extractedRequirements?.length || 0,
      })),
    };
  },

  /**
   * Retrieve a single previously saved job match and resolve against latest SkillEvidence.
   */
  async getJobMatchById(username, matchId) {
    if (!username || !matchId) {
      const err = new Error('Username and match ID are required');
      err.statusCode = 400;
      throw err;
    }

    const cleanUsername = username.trim().toLowerCase();

    const matchDoc = await JobMatch.findOne({
      _id: matchId,
      username: cleanUsername,
    }).lean();

    if (!matchDoc) {
      const err = new Error(`Job match '${matchId}' not found for user '${cleanUsername}'`);
      err.statusCode = 404;
      throw err;
    }

    // Resolve latest evidence records for the extracted requirements
    const evidenceRecords = await SkillEvidence.find({ username: cleanUsername })
      .sort({ lastObservedAt: -1 })
      .lean();

    const evidenceByKey = new Map();
    for (const ev of evidenceRecords) {
      if (!evidenceByKey.has(ev.technologyKey)) {
        evidenceByKey.set(ev.technologyKey, []);
      }
      evidenceByKey.get(ev.technologyKey).push(ev);
    }

    const resolvedRequirements = (matchDoc.extractedRequirements || []).map((req) => {
      if (req.recognitionStatus === 'unrecognized') {
        return {
          technologyKey: req.technologyKey,
          technology: req.displayName,
          category: req.category,
          recognitionStatus: 'unrecognized',
          matchStatus: 'unrecognized_technology',
          evidenceCount: 0,
          repositoryCount: 0,
          repositories: [],
          evidence: [],
          matchedText: req.matchedText,
          sampleSnippets: req.sampleSnippets || [],
        };
      }

      const evList = evidenceByKey.get(req.technologyKey) || [];

      if (evList.length > 0) {
        const repoMap = new Map();
        for (const ev of evList) {
          if (!repoMap.has(ev.githubRepoId)) {
            repoMap.set(ev.githubRepoId, {
              repository: ev.repositoryName,
              repositoryFullName: ev.repositoryFullName,
              repositoryUrl: ev.repositoryUrl,
              evidenceTypes: new Set(),
              sources: new Set(),
            });
          }
          const r = repoMap.get(ev.githubRepoId);
          r.evidenceTypes.add(ev.evidenceType);
          r.sources.add(ev.source);
        }

        const repositories = Array.from(repoMap.values()).map((r) => ({
          repository: r.repository,
          repositoryFullName: r.repositoryFullName,
          repositoryUrl: r.repositoryUrl,
          evidenceTypes: Array.from(r.evidenceTypes),
          sources: Array.from(r.sources),
        }));

        return {
          technologyKey: req.technologyKey,
          technology: req.displayName,
          category: req.category,
          recognitionStatus: 'recognized',
          matchStatus: 'matched',
          evidenceCount: evList.length,
          repositoryCount: repositories.length,
          repositories,
          evidence: evList.map((e) => ({
            repository: e.repositoryName,
            repositoryFullName: e.repositoryFullName,
            repositoryUrl: e.repositoryUrl,
            evidenceType: e.evidenceType,
            source: e.source,
            description: e.description,
            strength: e.strength,
            lastObservedAt: e.lastObservedAt || e.observedAt,
          })),
          matchedText: req.matchedText,
          sampleSnippets: req.sampleSnippets || [],
        };
      }

      return {
        technologyKey: req.technologyKey,
        technology: req.displayName,
        category: req.category,
        recognitionStatus: 'recognized',
        matchStatus: 'no_observable_evidence',
        evidenceCount: 0,
        repositoryCount: 0,
        repositories: [],
        evidence: [],
        matchedText: req.matchedText,
        sampleSnippets: req.sampleSnippets || [],
      };
    });

    return {
      matchId: matchDoc._id,
      username: cleanUsername,
      title: matchDoc.title,
      rawText: matchDoc.rawText,
      createdAt: matchDoc.createdAt,
      updatedAt: matchDoc.updatedAt,
      summary: matchDoc.summary,
      requirements: resolvedRequirements,
    };
  },
};

export default jobMatchingService;
