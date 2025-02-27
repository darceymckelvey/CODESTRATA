// src/modules/auth/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import LithoProfile from '../../models/LithoProfile.model';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // changed to secure import
import { AuthRequest } from '../../middleware/auth.middleware';
import { RefreshToken } from '../../models/LithoProfile.model';
import crypto from 'crypto';

// JWT token configuration
const JWT_CONFIG: SignOptions = {
  expiresIn: '24h',
};

const REFRESH_TOKEN_CONFIG: SignOptions = {
  expiresIn: '7d',
};

// Secure cookie options
const COOKIE_OPTIONS = {
  httpOnly: true,  // Prevents client-side JS from reading the cookie
  secure: process.env.NODE_ENV === 'production', // Only use HTTPS in production
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // CSRF protection
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
} as const;

const REFRESH_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh-token', // Restrict to refresh token endpoint
} as const;

/**
 * Set authentication cookies and store token in profile data
 */
const setAuthCookies = async (
  res: Response, 
  user: any, 
  req: Request
): Promise<{ token: string, refreshToken: string }> => {
  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'your-secret-key',
    JWT_CONFIG
  );
  
  // Generate refresh token with a unique ID
  const refreshTokenId = uuidv4();
  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.profileData?.tokenVersion || 1, jti: refreshTokenId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    REFRESH_TOKEN_CONFIG
  );
  
  // Store refresh token in database
  const tokenExpiration = new Date();
  tokenExpiration.setDate(tokenExpiration.getDate() + 7); // 7 days
  
  const newRefreshToken: RefreshToken = {
    token: refreshTokenId, // Store just the unique ID, not the full token
    expiresAt: tokenExpiration,
    createdAt: new Date(),
    isRevoked: false,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  };
  
  console.log('Generating new refresh token:', {
    userId: user.id,
    refreshTokenId,
    expiresAt: tokenExpiration
  });
  
  // Add token to the user's profile data
  const currentRefreshTokens = user.profileData?.refreshTokens || [];
  
  // Clean up expired tokens
  const now = new Date();
  const validTokens = currentRefreshTokens.filter((t: RefreshToken) => {
    const expires = new Date(t.expiresAt);
    return !t.isRevoked && expires > now;
  });
  
  const updatedProfileData = {
    ...user.profileData,
    lastLogin: new Date(),
    tokenVersion: user.profileData?.tokenVersion || 1,
    refreshTokens: [...validTokens, newRefreshToken]
  };
  
  console.log('Storing refresh token in user profile:', {
    userId: user.id,
    tokenVersion: updatedProfileData.tokenVersion,
    refreshTokensCount: updatedProfileData.refreshTokens.length,
    tokensCleanedUp: currentRefreshTokens.length - validTokens.length
  });
  
  // Update the user profile
  await user.update({ profileData: updatedProfileData });
  
  // Set cookies
  res.cookie('access_token', token, COOKIE_OPTIONS);
  res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);
  
  return { token, refreshToken };
};

/**
 * Clear authentication cookies
 */
const clearAuthCookies = (res: Response): void => {
  res.clearCookie('access_token', COOKIE_OPTIONS);
  res.clearCookie('refresh_token', REFRESH_COOKIE_OPTIONS);
};

/**
 * Revoke a specific refresh token
 */
const revokeRefreshToken = async (user: any, tokenId: string): Promise<void> => {
  if (!user.profileData?.refreshTokens) {
    return;
  }
  
  const updatedTokens = user.profileData.refreshTokens.map((token: RefreshToken) => {
    if (token.token === tokenId) {
      return { ...token, isRevoked: true };
    }
    return token;
  });
  
  await user.update({
    profileData: {
      ...user.profileData,
      refreshTokens: updatedTokens
    }
  });
};

/**
 * Revoke all refresh tokens for a user
 * This is used when a user logs out or needs to invalidate all sessions
 */
export const revokeAllRefreshTokens = async (userId: number): Promise<void> => {
  try {
    console.log(`Revoking all refresh tokens for user ID: ${userId}`);
    
    // Find the user
    const user = await LithoProfile.findByPk(userId);
    if (!user || !user.profileData) {
      console.warn(`Can't revoke tokens: User ${userId} not found or has no profile data`);
      return;
    }
    
    // Increment token version to invalidate all existing tokens
    const tokenVersion = (user.profileData.tokenVersion || 0) + 1;
    
    // Mark all tokens as revoked
    const updatedTokens = user.profileData.refreshTokens?.map((token: RefreshToken) => ({
      ...token,
      isRevoked: true
    })) || [];
    
    console.log(`Incrementing token version from ${user.profileData.tokenVersion} to ${tokenVersion} and revoking ${updatedTokens.length} tokens`);
    
    // Update user profile
    await user.update({
      profileData: {
        ...user.profileData,
        tokenVersion,
        refreshTokens: updatedTokens
      }
    });
    
    console.log(`Successfully revoked all tokens for user ${userId}`);
  } catch (error) {
    console.error(`Error revoking refresh tokens for user ${userId}:`, error);
    throw error;
  }
};

