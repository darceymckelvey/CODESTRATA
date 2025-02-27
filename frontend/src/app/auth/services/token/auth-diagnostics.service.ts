import { Injectable, PLATFORM_ID, Inject, Optional } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { environment } from '../../../../environments/environment';

import { TokenHealthStatus, TokenDiagnostics, TroubleshootResult } from '../../models/auth.models';
import { TokenStorageService } from './token-storage.service';
import { TokenValidationService } from './token-validation.service';

/**
 * Auth Diagnostics Service
 * 
 * Provides tools for diagnosing and troubleshooting authentication issues:
 * - Token health checks
 * - Comprehensive diagnostics
 * - Automated troubleshooting
 * - Force logout functionality
 */
@Injectable({ providedIn: 'root' })
export class AuthDiagnosticsService {
  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private jwtHelper: JwtHelperService,
    private tokenStorage: TokenStorageService,
    private tokenValidation: TokenValidationService,
    private http: HttpClient,
    private router: Router
  ) {
    if (!this.jwtHelper) {
      console.warn('JwtHelperService is not available in AuthDiagnosticsService. Some diagnostics may be limited.');
    }
  }

  /**
   * Debug token information
   * @returns Object with token status information
   */
  public debugTokenInfo(): { tokenStatus: string, refreshTokenStatus: string } {
    // Only run in browser
    if (!isPlatformBrowser(this.platformId)) {
      return { tokenStatus: 'N/A - SSR', refreshTokenStatus: 'N/A - SSR' };
    }
    
    try {
      const token = this.tokenStorage.getToken();
      const refreshToken = this.tokenStorage.getRefreshToken();
      
      // Check token
      let tokenStatus = 'No token found';
      if (token) {
        const isValid = this.tokenValidation.isTokenValid(token);
        tokenStatus = isValid ? 'Valid' : 'Invalid';
        
        // Get token parts if it's a JWT
        const parts = token.split('.');
        if (parts.length === 3) {
          try {
            const payload = this.jwtHelper.decodeToken(token);
            const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration';
            tokenStatus += ` (Expires: ${exp})`;
          } catch (e) {
            tokenStatus += ' (Error parsing token)';
          }
        } else {
          tokenStatus += ' (Non-JWT format)';
        }
      }
      
      // Check refresh token
      let refreshTokenStatus = 'No refresh token found';
      if (refreshToken) {
        refreshTokenStatus = 'Present';
        
        // If it's a JWT, try to get expiration
        if (refreshToken.split('.').length === 3) {
          try {
            const payload = this.jwtHelper.decodeToken(refreshToken);
            const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration';
            refreshTokenStatus += ` (Expires: ${exp})`;
          } catch (e) {
            refreshTokenStatus += ' (Error parsing token)';
          }
        }
      }
      
      const result = { tokenStatus, refreshTokenStatus };
      console.log('Auth debug info:', result);
      return result;
    } catch (error: any) {
      console.error('Error getting debug token info:', error);
      return { 
        tokenStatus: `Error: ${error?.message || 'Unknown error'}`, 
        refreshTokenStatus: `Error: ${error?.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Comprehensive token diagnostics
   * @returns Detailed token diagnostic information
   */
  public diagnoseThatTokens(): TokenDiagnostics {
    try {
      if (!isPlatformBrowser(this.platformId)) {
        return { 
          error: 'Not running in browser',
          localStorage: { 
            accessToken: 'N/A', 
            refreshToken: 'N/A', 
            tokenVersion: null 
          },
          cookies: {},
          tokenDetails: { 
            accessToken: null, 
            refreshToken: null, 
            expiryInfo: null 
          },
          timestamp: new Date().toISOString()
        };
      }
      
      console.log('Running token diagnostics');
      
      // Get tokens from localStorage
      const accessToken = this.tokenStorage.getToken();
      const refreshToken = this.tokenStorage.getRefreshToken();
      const tokenVersion = this.tokenStorage.getTokenVersion();
      
      // Try to decode tokens to get payload
      let accessTokenDecoded = null;
      let refreshTokenDecoded = null;
      let tokenExpiryInfo = null;

      if (accessToken) {
        try {
          accessTokenDecoded = this.jwtHelper.decodeToken(accessToken);
          const expirationDate = this.jwtHelper.getTokenExpirationDate(accessToken);
          const isExpired = this.jwtHelper.isTokenExpired(accessToken);
          
          tokenExpiryInfo = {
            expiresAt: expirationDate,
            isExpired,
            expiresInSeconds: expirationDate ? 
              Math.floor((expirationDate.getTime() - new Date().getTime()) / 1000) : 
              null
          };
        } catch (e) {
          console.warn('Error decoding access token:', e);
          accessTokenDecoded = { error: 'Invalid token format' };
        }
      }
      
      if (refreshToken) {
        try {
          refreshTokenDecoded = this.jwtHelper.decodeToken(refreshToken);
        } catch (e) {
          console.warn('Error decoding refresh token:', e);
          refreshTokenDecoded = { error: 'Invalid token format' };
        }
      }
      
      // Check for cookies
      const cookieTokens = this.tokenStorage.extractAuthCookies();
      
      const diagnostics: TokenDiagnostics = {
        localStorage: {
          accessToken: accessToken ? 'Present' : 'Not found',
          refreshToken: refreshToken ? 'Present' : 'Not found',
          tokenVersion: tokenVersion
        },
        cookies: cookieTokens,
        tokenDetails: {
          accessToken: accessTokenDecoded,
          refreshToken: refreshTokenDecoded,
          expiryInfo: tokenExpiryInfo
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('Token diagnostics:', diagnostics);
      return diagnostics;
    } catch (error) {
      console.error('Error during token diagnostics:', error);
      return { 
        error: 'Failed to run diagnostics', 
        localStorage: { 
          accessToken: 'Error', 
          refreshToken: 'Error', 
          tokenVersion: null 
        },
        cookies: {},
        tokenDetails: { 
          accessToken: null, 
          refreshToken: null, 
          expiryInfo: null 
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check authentication health
   * @returns Health status object
   */
  public checkAuthHealth(): TokenHealthStatus {
    if (!isPlatformBrowser(this.platformId)) {
      return { 
        overallHealth: 'error',
        error: 'Not running in browser',
        accessToken: { 
          present: false, 
          isValid: false,
          error: 'Not running in browser'
        },
        refreshToken: { 
          present: false, 
          isValid: false,
          error: 'Not running in browser'
        },
        tokenVersion: {
          stored: null,
          match: false,
          message: 'Not running in browser'
        },
        timestamp: new Date().toISOString()
      };
    }
    
    try {
      const accessToken = this.tokenStorage.getToken();
      const refreshToken = this.tokenStorage.getRefreshToken();
      const tokenVersion = this.tokenStorage.getTokenVersion();
      
      const accessTokenCheck = accessToken ? 
        this.tokenValidation.verifyTokenFormat(accessToken) : 
        { isValid: false, error: 'No access token' };
        
      const refreshTokenCheck = refreshToken ? 
        this.tokenValidation.verifyTokenFormat(refreshToken) : 
        { isValid: false, error: 'No refresh token' };
      
      // Check for token version mismatch
      let tokenVersionMatch = false;
      let versionCheckMessage = 'No token version stored';
      
      if (refreshToken && tokenVersion !== null) {
        try {
          const decoded = this.jwtHelper.decodeToken(refreshToken);
          if (decoded.tokenVersion !== undefined && decoded.tokenVersion === tokenVersion) {
            tokenVersionMatch = true;
            versionCheckMessage = 'Token version matches';
          } else {
            versionCheckMessage = `Token version mismatch: stored=${tokenVersion}, token=${decoded.tokenVersion ?? 'undefined'}`;
          }
        } catch (e) {
          versionCheckMessage = 'Error checking token version: ' + String(e);
        }
      }
      
      const healthStatus: TokenHealthStatus = {
        overallHealth: (accessTokenCheck.isValid || refreshTokenCheck.isValid) ? 'healthy' : 'issues-detected',
        accessToken: {
          present: !!accessToken,
          isValid: accessTokenCheck.isValid,
          error: accessTokenCheck.error
        },
        refreshToken: {
          present: !!refreshToken,
          isValid: refreshTokenCheck.isValid,
          error: refreshTokenCheck.error
        },
        tokenVersion: {
          stored: tokenVersion,
          match: tokenVersionMatch,
          message: versionCheckMessage
        },
        timestamp: new Date().toISOString()
      };
      
      console.log('Auth health check:', healthStatus);
      return healthStatus;
    } catch (error) {
      console.error('Error during auth health check:', error);
      return { 
        overallHealth: 'error', 
        error: String(error),
        accessToken: { 
          present: false, 
          isValid: false,
          error: 'Error checking token'
        },
        refreshToken: { 
          present: false, 
          isValid: false,
          error: 'Error checking token'
        },
        tokenVersion: {
          stored: null,
          match: false,
          message: 'Error during health check'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Force logout with server-side token invalidation
   * @param errorMessage Optional message to display on login screen
   * @returns Promise resolving to navigation success
   */
  public forceLogoutAndRedirect(errorMessage?: string): Promise<boolean> {
    // First clear all local tokens
    this.tokenStorage.clearTokens();
    this.tokenStorage.clearAuthCookies();
    
    // Try to call server logout (but don't wait for it to complete)
    try {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({
        next: () => console.log('Server-side logout successful'),
        error: (err) => console.warn('Server-side logout failed:', err)
      });
    } catch (e) {
      console.warn('Error during server logout:', e);
    }
    
    // Redirect to login with optional error message
    const queryParams: Record<string, string> = {};
    if (errorMessage) {
      queryParams['error'] = errorMessage;
    }
    
    return this.router.navigate(['/login'], { 
      queryParams,
      replaceUrl: true 
    });
  }

  /**
   * Completely reset auth state for troubleshooting
   */
  public resetAuthStateCompletely(): void {
    try {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      
      console.log('Performing complete auth state reset');
      
      // Clear all storage
      this.tokenStorage.clearTokens();
      this.tokenStorage.clearAuthCookies();
      
      // Clear session storage too
      sessionStorage.removeItem('auth_check_in_progress');
      sessionStorage.removeItem('auth_check_start_time');
      sessionStorage.removeItem('auth_check_id');
      
      console.log('Auth state has been completely reset - please reload the app');
    } catch (error) {
      console.error('Error during complete auth reset:', error);
    }
  }

  /**
   * Automatically troubleshoot authentication issues
   * @returns Observable with troubleshooting result
   */
  public troubleshootAuth(): Observable<TroubleshootResult> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ 
        status: 'error' as const,
        message: 'Not running in browser' 
      });
    }

    console.log('Starting automatic auth troubleshooting');
    
    // Step 1: Check current auth health
    const healthCheck = this.checkAuthHealth();
    console.log('Initial health check:', healthCheck);
    
    // If everything is healthy, nothing to do
    if (healthCheck.overallHealth === 'healthy') {
      return of({
        status: 'healthy' as const,
        message: 'Authentication is healthy, no action needed',
        details: healthCheck
      });
    }
    
    // Step 2: Determine appropriate action based on health diagnosis
    
    // Case: Token version mismatch
    if (healthCheck.tokenVersion && !healthCheck.tokenVersion.match) {
      console.log('Token version mismatch detected');
      
      return from(this.forceLogoutAndRedirect('Token version changed, please login again')).pipe(
        map(() => ({
          status: 'logged_out' as const,
          message: 'Force logout performed due to token version mismatch',
          action: 'force_logout',
          details: healthCheck
        }))
      );
    }
    
    // Case: Both tokens invalid
    if (!healthCheck.accessToken.isValid && !healthCheck.refreshToken.isValid) {
      console.log('Both tokens invalid, force logout required');
      
      return from(this.forceLogoutAndRedirect('Authentication expired, please login again')).pipe(
        map(() => ({
          status: 'logged_out' as const,
          message: 'Force logout performed due to invalid tokens',
          action: 'force_logout',
          details: healthCheck
        }))
      );
    }
    
    // Default case - no automatic fix identified
    console.log('No automatic fix available for current state');
    return of({
      status: 'no_action' as const,
      message: 'Auth has issues but no automatic fix is available',
      details: healthCheck
    });
  }
} 