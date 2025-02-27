// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import LithoProfile from '../models/LithoProfile.model';

/**
 * JWT payload structure containing user information
 */
interface JwtPayload {
  id: number;
  email: string;
  role: string;
  exp?: number;
}

/**
 * Extended Request interface with user property
 */
export interface AuthRequest extends Request {
  user?: LithoProfile;
}

/**
 * Authentication middleware to verify JWT tokens and attach user to request
 * 
 * This middleware:
 * 1. Extracts the JWT token from the Authorization header
 * 2. Verifies the token's validity
 * 3. Fetches the user from the database
 * 4. Attaches the user object to the request for use in route handlers
 */
export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Authentication required',
        code: 'AUTH_HEADER_MISSING',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Invalid token',
        code: 'TOKEN_MISSING',
      });
      return;
    }

    // Verify and decode token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: 'Server configuration error',
        code: 'SERVER_CONFIG_ERROR',
      });
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      // Log successful token validation for debugging
      console.log('Token successfully validated for user:', {
        userId: decoded.id,
        email: decoded.email,
        role: decoded.role,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'undefined'
      });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.error('Token expired error:', {
          error: error.message,
          expiredAt: (error as jwt.TokenExpiredError).expiredAt
        });
        
        res.status(StatusCodes.UNAUTHORIZED).json({
          message: 'Token expired',
          code: 'TOKEN_EXPIRED',
          details: {
            expiredAt: (error as jwt.TokenExpiredError).expiredAt
          }
        });
        return;
      }
      
      // For other JWT errors, log additional information
      console.error('Token validation error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        token: token.substring(0, 10) + '...' // Log part of token for debugging
      });
      
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'Invalid token',
        code: 'TOKEN_INVALID',
        details: {
          error: error instanceof Error ? error.name : 'Unknown error'
        }
      });
      return;
    }

    // Check if token is about to expire (within 1 hour)
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp - nowInSeconds < 3600) {
      // Note: Token is close to expiration, could add token refresh logic here
      // This would typically set a header to inform the client
      console.log('Token is close to expiration:', {
        userId: decoded.id,
        expiresIn: decoded.exp - nowInSeconds,
        expiresAt: new Date(decoded.exp * 1000).toISOString()
      });
    }

    // Fetch user from database
    const user = await LithoProfile.findByPk(decoded.id);
    if (!user) {
      console.error('User not found for token:', {
        userId: decoded.id,
        email: decoded.email
      });
      
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Authentication error',
      code: 'AUTH_ERROR',
    });
    return;
  }
};
