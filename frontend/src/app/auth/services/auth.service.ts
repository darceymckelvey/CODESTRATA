import { Injectable, PLATFORM_ID, Inject, OnDestroy, Optional } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, Subject, of, from } from 'rxjs';
import { catchError, tap, take, finalize, map, filter, switchMap, first, timeout } from 'rxjs/operators';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { AUTH } from '../../core/config/api.config';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';
import { JwtHelperService } from '@auth0/angular-jwt';

// Import our models
import { 
  User, 
  AuthResponse, 
  Environment, 
  TokenHealthStatus, 
  TokenDiagnostics,
  TroubleshootResult,
  StrataVault
} from '../models/auth.models';

// Re-export interfaces for backward compatibility
export { 
  User, 
  Environment, 
  StrataVault,
  AuthResponse,
  TokenHealthStatus, 
  TokenDiagnostics,
  TroubleshootResult
};

// Import our services
import { TokenStorageService } from './token/token-storage.service';
import { TokenValidationService } from './token/token-validation.service';
import { AuthDiagnosticsService } from './token/auth-diagnostics.service';

/**
 * Authentication Service
 * 
 * Provides authentication functionality including:
 * - User login and registration
 * - Token management (storage, refresh, validation)
 * - User profile management
 * - Authentication state tracking
 * - GitHub OAuth integration
 * - Diagnostic and troubleshooting utilities
 */
