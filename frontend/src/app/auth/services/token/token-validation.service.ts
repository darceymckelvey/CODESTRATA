import { Injectable, PLATFORM_ID, Inject, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../../environments/environment';

/**
 * Service responsible for validating JWT tokens
 * Handles validation, expiration checking, and token payload decoding
 */
@Injectable({
  providedIn: 'root'
})
export class TokenValidationService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private jwtHelper: JwtHelperService
  ) {
    if (!this.jwtHelper) {
      console.warn('JwtHelperService is not available. Using fallback token validation logic.');
    }
  }

  /**
   * Check if a token is valid (properly formatted and not expired)
   * @param token The token to validate
   * @returns Boolean indicating if the token is valid
   */
  isTokenValid(token: string): boolean {
    if (!token) {
      console.log('Token validation failed: No token provided');
      return false;
    }
    
    // Check if running in SSR/non-browser - always return false for server-side
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    
    try {
      // Check if token has the expected JWT format
      const parts = token.split('.');
      
      // Log token format for debugging
      console.log(`[TokenValidation] Token format check: ${parts.length} parts`);
      
      // First check for GitHub token format
      if (token.startsWith('gho_') && token.length >= 20) {
        console.log('[TokenValidation] Detected valid GitHub token format');
        return true;
      } else if (token.startsWith('gho_')) {
        console.warn('[TokenValidation] Suspicious GitHub token format (invalid length)');
        // Allow in development, reject in production
        return !environment.production;
      }
      
      // Standard JWT validation for production
      if (environment.production) {
        // In production, require strict JWT format for non-GitHub tokens
        if (parts.length !== 3) {
          console.warn('[TokenValidation] Invalid token format - token does not have 3 parts');
          return false;
        }
      } else {
        // In development, be more lenient with non-GitHub tokens
        if (parts.length !== 3) {
          console.warn('[TokenValidation] Non-standard token format in development, allowing');
          return true;
        }
      }
      
      // If we have a standard JWT, decode and validate it
      if (parts.length === 3) {
        try {
          if (this.jwtHelper) {
            // Use JWT helper to check token expiration if available
            if (this.jwtHelper.isTokenExpired(token)) {
              console.warn('[TokenValidation] Token has expired');
              return false;
            }
            
            // Get expiration date for logging
            const expirationDate = this.jwtHelper.getTokenExpirationDate(token);
            if (expirationDate) {
              const expiresInMinutes = Math.round((expirationDate.getTime() - Date.now()) / 60000);
              console.log(`[TokenValidation] Token expires in approximately ${expiresInMinutes} minutes`);
              
              // If token is close to expiring, log a warning
              if (expiresInMinutes < 5) {
                console.warn(`[TokenValidation] Token expires soon (${expiresInMinutes} minutes)`);
              }
            } else {
              console.log('[TokenValidation] Token has no expiration date');
              
              // In production, reject tokens without expiration
              if (environment.production) {
                console.warn('[TokenValidation] Token without expiration rejected in production');
                return false;
              }
            }
          } else {
            // Fallback validation if JwtHelperService is not available
            try {
              // Manual decode to check expiration
              const payload = JSON.parse(atob(parts[1]));
              if (payload.exp) {
                const expirationDate = new Date(payload.exp * 1000);
                if (expirationDate < new Date()) {
                  console.warn('[TokenValidation] Token has expired (fallback check)');
                  return false;
                }
                
                const expiresInMinutes = Math.round((expirationDate.getTime() - Date.now()) / 60000);
                console.log(`[TokenValidation] Token expires in approximately ${expiresInMinutes} minutes (fallback check)`);
              } else {
                console.log('[TokenValidation] Token has no expiration date (fallback check)');
                // In production, reject tokens without expiration
                if (environment.production) {
                  console.warn('[TokenValidation] Token without expiration rejected in production');
                  return false;
                }
              }
            } catch (fallbackError) {
              console.error('[TokenValidation] Fallback token validation failed:', fallbackError);
              // Only allow invalid tokens in development
              return !environment.production;
            }
          }
          
          // Token passes all validation checks
          return true;
        } catch (jwtError) {
          console.error('[TokenValidation] JWT validation error:', jwtError);
          
          // Only allow invalid tokens in development
          if (!environment.production) {
            console.log('[TokenValidation] Allowing invalid token in development despite JWT error');
            return true;
          }
          return false;
        }
      }
      
      // Default for non-JWT tokens in development
      return !environment.production;
    } catch (error) {
      console.error('[TokenValidation] Token validation failed with error:', error);
      return false;
    }
  }

  /**
   * Decode JWT token to extract payload information
   * @param token JWT token to decode
   * @returns Decoded token payload or null if invalid
   */
  decodeToken(token: string): any | null {
    if (!token) {
      return null;
    }
    
    try {
      if (this.jwtHelper) {
        return this.jwtHelper.decodeToken(token);
      } else {
        // Fallback manual decoding
        const parts = token.split('.');
        if (parts.length !== 3) {
          return null;
        }
        
        return JSON.parse(atob(parts[1]));
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Check if the token is expired
   * @param token JWT token to check
   * @returns Boolean indicating if token is expired
   */
  isTokenExpired(token: string): boolean {
    if (!token) {
      return true;
    }
    
    try {
      if (this.jwtHelper) {
        return this.jwtHelper.isTokenExpired(token);
      } else {
        // Fallback manual expiration check
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) {
          return true;
        }
        
        const expirationDate = new Date(decoded.exp * 1000);
        return expirationDate < new Date();
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Get the expiration date of a token
   * @param token JWT token
   * @returns Expiration date or null if invalid
   */
  getTokenExpirationDate(token: string): Date | null {
    if (!token) {
      return null;
    }
    
    try {
      if (this.jwtHelper) {
        return this.jwtHelper.getTokenExpirationDate(token);
      } else {
        // Fallback manual expiration date extraction
        const decoded = this.decodeToken(token);
        if (!decoded || !decoded.exp) {
          return null;
        }
        
        return new Date(decoded.exp * 1000);
      }
    } catch (error) {
      console.error('Error getting token expiration date:', error);
      return null;
    }
  }

  /**
   * Extract token version from refresh token
   * @param refreshToken Refresh token
   * @returns Token version number or null if not found
   */
  extractTokenVersion(refreshToken: string): number | null {
    if (!refreshToken) {
      return null;
    }
    
    try {
      // Enhanced GitHub token handling
      if (refreshToken.startsWith('gho_')) {
        console.log('Detected GitHub token format in extractTokenVersion');
        // For GitHub tokens, we use a constant version since they don't contain version info
        return 1; // Default version for GitHub tokens
      }
      
      const decoded = this.decodeToken(refreshToken);
      if (decoded && typeof decoded.tokenVersion === 'number') {
        return decoded.tokenVersion;
      }
      return null;
    } catch (error) {
      console.error('Error extracting token version:', error);
      return null;
    }
  }

  /**
   * Checks if a token is valid and verifiable with our JWT library
   * @param token JWT token string
   * @returns Object with validation result and optional error
   */
  verifyTokenFormat(token: string): { isValid: boolean; error?: string } {
    try {
      if (!token) {
        return { isValid: false, error: 'No token provided' };
      }
      
      // Special handling for GitHub tokens
      if (token.startsWith('gho_')) {
        console.log('[TokenValidation] GitHub token format detected in verifyTokenFormat');
        if (token.length >= 20) {
          return { isValid: true };
        } else {
          return { 
            isValid: !environment.production, 
            error: 'GitHub token has suspicious length' 
          };
        }
      }
      
      // Check token format for standard JWT
      const parts = token.split('.');
      if (parts.length !== 3) {
        // In development, we allow non-standard formats
        if (!environment.production) {
          console.warn('[TokenValidation] Non-standard token format in development, allowing in verifyTokenFormat');
          return { isValid: true, error: 'Non-standard token format (allowed in development)' };
        }
        return { isValid: false, error: 'Invalid token format (should have 3 parts)' };
      }
      
      // Try to decode token
      const decoded = this.decodeToken(token);
      if (!decoded) {
        if (!environment.production) {
          console.warn('[TokenValidation] Token could not be decoded, but allowing in development');
          return { isValid: true, error: 'Token could not be decoded (allowed in development)' };
        }
        return { isValid: false, error: 'Token could not be decoded' };
      }
      
      // Check for expiration
      if (this.isTokenExpired(token)) {
        return { isValid: false, error: 'Token is expired' };
      }
      
      // Check for essential claims - more lenient in development
      if (!decoded.sub && !decoded.id) {
        if (!environment.production) {
          console.warn('[TokenValidation] Token missing required claims, but allowing in development');
          return { isValid: true, error: 'Token missing required claims (allowed in development)' };
        }
        return { isValid: false, error: 'Token missing required claims (sub/id)' };
      }
      
      return { isValid: true };
    } catch (error) {
      console.error('Error verifying token format:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // In development, allow tokens even on verification errors
      if (!environment.production) {
        console.warn('[TokenValidation] Token verification error in development, allowing anyway');
        return { isValid: true, error: `Token verification error (allowed in development): ${errorMessage}` };
      }
      
      return { isValid: false, error: `Token verification error: ${errorMessage}` };
    }
  }
} 