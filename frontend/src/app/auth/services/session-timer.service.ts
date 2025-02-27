import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription, Observable, timer } from 'rxjs';
import { AuthService } from './auth.service';
import { JwtHelperService } from '@auth0/angular-jwt';

/**
 * Service to manage auth session timers and inactivity detection
 * Can be used to:
 * - Warn about session expiration before tokens expire
 * - Force logout on inactivity
 * - Schedule token refresh before expiration
 */
@Injectable({
  providedIn: 'root'
})
export class SessionTimerService implements OnDestroy {
  // Constant values for timing (all in milliseconds)
  private readonly INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly WARN_BEFORE_EXPIRY = 2 * 60 * 1000; // 2 minutes
  private readonly REFRESH_BEFORE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute

  private lastActivity: number = Date.now();
  private timerSubscription: Subscription | null = null;
  private tokenExpirySubscription: Subscription | null = null;
  private jwtHelper = new JwtHelperService();
  
  // Observable for components to subscribe to warnings
  private sessionWarningSubject = new BehaviorSubject<number>(0);
  public sessionWarning$ = this.sessionWarningSubject.asObservable();
  
  // Session expiring warning flag
  private isSessionWarningActive = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Only set up timers in browser environment
    if (isPlatformBrowser(this.platformId)) {
      this.setupActivityTracking();
      this.startTimers();
      
      // When auth state changes, restart timers
      this.authService.authState$.subscribe((isAuthenticated: boolean) => {
        if (isAuthenticated) {
          this.startTimers();
        } else {
          this.stopTimers();
        }
      });
    }
  }

  /**
   * Set up activity tracking based on user interactions
   */
  private setupActivityTracking(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      // Track user activity
      const activityEvents = ['mousedown', 'keypress', 'scroll', 'click', 'touchstart'];
      
      activityEvents.forEach(eventName => {
        window.addEventListener(eventName, () => this.resetActivityTimer());
      });
      
      // Initial activity timestamp
      this.resetActivityTimer();
    } catch (error) {
      console.error('Error setting up activity tracking:', error);
    }
  }

  /**
   * Reset the activity timer when user interacts with the app
   */
  public resetActivityTimer(): void {
    this.lastActivity = Date.now();
    
    // If a warning was active, dismiss it as the user is active again
    if (this.isSessionWarningActive) {
      this.isSessionWarningActive = false;
      this.sessionWarningSubject.next(0);
    }
  }

  /**
   * Start all timer-related processes
   */
  private startTimers(): void {
    this.stopTimers(); // Clear existing timers first
    
    // Only in browser context
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Set token expiry timer based on current token
    this.setTokenExpiryTimer();
    
    // Check session status periodically
    this.timerSubscription = timer(this.CHECK_INTERVAL, this.CHECK_INTERVAL)
      .subscribe(() => {
        this.checkSessionStatus();
      });
  }

  /**
   * Stop all timers
   */
  private stopTimers(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
    
    if (this.tokenExpirySubscription) {
      this.tokenExpirySubscription.unsubscribe();
      this.tokenExpirySubscription = null;
    }
  }

  /**
   * Check the current session status
   * Handles inactivity and token expiration
   */
  private checkSessionStatus(): void {
    // Skip if not authenticated
    if (!this.authService.isAuthenticated) {
      return;
    }
    
    const now = Date.now();
    const inactiveTime = now - this.lastActivity;
    
    // Force logout if user has been inactive too long
    if (inactiveTime >= this.INACTIVITY_TIMEOUT) {
      console.log('Logging out due to inactivity');
      this.logout('Your session has expired due to inactivity');
      return;
    }
    
    // Check token expiration and handle it
    this.checkTokenExpiration();
  }

  /**
   * Set a timer based on token expiration
   */
  private setTokenExpiryTimer(): void {
    // Clear existing timer first
    if (this.tokenExpirySubscription) {
      this.tokenExpirySubscription.unsubscribe();
      this.tokenExpirySubscription = null;
    }
    
    // Get token and check if it's valid
    const token = this.authService.getToken();
    if (!token) {
      return;
    }
    
    try {
      // Calculate when to refresh (if close to expiry)
      const expiryDate = this.jwtHelper.getTokenExpirationDate(token);
      if (!expiryDate) {
        return;
      }
      
      const expiryTime = expiryDate.getTime();
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      // If already expired, logout
      if (timeUntilExpiry <= 0) {
        this.logout('Your session has expired');
        return;
      }
      
      // Calculate when to refresh (before expiry)
      const refreshTime = Math.max(0, timeUntilExpiry - this.REFRESH_BEFORE_EXPIRY);
      const warningTime = Math.max(0, timeUntilExpiry - this.WARN_BEFORE_EXPIRY);
      
      // Set timer for token refresh
      if (refreshTime > 0) {
        setTimeout(() => {
          this.refreshToken();
        }, refreshTime);
      }
      
      // Set timer for warning
      if (warningTime > 0) {
        setTimeout(() => {
          this.warnAboutExpiry(Math.floor(timeUntilExpiry / 1000));
        }, warningTime);
      }
    } catch (error) {
      console.error('Error calculating token expiry:', error);
    }
  }

  /**
   * Check if the token is close to expiring and handle it
   */
  private checkTokenExpiration(): void {
    const token = this.authService.getToken();
    if (!token) {
      return;
    }
    
    try {
      const expiryDate = this.jwtHelper.getTokenExpirationDate(token);
      if (!expiryDate) {
        return;
      }
      
      const expiryTime = expiryDate.getTime();
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      // If token is expired, logout
      if (timeUntilExpiry <= 0) {
        this.logout('Your session has expired');
        return;
      }
      
      // If token is close to expiring, refresh it
      if (timeUntilExpiry <= this.REFRESH_BEFORE_EXPIRY) {
        this.refreshToken();
      }
      
      // If token is close to expiring, warn user
      if (timeUntilExpiry <= this.WARN_BEFORE_EXPIRY && !this.isSessionWarningActive) {
        this.warnAboutExpiry(Math.floor(timeUntilExpiry / 1000));
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  }

  /**
   * Refresh the JWT token
   */
  private refreshToken(): void {
    // Only refresh if authenticated
    if (!this.authService.isAuthenticated) {
      return;
    }
    
    console.log('Proactively refreshing token before expiry');
    this.authService.refreshToken().subscribe({
      next: () => {
        console.log('Token refreshed successfully');
        this.setTokenExpiryTimer(); // Reset timer with new token
      },
      error: (error) => {
        console.error('Failed to refresh token:', error);
        // For critical errors, force logout
        if (error?.status === 401 || error?.code === 'REFRESH_TOKEN_EXPIRED') {
          this.logout('Your session has expired. Please log in again.');
        }
      }
    });
  }

  /**
   * Warn the user about upcoming session expiry
   * @param secondsRemaining Seconds until the token expires
   */
  private warnAboutExpiry(secondsRemaining: number): void {
    if (secondsRemaining <= 0) {
      this.logout('Your session has expired');
      return;
    }
    
    // Set warning state and emit to subscribers
    this.isSessionWarningActive = true;
    this.sessionWarningSubject.next(secondsRemaining);
    
    console.log(`Session expiring in ${secondsRemaining} seconds`);
  }

  /**
   * Force logout due to session expiry or inactivity
   */
  private logout(message: string): void {
    // Clear warning state
    this.isSessionWarningActive = false;
    this.sessionWarningSubject.next(0);
    
    // Log the user out
    this.authService.logout();
    
    // Navigate to login with message
    this.router.navigate(['/login'], { 
      queryParams: { 
        message: message,
        expired: 'true'
      } 
    });
  }

  /**
   * Manually extend the session (e.g., when user clicks "Keep me logged in" button)
   */
  public extendSession(): void {
    this.resetActivityTimer();
    this.refreshToken();
    
    // Clear any active warnings
    this.isSessionWarningActive = false;
    this.sessionWarningSubject.next(0);
  }

  /**
   * Get time until session expiry based on token expiration
   * @returns Time in seconds until token expires or null if can't determine
   */
  public getTimeUntilExpiry(): number | null {
    const token = this.authService.getToken();
    if (!token) {
      return null;
    }
    
    try {
      const expiryDate = this.jwtHelper.getTokenExpirationDate(token);
      if (!expiryDate) {
        return null;
      }
      
      const expiryTime = expiryDate.getTime();
      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      
      // Return seconds remaining (or 0 if already expired)
      return Math.max(0, Math.floor(timeUntilExpiry / 1000));
    } catch (error) {
      console.error('Error calculating time until expiry:', error);
      return null;
    }
  }

  /**
   * Clean up resources when service is destroyed
   */
  ngOnDestroy(): void {
    this.stopTimers();
  }
} 