// Handles new user registration. Takes username, email, and password from request body.
// Creates a new user with 'student' role and returns a JWT token for immediate login.
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, email, password, role = 'student' } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    // Validate role
    const validRoles = ['student', 'instructor', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    // Check if user already exists
    const existingUser = await LithoProfile.findOne({
      where: {
        [Op.or]: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        res.status(400).json({ message: 'Username already in use' });
        return;
      }
      if (existingUser.email === email) {
        res.status(400).json({ message: 'Email already in use' });
        return;
      }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user profile
    const user = await LithoProfile.create({
      username,
      email,
      passwordHash,
      role,
      profileData: {
        createdAt: new Date(),
        lastLogin: new Date(),
        settings: {},
        preferences: {},
        refreshTokens: [],
        tokenVersion: 1
      },
    });

    // Set authentication cookies and generate tokens
    const { token, refreshToken } = await setAuthCookies(res, user, req);

    // Return user data and tokens
    // We still include tokens in the response body for API clients that can't use cookies
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileData: {
          createdAt: user.profileData.createdAt,
          lastLogin: user.profileData.lastLogin,
          settings: user.profileData.settings,
          preferences: user.profileData.preferences,
        },
      },
      token,
      refreshToken,
      useCookies: true, // Flag to indicate cookies are available
    });
  } catch (err: any) {
    console.error('Error registering user:', err);
    res.status(500).json({ message: 'Error registering user' });
  }
};

/**
 * Handles user login. Takes email and password from request body.
 * Verifies credentials and returns a JWT token if valid.
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate email and password are provided
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user by email
    const user = await LithoProfile.findOne({
      where: { email },
    });

    // Check if user exists and verify password
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Set authentication cookies and generate tokens
    const { token, refreshToken } = await setAuthCookies(res, user, req);

    // Return user data and tokens
    // We still include tokens in the response body for API clients that can't use cookies
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profileData: {
          createdAt: user.profileData.createdAt,
          lastLogin: user.profileData.lastLogin,
          settings: user.profileData.settings,
          preferences: user.profileData.preferences
        },
      },
      token,
      refreshToken,
      useCookies: true, // Flag to indicate cookies are available
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Error during login process' });
  }
};

/**
 * Retrieves user profile information for authenticated users.
 * Requires valid JWT token in Authorization header.
 */
export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      console.log('No user ID in request');
      res.status(401).json({ message: 'User not found' });
      return;
    }

    const user = await LithoProfile.findOne({
      where: { id: req.user.id },
      attributes: ['id', 'username', 'email', 'role'],
    });

    if (!user) {
      console.log('User not found in database:', req.user.id);
      res.status(404).json({ message: 'User not found' });
      return;
    }

    console.log('Returning profile for user:', user.id);
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
  } catch (err: any) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ message: 'Error fetching profile' });
  }
};

