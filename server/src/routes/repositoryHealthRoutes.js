import { Router } from 'express';
import repositoryHealthController from '../controllers/repositoryHealthController.js';

const router = Router({ mergeParams: true });

// Portfolio health summary with optional filters (?status=active&language=JavaScript&archived=false&from=YYYY-MM-DD&to=YYYY-MM-DD)
router.get('/', repositoryHealthController.getRepositoryHealthSummary);

// Single repository observable health indicators & historical trends
router.get('/:repository', repositoryHealthController.getSingleRepositoryHealth);

export default router;
