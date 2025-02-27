import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Service responsible for securely storing and retrieving authentication tokens
 * Handles localStorage and cookie operations in a cross-platform compatible way
 */
@Injectable({
  providedIn: 'root'
})
export class TokenStorageService {
  // Token storage keys
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly TOKEN_VERSION_KEY = 'token_version';
  
  // In-memory fallback for SSR or when localStorage is unavailable
  private memoryStorage: { [key: string]: string } = {};
  private useMemoryFallback = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Simpler and more reliable browser detection
    const isBrowser = typeof window !== 'undefined';
    
    // If not in browser or storage is unavailable, use memory storage
    if (!isBrowser) {
      this.useMemoryFallback = true;
      return;
    }
    
    // Try to check if storage is available
    try {
      this.useMemoryFallback = !this.isStorageAvailable();
    } catch (e) {
      console.warn('Error checking storage availability:', e);
      this.useMemoryFallback = true;
    }
    
    if (this.useMemoryFallback) {
      console.log('Using memory fallback for token storage');
    }
  }

  /**
   * Check if localStorage is available
   * @returns Boolean indicating if storage is available
   */
  public isStorageAvailable(): boolean {
    // Direct browser check
    if (typeof window === 'undefined') {
      return false;
    }
    
    try {
      // Test localStorage availability
      localStorage.setItem('_auth_test', '1');
      localStorage.removeItem('_auth_test');
      return true;
    } catch (storageError) {
      console.error('Cannot access localStorage:', storageError);
      return false;
    }
  }

  /**
   * Store tokens in localStorage or memory fallback
   * @param token Access token
   * @param refreshToken Refresh token
   * @param tokenVersion Optional token version for versioning
   */
  public setTokens(token: string, refreshToken: string, tokenVersion?: number): void {
    if (!isPlatformBrowser(this.platformId)) {
      // In SSR environment, store in memory only
      this.memoryStorage[this.TOKEN_KEY] = token;
      this.memoryStorage[this.REFRESH_TOKEN_KEY] = refreshToken;
      if (tokenVersion !== undefined) {
        this.memoryStorage[this.TOKEN_VERSION_KEY] = tokenVersion.toString();
      }
      console.log('[TOKEN STORAGE] Tokens stored in memory for SSR environment');
      return;
    }

    try {
      // Always store in memory as a backup
      this.memoryStorage[this.TOKEN_KEY] = token;
      this.memoryStorage[this.REFRESH_TOKEN_KEY] = refreshToken;
      if (tokenVersion !== undefined) {
        this.memoryStorage[this.TOKEN_VERSION_KEY] = tokenVersion.toString();
      }
      
      // Also store in sessionStorage for tab-level persistence
      try {
        sessionStorage.setItem(this.TOKEN_KEY, token);
        sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        if (tokenVersion !== undefined) {
          sessionStorage.setItem(this.TOKEN_VERSION_KEY, tokenVersion.toString());
        }
        console.log('[TOKEN STORAGE] Tokens stored in sessionStorage');
      } catch (sessionError) {
        console.warn('[TOKEN STORAGE] Error storing tokens in sessionStorage:', sessionError);
      }
      
      if (this.useMemoryFallback) {
        console.log('[TOKEN STORAGE] Using memory fallback for token storage');
      } else {
        // Store in localStorage for cross-tab persistence
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        
        // If token version was provided, store it
        if (tokenVersion !== undefined) {
          localStorage.setItem(this.TOKEN_VERSION_KEY, tokenVersion.toString());
        }
        
        // Verify tokens were actually stored
        const storedToken = localStorage.getItem(this.TOKEN_KEY);
        const storedRefreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
        
        console.log('[TOKEN STORAGE] Tokens stored in localStorage', {
          tokenStored: !!storedToken,
          refreshTokenStored: !!storedRefreshToken,
          tokenMatches: storedToken === token,
          refreshTokenMatches: storedRefreshToken === refreshToken
        });
        
        // If storage verification fails, try recovery options
        if (!storedToken || storedToken !== token) {
          console.warn('[TOKEN STORAGE] Token storage verification failed, attempting localStorage recovery');
          
          // Try one more time with direct writes
          try {
            // Don't clear localStorage as that would remove other app data
            // Instead, just re-set the token keys
            localStorage.setItem(this.TOKEN_KEY, token);
            localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
            if (tokenVersion !== undefined) {
              localStorage.setItem(this.TOKEN_VERSION_KEY, tokenVersion.toString());
            }
            
            // Check again to verify recovery worked
            const recoveredToken = localStorage.getItem(this.TOKEN_KEY);
            if (!recoveredToken || recoveredToken !== token) {
              console.error('[TOKEN STORAGE] Storage recovery failed, using memory and sessionStorage only');
              this.useMemoryFallback = true;
            } else {
              console.log('[TOKEN STORAGE] Storage recovery successful');
            }
          } catch (recoveryError) {
            console.error('[TOKEN STORAGE] Storage recovery error:', recoveryError);
            this.useMemoryFallback = true;
          }
        }
      }
      
      // Set cookies as an additional fallback (accessible to server)
      try {
        document.cookie = `${this.TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Strict`;
        document.cookie = `${this.REFRESH_TOKEN_KEY}=${encodeURIComponent(refreshToken)}; path=/; max-age=86400; SameSite=Strict`;
        console.log('[TOKEN STORAGE] Tokens also stored in cookies');
      } catch (cookieError) {
        console.warn('[TOKEN STORAGE] Error storing tokens in cookies:', cookieError);
      }
    } catch (e) {
      console.error('[TOKEN STORAGE] Error storing auth tokens:', e);
      
      // Ensure we have memory storage in all cases
      this.useMemoryFallback = true;
      
      // Try session storage as a last resort
      try {
        sessionStorage.setItem(this.TOKEN_KEY, token);
        sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
        if (tokenVersion !== undefined) {
          sessionStorage.setItem(this.TOKEN_VERSION_KEY, tokenVersion.toString());
        }
        console.log('[TOKEN STORAGE] Falling back to sessionStorage after localStorage error');
      } catch (sessionError) {
        console.warn('[TOKEN STORAGE] Could not use sessionStorage fallback:', sessionError);
        console.log('[TOKEN STORAGE] Falling back to memory storage only after all storage errors');
      }
    }
  }

  /**
   * Get the current JWT token from storage
   * @returns The JWT token or null if not available
   */
  public getToken(): string | null {
    // Quick return for SSR environment
    if (typeof window === 'undefined') {
      return this.memoryStorage[this.TOKEN_KEY] || null;
    }
    
    // If using memory fallback, return from memory
    if (this.useMemoryFallback) {
      return this.memoryStorage[this.TOKEN_KEY] || null;
    }
    
    try {
      // Try to get from localStorage first
      const localStorageToken = localStorage.getItem(this.TOKEN_KEY);
      
      // If localStorage has a token, return it
      if (localStorageToken) {
        // Store in memory as backup
        this.memoryStorage[this.TOKEN_KEY] = localStorageToken;
        return localStorageToken;
      }
      
      // If no localStorage token but we have one in memory, return it
      if (this.memoryStorage[this.TOKEN_KEY]) {
        return this.memoryStorage[this.TOKEN_KEY];
      }
      
      // No token found
      return null;
    } catch (error) {
      console.error('[TOKEN STORAGE] Error accessing localStorage:', error);
      // Fall back to memory storage
      this.useMemoryFallback = true;
      return this.memoryStorage[this.TOKEN_KEY] || null;
    }
  }

  /**
   * Get the current refresh token
   * @returns The refresh token or null if not available
   */
  public getRefreshToken(): string | null {
    // Quick return for SSR environment
    if (typeof window === 'undefined') {
      return this.memoryStorage[this.REFRESH_TOKEN_KEY] || null;
    }
    
    // If using memory fallback, return from memory
    if (this.useMemoryFallback) {
      return this.memoryStorage[this.REFRESH_TOKEN_KEY] || null;
    }
    
    try {
      // Try to get from localStorage first
      const localStorageRefreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
      
      // If localStorage has a token, return it
      if (localStorageRefreshToken) {
        // Store in memory as backup
        this.memoryStorage[this.REFRESH_TOKEN_KEY] = localStorageRefreshToken;
        return localStorageRefreshToken;
      }
      
      // If no localStorage token but we have one in memory, return it
      if (this.memoryStorage[this.REFRESH_TOKEN_KEY]) {
        return this.memoryStorage[this.REFRESH_TOKEN_KEY];
      }
      
      // No token found
      return null;
    } catch (error) {
      console.error('[TOKEN STORAGE] Error accessing localStorage for refresh token:', error);
      // Fall back to memory storage
      this.useMemoryFallback = true;
      return this.memoryStorage[this.REFRESH_TOKEN_KEY] || null;
    }
  }

  /**
   * Get stored token version
   * @returns The token version or null if not available
   */
  public getTokenVersion(): number | null {
    if (!isPlatformBrowser(this.platformId)) {
      const version = this.memoryStorage[this.TOKEN_VERSION_KEY];
      return version ? parseInt(version, 10) : null;
    }
    
    try {
      if (this.useMemoryFallback) {
        const version = this.memoryStorage[this.TOKEN_VERSION_KEY];
        return version ? parseInt(version, 10) : null;
      }
      const version = localStorage.getItem(this.TOKEN_VERSION_KEY);
      return version ? parseInt(version, 10) : null;
    } catch (e) {
      console.error('Error accessing token version:', e);
      // Fall back to memory storage
      this.useMemoryFallback = true;
      const version = this.memoryStorage[this.TOKEN_VERSION_KEY];
      return version ? parseInt(version, 10) : null;
    }
  }

  /**
   * Clear all tokens from storage
   */
  public clearTokens(): void {
    // Clear memory storage first
    this.memoryStorage = {};
    
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      // Always clear from sessionStorage first
      try {
        sessionStorage.removeItem(this.TOKEN_KEY);
        sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
        sessionStorage.removeItem(this.TOKEN_VERSION_KEY);
        console.log('Auth tokens cleared from sessionStorage');
      } catch (sessionError) {
        console.error('Error clearing tokens from sessionStorage:', sessionError);
      }
      
      // Then clear from localStorage
      if (!this.useMemoryFallback) {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.TOKEN_VERSION_KEY);
        
        // Also clear GitHub related state since they're auth-related
        localStorage.removeItem('github_oauth_state');
        localStorage.removeItem('github_state');
        console.log('Auth tokens cleared from localStorage');
      }
      
      // Verify clearance
      const sessionToken = sessionStorage.getItem(this.TOKEN_KEY);
      const localToken = localStorage.getItem(this.TOKEN_KEY);
      
      if (sessionToken || localToken) {
        console.warn('Auth tokens may not be fully cleared:', {
          sessionToken: !!sessionToken,
          localToken: !!localToken
        });
      } else {
        console.log('Auth tokens successfully cleared from all storage');
      }
    } catch (e) {
      console.error('Error clearing tokens:', e);
    }
  }

  /**
   * Clear authentication cookies
   * Only applies for cookie-based authentication
   */
  public clearAuthCookies(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      // We can't directly clear HttpOnly cookies, but we can set them to expire
      document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      console.log('Auth cookies cleared');
    } catch (e) {
      console.error('Error clearing auth cookies:', e);
    }
  }

  /**
   * Extract authentication cookies from document.cookie
   * @returns Object with auth-related cookies
   */
  public extractAuthCookies(): Record<string, string> {
    if (!isPlatformBrowser(this.platformId)) {
      return {};
    }
    
    const cookies: Record<string, string> = {};
    
    try {
      document.cookie.split(';').forEach(cookie => {
        const parts = cookie.trim().split('=');
        if (parts.length >= 1) {
          const name = parts[0].trim();
          const value = parts.length > 1 ? parts[1].trim() : '';
          if (name) {
            cookies[name] = value || 'present (no value)';
          }
        }
      });
      
      // Specifically check for auth-related cookies
      return {
        access_token: cookies['access_token'] || 'Not found',
        refresh_token: cookies['refresh_token'] || 'Not found',
        auth_token: cookies['auth_token'] || 'Not found'
      };
    } catch (e) {
      console.error('Error extracting auth cookies:', e);
      return {
        access_token: 'Error',
        refresh_token: 'Error',
        auth_token: 'Error'
      };
    }
  }
} 