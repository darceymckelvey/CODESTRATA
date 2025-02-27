import { Component, OnDestroy, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { VaultService } from '../../features/user-strata-vaults/vault.service';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';
import { catchError, EMPTY } from 'rxjs';
import { TokenValidationService } from '../services/token/token-validation.service';
import { TokenStorageService } from '../services/token/token-storage.service';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [
    CommonModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    MatButtonModule, 
    RouterModule
  ],
  templateUrl: './github-callback.component.html',
  styleUrls: ['./github-callback.component.css']
})
export class GithubCallbackComponent implements OnInit, OnDestroy {
  loading = true;
  error = false;
  errorMessage: string | null = null;
  loadingMessage = 'Validating GitHub response...';
  redirectCountdown = 5;
  private redirectTimer: any = null;
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private timeoutIds: number[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vaultService: VaultService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object,
    private tokenValidation: TokenValidationService,
    private tokenStorageService: TokenStorageService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (!this.isBrowser) {
      return; // Early return for server-side rendering
    }
    
    // Clear any auth check flags that might be stuck
    sessionStorage.removeItem('auth_check_in_progress');
    sessionStorage.removeItem('auth_check_start_time');
    
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        console.log('GitHub callback params received:', Object.keys(params));
      
        // Check for error from GitHub
        if (params['error']) {
          this.handleError('GitHub authentication was denied: ' + (params['error_description'] || params['error']));
          return;
        }

        // Handle token directly from our backend redirect
        if (params['token']) {
          console.log('Token received directly in URL params');
          
          try {
            // Validate token format before proceeding
            if (!params['token'] || typeof params['token'] !== 'string') {
              this.handleError('Invalid token format received');
              return;
            }
            
            // Enhanced token validation logic
            const tokenValidation = this.tokenValidation.verifyTokenFormat(params['token']);
            
            // Log validation results
            console.log('Token validation result:', tokenValidation);
            
            // Special handling for GitHub tokens which use a different format
            if (!tokenValidation.isValid) {
              // Special handling for GitHub tokens
              if (params['token'].startsWith('gho_') && params['token'].length >= 40) {
                console.log('GitHub token detected, proceeding despite validation warnings');
                // Continue with GitHub token - it's valid even if standard validation fails
              } else if (params['token'].startsWith('gho_')) {
                console.warn('Suspicious GitHub token format (invalid length)');
                // Allow in development, reject in production
                if (environment.production) {
                  this.handleError(`Invalid GitHub token format: ${tokenValidation.error}`);
                  return;
                }
              } else {
                console.error('Invalid token format received from GitHub auth:', tokenValidation.error);
                
                // In production, be more strict about token validation
                if (environment.production) {
                  this.handleError(`Invalid authentication token: ${tokenValidation.error}`);
                  return;
                }
              }
            }
            
            // Extract user data if available
            let userData = null;
            if (params['userData']) {
              try {
                const decodedUserData = atob(params['userData']);
                userData = JSON.parse(decodedUserData);
                console.log('Successfully decoded user data from URL params');
              } catch (e) {
                console.error('Error decoding user data:', e);
                // Continue even if user data parsing fails
              }
            }
            
            console.log('Processing GitHub auth with token');
            
            // Handle GitHub auth success with the token - verify token is stored properly
            const storedTokenBefore = localStorage.getItem('auth_token');
            
            this.authService.handleGithubAuthSuccess(
              params['token'], 
              params['refreshToken'],
              userData
            );
            
            // Verify token was actually stored
            const storedTokenAfter = localStorage.getItem('auth_token');
            if (!storedTokenAfter) {
              console.error('Token was not properly stored - checking for errors');
              // Check if token storage was successful
              if (this.tokenStorageService.isStorageAvailable()) {
                console.error('Storage is available but token was not stored');
                this.handleError('Failed to store authentication token');
                return;
              } else {
                console.error('localStorage is not available - notify user');
                this.handleError('Your browser doesn\'t support localStorage or has privacy mode enabled. Please enable cookies and localStorage for this site.');
                return;
              }
            }
            
            // Verify token is valid
            if (!this.authService.isAuthenticated()) {
              console.error('Token was stored but authentication check failed');
              this.handleError('Authentication failed: Invalid token received');
              return;
            }
            
            // If we get here, authentication was successful
            this.loadingMessage = 'Authentication successful';
            this.showSuccess();
          } catch (error) {
            console.error('Error during authentication token processing:', error);
            this.handleError('Failed to process authentication token');
          }
        } else if (params['code']) {
          // If only code is present, we need to exchange it for a token
          this.processGithubCode(params['code']);
        } else {
          this.handleError('Invalid GitHub callback - missing code or token');
        }
      });
  }

  private processGithubCode(code: string): void {
    // Show loading state
    this.loading = true;
    this.loadingMessage = 'Establishing connection with GitHub...';
    
    try {
      // Get state from URL params
      const params = new URLSearchParams(window.location.search);
      const state = params.get('state');
      const storedState = localStorage.getItem('github_oauth_state');
      
      console.log('GitHub callback received:', { 
        hasCode: !!code, 
        hasState: !!state, 
        hasStoredState: !!storedState,
        stateMatch: state === storedState,
        codeLength: code ? code.length : 0
      });
      
      // Enhanced validation of parameters
      if (!code || code.length < 10) {
        this.handleError('GitHub authorization code is missing or invalid');
        return;
      }
      
      if (!state) {
        this.handleError('GitHub state parameter is missing (CSRF protection)');
        return;
      }
      
      if (!storedState) {
        console.warn('Stored state is missing from localStorage');
        // Continue with auth flow but log warning
      } else if (state !== storedState) {
        this.handleError('Security validation failed: State parameter mismatch');
        return;
      }
      
      // Clear stored state for security
      localStorage.removeItem('github_oauth_state');
      
      this.loadingMessage = 'Authenticating with GitHub...';
      
      // Create retry configuration
      const maxRetries = 2;
      let retryCount = 0;
      
      const attemptGithubAuth = () => {
        this.loadingMessage = `Authenticating with GitHub${retryCount > 0 ? ` (attempt ${retryCount + 1}/${maxRetries + 1})` : ''}...`;
        
        this.vaultService.handleGithubCallback(code, state)
          .pipe(
            catchError(error => {
              console.error('GitHub authentication error:', error);
              
              // Retry logic
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying GitHub auth, attempt ${retryCount} of ${maxRetries}`);
                
                // Add increasing delay between retries
                const delay = retryCount * 1000;
                this.loadingMessage = `Connection error, retrying in ${delay/1000} second${delay !== 1000 ? 's' : ''}...`;
                
                setTimeout(() => attemptGithubAuth(), delay);
                return EMPTY;
              }
              
              // Max retries reached
              this.handleError('Could not connect to authentication server after multiple attempts.');
              return EMPTY;
            })
          )
          .subscribe((response: any) => {
            console.log('GitHub authentication successful');
            
            if (!response?.token) {
              this.handleError('Authentication response missing token');
              return;
            }
            
            try {
              // Use the central auth service method
              this.authService.handleGithubAuthSuccess(
                response.token,
                response.refreshToken,
                response.user
              );
              
              this.error = false;
              this.errorMessage = null;
              this.loadingMessage = 'Authentication successful!';
              
              // Add delay to ensure auth state is updated before navigation
              // We use a longer timeout to ensure authentication completes properly
              setTimeout(() => {
                // Ensure we're not stuck in loading state
                this.loading = false;
                this.showSuccess();
              }, 1000);
            } catch (error) {
              console.error('Error processing authentication response:', error);
              this.handleError('Failed to process authentication response');
            }
          });
      };
      
      // Start the auth process
      attemptGithubAuth();
    } catch (error) {
      console.error('Unexpected error in GitHub callback:', error);
      this.handleError('An unexpected error occurred');
    }
  }

  private showSuccess() {
    // Ensure loading state is turned off
    this.loading = false;
    
    // Show success message with countdown
    this.redirectCountdown = 3;
    
    // Check if the process was a signup or login (based on state parameter)
    try {
      const params = new URLSearchParams(window.location.search);
      const state = params.get('state') || '';
      const isSignup = state.includes('signup');
      
      // Set appropriate success message based on the source
      if (isSignup) {
        this.loadingMessage = 'GitHub account successfully linked! Welcome to CodeStrata.';
      } else {
        this.loadingMessage = 'Authentication successful! Redirecting to your dashboard...';
      }
      
      // Add a delay before navigation to ensure auth state is fully established
      const timeoutId = window.setTimeout(() => {
        console.log('Checking authentication state before redirecting...');
        // Final authentication check before redirecting
        if (this.authService.isAuthenticated()) {
          console.log('Auth state confirmed, redirecting to vaults page');
          // For more reliable navigation, use location.href instead of router
          window.location.href = '/vaults';
        } else {
          console.warn('Auth state not established, attempting recovery...');
          // Try one more time with a longer delay
          const recoveryTimeoutId = window.setTimeout(() => {
            console.log('Final auth check before redirect');
            if (this.authService.isAuthenticated()) {
              console.log('Auth recovered, redirecting to vaults');
              window.location.href = '/vaults';
            } else {
              console.error('Authentication failed after multiple attempts');
              // Fallback to login page
              window.location.href = '/login';
            }
          }, 2000);
          this.timeoutIds.push(recoveryTimeoutId);
        }
      }, 1500);
      
      this.timeoutIds.push(timeoutId);
      
      // Start visual countdown for user feedback
      this.redirectTimer = setInterval(() => {
        this.redirectCountdown--;
        if (this.redirectCountdown <= 0) {
          this.clearTimers();
        }
      }, 1000);
    } catch (error) {
      console.error('Error in showSuccess:', error);
      // Ensure we still redirect even if parsing fails
      const fallbackTimeoutId = window.setTimeout(() => {
        window.location.href = '/vaults';
      }, 2000);
      this.timeoutIds.push(fallbackTimeoutId);
    }
  }
  
  private clearTimers() {
    if (this.redirectTimer) {
      clearInterval(this.redirectTimer);
      this.redirectTimer = null;
    }
  }

  private handleError(message: string) {
    this.loading = false;
    this.error = true;
    this.errorMessage = message;
    console.error('GitHub auth error:', message);
    
    // Start countdown for redirect
    this.startRedirectCountdown();
  }

  private startRedirectCountdown() {
    this.redirectCountdown = 3;
    this.redirectTimer = setInterval(() => {
      this.redirectCountdown--;
      
      if (this.redirectCountdown <= 0) {
        clearInterval(this.redirectTimer);
        this.router.navigate(['/login']);
      }
    }, 1000);
  }

  ngOnDestroy() {
    if (this.redirectTimer) {
      clearInterval(this.redirectTimer);
    }
    
    // Clear any pending timeouts
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
