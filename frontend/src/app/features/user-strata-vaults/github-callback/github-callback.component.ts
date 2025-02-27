import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { VaultService } from '../vault.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil, timer, catchError, EMPTY } from 'rxjs';

@Component({
  selector: 'app-github-callback',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="strata-callback-container">
      <div class="excavation-spinner" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <p>{{ loadingMessage }}</p>
      </div>
      <div class="erosion-container" *ngIf="error">
        <div class="erosion-message">
          {{ error }}
        </div>
        <div class="stratum-redirect" *ngIf="redirectCountdown > 0">
          Shifting strata in {{ redirectCountdown }} seconds...
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .strata-callback-container {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        text-align: center;
        padding: 2rem;
        background: #f5f5f5;
      }
      .excavation-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .erosion-container {
        padding: 2rem;
        border-radius: 8px;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .erosion-message {
        color: #d32f2f;
        background: #ffebee;
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
      }
      .stratum-redirect {
        color: #666;
        font-size: 0.9em;
      }
    `,
  ],
})
export class GithubCallbackComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  loadingMessage = 'Excavating GitHub credentials...';
  redirectCountdown = 3;
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vaultService: VaultService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    // Clean up any lingering auth state checks to prevent conflicts
    sessionStorage.removeItem('auth_check_in_progress');
    sessionStorage.removeItem('auth_check_start_time');
    
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        console.log('GitHub stratum callback parameters received:', Object.keys(params));
        
        if (params['error']) {
          this.handleErosion('GitHub stratum access was denied: ' + (params['error_description'] || params['error']));
          return;
        }

        // Handle token directly from URL (e.g. from backend redirect)
        if (params['token']) {
          console.log('Token received directly in stratum params');
          
          try {
            if (!params['token'] || typeof params['token'] !== 'string') {
              this.handleErosion('Invalid token format received');
              return;
            }
            
            // Extract user data if available
            let userData = null;
            if (params['userData']) {
              try {
                const decodedUserData = atob(params['userData']);
                userData = JSON.parse(decodedUserData);
                console.log('Successfully decoded user data from stratum params');
              } catch (e) {
                console.error('Error decoding user data:', e);
              }
            }
            
            this.loadingMessage = 'Connecting to GitHub stratum...';
            
            // Store token with multiple storage attempts for reliability
            localStorage.setItem('auth_token', params['token']);
            if (params['refreshToken']) {
              localStorage.setItem('refresh_token', params['refreshToken']);
            }
            
            // Verify token storage
            const timeoutId1 = window.setTimeout(() => {
              const storedToken = localStorage.getItem('auth_token');
              if (!storedToken) {
                console.error('Token storage failed, retrying');
                localStorage.setItem('auth_token', params['token']);
              }
              
              this.loading = false;
              this.showStratumSuccess();
              
              const timeoutId2 = window.setTimeout(() => {
                this.router.navigate(['/vaults'], { replaceUrl: true });
              }, 1000);
              this.timeoutIds.push(timeoutId2);
            }, 200);
            this.timeoutIds.push(timeoutId1);
            
            return;
          } catch (error) {
            console.error('Error processing token from stratum params:', error);
            this.handleErosion('Error processing GitHub credentials');
            return;
          }
        }

        const { code, state } = params;
        if (!code || !state) {
          this.handleErosion('Invalid stratum parameters');
          return;
        }

        this.excavateAuthentication(code, state);
      });
  }

  private excavateAuthentication(code: string, state: string) {
    this.loadingMessage = 'Validating stratum credentials...';
    
    // Add retry mechanism for robustness
    let retryCount = 0;
    const maxRetries = 2;
    
    const attemptExcavation = () => {
      this.vaultService
        .handleGithubCallback(code, state)
        .pipe(
          takeUntil(this.destroy$),
          catchError(error => {
            // Retry on network errors
            if (error.status === 0 && retryCount < maxRetries) {
              retryCount++;
              console.log(`Network error, retrying excavation (${retryCount}/${maxRetries})...`);
              this.loadingMessage = `Connection issue, retrying excavation (${retryCount}/${maxRetries})...`;
              setTimeout(attemptExcavation, retryCount * 1000);
              return EMPTY;
            }
            throw error;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('GitHub stratum connection successful');
            this.loading = false;
            
            if (!response.token) {
              this.handleErosion('Missing authentication token from GitHub');
              return;
            }
            
            // Verify token was stored properly
            const verifyTimeoutId = window.setTimeout(() => {
              const storedToken = localStorage.getItem('auth_token');
              if (!storedToken) {
                console.warn('Token storage check failed, storing directly');
                localStorage.setItem('auth_token', response.token);
              }
              
              this.showStratumSuccess();
              const navTimeoutId = window.setTimeout(() => {
                this.router.navigate(['/vaults'], { replaceUrl: true });
              }, 1000);
              this.timeoutIds.push(navTimeoutId);
            }, 200);
            this.timeoutIds.push(verifyTimeoutId);
          },
          error: (error) => {
            console.error('GitHub excavation error:', error);
            this.handleErosion(
              error.message || 'Failed to excavate GitHub stratum'
            );
          },
        });
    };
    
    // Start the authentication process
    attemptExcavation();
  }

  private showStratumSuccess() {
    this.snackBar.open('Successfully excavated GitHub stratum', 'Close', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  private handleErosion(message: string) {
    this.loading = false;
    this.error = message;

    timer(0, 1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.redirectCountdown > 0) {
          this.redirectCountdown--;
        } else {
          this.router.navigate(['/vaults']);
        }
      });
  }

  private timeoutIds: number[] = [];

  ngOnDestroy() {
    // Clear any pending timeouts
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    
    this.destroy$.next();
    this.destroy$.complete();
  }
}
