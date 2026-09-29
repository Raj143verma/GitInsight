import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import githubRoutes from './githubRoutes.js';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/github', githubRoutes);

export default apiRouter;
