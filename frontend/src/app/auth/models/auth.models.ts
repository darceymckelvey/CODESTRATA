/**
 * Models and interfaces for authentication
 */

/**
 * User profile data structure
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profileData: {
    createdAt: string;
    lastLogin: string;
    settings: Record<string, any>;
    preferences: Record<string, any>;
  };
  terrainPathsId?: number;
  strataVaultsId?: number;
  terrainProgressId?: number;
  terrainReviewsId?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Structure for Strata Vault model
 */
export interface StrataVault {
  id: number;
  profileId: number;
  name: string;
  description?: string;
  repositoryUri?: string;
  currentBranch: string;
  fossilizesId: number;
  artifacts?: string[];
  strata?: string[];
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Authentication API response structure
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  useCookies?: boolean; // Flag indicating whether cookies are used for auth
}

/**
 * Environment configuration
 */
export interface Environment {
  production: boolean;
  apiUrl: string;
  github: {
    clientId: string;
    redirectUri: string;
  };
  auth: {
    tokenRefreshThreshold: number;
    sessionTimeout: number;
  };
}

/**
 * Auth state information
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Token health diagnostic result
 */
export interface TokenHealthStatus {
  overallHealth: 'healthy' | 'issues-detected' | 'error';
  error?: string; // Error message if overallHealth is 'error'
  accessToken: {
    present: boolean;
    isValid: boolean;
    error?: string;
  };
  refreshToken: {
    present: boolean;
    isValid: boolean;
    error?: string;
  };
  tokenVersion: {
    stored: number | null;
    match: boolean;
    message: string;
  };
  timestamp: string;
}

/**
 * Structure for token diagnostics
 */
export interface TokenDiagnostics {
  localStorage: {
    accessToken: string;
    refreshToken: string;
    tokenVersion: number | null;
  };
  cookies: Record<string, string>;
  tokenDetails: {
    accessToken: any;
    refreshToken: any;
    expiryInfo: any;
  };
  timestamp: string;
  error?: string;
}

/**
 * Troubleshooting result
 */
export interface TroubleshootResult {
  status: 'healthy' | 'fixed' | 'error' | 'logged_out' | 'no_action' | 'pending';
  message: string;
  action?: string;
  details?: any;
  previousHealth?: TokenHealthStatus;
  newHealth?: TokenHealthStatus;
  error?: string;
} 