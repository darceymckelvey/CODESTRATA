// src/modules/auth/auth.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import * as authController from './auth.controller';
import { authMiddleware, AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// Public routes for authentication
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  await authController.register(req, res, next);
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  await authController.login(req, res, next);
});

router.post('/refresh-token', async (req: Request, res: Response, next: NextFunction) => {
  await authController.refreshToken(req, res, next);
});

// GitHub OAuth routes
/**
 * GitHub OAuth login route
 * Redirects the user to GitHub authorization page or returns the URL
 * Supports both direct browser redirects and AJAX requests that need the URL
 */
router.get('/github/login', (req: Request, res: Response) => {
  console.log('Starting GitHub OAuth flow');
  console.log('GitHub client ID:', process.env.GITHUB_CLIENT_ID);
  console.log('Callback URL:', process.env.GITHUB_CALLBACK_URL);
  
  authController.githubLogin(req, res);
});

/**
 * Explicitly handle OPTIONS requests for GitHub callback routes
 * This helps resolve CORS preflight issues
 */
router.options('/github/callback', (req: Request, res: Response) => {
  console.log('Received OPTIONS request for GitHub callback endpoint');
  // CORS headers are now handled by the cors middleware
  res.status(200).end();
});

/**
 * GitHub OAuth callback route
 * Handles the callback from GitHub after user authorization
 */
router.get('/github/callback', async (req: Request, res: Response, next: NextFunction) => {
  console.log('Received GitHub OAuth callback (GET)');
  console.log('Query parameters:', req.query);
  
  try {
    await authController.githubCallback(req, res, next);
  } catch (error) {
    console.error('Error in GitHub callback route:', error);
    next(error);
  }
});

/**
 * GitHub OAuth callback route - POST version
 * Handles the callback from frontend after GitHub authorization
 */
router.post('/github/callback', async (req: Request, res: Response, next: NextFunction) => {
  console.log('Received GitHub OAuth callback (POST)');
  console.log('Request body:', req.body);
  
  // Transfer code from body to query for consistent handling
  if (req.body && req.body.code) {
    req.query.code = req.body.code;
    req.query.state = req.body.state || 'frontend-post';
  }
  
  try {
    await authController.githubCallback(req, res, next);
  } catch (error) {
    console.error('Error in GitHub callback POST route:', error);
    next(error);
  }
});

// Protected routes
router.get('/profile', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  await authController.getProfile(req, res, next);
});

// Health check for auth configuration
router.get('/status', (req: Request, res: Response) => {
  try {
    // Basic server health check
    const serverStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'missing',
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ? 'configured' : 'missing',
        ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m (default)',
        REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d (default)'
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    };
    
    res.status(200).json({
      success: true,
      data: serverStatus
    });
  } catch (error) {
    console.error('Error in auth status endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check auth status'
    });
  }
});

// Endpoint to forcefully invalidate tokens
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
      return;
    }
    
    // Revoke all refresh tokens for this user
    authController.revokeAllRefreshTokens(req.user.id)
      .then(() => {
        // Clear auth cookies
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        
        res.status(200).json({
          success: true,
          data: { message: 'Logged out successfully' }
        });
      })
      .catch((error) => {
        console.error('Error during logout:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to logout properly'
        });
      });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout properly'
    });
  }
});

export default router;
