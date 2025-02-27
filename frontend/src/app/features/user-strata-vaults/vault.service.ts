import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of, Subject } from 'rxjs';
import { catchError, tap, map, switchMap, retry, takeUntil, filter } from 'rxjs/operators';
import { VAULTS } from '../../core/config/api.config';
import { StrataVault } from '../../auth/services/auth.service';
import { environment } from '../../../environments/environment';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';
import { AUTH } from '../../core/config/api.config';
import { TokenStorageService } from '../../auth/services/token/token-storage.service';

export interface VaultCommand {
  command:
    | 'create-vault'
    | 'fossilize' // Preserve a snapshot of current code state 
    | 'stratum-shift' // Move between different code layers
    | 'excavate' // Dig into and analyze code structure
    | 'uplift' // Elevate code quality or refactor legacy code
    | 'connect-vault' // Link multiple code repositories
    | 'unearth' // Discover hidden patterns or bugs
    | 'shift-to' // Navigate to specific code formation
    | 'map-strata' // Generate a visualization of code layers
    | 'fuse-strata' // Combine multiple code layers
    | 'preserve' // Protect code from further changes
    | 'erode-strata' // Remove deprecated code layers
    | 'erode-remote-strata'; // Clean up remote code;
  args?: string[];
  message?: string;
}

export interface VaultCommandResponse {
  message: string;
  output?: string;
  error?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VaultService implements OnDestroy {
  private readonly GITHUB_CLIENT_ID = environment.github.clientId;
  private readonly GITHUB_REDIRECT_URI = environment.github.redirectUri;
  private readonly GITHUB_SCOPE = 'repo';

  // For tracking resources to clean up
  private destroy$ = new Subject<void>();
  private timeoutIds: number[] = [];

  private vaultsSubject = new BehaviorSubject<StrataVault[]>([]);
  vaults$ = this.vaultsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private errorHandler: ErrorHandlerService,
    private tokenStorage: TokenStorageService
  ) {
    // Load cached vaults immediately when service is instantiated
    this.loadCachedVaultsIfAvailable();
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
    
    // Clear any timeouts
    this.timeoutIds.forEach(id => clearTimeout(id));
  }

