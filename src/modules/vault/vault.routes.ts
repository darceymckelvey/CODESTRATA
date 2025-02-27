import { Router, Request, Response, NextFunction } from 'express';
import * as vaultController from './vault.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Protected routes - requires valid JWT token
router.get('/', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.getVaults(req, res, next);
});

// Public route for getting all vaults with search - still requires authentication for ownership info
router.get('/explore', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  // Add all=true parameter to the query to fetch all vaults
  req.query.all = 'true';
  vaultController.getVaults(req, res, next);
});

router.post('/', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.createVault(req, res, next);
});

router.post('/:id/fossilize', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.fossilize(req, res, next);
});

router.post('/:id/stratum-shift', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.stratumShift(req, res, next);
});

router.post('/:id/artifacts', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.uploadArtifacts(req, res, next);
});

router.delete('/:id', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.erodeVault(req, res, next);
});

// GitHub integration
router.post('/:id/github', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.initializeGithubRepo(req, res, next);
});

router.post('/:id/command', authMiddleware, (req: Request, res: Response, next: NextFunction) => {
  vaultController.executeCommand(req, res, next);
});

export default router;