/**
 * Refreshes the user's access token using a valid refresh token.
 * Either from cookies or from request body.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get refresh token from cookie or request body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    console.log('Refresh token attempt:', {
      hasCookies: !!req.cookies,
      hasRefreshTokenCookie: !!req.cookies?.refreshToken,
      hasRefreshTokenBody: !!req.body?.refreshToken,
      tokenReceived: !!refreshToken,
    });
    
    if (!refreshToken) {
      console.error('Refresh token error: No refresh token provided in cookies or request body');
      res.status(401).json({ 
        message: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING'
      });
      return;
    }

    // Verify the refresh token
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key') as JwtPayload;
      
      console.log('Refresh token decoded successfully:', {
        userId: decoded.id,
        tokenVersion: decoded.tokenVersion,
        jti: decoded.jti,
        exp: decoded.exp
      });
      
      // Find user by ID
      const user = await LithoProfile.findByPk(decoded.id);
      
      if (!user) {
        console.error(`User not found with ID: ${decoded.id}`);
        res.status(401).json({ 
          message: 'User not found',
          code: 'USER_NOT_FOUND' 
        });
        return;
      }
      
      console.log('User found:', {
        id: user.id,
        hasProfileData: !!user.profileData,
        tokenVersion: user.profileData?.tokenVersion,
        refreshTokensCount: user.profileData?.refreshTokens?.length || 0
      });
      
      // Initialize profileData if it doesn't exist (for GitHub users who might not have it)
      if (!user.profileData) {
        console.log('Initializing profileData for user');
        user.profileData = {
          createdAt: new Date(),
          lastLogin: new Date(),
          tokenVersion: 1,
          refreshTokens: [],
          settings: {},
          preferences: {}
        };
        await user.save();
      }
      
      // Check if the token version matches
      const storedTokenVersion = user.profileData?.tokenVersion || 1;
      if (decoded.tokenVersion !== storedTokenVersion) {
        console.error(`Token version mismatch: decoded=${decoded.tokenVersion}, stored=${storedTokenVersion}`);
        res.status(401).json({ 
          message: 'Token version mismatch',
          code: 'TOKEN_VERSION_MISMATCH',
          details: {
            storedVersion: storedTokenVersion,
            tokenVersion: decoded.tokenVersion
          }
        });
        return;
      }
      
      // Check if the token has been revoked
      if (decoded.jti) {
        const storedRefreshTokens = user.profileData?.refreshTokens || [];
        console.log('Checking refresh tokens:', {
          hasJti: !!decoded.jti,
          storedTokensCount: storedRefreshTokens.length,
          storedTokens: storedRefreshTokens.map((t: RefreshToken) => ({ 
            id: t.token, 
            revoked: t.isRevoked,
            expires: t.expiresAt 
          }))
        });
        
        const tokenRecord = storedRefreshTokens.find((t: RefreshToken) => t.token === decoded.jti);
        
        if (!tokenRecord) {
          console.error(`Token with ID ${decoded.jti} not found in user's refresh tokens`);
          res.status(401).json({ 
            message: 'Token not found',
            code: 'TOKEN_ID_NOT_FOUND' 
          });
          return;
        }
        
        if (tokenRecord.isRevoked) {
          console.error(`Token with ID ${decoded.jti} has been revoked`);
          res.status(401).json({ 
            message: 'Token has been revoked',
            code: 'TOKEN_REVOKED' 
          });
          return;
        }
        
        // Check expiration
        const now = new Date();
        const expirationDate = new Date(tokenRecord.expiresAt);
        if (expirationDate < now) {
          console.error(`Token with ID ${decoded.jti} expired at ${expirationDate}, current time: ${now}`);
          res.status(401).json({ 
            message: 'Token has expired',
            code: 'TOKEN_EXPIRED',
            details: {
              expired: expirationDate.toISOString(),
              now: now.toISOString()
            }
          });
          return;
        }
      } else {
        console.warn('No JTI (token ID) in the refresh token payload');
      }
      
      // Generate new tokens
      const { token, refreshToken: newRefreshToken } = await setAuthCookies(res, user, req);
            
      // Return tokens in response body as well
      res.json({ 
        token, 
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          profileData: {
            createdAt: user.profileData.createdAt,
            lastLogin: user.profileData.lastLogin,
            settings: user.profileData.settings,
            preferences: user.profileData.preferences
          }
        }
      });
    } catch (err) {
      // If token verification fails
      console.error('Token verification error:', err);
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ 
          message: 'Refresh token has expired',
          code: 'REFRESH_TOKEN_EXPIRED',
          details: {
            expiredAt: (err as jwt.TokenExpiredError).expiredAt
          }
        });
      } else if (err instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ 
          message: 'Invalid refresh token',
          code: 'REFRESH_TOKEN_INVALID',
          details: {
            error: err.message
          }
        });
      } else {
        res.status(401).json({ 
          message: 'Invalid or expired refresh token',
          code: 'REFRESH_TOKEN_ERROR'
        });
      }
    }
  } catch (err: any) {
    console.error('Refresh token error:', err);
    res.status(500).json({ 
      message: 'Error refreshing token',
      code: 'SERVER_ERROR'
    });
  }
};

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

/**
 * Initiates GitHub OAuth login flow
 * 
 * @param req Request object
 * @param res Response object
 */
