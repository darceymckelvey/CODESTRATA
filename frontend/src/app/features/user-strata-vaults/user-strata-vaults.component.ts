import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  firstValueFrom,
  Subject,
  takeUntil,
  switchMap,
  of,
  retry,
  finalize,
  delay,
  filter,
  take,
  timeout,
  throwError,
  timer,
  Observable
} from 'rxjs';
import { AuthService, StrataVault, User } from '../../auth/services/auth.service';
import { VaultService } from './vault.service';

@Component({
  selector: 'app-user-strata-vaults',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatInputModule,
  ],
  templateUrl: './user-strata-vaults.component.html',
  styleUrls: ['./user-strata-vaults.component.css'],
})
export class UserStrataVaultsComponent implements OnInit, OnDestroy {
  uploading = false;
  currentVault: StrataVault | null = null;
  vaults: StrataVault[] = [];
  isLoading = true;
  error: string | null = null;
  private destroy$ = new Subject<void>();
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second
  isGithubConnected = false;
  currentUser: User | null = null;

  constructor(
    private vaultService: VaultService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Set isLoading first to avoid ExpressionChangedAfterItHasBeenCheckedError
    this.isLoading = true;
    
    // Use setTimeout to push the initialization to the next event cycle
    setTimeout(() => {
      this.initializeVaults();
    }, 0);
  }
  
  private async initializeVaults() {
    try {
      // First try to load from cached vaults before authentication check
      // This ensures vaults are displayed immediately, even if authentication check takes time
      this.loadCachedVaults();
      
      if (!(await this.checkAuthentication())) {
        this.isLoading = false;
        return;
      }
      
      // Get current user info
      this.authService.user$.pipe(take(1)).subscribe(user => {
        this.currentUser = user;
        console.log('Current user loaded:', this.currentUser?.username);
      });
      
      await this.refreshVaults();
      await this.checkGithubConnection();
    } catch (error) {
      this.handleOperationError(error, 'Failed to initialize');
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Load cached vaults from localStorage to display immediately
   */
  private loadCachedVaults() {
    // Skip localStorage access in SSR environment
    if (typeof window === 'undefined') {
      console.log('[UserStrataVaults] Server environment detected, skipping cache load');
      return;
    }
    
    try {
      const cachedVaults = localStorage.getItem('cached_vaults');
      if (cachedVaults) {
        const vaults = JSON.parse(cachedVaults) as StrataVault[];
        console.log(`[UserStrataVaults] Loaded ${vaults.length} vaults from cache`);
        
        // Only update if we have vaults in the cache
        if (vaults && vaults.length > 0) {
          this.vaults = vaults;
          
          // Still mark as loading since we'll refresh from API
          this.isLoading = true;
        }
      }
    } catch (error) {
      console.warn('[UserStrataVaults] Could not load vaults from cache:', error);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async createVault() {
    try {
      if (!(await this.checkAuthentication())) return;

      const name = prompt('Enter vault name:');
      if (!name || name.trim() === '') {
        this.showInfo('Vault creation cancelled');
        return;
      }

      console.log(`Creating vault with name: "${name}"`);
      this.showInfo('Creating vault...');
      
      await firstValueFrom(this.vaultService.createVault(name));
      this.showSuccess('Vault created successfully');
      await this.refreshVaults();
    } catch (error) {
      console.error('Error creating vault:', error);
      this.handleOperationError(error, 'Failed to create vault');
    }
  }

  async checkGithubConnection() {
    try {
      if (!this.authService.isAuthenticated()) {
        await this.handleUnauthorized();
        return false;
      }

      this.isGithubConnected = await firstValueFrom(
        this.vaultService.checkGithubConnection()
      );
      return this.isGithubConnected;
    } catch (error) {
      this.handleOperationError(error, 'Failed to check GitHub connection');
      this.isGithubConnected = false;
      return false;
    }
  }

  async connectGithub() {
    try {
      if (!(await this.checkAuthentication())) return;

      this.authService.loginWithGithub('login');
    } catch (error) {
      this.handleOperationError(error, 'Failed to connect to GitHub');
    }
  }

  private getCurrentUser(): User | null {
    // We need to use the BehaviorSubject.value syntax directly or subscribe
    // Since we can't use getValue() on an Observable
    let currentUser: User | null = null;
    this.authService.user$.pipe(take(1)).subscribe((user) => {
      currentUser = user;
    });
    return currentUser;
  }

  private showInfo(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['info-snackbar'],
    });
  }

  /**
   * Create a GitHub repository for a specific vault
   */
  async createGithubRepository(vaultId: number) {
    try {
      if (!(await this.checkAuthentication())) return;

      // Check if GitHub is connected first
      if (!this.isGithubConnected) {
        this.showInfo('You need to connect your GitHub account first');
        await this.connectGithub();
        return;
      }

      // Prompt for repository name with example format
      const username = this.currentUser?.username || 'user';
      const suggestedName = `${username}/codestrata-vault-${vaultId}`;
      const repoMessage = 'Enter GitHub repository format: username/repo-name';
      
      const repoName = prompt(repoMessage, suggestedName);
      if (!repoName) {
        this.showInfo('Repository creation cancelled');
        return;
      }
      
      // Validate repository name format
      if (!repoName.includes('/')) {
        this.showInfo('Repository name should be in format username/repo-name');
        return;
      }

      // Show loading indicator
      this.showInfo('Creating GitHub repository...');

      // Create the GitHub repository
      await firstValueFrom(
        this.vaultService.initializeGithubRepo(vaultId, repoName)
      );

      this.showSuccess(`GitHub repository "${repoName}" created successfully`);
      
      // Push the initial files to GitHub
      this.showInfo('Pushing files to GitHub...');
      await firstValueFrom(
        this.vaultService.uplift(vaultId)
      );
      
      this.showSuccess('Files pushed to GitHub successfully');
      
      // Refresh the vaults to see updated GitHub info
      await this.refreshVaults();
    } catch (error) {
      this.handleOperationError(error, 'Failed to create GitHub repository');
    }
  }

  async uploadArtifacts(vaultId: number, files: FileList) {
    if (!files.length) return;

    try {
      if (!(await this.checkAuthentication())) return;

      this.uploading = true;
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('artifacts', file);
      });

      await firstValueFrom(
        this.vaultService.uploadArtifacts(vaultId, formData)
      );
      this.showSuccess('Artifacts uploaded successfully');
      await this.refreshVaults();
    } catch (error) {
      this.handleOperationError(error, 'Failed to upload artifacts');
    } finally {
      this.uploading = false;
    }
  }

