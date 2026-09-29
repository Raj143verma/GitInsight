import { Router } from 'express';
import analyticsController from '../controllers/analyticsController.js';

const router = Router({ mergeParams: true });

// Developer overview analytics
router.get('/overview', analyticsController.getOverview);

// Repository growth and historical trends
router.get('/repositories', analyticsController.getRepositoryGrowth);

// Repository activity freshness and composition patterns
router.get('/repositories/activity', analyticsController.getRepositoryActivity);

// Language distribution and trend analytics
router.get('/languages', analyticsController.getLanguageAnalytics);

// Observable activity trends
router.get('/activity', analyticsController.getActivityTrends);

export default router;
