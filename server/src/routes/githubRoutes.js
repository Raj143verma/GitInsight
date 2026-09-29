import { Router } from 'express';
import githubController from '../controllers/githubController.js';
import analyticsRoutes from './analyticsRoutes.js';
import skillEvidenceRoutes from './skillEvidenceRoutes.js';
import repositoryHealthRoutes from './repositoryHealthRoutes.js';
import jobMatchingRoutes from './jobMatchingRoutes.js';

const router = Router();

// Profile lookup
router.get('/users/:username', githubController.getUser);

// Repository retrieval (paginated)
router.get('/users/:username/repos', githubController.getUserRepos);

// Repository language breakdown
router.get('/users/:username/repos/:repo/languages', githubController.getRepoLanguages);

// Public activity events
router.get('/users/:username/events', githubController.getUserEvents);

// Synchronization pipeline (updates profile, repos, and daily snapshot)
router.post('/users/:username/sync', githubController.syncUser);

// Historical Snapshots API
router.get('/users/:username/snapshots', githubController.getSnapshots);
router.get('/users/:username/snapshots/latest', githubController.getLatestSnapshot);
router.get('/users/:username/snapshots/compare', githubController.compareSnapshots);

// Historical Repositories & Language Trends API
router.get('/users/:username/repositories/history', githubController.getRepositoryHistory);
router.get('/users/:username/languages/history', githubController.getLanguageHistory);

// Analytics Engine API
router.use('/users/:username/analytics', analyticsRoutes);

// Skill Evidence Engine API
router.use('/users/:username/skills', skillEvidenceRoutes);

// Repository Health & Maintenance Analytics API
router.use('/users/:username/repository-health', repositoryHealthRoutes);

// Job Description Matching & Evidence Mapping API
router.use('/users/:username/job-matches', jobMatchingRoutes);

// Rate limit inspection
router.get('/rate-limit', githubController.getRateLimit);

export default router;

