import { Router } from 'express';
import jobMatchingController from '../controllers/jobMatchingController.js';

const router = Router({ mergeParams: true });

// Create a new match between a JD and user's SkillEvidence
router.post('/', jobMatchingController.createMatch);

// List previous matches for a user
router.get('/', jobMatchingController.getMatches);

// Retrieve a specific match by ID
router.get('/:id', jobMatchingController.getMatchById);

export default router;