@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  // Authentication state management
  private userSubject = new BehaviorSubject<User | null>(null);
  private authStateSubject = new BehaviorSubject<boolean>(false);
  private refreshInProgress = false;
  private refreshAttempts = 0;
  private refreshTokenSubject = new Subject<string | null>();
  private readonly MAX_REFRESH_ATTEMPTS = 3;
  
  // Flag to track if we're using cookies for auth (fallback)
  private usesCookies = false;

  // Observable streams for consumers
  user$ = this.userSubject.asObservable();
  authState$ = this.authStateSubject.asObservable();

  // For cleanup purposes
  private destroy$ = new Subject<void>();
  private fetchProfileInProgress = false;
  private timeoutIds: number[] = [];
  private initAuthSubscription: any = null;
  private profileFetchSubscription: any = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private errorHandler: ErrorHandlerService,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() private jwtHelper: JwtHelperService,
    private tokenStorage: TokenStorageService,
    private tokenValidation: TokenValidationService,
    private diagnostics: AuthDiagnosticsService
  ) {
    if (!this.jwtHelper) {
      console.warn('JwtHelperService is not available. Some auth functionality may be limited.');
    }
    
    // Use a more reliable check for browser environment
    const isBrowser = typeof window !== 'undefined';
    
    if (isBrowser) {
      console.log('Browser environment confirmed, initializing auth state');
      // Set initial state without causing a loop
      this.authStateSubject.next(false);
      this.userSubject.next(null);
      
      // Get token from storage - no async operations here
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          // Just update the state synchronously
          this.authStateSubject.next(true);
        }
      } catch (e) {
        console.error('Error checking auth token:', e);
      }
    } else {
      console.log('Not in browser environment, skipping auth initialization');
    }
  }

  //========================================================================
  // INITIALIZATION
  //========================================================================
  
  /**
   * Initialize authentication state from stored tokens
   */
  private initializeAuth(): void {
    try {
      console.log('Initializing authentication state');
      
      // Only proceed with localStorage checks in browser environment
      if (!isPlatformBrowser(this.platformId)) {
        console.log('Not in browser environment, skipping auth initialization');
        this.authStateSubject.next(false);
        return;
      }
      
      // Check for potential localStorage access issues early
      if (!this.tokenStorage.isStorageAvailable()) {
        this.authStateSubject.next(false);
        this.usesCookies = true; // Fall back to cookies as we can't use localStorage
        return;
      }
      
      // First check if we have a token in localStorage
      const token = this.tokenStorage.getToken();
      const refreshToken = this.tokenStorage.getRefreshToken();
      
      if (token) {
        console.log('Found token in localStorage, validating...');
        
        // Check if there's also a refresh token
        if (!refreshToken) {
          console.warn('No refresh token found but access token exists');
        }
        
        // Validate the token
        if (this.tokenValidation.isTokenValid(token)) {
          console.log('Token is valid, setting auth state to true');
          // We have a valid token in localStorage, update auth state immediately
          this.authStateSubject.next(true);
          
          // Try to load the user profile
          this.initAuthSubscription = this.getUserProfile().subscribe({
            next: (user) => {
              console.log('User profile loaded successfully during initialization');
              this.userSubject.next(user);
              
              // Cleanup subscription
              if (this.initAuthSubscription) {
                this.initAuthSubscription.unsubscribe();
                this.initAuthSubscription = null;
              }
            },
            error: (error) => {
              // Cleanup subscription
              if (this.initAuthSubscription) {
                this.initAuthSubscription.unsubscribe();
                this.initAuthSubscription = null;
              }
              
              // Don't show connection errors as they're expected when backend is down
              if (error.status === 0) {
                console.log('Backend not available during initialization, will retry later');
                return;
              }
              
              console.error('Error loading user profile from token:', error);
              
              // Even if profile loading fails, we keep auth state true if token is valid
              // This helps prevent unwanted redirects to login
              if (error.status !== 401) {
                console.log('Error is not 401, keeping auth state true');
              } else {
                console.log('401 error, clearing auth state');
                this.clearAuth();
                
                // If we have a refresh token but got a 401, try refreshing the token
                if (refreshToken && !this.refreshInProgress && this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
                  console.log('Attempting to refresh token after 401 during initialization');
                  
                  const refreshSubscription = this.refreshToken().subscribe({
                    next: () => {
                      console.log('Token refreshed successfully during initialization');
                      // Retry loading profile after token refresh
                      const profileSubscription = this.getUserProfile().subscribe({
                        next: (user) => {
                          console.log('User profile loaded after token refresh during initialization');
                          profileSubscription.unsubscribe();
                        },
                        error: (err) => {
                          console.error('Failed to load profile after token refresh:', err);
                          profileSubscription.unsubscribe();
                        }
                      });
                      refreshSubscription.unsubscribe();
                    },
                    error: (err) => {
                      console.error('Failed to refresh token during initialization:', err);
                      refreshSubscription.unsubscribe();
                    }
                  });
                }
              }
            }
          });
        } else {
          console.log('Token found but is invalid, attempting refresh');
          
          // If we have a refresh token, try to use it to get a new access token
          if (refreshToken && !this.refreshInProgress) {
            const refreshSubscription = this.refreshToken().subscribe({
              next: () => {
                console.log('Successfully refreshed token during initialization');
                // After successful refresh, we should have valid tokens and auth state
                // Try to load the user profile
                const profileSubscription = this.getUserProfile().subscribe({
                  next: (user) => {
                    console.log('User profile loaded after token refresh during initialization');
                    profileSubscription.unsubscribe();
                  },
                  error: (err) => {
                    console.error('Failed to load profile after token refresh:', err);
                    profileSubscription.unsubscribe();
                  }
                });
                refreshSubscription.unsubscribe();
              },
              error: () => {
                console.log('Failed to refresh token during initialization, clearing auth state');
                this.clearAuth();
                refreshSubscription.unsubscribe();
              }
            });
          } else {
            console.log('No valid refresh token available, clearing auth state');
            this.clearAuth();
          }
        }
      } else {
        console.log('No token found in localStorage');
        
        // Check if we have just a refresh token (unusual but possible)
        if (refreshToken && !this.refreshInProgress) {
          console.log('No access token but refresh token found, attempting refresh');
          const refreshOnlySubscription = this.refreshToken().subscribe({
            next: () => {
              console.log('Successfully refreshed token from refresh-only state');
              refreshOnlySubscription.unsubscribe();
            },
            error: () => {
              console.log('Failed to refresh with refresh-only token, clearing auth');
              this.clearAuth();
              refreshOnlySubscription.unsubscribe();
            }
          });
          return;
        }
        
        // If we're in development, don't try to check for cookie-based session
        // to avoid unnecessary network errors
        if (environment.production) {
          // Try to check if we have a cookie-based session
          const cookieCheckSubscription = this.refreshAuthState().subscribe({
            next: (success) => {
              console.log(success ? 'Cookie-based session found' : 'No cookie-based session');
              cookieCheckSubscription.unsubscribe();
            },
            error: () => {
              console.log('No cookie-based session found');
              cookieCheckSubscription.unsubscribe();
            }
          });
        } else {
          console.log('Skipping cookie-based session check in development environment');
        }
      }
    } catch (error) {
      console.error('Error during auth initialization:', error);
      this.clearAuth();
    }
  }

  //========================================================================
  // TOKEN MANAGEMENT (INTERNAL)
  //========================================================================
  
  /**
   * Clear all authentication data from all storage mechanisms
   */
  private clearAuth(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    console.log('[AUTH SERVICE] Clearing authentication data');
    
    // Reset refresh state
    this.refreshInProgress = false;
    this.refreshAttempts = 0;
    
    // Clear from storage
    try {
      // Clear memory storage in TokenStorageService
      this.tokenStorage.clearTokens();
      this.tokenStorage.clearAuthCookies();
      
      // Force clear sessionStorage directly as well
      if (isPlatformBrowser(this.platformId)) {
        try {
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('token_version');
          sessionStorage.removeItem('auth_check_in_progress');
          sessionStorage.removeItem('auth_check_start_time');
        } catch (sessionError) {
          console.error('[AUTH SERVICE] Error clearing sessionStorage:', sessionError);
        }
      }
      
      // Verify tokens were cleared
      const tokenAfterClear = this.tokenStorage.getToken();
      const refreshTokenAfterClear = this.tokenStorage.getRefreshToken();
      
      console.log('[AUTH SERVICE] Token clear verification:', {
        tokenCleared: !tokenAfterClear,
        refreshTokenCleared: !refreshTokenAfterClear,
        hasTokenAfterClear: !!tokenAfterClear,
        hasRefreshTokenAfterClear: !!refreshTokenAfterClear
      });
      
      // If tokens still exist, try more aggressive clearing
      if (tokenAfterClear || refreshTokenAfterClear) {
        console.warn('[AUTH SERVICE] Tokens not fully cleared from storage, trying more aggressive clearing');
        
        // More aggressive clearing approach
        if (isPlatformBrowser(this.platformId)) {
          try {
            // Force clear localStorage directly
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('token_version');
            localStorage.removeItem('github_oauth_state');
            localStorage.removeItem('github_state');
            
            // Clear any cached data that might influence authentication
            localStorage.removeItem('cached_user');
            localStorage.removeItem('cached_user_timestamp');
          } catch (error) {
            console.error('[AUTH SERVICE] Error during aggressive localStorage clearing:', error);
          }
        }
      }
    } catch (error) {
      console.error('[AUTH SERVICE] Error clearing tokens:', error);
    }
    
    // Update auth state
    this.authStateSubject.next(false);
    this.userSubject.next(null);
    
    console.log('[AUTH SERVICE] Authentication data cleared');
  }

  //========================================================================
  // AUTHENTICATION API METHODS
  //========================================================================
  
  /**
   * Authenticate user with email and password
   * @param email User email
   * @param password User password
   * @returns Observable with authentication response
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(AUTH.LOGIN, { email, password }).pipe(
      tap((response) => {
        console.log('[AUTH SERVICE] Login response received:', { 
          useCookies: response.useCookies,
          hasToken: !!response.token,
          hasUser: !!response.user,
          tokenLength: response.token?.length || 0,
          refreshTokenLength: response.refreshToken?.length || 0
        });
        
        this.handleAuthSuccess(response);
      }),
      catchError((error) => {
        console.error('[AUTH SERVICE] Login error:', error);
        return this.errorHandler.handleHttpError(error, 'AuthService');
      })
    );
  }

  /**
   * Register a new user
   * @param username User's username
   * @param email User's email address
   * @param password User's password
   * @param role User's role (defaults to 'student')
   * @returns Observable with authentication response
   */
  register(
    username: string,
    email: string,
    password: string,
    role: string = 'student'
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(AUTH.REGISTER, { username, email, password, role })
      .pipe(
        tap((response) => {
          this.handleAuthSuccess(response);
          this.authStateSubject.next(true);
        }),
        catchError((error) => this.errorHandler.handleHttpError(error, 'AuthService'))
      );
  }

  /**
   * Refresh the access token using the refresh token
   * @returns Observable with the new tokens
   */
  refreshToken(): Observable<AuthResponse> {
    console.log('[AUTH SERVICE] Attempting to refresh token');
    
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshInProgress) {
      console.log('[AUTH SERVICE] Refresh already in progress, returning existing subject');
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(() => {
          // Return the current user state after refresh completes
          return this.user$.pipe(
            filter(user => !!user),
            take(1),
            map(user => {
              const token = this.tokenStorage.getToken() || '';
              const refreshToken = this.tokenStorage.getRefreshToken() || '';
              return { token, refreshToken, user: user! };
            })
          );
        }),
        // Add timeout to prevent infinite waiting
        timeout(8000),
        catchError(err => {
          console.error('[AUTH SERVICE] Refresh token wait timeout:', err);
          return throwError(() => new Error('Refresh token process timed out'));
        })
      );
    }
    
    this.refreshInProgress = true;
    this.refreshAttempts++;
    
    // Get the refresh token from storage
    const refreshToken = this.tokenStorage.getRefreshToken();
    
    if (!refreshToken) {
      console.error('[AUTH SERVICE] No refresh token available');
      this.refreshInProgress = false;
      
      // If no refresh token, clean up any stale tokens
      this.tokenStorage.clearTokens();
      
      return throwError(() => new Error('No refresh token available'));
    }
    
    console.log('[AUTH SERVICE] Sending refresh token request with refresh token available');
    
    // Check refresh token length for basic validation
    if (refreshToken.length < 20 && !refreshToken.startsWith('gho_')) {
      console.warn('[AUTH SERVICE] Refresh token has suspicious length, may be invalid');
    }
    
    // Make the refresh token request
    return this.http.post<AuthResponse>(AUTH.REFRESH, { refreshToken }).pipe(
      tap(response => {
        console.log('[AUTH SERVICE] Token refresh successful, updating storage');
        
        // Store the new tokens
        if (response.token && response.refreshToken) {
          // Extract token version and convert null to undefined
          const tokenVersion = this.tokenValidation.extractTokenVersion(response.refreshToken);
          const versionForStorage = tokenVersion === null ? undefined : tokenVersion;
          
          // Set tokens in storage
          this.tokenStorage.setTokens(
            response.token,
            response.refreshToken,
            versionForStorage
          );
          
          // Verify tokens were stored
          const storedToken = this.tokenStorage.getToken();
          const storedRefreshToken = this.tokenStorage.getRefreshToken();
          
          // If verification failed, try one more direct storage attempt
          if (!storedToken || storedToken !== response.token) {
            console.warn('[AUTH SERVICE] Token storage verification failed, setting directly');
            try {
              if (isPlatformBrowser(this.platformId)) {
                sessionStorage.setItem('auth_token', response.token);
                sessionStorage.setItem('refresh_token', response.refreshToken);
                console.log('[AUTH SERVICE] Tokens set directly in sessionStorage');
              }
            } catch (directError) {
              console.error('[AUTH SERVICE] Error setting tokens directly:', directError);
            }
          }
          
          // Update user state
          if (response.user) {
            this.userSubject.next(response.user);
            this.authStateSubject.next(true);
          }
          
          // Notify subscribers that refresh is complete
          this.refreshTokenSubject.next(response.token);
          
          // Log success for debugging
          console.log('[AUTH SERVICE] Token refresh completed successfully', {
            tokenStored: !!this.tokenStorage.getToken(),
            refreshTokenStored: !!this.tokenStorage.getRefreshToken(),
            userUpdated: !!response.user,
            tokenMatch: this.tokenStorage.getToken() === response.token
          });
        } else {
          console.error('[AUTH SERVICE] Refresh response missing tokens', response);
          throw new Error('Invalid refresh response: missing tokens');
        }
      }),
      catchError(error => {
        console.error('[AUTH SERVICE] Token refresh failed:', error);
        
        // Check if there are cached vaults before deciding to clear auth
        let hasCachedVaults = false;
        try {
          hasCachedVaults = !!localStorage.getItem('cached_vaults');
        } catch (e) {
          console.warn('[AUTH SERVICE] Error reading cached vaults:', e);
        }
        
        if (error.status === 401 || error.status === 403) {
          console.log('[AUTH SERVICE] Auth error during token refresh, clearing auth state');
          // Only clear auth state if we don't have cached data for offline access
          if (!hasCachedVaults) {
            this.clearAuth();
          } else {
            console.log('[AUTH SERVICE] Keeping auth state for offline access with cached data');
          }
        } else if (error.status === 0) {
          // Network error - don't clear auth state, could be offline
          console.log('[AUTH SERVICE] Network error during token refresh, maintaining auth state');
        } else {
          // For other errors, clear auth as a precaution
          console.log('[AUTH SERVICE] Non-auth error during token refresh:', error.status);
          
          // Double-check cached vaults in case of race condition
          let cachedVaultsExist = false;
          try {
            cachedVaultsExist = !!localStorage.getItem('cached_vaults');
          } catch (e) {
            console.warn('[AUTH SERVICE] Error reading cached vaults:', e);
          }
          
          if (!hasCachedVaults && !cachedVaultsExist) {
            this.clearAuth();
          }
        }
        
        // Notify subscribers that refresh failed
        this.refreshTokenSubject.next(null);
        
        return throwError(() => error);
      }),
      finalize(() => {
        this.refreshInProgress = false;
        console.log('[AUTH SERVICE] Token refresh process completed');
      }),
      // Add timeout to prevent hanging requests
      timeout(10000),
      catchError(timeoutError => {
        console.error('[AUTH SERVICE] Token refresh request timed out');
        this.refreshInProgress = false;
        this.refreshTokenSubject.next(null);
        return throwError(() => new Error('Token refresh request timed out'));
      })
    );
  }

  /**
   * Log out the current user
   * Clears tokens and redirects to login page
   */
  logout(): void {
    console.log('[AUTH SERVICE] Logging out user');
    
    // Reset auth state first
    this.authStateSubject.next(false);
    this.userSubject.next(null);
    
    // Clear any refresh attempts in progress
    this.refreshInProgress = false;
    this.refreshAttempts = 0;
    this.fetchProfileInProgress = false;
    
    // Notify any pending refresh requests
    if (!this.refreshTokenSubject.closed) {
      this.refreshTokenSubject.next(null);
      this.refreshTokenSubject.complete();
    }
    
    // Create a new subject for future refreshes
    this.refreshTokenSubject = new Subject<string | null>();
    
    // Perform thorough cleanup of all token storage
    try {
      // Clear primary token storage
      this.tokenStorage.clearTokens();
      this.tokenStorage.clearAuthCookies();
      
      // Additional direct clearing to ensure everything is removed
      if (isPlatformBrowser(this.platformId)) {
        // Clear session storage
        try {
          // Auth check related items
          sessionStorage.removeItem('auth_check_in_progress');
          sessionStorage.removeItem('auth_check_start_time');
          
          // Auth tokens
          sessionStorage.removeItem('auth_token');
          sessionStorage.removeItem('refresh_token');
          sessionStorage.removeItem('token_version');
          
          // GitHub related
          sessionStorage.removeItem('github_auth_source');
          sessionStorage.removeItem('github_code');
          sessionStorage.removeItem('github_state');
          
          console.log('[AUTH SERVICE] Session storage cleared successfully');
        } catch (sessionError) {
          console.error('[AUTH SERVICE] Error clearing session storage:', sessionError);
        }
        
        // Clear localStorage items too
        try {
          // Auth tokens
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token_version');
          
          // GitHub related
          localStorage.removeItem('github_oauth_state');
          localStorage.removeItem('github_state');
          
          // Cached user data
          localStorage.removeItem('cached_user');
          localStorage.removeItem('cached_user_timestamp');
          
          console.log('[AUTH SERVICE] Local storage cleared successfully');
        } catch (localError) {
          console.error('[AUTH SERVICE] Error clearing local storage:', localError);
        }
      }
    } catch (error) {
      console.error('[AUTH SERVICE] Error during logout cleanup:', error);
    }
    
    // Verify tokens are cleared
    const tokenAfterClear = this.tokenStorage.getToken();
    if (tokenAfterClear) {
      console.warn('[AUTH SERVICE] Warning: Token still exists after logout');
      
      // Last resort direct clearing
      try {
        if (isPlatformBrowser(this.platformId)) {
          sessionStorage.clear();
          console.log('[AUTH SERVICE] Performed full sessionStorage clear as last resort');
        }
      } catch (e) {
        console.error('[AUTH SERVICE] Error during last resort clearing:', e);
      }
    } else {
      console.log('[AUTH SERVICE] Logout cleanup successful, no tokens remaining');
    }
    
    // Navigate to home page after logout
    Promise.resolve().then(() => {
      this.router.navigate(['/home'], { 
        queryParams: { logout: 'success' } 
      }).catch(err => {
        console.error('[AUTH SERVICE] Error navigating to home page after logout:', err);
      });
    });
  }

  /**
   * Get the current user's profile
   * @returns Observable with user data
   */
  getUserProfile(): Observable<User> {
    console.log('[AUTH SERVICE] Fetching user profile from API...');
    
    // Check for cached user data first
    try {
      const cachedUserData = localStorage.getItem('cached_user');
      if (cachedUserData) {
        const cachedUser = JSON.parse(cachedUserData) as User;
        if (cachedUser) {
          console.log('[AUTH SERVICE] Found cached user data:', cachedUser.username);
          // Update user data from cache immediately while we fetch fresh data
          this.userSubject.next(cachedUser);
          this.authStateSubject.next(true);
        }
      }
    } catch (cacheError) {
      console.warn('[AUTH SERVICE] Error reading cached user data:', cacheError);
    }
    
    // If we're already fetching the profile, return the ongoing request
    if (this.fetchProfileInProgress) {
      console.log('[AUTH SERVICE] Profile fetch already in progress, returning existing observable');
      return this.userSubject.asObservable().pipe(
        filter((user): user is User => !!user), // Type guard to ensure non-null
        first(),
        timeout(10000), // 10 second timeout for user fetch
        catchError(err => {
          console.warn('[AUTH SERVICE] Timeout waiting for user profile', err);
          return throwError(() => new Error('Timeout waiting for user profile'));
        })
      );
    }
    
    // Check if token exists before making the request
    const token = this.tokenStorage.getToken();
    if (!token) {
      console.error('[AUTH SERVICE] Attempted to fetch user profile without a valid token');
      
      // Check if we have cached user data - if so, use that instead of failing
      const cachedUserData = localStorage.getItem('cached_user');
      if (cachedUserData) {
        try {
          const cachedUser = JSON.parse(cachedUserData) as User;
          if (cachedUser) {
            console.log('[AUTH SERVICE] No token but using cached user data for profile');
            // Return cached user but wrapped in error to indicate it's stale
            return of(cachedUser).pipe(
              tap(user => {
                this.userSubject.next(user);
                this.authStateSubject.next(true);
              }),
              catchError(() => throwError(() => new Error('Using cached user data')))
            );
          }
        } catch (cacheError) {
          console.warn('[AUTH SERVICE] Error parsing cached user data:', cacheError);
        }
      }
      
      return throwError(() => new Error('No authentication token available'));
    }
    
    this.fetchProfileInProgress = true;
    
    // Debug token before making the request
    console.log(`[AUTH SERVICE] Using authentication token for profile fetch: ${token.substring(0, 10)}...`);
    console.log('[AUTH SERVICE] Current auth state before profile fetch:', { 
      isAuthenticated: this.authStateSubject.value,
      hasUser: !!this.userSubject.value
    });

    // Log current cookies to see if we have auth cookies set
    if (isPlatformBrowser(this.platformId)) {
      try {
        const cookies = this.tokenStorage.extractAuthCookies();
        console.log('[AUTH SERVICE] Auth cookies detected:', cookies);
      } catch (e) {
        console.error('[AUTH SERVICE] Error reading cookies:', e);
      }
    }

    return this.http.get<User>(AUTH.PROFILE).pipe(
      tap((user) => {
        console.log('[AUTH SERVICE] User profile fetched successfully:', user.username);
        // Cache user data for offline access
        this.cacheUserData(user);
        // Update state
        this.userSubject.next(user);
        this.authStateSubject.next(true);
      }),
      catchError((error: HttpErrorResponse) => this.handleProfileFetchError(error)),
      finalize(() => {
        this.fetchProfileInProgress = false;
      })
    );
  }

  /**
   * When there's a 401 error fetching profile, attempt refresh if possible
   */
  private handleProfileFetchError(error: HttpErrorResponse): Observable<User> {
    console.error('[AUTH SERVICE] Error fetching user profile:', error);
    
    // Check response for specific error details
    if (error.error && typeof error.error === 'object') {
      console.log('[AUTH SERVICE] Profile fetch error details:', {
        status: error.status,
        error: error.error,
        message: error.error.message || error.message,
        code: error.error.code
      });
    }
    
    // Check if we have cached user data that we can use
    try {
      const cachedUserData = localStorage.getItem('cached_user');
      if (cachedUserData) {
        const cachedUser = JSON.parse(cachedUserData) as User;
        if (cachedUser) {
          console.log('[AUTH SERVICE] Using cached user data instead of fetching profile');
          // Update the user subject with cached data
          this.userSubject.next(cachedUser);
          // Keep auth state true since we have cached user data
          this.authStateSubject.next(true);
          // Return the cached user
          return of(cachedUser);
        }
      }
    } catch (cacheError) {
      console.warn('[AUTH SERVICE] Error reading cached user data:', cacheError);
    }
    
    // Check if we can try to refresh the token
    if (error.status === 401 && !this.refreshInProgress && this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
      console.log('[AUTH SERVICE] Attempting to refresh token after 401 error in getUserProfile');
      
      return this.refreshToken().pipe(
        switchMap((response) => {
          console.log('[AUTH SERVICE] Token refreshed successfully, retrying profile fetch');
          
          // Log the refreshed token details
          console.log('[AUTH SERVICE] Refreshed token details:', {
            hasToken: !!response.token,
            tokenPrefix: response.token ? response.token.substring(0, 10) + '...' : 'none',
            hasRefreshToken: !!response.refreshToken
          });
          
          // Verify we have a token before retrying
          if (!response.token) {
            return throwError(() => new Error('Token refresh succeeded but no token returned'));
          }
          
          // Retry the request with the new token
          return this.http.get<User>(AUTH.PROFILE).pipe(
            tap((user) => {
              console.log('[AUTH SERVICE] User profile fetch successful after token refresh');
              // Save user data to cache
              this.cacheUserData(user);
              // Update state
              this.userSubject.next(user);
              this.authStateSubject.next(true);
            })
          );
        }),
        catchError((refreshError: any) => {
          console.error('[AUTH SERVICE] Token refresh failed during profile fetch:', refreshError);
          
          // Check if there are cached vaults before deciding to clear auth
          const hasCachedVaults = !!localStorage.getItem('cached_vaults');
          
          // If the refresh token failed with an auth error, but we have cached data,
          // don't automatically log out - maintain a degraded auth state
          if (refreshError.status === 401 && hasCachedVaults) {
            console.log('[AUTH SERVICE] Auth error during token refresh, but cached data exists');
            console.log('[AUTH SERVICE] Maintaining degraded auth state for offline access');
            // Return a network error instead of auth error to prevent logout
            return throwError(() => new Error('Network error - working offline with cached data'));
          } else if (refreshError.status === 401) {
            // Only clear auth if we have no cached data to work with
            this.clearAuth();
            console.log('[AUTH SERVICE] Auth state cleared due to 401 during token refresh');
            return throwError(() => new Error('Authentication required'));
          }
          
          // For network errors, keep the auth state but return the error
          if (refreshError.status === 0) {
            console.log('[AUTH SERVICE] Network error during refresh, maintaining auth state');
            return throwError(() => new Error('Network error during authentication'));
          }
          
          // For other errors, retain the auth state unless explicitly told not to
          if (refreshError.clearAuth === true && !hasCachedVaults) {
            this.clearAuth();
          } else {
            console.warn('[AUTH SERVICE] Error is not 401, keeping auth state pending network recovery');
          }
          
          return throwError(() => refreshError);
        }),
        finalize(() => {
          this.fetchProfileInProgress = false;
        })
      );
    } else if (error.status === 401) {
      // Check if there are cached vaults before deciding what to do
      const hasCachedVaults = !!localStorage.getItem('cached_vaults');
      
      if (hasCachedVaults) {
        // If we have cached data, don't clear auth even for 401 errors
        console.log('[AUTH SERVICE] Auth error but cached data exists, maintaining degraded auth state');
        this.authStateSubject.next(true); // Keep auth state true for UI purposes
        return throwError(() => new Error('Working offline with cached data'));
      }
      
      // If we can't refresh the token (max attempts reached or already in progress)
      console.warn('[AUTH SERVICE] Unable to refresh token for profile fetch: ' +
        (this.refreshInProgress ? 'refresh in progress' : 'max attempts reached'));
      // Don't automatically clear auth - this might be a temporary issue
      // Let the interceptor handle 401 errors globally
      return throwError(() => new Error('Authentication required'));
    }
    
    // For network errors, keep auth state
    if (error.status === 0) {
      console.log('[AUTH SERVICE] Network error during profile fetch, maintaining auth state');
      return throwError(() => new Error('Network error loading user profile'));
    }
    
    // For other errors, log and rethrow but don't clear auth
    console.log('[AUTH SERVICE] Error loading user profile from token:', error);
    console.log('[AUTH SERVICE] Error is not 401, keeping auth state true');
    return throwError(() => error);
  }
  
  /**
   * Cache user data for offline access
   */
  private cacheUserData(user: User): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[AUTH SERVICE] Skipping cache in SSR mode');
      return;
    }
    
    try {
      localStorage.setItem('cached_user', JSON.stringify(user));
      localStorage.setItem('cached_user_timestamp', Date.now().toString());
      console.log('[AUTH SERVICE] User data cached successfully');
    } catch (error) {
      console.warn('[AUTH SERVICE] Could not cache user data:', error);
    }
  }

  /**
   * Process successful authentication response
   * @param response Authentication response with tokens and user data
   */
  public handleAuthSuccess(response: AuthResponse): void {
    console.log('[AUTH SERVICE] Handling auth success response:', { 
      hasToken: !!response.token, 
      hasRefreshToken: !!response.refreshToken,
      hasUser: !!response.user,
      tokenLength: response.token?.length || 0
    });
    
    // If we got a response with a token and user
    if (response.token && response.user) {
      try {
        // Extract token version if possible
        const tokenVersion = this.tokenValidation.extractTokenVersion(response.refreshToken);
        
        // Store tokens in appropriate storage
        this.tokenStorage.setTokens(
          response.token, 
          response.refreshToken || '', 
          tokenVersion || undefined
        );
        
        // Cache user data for offline access
        this.cacheUserData(response.user);
        
        // Update user data
        this.userSubject.next(response.user);
        this.authStateSubject.next(true);
        
        // Debug: verify tokens were stored correctly
        console.log(`[AUTH SERVICE] User authenticated: ${response.user.username}`);
        console.log('[AUTH SERVICE] Verify token storage:', {
          hasTokenInStorage: !!this.tokenStorage.getToken(),
          tokenLength: this.tokenStorage.getToken()?.length || 0,
          tokenStart: this.tokenStorage.getToken()?.substring(0, 10) || '',
          hasRefreshTokenInStorage: !!this.tokenStorage.getRefreshToken(),
          refreshTokenLength: this.tokenStorage.getRefreshToken()?.length || 0
        });
      } catch (error) {
        console.error('[AUTH SERVICE] Error handling authentication success:', error);
      }
    } else {
      console.error('[AUTH SERVICE] Invalid authentication response:', response);
    }
  }

  //========================================================================
  // TOKEN UTILITIES
  //========================================================================

  /**
   * Get authentication token if available
   * @returns The current JWT token or null if not available
   */
  public getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  /**
   * Check if the user is authenticated either via cookies or localStorage token
   * @returns Boolean indicating if the user is authenticated
   */
  isAuthenticated(): boolean {
    // Use a more reliable check for browser environment
    if (typeof window === 'undefined') {
      console.log('isAuthenticated: Not in browser environment');
      return false;
    }
    
    // First check current auth state - avoid unnecessary storage access
    if (this.authStateSubject.value === true) {
      return true;
    }
    
    // Get token once to avoid multiple calls
    const token = this.tokenStorage.getToken();
    
    console.log('isAuthenticated: checking token validity', token ? 'has token' : 'no token');
    
    // Check if there are cached vaults - if so, we can assume authentication for UI purposes
    // This helps prevent unnecessary redirects when token is invalid but we have cached data
    let cachedVaults = null;
    try {
      cachedVaults = localStorage.getItem('cached_vaults');
    } catch (error) {
      console.warn('[AUTH SERVICE] Error accessing cached vaults:', error);
    }
    
    // We already got the token earlier
    if (token) {
      try {
        // Special handling for GitHub tokens
        if (token.startsWith('gho_')) {
          console.log('isAuthenticated: GitHub token detected, using simplified validation');
          // GitHub tokens just need to exist and have proper length
          // Using 10 as minimum valid length for GitHub tokens - most are 40+ chars
          const isValidGithubToken = token.length >= 10;
          
          if (!isValidGithubToken) {
            console.warn('isAuthenticated: GitHub token has suspicious length');
            // Check if we have cached vaults data - safely
            try {
              if (cachedVaults) {
                console.log('isAuthenticated: Invalid GitHub token but cached vaults exist, allowing access');
                return true;
              }
            } catch (e) {
              console.warn('Error checking cached vaults:', e);
            }
            // In development we still allow these
            return !environment.production;
          }
          
          console.log('isAuthenticated: GitHub token is valid');
          return true;
        }
        
        // Standard validation for non-GitHub tokens
        const isValid = this.tokenValidation.isTokenValid(token);
        
        // If token is valid, return true
        if (isValid) {
          return true;
        }
        
        // If token is invalid but we have cached vaults, still allow access
        // This prevents logout loops and allows offline use with cached data
        try {
          if (cachedVaults) {
            console.log('isAuthenticated: Invalid token but cached vaults exist, allowing access');
            return true;
          }
        } catch (e) {
          console.warn('Error checking cached vaults:', e);
        }
        
        return false;
      } catch (error) {
        console.error('Error validating token:', error);
        
        // If token validation fails but we have cached vaults, still allow access
        try {
          if (cachedVaults) {
            console.log('isAuthenticated: Token validation error but cached vaults exist, allowing access');
            return true;
          }
        } catch (e) {
          console.warn('Error checking cached vaults during validation error:', e);
        }
        
        // Be more lenient with token validation errors in development
        if (!environment.production) {
          console.warn('Token validation error in development, allowing anyway');
          return true;
        }
        
        return false;
      }
    }
    
    // If we have cached vaults but no token, allow access in an "offline mode"
    try {
      if (cachedVaults) {
        console.log('isAuthenticated: No token but cached vaults exist, allowing access in offline mode');
        return true;
      }
    } catch (e) {
      console.warn('Error checking cached vaults in offline mode:', e);
    }
    
    // If no valid token in localStorage, check if we have a cookie-based session
    if (this.usesCookies) {
      // TODO: Add logic to check if the user has a valid cookie-based session
      return true;
    }
    
    // No valid authentication found
    return false;
  }

  //========================================================================
  // GITHUB AUTHENTICATION
  //========================================================================
  
  /**
   * Process GitHub authentication success
   * @param token JWT token received from GitHub auth
   * @param refreshToken Refresh token received from GitHub auth
   * @param user User data if available
   */
  handleGithubAuthSuccess(token: string, refreshToken?: string, user?: any): void {
    console.log('[AUTH SERVICE] Handling GitHub auth success');
    
    if (!token) {
      console.error('[AUTH SERVICE] No token provided to handleGithubAuthSuccess');
      return;
    }
    
    // First clear any existing auth state to avoid conflicts
    try {
      // Clear any pending timeouts first
      this.timeoutIds.forEach(id => window.clearTimeout(id));
      this.timeoutIds = [];
      
      // Unsubscribe from any profile fetch in progress
      if (this.profileFetchSubscription) {
        this.profileFetchSubscription.unsubscribe();
        this.profileFetchSubscription = null;
      }
      
      this.clearAuth();
      console.log('[AUTH SERVICE] Previous auth state cleared');
    } catch (clearError) {
      console.error('[AUTH SERVICE] Error clearing previous auth state:', clearError);
    }
    
    // Validate token before storing
    try {
      // Special handling for GitHub tokens which have a different format
      let isGithubToken = token.startsWith('gho_');
      
      if (isGithubToken) {
        console.log('[AUTH SERVICE] Detected GitHub format token');
      }
      
      // Log token debug info
      console.log('[AUTH SERVICE] Token details:', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 10) + '...',
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken ? refreshToken.length : 0,
        isGithubToken: isGithubToken
      });
      
      // Skip standard JWT validation for GitHub tokens
      if (!isGithubToken) {
        const tokenFormat = this.tokenValidation.verifyTokenFormat(token);
        
        console.log('[AUTH SERVICE] Token validation result:', tokenFormat);
        
        if (!tokenFormat.isValid && environment.production) {
          console.error('[AUTH SERVICE] Invalid token format in production environment, rejecting');
          throw new Error(`Invalid token format: ${tokenFormat.error}`);
        } else if (!tokenFormat.isValid) {
          console.warn('[AUTH SERVICE] Invalid token format in development environment, proceeding with caution');
        }
      } else {
        // For GitHub tokens, do a basic validity check
        if (token.length < 40) {
          console.warn('[AUTH SERVICE] GitHub token has suspicious length');
          if (environment.production) {
            throw new Error('Invalid GitHub token format (insufficient length)');
          }
        } else {
          console.log('[AUTH SERVICE] GitHub token passed basic validation');
        }
      }
      
      // Extract token version if possible
      const tokenVersion = refreshToken ? 
        this.tokenValidation.extractTokenVersion(refreshToken) : null;
      
      // Store the tokens
      this.tokenStorage.setTokens(token, refreshToken || '', tokenVersion || undefined);
      
      // Verify tokens were stored correctly
      const storedToken = this.tokenStorage.getToken();
      console.log('[AUTH SERVICE] Token storage verification:', {
        originalTokenLength: token.length,
        storedTokenLength: storedToken ? storedToken.length : 0,
        tokenMatch: storedToken === token,
        tokensMatch: !!storedToken
      });
      
      // Update authentication state immediately to avoid race conditions
      this.authStateSubject.next(true);
      
      // Update user data if available
      if (user) {
        console.log('[AUTH SERVICE] Using provided user data from GitHub callback');
        this.userSubject.next(user);
      } else {
        // If no user data was provided, try to fetch it
        console.log('[AUTH SERVICE] No user data from GitHub callback, fetching profile');
        
        const profileTimeoutId = window.setTimeout(() => {
          // Only fetch if we still don't have user data
          if (!this.userSubject.value) {
            console.log('[AUTH SERVICE] Fetching user profile after GitHub auth');
            this.profileFetchSubscription = this.getUserProfile()
              .pipe(
                // Add timeout to prevent UI hanging
                timeout(10000), // Extended timeout for network issues
                catchError(error => {
                  console.error('[AUTH SERVICE] Profile fetch failed after GitHub auth:', error);
                  
                  if (error.status === 401) {
                    console.warn('[AUTH SERVICE] 401 error during profile fetch after GitHub auth - token might be invalid');
                    // For 401 errors, we'll retry with the refresh token if available
                    if (refreshToken && !this.refreshInProgress) {
                      console.log('[AUTH SERVICE] Attempting to refresh token after profile fetch failure');
                      return this.refreshToken().pipe(
                        switchMap(() => this.getUserProfile()),
                        catchError(refreshError => {
                          console.error('[AUTH SERVICE] Token refresh failed after GitHub auth:', refreshError);
                          return of(null);
                        })
                      );
                    }
                  }
                  
                  // Even if profile fetch fails, authentication is still valid
                  // Don't clear auth state automatically
                  console.log('[AUTH SERVICE] Keeping authentication state despite profile fetch error');
                  return of(null);
                })
              )
              .subscribe({
                next: (userData) => {
                  if (userData) {
                    console.log('[AUTH SERVICE] Successfully fetched user profile after GitHub auth');
                  }
                  
                  // Clean up subscription
                  if (this.profileFetchSubscription) {
                    this.profileFetchSubscription.unsubscribe();
                    this.profileFetchSubscription = null;
                  }
                },
                error: () => {
                  // Clean up subscription on error too
                  if (this.profileFetchSubscription) {
                    this.profileFetchSubscription.unsubscribe();
                    this.profileFetchSubscription = null;
                  }
                }
              });
          }
        }, 500);
        this.timeoutIds.push(profileTimeoutId);
      }
      
      console.log('[AUTH SERVICE] GitHub authentication state updated, user is now authenticated');
      
      // Only navigate after ensuring profile is loaded and auth state is fully established
      if (user) {
        console.log('[AUTH SERVICE] Already have user data, can navigate to vaults');
        // Still add a small delay to ensure auth state is fully updated
        const navigationTimeoutId = window.setTimeout(() => {
          this.router.navigate(['/vaults']);
        }, 300);
        this.timeoutIds.push(navigationTimeoutId);
      } else {
        console.log('[AUTH SERVICE] Delaying navigation until profile is fetched');
        // We'll let the callback component handle navigation after profile fetch completes
      }
    } catch (error) {
      console.error('[AUTH SERVICE] Error handling GitHub authentication success:', error);
      // Log error but don't clear auth state as token might still be valid
      this.errorHandler.logError('Warning during GitHub authentication', error);
    }
  }

  /**
   * Get GitHub authorization URL for signup/login
   * @param source Indicates if this is for signup or login
   * @returns Observable with the GitHub authorization URL
   */
  getGithubAuthUrl(source: 'signup' | 'login' = 'login'): Observable<{url: string}> {
    const endpoint = `${AUTH.GITHUB_LOGIN}?source=${source}&getUrl=true`;
    console.log('Requesting GitHub auth URL from:', endpoint);
    
    return this.http.get<{url: string}>(endpoint).pipe(
      tap(response => {
        console.log('GitHub auth URL received:', response);
      }),
      catchError(error => {
        console.error('Error getting GitHub auth URL:', error);
        return this.errorHandler.handleHttpError(error, 'AuthService');
      })
    );
  }

  /**
   * Initiate GitHub login/signup
   * @param source Whether this is for 'login' or 'signup'
   */
  loginWithGithub(source: 'signup' | 'login' = 'login'): void {
    this.getGithubAuthUrl(source).subscribe({
      next: (response) => {
        if (response && response.url) {
          // Store the auth source for the callback to handle appropriately
          sessionStorage.setItem('github_auth_source', source);
          // Redirect to GitHub
          window.location.href = response.url;
        } else {
          console.error('Invalid GitHub auth URL response:', response);
        }
      },
      error: (error) => {
        console.error('Failed to get GitHub auth URL:', error);
      }
    });
  }

  //========================================================================
  // DIAGNOSTICS & TROUBLESHOOTING (PUBLIC API)
  //========================================================================

  /**
   * Refresh authentication state by fetching the user profile
   * Used when we're using cookie-based authentication
   * @returns Observable<boolean> indicating success
   */
  public refreshAuthState(): Observable<boolean> {
    console.log('Refreshing authentication state');
    
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }
    
    // Check if there's cached user data
    const cachedUserData = localStorage.getItem('cached_user');
    const cachedVaults = localStorage.getItem('cached_vaults');
    
    // If we have cached data, we can pre-populate states before network calls
    let hasCachedData = false;
    
    if (cachedUserData) {
      try {
        const cachedUser = JSON.parse(cachedUserData) as User;
        if (cachedUser) {
          console.log('[AUTH SERVICE] Using cached user data during auth refresh');
          this.userSubject.next(cachedUser);
          this.authStateSubject.next(true);
          hasCachedData = true;
        }
      } catch (error) {
        console.warn('[AUTH SERVICE] Error parsing cached user data:', error);
      }
    }
    
    // If we have cached vaults but no user data, still consider authorized in degraded mode
    if (!hasCachedData && cachedVaults) {
      console.log('[AUTH SERVICE] No cached user data but vaults exist, maintaining limited auth state');
      this.authStateSubject.next(true);
      hasCachedData = true;
    }
    
    // Try to get fresh user data
    return this.getUserProfile().pipe(
      tap(() => console.log('Auth state refreshed successfully with fresh data')),
      map(() => true),
      catchError((error) => {
        // Don't log network or connection errors as they're expected when backend is down
        if (error.status === 0) {
          console.log('Backend connection not available, skipping auth refresh');
          // If we have cached data, consider this a success despite network error
          if (hasCachedData) {
            console.log('[AUTH SERVICE] Working with cached data due to network error');
            return of(true);
          }
          return of(false);
        }
        
        // For auth errors, check if we have cached data before clearing auth
        if (error.status === 401 && hasCachedData) {
          console.log('[AUTH SERVICE] Auth error during refresh but using cached data, maintaining state');
          return of(true);
        }
        
        // Only clear auth for server errors when we have no cached data
        console.error('Error refreshing auth state:', error);
        if (!hasCachedData) {
          this.clearAuth();
        } else {
          console.log('[AUTH SERVICE] Maintaining auth state with cached data despite server error');
          // Return success because we're using cached data
          return of(true);
        }
        
        return of(false);
      })
    );
  }

  /**
   * Force logout with server-side token invalidation
   * @param errorMessage Optional message to display on login screen
   * @returns Promise resolving to navigation success
   */
  public forceLogoutAndRedirect(errorMessage?: string): Promise<boolean> {
    return this.diagnostics.forceLogoutAndRedirect(errorMessage);
  }

  /**
   * Check if a token refresh is currently in progress
   * @returns True if a refresh is in progress, false otherwise
   */
  public isRefreshInProgress(): boolean {
    return this.refreshInProgress;
  }
  
  /**
   * Reset auth state (static method for browser console)
   */
  public static resetAuthState(): void {
    console.log('Resetting authentication state...');
    try {
      // Clear all auth-related items from localStorage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_version');
      localStorage.removeItem('github_oauth_state');
      localStorage.removeItem('github_state');
      
      // Clear session storage items too
      sessionStorage.removeItem('auth_check_in_progress');
      sessionStorage.removeItem('auth_check_start_time');
      sessionStorage.removeItem('auth_check_id');
      
      console.log('Authentication storage completely cleared. Please refresh the page.');
    } catch (error) {
      console.error('Error clearing authentication state:', error);
    }
  }
  
  /**
   * Debug token information method
   * @returns Object with token status information
   */
  debugTokenInfo(): { tokenStatus: string, refreshTokenStatus: string } {
    return this.diagnostics.debugTokenInfo();
  }

  /**
   * Comprehensive token diagnostics
   * @returns Detailed token diagnostic information
   */
  public diagnoseThatTokens(): TokenDiagnostics {
    return this.diagnostics.diagnoseThatTokens();
  }

  /**
   * Check authentication health
   * @returns Health status object
   */
  public checkAuthHealth(): TokenHealthStatus {
    return this.diagnostics.checkAuthHealth();
  }

  /**
   * Completely reset auth state for troubleshooting
   */
  public resetAuthStateCompletely(): void {
    this.diagnostics.resetAuthStateCompletely();
    
    // Reset auth state in this service
    this.authStateSubject.next(false);
    this.userSubject.next(null);
    this.refreshInProgress = false;
    this.refreshAttempts = 0;
    this.usesCookies = false;
  }

  /**
   * Automatically troubleshoot authentication issues
   * @returns Observable with troubleshooting result
   */
  public troubleshootAuth(): Observable<TroubleshootResult> {
    // Check health first
    const healthCheck = this.diagnostics.checkAuthHealth();
    
    // If auth is healthy, nothing to do
    if (healthCheck.overallHealth === 'healthy') {
      return of({
        status: 'healthy' as const,
        message: 'Authentication is healthy, no action needed',
        details: healthCheck
      });
    }
    
    // For refresh attempts, use our refresh logic
    if (!healthCheck.accessToken.isValid && healthCheck.refreshToken.isValid) {
      console.log('Access token invalid but refresh token valid, attempting refresh');
      
      return this.refreshToken().pipe(
        map(response => ({
          status: 'fixed' as const,
          message: 'Successfully refreshed tokens',
          action: 'refresh',
          newHealth: this.diagnostics.checkAuthHealth()
        })),
        catchError(error => {
          console.error('Token refresh failed during troubleshooting:', error);
          // If refresh fails, force logout
          return from(this.forceLogoutAndRedirect('Authentication issue detected, please login again')).pipe(
            map(() => ({
              status: 'error' as const,
              message: 'Token refresh failed, auth state cleared',
              action: 'refresh_then_clear',
              error: error instanceof Error ? error.message : String(error)
            }))
          );
        })
      );
    }
    
    // For other issues, delegate to diagnostics service
    return this.diagnostics.troubleshootAuth();
  }
  
  /**
   * Clean up resources when service is destroyed
   */
  ngOnDestroy(): void {
    console.log('AuthService being destroyed, cleaning up resources');
    
    // Clean up any subscriptions
    if (this.initAuthSubscription) {
      this.initAuthSubscription.unsubscribe();
      this.initAuthSubscription = null;
    }
    
    if (this.profileFetchSubscription) {
      this.profileFetchSubscription.unsubscribe();
      this.profileFetchSubscription = null;
    }
    
    // Clear any pending timeouts
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    this.timeoutIds = [];
    
    // Complete subjects
    this.destroy$.next();
    this.destroy$.complete();
    
    if (!this.refreshTokenSubject.closed) {
      this.refreshTokenSubject.complete();
    }
  }
}
