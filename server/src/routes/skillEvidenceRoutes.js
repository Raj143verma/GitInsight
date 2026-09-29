import { Router } from 'express';
import skillEvidenceController from '../controllers/skillEvidenceController.js';

const router = Router({ mergeParams: true });

// Skill summary list
router.get('/', skillEvidenceController.getSkills);

// Skill detail evidence trail
router.get('/:technology', skillEvidenceController.getSkillDetail);

export default router;