export const githubLogin = (req: Request, res: Response): void => {
  try {
    // Set source parameter to identify if this is a login or signup request
    const source = req.query.source || 'login';
    
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      console.error('GITHUB_CLIENT_ID environment variable is not set');
      res.status(500).json({ message: 'GitHub authentication is not configured' });
      return;
    }

    // If this is an API request that wants the URL rather than a redirect
    if (req.query.getUrl || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&state=${source}-${Date.now()}`;
      console.log('Returning GitHub URL:', githubUrl);
      res.json({ url: githubUrl });
      return;
    }

    // If it's a regular request, redirect the user to GitHub
    const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=user:email&state=${source}-${Date.now()}`;
    console.log('Redirecting to GitHub:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error in GitHub login:', err);
    res.status(500).json({ message: 'Error during GitHub authentication initialization' });
  }
};

/**
 * Handles GitHub OAuth callback. Exchanges code for token and creates/updates user.
 */
export const githubCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, state } = req.query;
    if (!code) {
      res.status(400).json({ message: 'Authorization code is required' });
      return;
    }

    // Always treat GitHub auth as login, regardless of the source parameter
    const sourceType = 'login';
    console.log('GitHub auth source forced to login mode');

    // Get access token from GitHub
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!tokenResponse.data.access_token) {
      console.error('Failed to obtain access token:', tokenResponse.data);
      res.status(401).json({ message: 'Failed to obtain access token' });
      return;
    }

    // Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokenResponse.data.access_token}`,
      },
    });

    const githubUser = userResponse.data;
    
    // Variable to store our LithoProfile user
    let user: any;

    // Get user's primary email if it's not public in their profile
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${tokenResponse.data.access_token}`,
        },
      });
      
      const primaryEmail = emailsResponse.data.find((e: any) => e.primary);
      email = primaryEmail ? primaryEmail.email : null;
    }

    if (!email) {
      res.status(400).json({ message: 'Could not retrieve email from GitHub' });
      return;
    }

    // Check if a user with the same GitHub ID already exists (direct match)
    const existingGithubUser = await LithoProfile.findOne({
      where: {
        profileData: {
          githubId: githubUser.id.toString()
        }
      }
    });

    // Check if a user with the same email exists
    const existingEmailUser = await LithoProfile.findOne({ where: { email } });
    
    // Case 1: User with this GitHub ID already exists - use that account
    if (existingGithubUser) {
      console.log('User with GitHub ID already exists, logging in with that account:', existingGithubUser.email);
      user = existingGithubUser;
    }
    // Case 2: Email exists but not linked to this GitHub account
    else if (existingEmailUser) {
      // We're only using GitHub for login now, not signup
      
      // For login, link this GitHub account to the existing user
      console.log('Linking GitHub account to existing user:', email);
      existingEmailUser.profileData.githubId = githubUser.id.toString();
      existingEmailUser.profileData.githubUsername = githubUser.login;
      await existingEmailUser.save();
      user = existingEmailUser;
    } else {
      // Create new user
      const username = `${githubUser.login}_${Math.floor(Math.random() * 1000)}`;
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      try {
        user = await LithoProfile.create({
          email,
          username,
          passwordHash,
          role: 'student',
          profileData: {
            createdAt: new Date(),
            lastLogin: new Date(),
            githubId: githubUser.id.toString(),
            githubUsername: githubUser.login,
            settings: {},
            preferences: {},
            refreshTokens: [],
            tokenVersion: 0
          },
        });
      } catch (err: any) {
        console.error('Error creating new user:', err);
        res.status(500).json({ message: 'Error creating new user' });
        return;
      }
    }

    // Set authentication cookies
    const { token, refreshToken } = await setAuthCookies(res, user, req);

    // Include user data in the redirect to avoid additional API requests
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    // Base64 encode the user data to safely include it in the URL
    const encodedUserData = Buffer.from(JSON.stringify(userData)).toString('base64');

    // Redirect to frontend with tokens as URL parameters
    // This is a fallback for clients that don't support cookies
    const frontendCallback = process.env.FRONTEND_URL || 'http://localhost:4200';
    const redirectUrl = `${frontendCallback}/auth/github-callback?token=${token}&refreshToken=${refreshToken}&userData=${encodedUserData}`;
    
    console.log('Redirecting to frontend with tokens:', { 
      frontendUrl: frontendCallback,
      hasToken: !!token,
      hasRefreshToken: !!refreshToken,
      hasUserData: !!encodedUserData
    });
    
    res.redirect(redirectUrl);
  } catch (err: any) {
    console.error('GitHub callback error:', err);
    res.status(500).json({ message: 'GitHub authentication error' });
  }
};