  getVaults(explore: boolean = false, searchTerm?: string): Observable<StrataVault[]> {
    // Always start by showing any cached vaults we have to ensure immediate display
    this.loadCachedVaultsIfAvailable();
    
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for getVaults');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available',
        code: 'AUTH_HEADER_MISSING'
      }));
    }
    
    // Add explicit headers with the token to ensure it gets included
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Determine which endpoint to use and add search params if needed
    let url = explore ? `${VAULTS.BASE}/explore` : VAULTS.BASE;
    let params = {};
    
    // Add search parameter if provided
    if (searchTerm && searchTerm.trim()) {
      params = { search: searchTerm.trim() };
    }
    
    console.log(`[VaultService] Making request to ${url} with explicit token${searchTerm ? ` and search: ${searchTerm}` : ''}`);
    
    return this.http.get<StrataVault[]>(url, { headers, params }).pipe(
      // Add retry on network failures to improve reliability
      retry({ count: 3, delay: 1000 }),
      map((vaults) =>
        vaults.sort((a, b) => {
          const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return dateB - dateA;
        })
      ),
      tap((vaults) => {
        console.log(`[VaultService] Successfully retrieved ${vaults.length} vaults from API`);
        // Update the vaults in the local subject (BehaviorSubject)
        this.vaultsSubject.next(vaults);
        
        // Cache the last successful fetch in localStorage to ensure persistence (only in browser)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('cached_vaults', JSON.stringify(vaults));
            localStorage.setItem('cached_vaults_timestamp', Date.now().toString());
          } catch (err) {
            console.warn('[VaultService] Could not cache vaults in localStorage:', err);
          }
        }
      }),
      catchError((error) => {
        console.error('[VaultService] Error fetching vaults:', error);
        
        // Already loaded cache at the beginning, so we can just return what we have
        if (this.vaultsSubject.value && this.vaultsSubject.value.length > 0) {
          console.log('[VaultService] Using already loaded cached vaults due to API error');
          return of(this.vaultsSubject.value);
        }
        
        // If no vaults are loaded yet, try to load from cache again
        try {
          const cachedVaults = localStorage.getItem('cached_vaults');
          if (cachedVaults) {
            console.log('[VaultService] Using cached vaults due to API error');
            const vaults = JSON.parse(cachedVaults) as StrataVault[];
            this.vaultsSubject.next(vaults);
            return of(vaults);
          }
        } catch (cacheError) {
          console.warn('[VaultService] Error reading from cache:', cacheError);
        }
        
        // If cache strategy fails, handle error normally
        return this.handleVaultError(error, 'getVaults');
      })
    );
  }
  
  /**
   * Helper method to load vaults from cache immediately upon service initialization
   * This ensures vaults are shown while API request is in progress
   */
  private loadCachedVaultsIfAvailable(): void {
    // Skip in non-browser environment
    if (typeof window === 'undefined') {
      console.log('[VaultService] Not in browser environment, skipping cache load');
      return;
    }
    
    try {
      const cachedVaults = localStorage.getItem('cached_vaults');
      if (cachedVaults) {
        const vaults = JSON.parse(cachedVaults) as StrataVault[];
        console.log(`[VaultService] Loaded ${vaults.length} vaults from cache`);
        this.vaultsSubject.next(vaults);
      }
    } catch (error) {
      console.warn('[VaultService] Could not load vaults from cache:', error);
    }
  }

  createVault(name: string): Observable<StrataVault> {
    console.log('[VaultService] Creating vault with name:', name);
    
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for createVault');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available',
        code: 'AUTH_HEADER_MISSING'
      }));
    }
    
    // Add explicit headers with the token to ensure it gets included
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Create the vault payload with required fields
    const payload = {
      name,
      description: 'Created via CodeStrata UI', 
      // Initialize with empty arrays and additional data for GitHub integration
      artifacts: [], 
      strata: [],
      // Add gitIntegration flag to enable GitHub repository creation
      gitIntegration: true,
      // Add default branch name for repository
      defaultBranch: 'main'
    };
    
    console.log(`[VaultService] Creating vault with payload:`, payload);
    
    // Use direct POST to create endpoint instead of execute command
    return this.http.post<StrataVault>(VAULTS.BASE, payload, { headers }).pipe(
      // Add retry logic for network issues
      retry({ count: 2, delay: 1000 }),
      tap((vault) => {
        console.log(`[VaultService] Vault created successfully:`, vault);
        
        // Update local vault data
        const currentVaults = this.vaultsSubject.value;
        const updatedVaults = [...currentVaults, vault];
        this.vaultsSubject.next(updatedVaults);
        
        // Cache to localStorage for persistence
        try {
          localStorage.setItem('cached_vaults', JSON.stringify(updatedVaults));
          localStorage.setItem('cached_vaults_timestamp', Date.now().toString());
        } catch (err) {
          console.warn('[VaultService] Could not cache vaults in localStorage:', err);
        }
        
        // After creating vault, try to initialize repository if gitIntegration is enabled
        if (vault.id && payload.gitIntegration) {
          // Set a timeout to avoid overwhelming the API
          const timeoutId = window.setTimeout(() => {
            console.log(`[VaultService] Initializing GitHub repository for vault ${vault.id}`);
            // Use the CLI command to initialize the repository via executeCommand
            this.executeCommand({
              command: 'create-vault',
              args: [vault.id.toString()],
              message: 'Initial repository creation'
            }).subscribe({
              next: (response) => {
                console.log('[VaultService] Repository initialization response:', response);
              },
              error: (err) => {
                console.error('[VaultService] Error initializing repository:', err);
                // Non-critical error, don't propagate
              }
            });
          }, 1000);
          
          this.timeoutIds.push(timeoutId);
        }
      }),
      catchError((error) => {
        console.error('[VaultService] Error creating vault:', error);
        return this.handleVaultError(error, 'createVault');
      })
    );
  }

  uploadArtifacts(vaultId: number, files: FormData): Observable<any> {
    const url = `${VAULTS.BASE}/${vaultId}/artifacts`;
    console.log('[VaultService] Uploading artifacts to:', url);
    
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for uploadArtifacts');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available',
        code: 'AUTH_HEADER_MISSING'
      }));
    }
    
    // Add explicit headers with the token
    // Note: Don't include 'Content-Type' for multipart/form-data
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // Verify FormData has content
    if (files instanceof FormData) {
      // Log the keys in the FormData for debugging
      const formDataEntries = Array.from((files as any).entries());
      console.log('[VaultService] FormData keys:', formDataEntries.map((e: any) => e[0]));
      
      // Validate the FormData has the expected structure
      if (formDataEntries.length === 0) {
        console.error('[VaultService] FormData is empty');
        return throwError(() => new Error('No files were included in the upload'));
      }
      
      // Ensure 'artifacts' key exists in FormData
      if (!formDataEntries.some((e: any) => e[0] === 'artifacts')) {
        console.warn('[VaultService] FormData missing "artifacts" key, adding empty field');
        // Add an empty field to prevent server-side issues
        files.append('artifacts', new Blob(['{}'], {type: 'application/json'}), 'empty.json');
      }
      
      // Count how many files we're actually uploading
      const artifactCount = formDataEntries.filter((e: any) => e[0] === 'artifacts').length;
      console.log(`[VaultService] Uploading ${artifactCount} artifacts`);
    } else {
      console.error('[VaultService] Invalid FormData object');
      return throwError(() => new Error('Invalid upload data format'));
    }
    
    // Set up the request with progress reporting
    return this.http
      .post(url, files, { 
        headers,
        reportProgress: true,
        observe: 'events'
      })
      .pipe(
        // Map the progress events to a more useful format
        map((event: any) => {
          if (event.type === 1) { // HttpEventType.UploadProgress
            const progress = Math.round(100 * (event as any).loaded / (event as any).total);
            return { type: 'progress', progress };
          } else if (event.type === 4) { // HttpEventType.Response
            return (event as any).body;
          }
          return event;
        }),
        // Only emit the final response to subscribers
        filter((event: any) => event.type !== 'progress'),
        // Ensure result is properly typed
        map((event: any) => {
          if (typeof event === 'object' && event !== null && 'type' in event) {
            return (event as any).body;
          }
          return event;
        }),
        tap(response => {
          console.log('[VaultService] Artifacts uploaded successfully:', response);
          
          // Refresh vault data after artifact upload
          const timeoutId = window.setTimeout(() => {
            this.refreshVaultAfterOperation(vaultId);
          }, 1000);
          
          this.timeoutIds.push(timeoutId);
        }),
        catchError((error) => {
          console.error('[VaultService] Error uploading artifacts:', error);
          
          // Enhance error message for specific cases
          if (error.status === 400) {
            if (error.error?.message?.includes('No files')) {
              return throwError(() => new Error('No files were received by the server. Please try again.'));
            }
          } else if (error.status === 413) {
            return throwError(() => new Error('The files are too large. Please try smaller files or fewer files.'));
          }
          
          return this.handleVaultError(error, 'uploadArtifacts');
        })
      );
  }

  fossilize(
    vaultId: number,
    message: string
  ): Observable<VaultCommandResponse> {
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for fossilize');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available'
      }));
    }
    
    // Use executeCommand pattern for consistent geological terminology
    return this.executeCommand({
      command: 'fossilize',
      args: [vaultId.toString()],
      message: message
    }).pipe(
      // Add retry on network failures
      retry({ count: 2, delay: 1000 }),
      tap(() => {
        console.log(`[VaultService] Successfully fossilized changes for vault ${vaultId}`);
        // Refresh vault list after operation to get updated data
        this.refreshVaultAfterOperation(vaultId);
      }),
      catchError((error) => {
        console.error('[VaultService] Error fossilizing changes:', error);
        return this.handleVaultError(error, 'fossilize');
      })
    );
  }

  stratumShift(
    vaultId: number,
    name: string
  ): Observable<VaultCommandResponse> {
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for stratumShift');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available'
      }));
    }
    
    // Use executeCommand pattern for consistent geological terminology
    return this.executeCommand({
      command: 'stratum-shift',
      args: [vaultId.toString(), name],
    }).pipe(
      // Add retry on network failures
      retry({ count: 2, delay: 1000 }),
      tap(() => {
        console.log(`[VaultService] Successfully created new stratum ${name} for vault ${vaultId}`);
        // Refresh vault list after operation to get updated data
        this.refreshVaultAfterOperation(vaultId);
      }),
      catchError((error) => {
        console.error('[VaultService] Error creating stratum:', error);
        return this.handleVaultError(error, 'stratumShift');
      })
    );
  }

  excavate(vaultId: number): Observable<VaultCommandResponse> {
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for excavate');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available'
      }));
    }
    
    return this.executeCommand({
      command: 'excavate',
      args: [vaultId.toString()],
    }).pipe(
      tap(() => {
        console.log(`[VaultService] Successfully excavated vault ${vaultId}`);
        // Refresh vault list after operation to get updated data
        this.refreshVaultAfterOperation(vaultId);
      }),
      catchError((error) => {
        console.error('[VaultService] Error excavating vault:', error);
        return this.handleVaultError(error, 'excavate');
      })
    );
  }

  uplift(vaultId: number): Observable<VaultCommandResponse> {
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for uplift');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available'
      }));
    }
    
    return this.executeCommand({
      command: 'uplift',
      args: [vaultId.toString()],
    }).pipe(
      tap(() => {
        console.log(`[VaultService] Successfully uplifted vault ${vaultId} to remote`);
        // Refresh vault list after operation to get updated data
        this.refreshVaultAfterOperation(vaultId);
      }),
      catchError((error) => {
        console.error('[VaultService] Error uplifting vault:', error);
        return this.handleVaultError(error, 'uplift');
      })
    );
  }
  
  // Helper method to refresh a vault after an operation 
  private refreshVaultAfterOperation(vaultId: number): void {
    // Set a timeout to avoid immediate refresh
    const timeoutId = window.setTimeout(() => {
      this.getVaultById(vaultId).subscribe({
        next: (updatedVault) => {
          // Update this vault in the current list
          const currentVaults = this.vaultsSubject.value;
          const updatedVaults = currentVaults.map(vault => 
            vault.id === vaultId ? updatedVault : vault
          );
          
          // Update subject with new data
          this.vaultsSubject.next(updatedVaults);
          
          // Update cache
          try {
            localStorage.setItem('cached_vaults', JSON.stringify(updatedVaults));
            localStorage.setItem('cached_vaults_timestamp', Date.now().toString());
          } catch (err) {
            console.warn('[VaultService] Could not update cache after operation:', err);
          }
        },
        error: (err) => {
          console.warn('[VaultService] Could not refresh vault after operation:', err);
          // Non-critical error, don't propagate
        }
      });
    }, 1000);
    
    this.timeoutIds.push(timeoutId);
  }

  unearthVault(
    repositoryUrl: string,
    name: string
  ): Observable<VaultCommandResponse> {
    return this.executeCommand({
      command: 'unearth',
      args: [repositoryUrl, name],
    }).pipe(
      catchError((error) => this.errorHandler.handleHttpError(error, 'VaultService'))
    );
  }

  shiftTo(vaultId: number, branch: string): Observable<VaultCommandResponse> {
    return this.executeCommand({
      command: 'shift-to',
      args: [vaultId.toString(), branch],
    }).pipe(
      catchError((error) => this.errorHandler.handleHttpError(error, 'VaultService'))
    );
  }

  mapStrata(vaultId: number): Observable<VaultCommandResponse> {
    return this.executeCommand({
      command: 'map-strata',
      args: [vaultId.toString()],
    }).pipe(
      catchError((error) => this.errorHandler.handleHttpError(error, 'VaultService'))
    );
  }

  fuseStrata(
    vaultId: number,
    message: string
  ): Observable<VaultCommandResponse> {
    return this.executeCommand({
      command: 'fuse-strata',
      args: [vaultId.toString()],
      message,
    }).pipe(
      catchError((error) => this.errorHandler.handleHttpError(error, 'VaultService'))
    );
  }

  erodeStrata(
    vaultId: number,
    branch: string
  ): Observable<VaultCommandResponse> {
    return this.executeCommand({
      command: 'erode-strata',
      args: [vaultId.toString(), branch],
    }).pipe(
      catchError((error) => this.errorHandler.handleHttpError(error, 'VaultService'))
    );
  }

  getVaultById(id: number): Observable<StrataVault> {
    // First try to find the vault in our cached collection
    const cachedVaults = this.vaultsSubject.value;
    const cachedVault = cachedVaults.find((v) => v.id === id);

    // If we have it cached, return it immediately
    if (cachedVault) {
      console.log(`[VaultService] Using cached vault data for ID: ${id}`);
      return of(cachedVault);
    }
    
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for getVaultById');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available',
        code: 'AUTH_HEADER_MISSING'
      }));
    }
    
    // Add explicit headers with the token to ensure it gets included
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`[VaultService] Fetching vault with ID: ${id}`);

    // Otherwise fetch it from the API
    return this.http
      .get<StrataVault>(`${VAULTS.BASE}/${id}`, { headers })
      .pipe(
        tap(vault => console.log(`[VaultService] Successfully retrieved vault: ${vault.name}`)),
        catchError((error) => this.handleVaultError(error, 'getVaultById'))
      );
  }

  deleteVault(id: number): Observable<any> {
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for deleteVault');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available',
        code: 'AUTH_HEADER_MISSING'
      }));
    }
    
    // Add explicit headers with the token to ensure it gets included
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  
    console.log(`[VaultService] Deleting vault with ID: ${id}`);
    
    return this.http.delete(`${VAULTS.BASE}/${id}`, { headers }).pipe(
      // Add retry for network issues
      retry({ count: 2, delay: 1000 }),
      tap(() => {
        // Remove from local cache
        const currentVaults = this.vaultsSubject.value;
        const updatedVaults = currentVaults.filter((vault) => vault.id !== id);
        this.vaultsSubject.next(updatedVaults);
        
        console.log(`[VaultService] Vault ${id} successfully deleted`);
        
        // Update the cache in localStorage
        try {
          localStorage.setItem('cached_vaults', JSON.stringify(updatedVaults));
          localStorage.setItem('cached_vaults_timestamp', Date.now().toString());
        } catch (err) {
          console.warn('[VaultService] Could not update cache after deletion:', err);
        }
        
        // Fetch vaults from API to ensure we have the latest data
        const timeoutId = window.setTimeout(() => {
          this.http.get<StrataVault[]>(VAULTS.BASE, { headers }).subscribe({
            next: (freshVaults) => {
              // Sort vaults by update date
              const sortedVaults = freshVaults.sort((a, b) => {
                const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
                const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
                return dateB - dateA;
              });
              
              console.log(`[VaultService] Refreshed ${sortedVaults.length} vaults after deletion`);
              this.vaultsSubject.next(sortedVaults);
              
              // Update cache with fresh data
              try {
                localStorage.setItem('cached_vaults', JSON.stringify(sortedVaults));
                localStorage.setItem('cached_vaults_timestamp', Date.now().toString());
              } catch (err) {
                console.warn('[VaultService] Could not update cache with fresh data:', err);
              }
            },
            error: (err) => {
              console.warn('[VaultService] Could not refresh vaults after deletion:', err);
              // Non-critical error, don't propagate
            }
          });
        }, 1000);
        
        this.timeoutIds.push(timeoutId);
      }),
      catchError((error) => {
        console.error('[VaultService] Error deleting vault:', error);
        return this.handleVaultError(error, 'deleteVault');
      })
    );
  }

  checkGithubConnection(): Observable<boolean> {
    console.log('[VaultService] Checking GitHub connection status...');
    
    // For health endpoint, we don't need auth
    console.log(`[VaultService] Checking API health at: ${environment.apiUrl}/health`);
    
    // Check the API health endpoint first to see if backend is up
    return this.http
      .get<{ status: string }>(`${environment.apiUrl}/health`)
      .pipe(
        tap(response => console.log('[VaultService] API health status:', response)),
        map(() => true), // If API is up, consider GitHub available
        catchError(error => {
          console.warn('[VaultService] API health check failed:', error.status || 'Network error');
          return of(false);
        })
      );
  }

  connectGithubAccount(): void {
    try {
      // Use a more controlled approach to state management
      const safeAction = () => {
        try {
          // Clear any existing state first to avoid conflicts
          localStorage.removeItem('github_oauth_state');
          
          // Generate and store a new state parameter
          const state = this.generateStateParam();
          localStorage.setItem('github_oauth_state', state);
          
          // Build the GitHub authorization URL
          const authUrl = this.buildGithubAuthUrl(state);
          
          // Navigate to GitHub OAuth
          console.log('Redirecting to GitHub authorization URL');
          window.location.href = authUrl;
        } catch (e) {
          console.error('Error during GitHub connection:', e);
        }
      };
      
      // Execute safely after a small delay
      setTimeout(safeAction, 0);
    } catch (error) {
      console.error('Error in connectGithubAccount:', error);
    }
  }

  handleGithubCallback(code: string, state: string): Observable<any> {
    console.log('Starting GitHub callback handling with code:', code?.substring(0, 5) + '...');
    
    // Validate state parameter if present
    const storedState = localStorage.getItem('github_oauth_state');
    
    console.log('GitHub OAuth state validation:', {
      receivedState: state ? state.substring(0, 10) + '...' : 'none',
      storedState: storedState ? storedState.substring(0, 10) + '...' : 'none',
      match: storedState === state
    });
    
    // Clear state now that we've used it
    localStorage.removeItem('github_oauth_state');
    
    // Only validate state if we have a stored state (the setting mechanism was moved to AuthService)
    if (storedState && state !== storedState) {
      console.error('State parameter mismatch in GitHub callback');
      return throwError(() => new Error('Security validation failed: State mismatch'));
    }
    
    // Log the endpoint we're calling
    console.log('Sending GitHub code to endpoint:', `${AUTH.GITHUB}`);
    
    // Exchange code for token
    return this.http.post<{token?: string, refreshToken?: string, user?: any}>(`${AUTH.GITHUB}`, { code, state }).pipe(
      tap(response => {
        console.log('GitHub callback successful, received response with token:', 
          response?.token ? 'yes' : 'no',
          'refresh token:', response?.refreshToken ? 'yes' : 'no');
      }),
      catchError((error) => {
        console.error('Error in GitHub callback:', error);
        return this.errorHandler.handleHttpError(error, 'VaultService');
      })
    );
  }

  initializeGithubRepo(vaultId: number, repositoryName: string): Observable<any> {
    console.log(`[VaultService] Creating GitHub repository for vault ${vaultId} with name: ${repositoryName}`);
    
    // Ensure we have a valid token before making the request
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for GitHub repository creation');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available'
      }));
    }
    
    const url = `${VAULTS.BASE}/${vaultId}/github`;
    const payload = { 
      repositoryName,
      description: 'CodeStrata vault repository',
      isPrivate: true // Default to private repository
    };
    
    // Add explicit headers with the token to ensure it gets included
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('[VaultService] Making GitHub repo initialization request with headers:', {
      url,
      hasToken: !!headers.Authorization,
      tokenLength: headers.Authorization ? headers.Authorization.length : 0
    });
    
    return this.http.post(url, payload, { headers }).pipe(
      // Add retry for network issues
      retry({ count: 2, delay: 1000 }),
      tap(response => {
        console.log(`[VaultService] GitHub repository created successfully:`, response);
        // Refresh vault list after repository creation to get updated data
        this.refreshVaultAfterOperation(vaultId);
      }),
      catchError((error) => {
        console.error('[VaultService] Error creating GitHub repository:', error);
        
        // Enhanced error handling for GitHub API errors
        if (error.status === 401) {
          return throwError(() => new Error('GitHub authentication failed. Please reconnect your GitHub account.'));
        } else if (error.status === 422) {
          return throwError(() => new Error('Repository name already exists or is invalid. Please choose another name.'));
        } else if (error.status === 403) {
          return throwError(() => new Error('GitHub rate limit exceeded or insufficient permissions.'));
        }
        
        return this.handleVaultError(error, 'initializeGithubRepo');
      })
    );
  }

  private buildGithubAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.GITHUB_CLIENT_ID,
      redirect_uri: this.GITHUB_REDIRECT_URI,
      scope: this.GITHUB_SCOPE,
      state: state
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  private generateStateParam(): string {
    // Create a more secure state parameter using multiple entropy sources
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timePart = Date.now().toString(36);
    const extraEntropy = (Math.random() * 1000000).toString(36).substring(0, 5);
    
    return `${randomPart}_${timePart}_${extraEntropy}`;
  }

  private executeCommand(
    command: VaultCommand
  ): Observable<VaultCommandResponse> {
    console.log(`[VaultService] Executing command: ${command.command}`, command);
    
    // Verify we have an API endpoint
    if (!VAULTS.EXECUTE) {
      console.error('[VaultService] No execution endpoint configured');
      return throwError(() => new Error('Vault execution endpoint not configured'));
    }
    
    // Check authentication status before making the call
    const token = this.getAuthToken();
    if (!token) {
      console.error('[VaultService] No auth token available for command execution');
      return throwError(() => ({
        message: 'Authentication required',
        error: 'No authentication token available',
        code: 'AUTH_HEADER_MISSING'
      }));
    }
    
    return this.http
      .post<VaultCommandResponse>(`${VAULTS.EXECUTE}`, command)
      .pipe(
        // Use takeUntil to ensure observables complete when component is destroyed
        takeUntil(this.destroy$),
        tap(response => {
          console.log(`[VaultService] Command ${command.command} executed successfully:`, response);
        }),
        catchError((error) => {
          console.error(`[VaultService] Error executing command ${command.command}:`, error);
          
          // Enhanced error handling for authentication issues
          if (error.status === 401) {
            console.log('[VaultService] Authentication error detected, handling auth flow');
            
            // Log specific information about the request headers for debugging
            console.log('[VaultService] Request details:', {
              command: command.command,
              hasAuthToken: !!token,
              tokenLength: token ? token.length : 0,
              tokenPrefix: token ? token.substring(0, 10) + '...' : 'none'
            });
          }
          
          return this.handleVaultError(error, `executeCommand:${command.command}`);
        })
      );
  }
  
  /**
   * Helper method to get the current authentication token
   */
  private getAuthToken(): string | null {
    // Try getting the token from token storage service first
    const token = this.tokenStorage?.getToken();
    
    // Log token details for debugging
    console.log('[VaultService] Auth token for API call:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 10) + '...' : 'none',
      isGithubToken: token ? token.startsWith('gho_') : false
    });
    
    // If token is missing, try some recovery mechanisms
    if (!token) {
      console.warn('[VaultService] No token from token storage service, trying fallbacks');
      
      try {
        // First try direct localStorage access - might work if token service has issues 
        const rawToken = localStorage.getItem('auth_token');
        
        if (rawToken) {
          console.log('[VaultService] Found token via direct localStorage access');
          return rawToken;
        }
        
        // Try the session storage as another fallback
        const sessionToken = sessionStorage.getItem('auth_token');
        if (sessionToken) {
          console.log('[VaultService] Found token in session storage');
          return sessionToken;
        }
        
        // Check for GitHub tokens specifically - they might be stored differently
        const githubToken = localStorage.getItem('github_token');
        if (githubToken) {
          console.log('[VaultService] Found GitHub token in localStorage');
          return githubToken;
        }
        
        // Log issue for debugging
        console.error('[VaultService] Authentication token is missing, API call will fail');
      } catch (e) {
        console.error('[VaultService] Error in token fallback logic:', e);
      }
    }
    
    return token || null;
  }
  
  /**
   * Handles errors from vault API calls with specialized handling for authentication issues
   */
  private handleVaultError(error: HttpErrorResponse, operation: string): Observable<never> {
    console.error(`[VaultService] Error in ${operation}:`, error);
    
    // Check for authentication errors
    if (error.status === 401) {
      // Log specific details about the auth error
      if (error.error?.code === 'AUTH_HEADER_MISSING') {
        console.error('[VaultService] Authentication header missing in request');
      } else if (error.error?.code === 'INVALID_TOKEN') {
        console.error('[VaultService] Invalid authentication token provided');
      } else if (error.error?.code === 'TOKEN_EXPIRED') {
        console.error('[VaultService] Authentication token has expired');
      }
      
      // Let the ErrorHandlerService handle the auth flow (redirect to login, etc.)
      return this.errorHandler.handleHttpError(error, 'VaultService');
    }
    
    // Handle operation-specific errors
    if (operation === 'createVault' && error.status === 409) {
      return throwError(() => new Error('A vault with this name already exists'));
    }
    
    // For all other errors, delegate to the error handler service
    return this.errorHandler.handleHttpError(error, 'VaultService');
  }
}