  async onFileSelected(event: Event, vaultId: number) {
    try {
      if (!(await this.checkAuthentication())) return;

      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        this.showInfo('No files selected');
        return;
      }

      this.uploading = true;
      
      // Show initial feedback
      this.showInfo(`Uploading ${files.length} file(s)...`);
      
      // Create FormData and append files with proper key
      const formData = new FormData();
      
      // Log the files being uploaded
      console.log(`Uploading ${files.length} file(s) to vault ${vaultId}:`, 
        Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })));
      
      // Add each file to the FormData with the key 'artifacts'
      Array.from(files).forEach((file) => {
        formData.append('artifacts', file);
        // Log each file being added to the FormData
        console.log(`Added file to FormData: ${file.name} (${file.type}, ${file.size} bytes)`);
      });

      // Verify FormData contains the files (debugging)
      console.log('FormData debug:', 
        Array.from((formData as any).entries()).map((e: any) => e[0]));

      // Send the upload request
      const response = await firstValueFrom(
        this.vaultService.uploadArtifacts(vaultId, formData)
      );
      
      // Show success and refresh
      console.log('Upload response:', response);
      this.showSuccess(`${files.length} artifact(s) uploaded successfully`);
      await this.refreshVaults();
      
      // Reset the file input
      if (event.target) {
        (event.target as HTMLInputElement).value = '';
      }
    } catch (error) {
      console.error('File upload error:', error);
      
      // Provide more helpful error messaging
      if (error instanceof HttpErrorResponse) {
        if (error.status === 400) {
          this.showError('Upload failed: ' + (error.error?.message || 'Bad Request'));
        } else if (error.status === 413) {
          this.showError('Files are too large. Please try smaller files or fewer files.');
        } else {
          this.handleOperationError(error, 'Failed to upload artifacts');
        }
      } else {
        this.handleOperationError(error, 'Failed to upload artifacts');
      }
      
      // Reset the file input on error
      if (event.target) {
        (event.target as HTMLInputElement).value = '';
      }
    } finally {
      this.uploading = false;
    }
  }

  private async checkAuthentication(forceReset: boolean = false): Promise<boolean> {
    // Skip complex auth check in SSR environment
    if (typeof window === 'undefined') {
      console.log('Skipping auth check in server environment');
      return false;
    }
    
    try {
      // Get a unique auth check ID to prevent conflicts when multiple components check auth
      const authCheckId = `auth_check_${Math.random().toString(36).substring(2, 10)}`;
      
      // Allow forced reset of auth check state
      if (forceReset) {
        console.log('Forced reset of authentication check state');
        try {
          sessionStorage.removeItem('auth_check_in_progress');
          sessionStorage.removeItem('auth_check_start_time');
          sessionStorage.removeItem('auth_check_id');
        } catch (e) {
          console.warn('Error clearing session storage:', e);
        }
      }
      
      // Check if there's already an authentication attempt in progress to prevent loops
      let isAuthInProgress = false;
      try {
        isAuthInProgress = sessionStorage.getItem('auth_check_in_progress') === 'true';
      } catch (e) {
        console.warn('Error accessing session storage:', e);
      }
      if (isAuthInProgress) {
        console.log('Authentication check already in progress, waiting for completion');
        
        // Check how long it's been in progress
        const authCheckStartTime = sessionStorage.getItem('auth_check_start_time');
        if (authCheckStartTime) {
          const startTime = parseInt(authCheckStartTime, 10);
          const currentTime = Date.now();
          const timeElapsed = currentTime - startTime;
          
          // If it's been more than 5 seconds, something went wrong - reset
          if (timeElapsed > 5000) {
            console.log('Authentication check has been stuck for too long, resetting');
            sessionStorage.removeItem('auth_check_in_progress');
            sessionStorage.removeItem('auth_check_start_time');
            sessionStorage.removeItem('auth_check_id');
            // Use a shorter timeout to prevent stuck states
            return this.checkAuthentication(true);
          }
        }
        
        // Use a more reliable promise-based approach for the polling
        return new Promise<boolean>((resolve) => {
          const maxAttempts = 20; // 4 seconds max wait
          let attempts = 0;
          
          const checkComplete = () => {
            // Always cleanup on exit
            if (attempts >= maxAttempts || 
                sessionStorage.getItem('auth_check_in_progress') !== 'true') {
              this.cleanupAuthCheckState();
              resolve(this.authService.isAuthenticated());
              return;
            }
            
            attempts++;
            const checkIntervalId = setTimeout(checkComplete, 200);
            
            // Ensure we clean up timeouts if component is destroyed
            this.destroy$.pipe(take(1)).subscribe(() => {
              clearTimeout(checkIntervalId);
              resolve(false);
            });
          };
          
          // Start polling
          checkComplete();
        });
      }
      
      // Mark authentication check as in progress
      try {
        sessionStorage.setItem('auth_check_in_progress', 'true');
        sessionStorage.setItem('auth_check_start_time', Date.now().toString());
        sessionStorage.setItem('auth_check_id', authCheckId);
      } catch (e) {
        console.warn('Error setting session storage auth state:', e);
      }
      
      try {
        // Use a more direct authentication check
        const isAuthenticated = this.authService.isAuthenticated();
        console.log('Initial authentication check result:', isAuthenticated);
        
        if (!isAuthenticated) {
          console.log('User is not authenticated, attempting token refresh...');
          
          // Try to refresh the token first before redirecting
          try {
            // First, check for cached vaults data - if we have vaults, assume we're likely authenticated
            // and the token just needs refreshing
            const cachedVaults = localStorage.getItem('cached_vaults');
            let assumeAuthenticated = false;
            
            if (cachedVaults) {
              try {
                const vaults = JSON.parse(cachedVaults) as StrataVault[];
                if (vaults && vaults.length > 0) {
                  console.log('Found cached vaults, assuming user may be authenticated but needs token refresh');
                  assumeAuthenticated = true;
                  // Show vaults from cache while we try to refresh token
                  this.vaults = vaults;
                }
              } catch (cacheError) {
                console.warn('Error parsing cached vaults:', cacheError);
              }
            }
            
            // Use firstValueFrom to properly await the observable with better error handling
            const refreshed = await firstValueFrom(
              this.authService.refreshAuthState().pipe(
                timeout({
                  each: 8000, // 8 second timeout for the observable - increased for network issues
                  with: () => of(assumeAuthenticated) // Return assumeAuthenticated on timeout instead of false
                }),
                catchError(error => {
                  console.error('Auth refresh timeout or error:', error);
                  // If we have cached vaults, don't fail auth completely
                  return of(assumeAuthenticated); 
                })
              )
            );
            
            // Check authentication state again after refresh attempt
            const refreshedAuth = this.authService.isAuthenticated();
            console.log('Authentication state after refresh attempt:', refreshedAuth);
            
            if (!refreshedAuth) {
              if (assumeAuthenticated) {
                // If we have cached vaults but couldn't refresh token, just warn and continue
                console.log('Could not refresh token but have cached vaults - continuing in offline mode');
                this.showInfo('Working in offline mode. Some features may be limited.');
                this.cleanupAuthCheckState(authCheckId);
                return true;
              }
              
              console.log('Still not authenticated after refresh, redirecting to login');
              
              // Clean up auth check state before redirecting
              this.cleanupAuthCheckState(authCheckId);
              
              // Use a small delay before redirect to avoid race conditions
              await new Promise(resolve => {
                const delayTimeoutId = setTimeout(resolve, 50);
                this.destroy$.pipe(take(1)).subscribe(() => clearTimeout(delayTimeoutId));
              });
              
              // Only handle unauthorized if the user is not authenticated
              // This prevents unnecessary redirects for authenticated users
              const isActuallyAuthenticated = this.authService.isAuthenticated();
              if (!isActuallyAuthenticated) {
                await this.handleUnauthorized();
              } else {
                console.log('User is actually authenticated, not redirecting to login');
              }
              
              return isActuallyAuthenticated;
            }
            
            // User is now authenticated after token refresh
            this.cleanupAuthCheckState(authCheckId);
            return true;
          } catch (refreshError) {
            console.error('Failed to refresh authentication:', refreshError);
            this.cleanupAuthCheckState(authCheckId);
            
            // Check for cached vaults - if we have them, don't redirect
            const cachedVaults = localStorage.getItem('cached_vaults');
            if (cachedVaults) {
              try {
                const vaults = JSON.parse(cachedVaults) as StrataVault[];
                if (vaults && vaults.length > 0) {
                  console.log('Error refreshing token but have cached vaults - continuing in offline mode');
                  this.showInfo('Working in offline mode. Some features may be limited.');
                  this.vaults = vaults;
                  return true;
                }
              } catch (cacheError) {
                console.warn('Error parsing cached vaults after refresh error:', cacheError);
              }
            }
            
            // Only redirect on actual auth failures, not on network errors
            if (refreshError instanceof HttpErrorResponse && refreshError.status !== 0) {
              await this.handleUnauthorized();
            } else {
              console.warn('Network error during auth refresh, assuming temporary issue');
              this.showError('Temporary connection issue. Please try again.');
            }
            return false;
          }
        }
        
        // User is already authenticated
        this.cleanupAuthCheckState(authCheckId);
        return isAuthenticated;
      } catch (error) {
        console.error('Error during authentication check:', error);
        this.cleanupAuthCheckState(authCheckId);
        
        // Check for cached vaults - if we have them, don't redirect
        const cachedVaults = localStorage.getItem('cached_vaults');
        if (cachedVaults) {
          try {
            const vaults = JSON.parse(cachedVaults) as StrataVault[];
            if (vaults && vaults.length > 0) {
              console.log('Error during auth check but have cached vaults - continuing in offline mode');
              this.showInfo('Working in offline mode. Some features may be limited.');
              this.vaults = vaults;
              return true;
            }
          } catch (cacheError) {
            console.warn('Error parsing cached vaults after auth check error:', cacheError);
          }
        }
        
        // Only redirect on actual auth failures, not on network errors
        if (error instanceof HttpErrorResponse && error.status !== 0) {
          await this.handleUnauthorized();
        }
        return false;
      }
    } catch (error) {
      console.error('Unexpected error in authentication check:', error);
      this.cleanupAuthCheckState();
      
      // Check for cached vaults as a last resort
      const cachedVaults = localStorage.getItem('cached_vaults');
      if (cachedVaults) {
        try {
          const vaults = JSON.parse(cachedVaults) as StrataVault[];
          if (vaults && vaults.length > 0) {
            console.log('Unexpected error but have cached vaults - continuing in offline mode');
            this.showInfo('Working in offline mode due to an error. Some features may be limited.');
            this.vaults = vaults;
            return true;
          }
        } catch (cacheError) {
          console.warn('Error parsing cached vaults after unexpected error:', cacheError);
        }
      }
      
      await this.handleUnauthorized();
      return false;
    }
  }
  
  private cleanupAuthCheckState(checkId?: string): void {
    // Skip in non-browser environments
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      // Only clear auth check progress if our ID matches or no ID provided
      if (!checkId || sessionStorage.getItem('auth_check_id') === checkId) {
        sessionStorage.removeItem('auth_check_in_progress');
        sessionStorage.removeItem('auth_check_start_time');
        sessionStorage.removeItem('auth_check_id');
      }
    } catch (e) {
      console.warn('Error cleaning up auth check state:', e);
    }
  }

  async fossilize(vaultId: number, message: string) {
    try {
      if (!(await this.checkAuthentication())) return;

      await firstValueFrom(this.vaultService.fossilize(vaultId, message));
      this.showSuccess('Changes fossilized successfully');
      await this.refreshVaults();
    } catch (error) {
      this.handleOperationError(error, 'Failed to fossilize changes');
    }
  }

  async stratumShift(vaultId: number, name: string) {
    try {
      if (!(await this.checkAuthentication())) return;

      await firstValueFrom(this.vaultService.stratumShift(vaultId, name));
      this.showSuccess('Stratum shift successful');
      await this.refreshVaults();
    } catch (error) {
      this.handleOperationError(error, 'Failed to shift stratum');
    }
  }

  async erodeVault(vaultId: number) {
    try {
      if (!(await this.checkAuthentication())) return;

      await firstValueFrom(this.vaultService.erodeStrata(vaultId, ''));
      this.showSuccess('Vault eroded successfully');
      await this.refreshVaults();
    } catch (error) {
      this.handleOperationError(error, 'Failed to erode vault');
    }
  }

  async handleUnauthorized() {
    // Check if the user is actually authenticated before redirecting
    if (!this.authService.isAuthenticated()) {
      this.showError('Authentication required');
      await this.router.navigate(['/login']);
    } else {
      // User is authenticated but might not have the proper permissions
      this.showError('You do not have permission to access this resource');
      // Don't redirect if they're already authenticated - stay on current page
    }
  }

  async refreshVaults() {
    // If already loading, don't start another refresh
    if (this.isLoading) {
      console.log('Refresh already in progress, skipping');
      return;
    }

    try {
      // Always load cached vaults first, even if authentication check fails
      this.loadCachedVaults();
      
      if (!(await this.checkAuthentication())) return;

      // Mark loading state for UI, but with a small delay to show cached data first
      setTimeout(() => {
        if (this.isLoading) { // Double-check we're still loading
          this.isLoading = true;
        }
      }, 200);
      
      const fetchVaultsPromise = firstValueFrom(
        this.vaultService.getVaults().pipe(
          timeout(8000), // Increase timeout for slower connections
          retry({
            count: 3,
            delay: 1000 // 1 second between retries
          }),
          catchError(error => {
            console.error('Error fetching vaults after retries:', error);
            throw error; // Re-throw to be caught in the outer catch
          })
        )
      );

      const freshVaults = await fetchVaultsPromise;
      
      // Only update the UI if we got valid vaults from the API
      if (freshVaults && freshVaults.length > 0) {
        console.log(`[UserStrataVaults] Retrieved ${freshVaults.length} vaults from API`);
        this.vaults = freshVaults;
        
        // Update the cache with the fresh data
        try {
          localStorage.setItem('cached_vaults', JSON.stringify(freshVaults));
          localStorage.setItem('cached_vaults_timestamp', Date.now().toString());
        } catch (cacheError) {
          console.warn('[UserStrataVaults] Could not update cache with fresh data:', cacheError);
        }
      } else if (freshVaults && freshVaults.length === 0) {
        // If API returned empty array but we have cached vaults, keep cached vaults
        const cachedVaults = localStorage.getItem('cached_vaults');
        if (cachedVaults) {
          const parsedVaults = JSON.parse(cachedVaults) as StrataVault[];
          if (parsedVaults && parsedVaults.length > 0) {
            console.log('[UserStrataVaults] API returned empty vaults but cache has data, keeping cached data');
            this.vaults = parsedVaults;
          } else {
            // API returned empty array and no cached data
            this.vaults = [];
          }
        } else {
          // No cached data, use empty array from API
          this.vaults = [];
        }
      }
    } catch (error) {
      console.error('Vault refresh failed:', error);
      // Enhanced error logging
      if (error instanceof HttpErrorResponse) {
        console.error(`HTTP Error ${error.status}: ${error.statusText}`);
      }
      this.handleOperationError(error, 'Failed to refresh vaults');
      
      // Try to use cached vaults if available instead of clearing the array
      const cachedVaults = localStorage.getItem('cached_vaults');
      if (cachedVaults) {
        try {
          const parsedVaults = JSON.parse(cachedVaults) as StrataVault[];
          if (parsedVaults && parsedVaults.length > 0) {
            console.log('[UserStrataVaults] Using cached vaults after API error');
            this.vaults = parsedVaults;
          }
        } catch (cacheError) {
          console.warn('[UserStrataVaults] Could not parse cached vaults:', cacheError);
          // If parse fails, set empty array
          this.vaults = [];
        }
      } else {
        // No cached vaults, set empty array
        this.vaults = [];
      }
    } finally {
      // Ensure we reset loading state with setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
      setTimeout(() => {
        this.isLoading = false;
      }, 0);
    }
  }

  private handleOperationError(error: any, defaultMessage: string) {
    console.error('Operation error:', error);
    let errorMessage = defaultMessage;

    if (error instanceof HttpErrorResponse) {
      // Handle network connectivity issues differently
      if (error.status === 0) {
        errorMessage = 'Network connectivity issue. Please check your connection.';
      } else if (error.status === 401) {
        // Track auth failures to prevent infinite loops
        const authFailCount = +(sessionStorage.getItem('auth_fail_count') || '0');
        if (authFailCount > 3) {
          // Too many auth failures, force logout to break potential loop
          console.error('Too many authentication failures, forcing logout');
          this.authService.logout();
          sessionStorage.removeItem('auth_fail_count');
          this.router.navigate(['/login']);
          return;
        }
        
        // Check if user is actually authenticated before redirecting
        if (this.authService.isAuthenticated()) {
          console.log('User is authenticated despite 401 error, not redirecting');
          this.showError('Operation not permitted. You may need to refresh your login session.');
          return;
        }
        
        sessionStorage.setItem('auth_fail_count', (authFailCount + 1).toString());
        // Clean up auth check state before redirecting
        this.cleanupAuthCheckState();
        setTimeout(() => this.handleUnauthorized(), 100);
        return;
      } else {
        errorMessage = error.error?.message || `Server error: ${error.status}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error === null || error === undefined) {
      errorMessage = 'Unknown error occurred';
    }

    this.showError(errorMessage);
  }

  private showSuccess(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }

  async retryExcavation() {
    try {
      if (!(await this.checkAuthentication())) return;
      await this.refreshVaults();
    } catch (error) {
      this.handleOperationError(error, 'Failed to retry excavation');
    }
  }

  /**
   * Gets the appropriate material icon for a file based on its extension
   */
  getFileIcon(artifact: any): string {
    const filename = typeof artifact === 'string' ? artifact : artifact?.name || '';
    if (!filename) return 'insert_drive_file';
    
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return 'description';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'table_chart';
      case 'ppt':
      case 'pptx':
        return 'slideshow';
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return 'archive';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audiotrack';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
        return 'movie';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return 'code';
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
      case 'scss':
      case 'less':
        return 'style';
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return 'data_object';
      case 'py':
        return 'code';
      case 'java':
      case 'cpp':
      case 'c':
      case 'go':
      case 'rs':
        return 'terminal';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Gets CSS class for file icon based on file type
   */
  getFileIconClass(artifact: any): string {
    const filename = typeof artifact === 'string' ? artifact : artifact?.name || '';
    if (!filename) return 'file-icon';
    
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'file-icon pdf-icon';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'file-icon image-icon';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
        return 'file-icon code-icon';
      case 'html':
      case 'htm':
        return 'file-icon html-icon';
      case 'css':
      case 'scss':
      case 'less':
        return 'file-icon style-icon';
      case 'json':
      case 'xml':
      case 'yaml':
      case 'yml':
        return 'file-icon data-icon';
      default:
        return 'file-icon';
    }
  }
}
