import { Injectable, ErrorHandler, Inject, NgZone } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, Subject } from 'rxjs';
import { retry, catchError, delay } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';

export interface ErrorContext {
  timestamp: string;
  url: string;
  code: string;
  status: number;
  details?: any;
}

export interface AppError extends Error {
  context?: ErrorContext;
  code?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isNetworkError?: boolean;
  isAuthError?: boolean;
  isHandled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService implements ErrorHandler {
  // Subject for broadcasting error events to any interested components
  private errorEvents = new Subject<AppError>();
  errorEvents$ = this.errorEvents.asObservable();
  
  // Tracks if we're currently in the process of handling an auth error
  private handlingAuthError = false;
  
  // Standard retry configuration for network errors
  private defaultRetryConfig = {
    count: 2,
    delay: 1000,
    exponentialBackoff: true,
    maxDelay: 6000
  };
  
  constructor(
    private snackBar: MatSnackBar, 
    private router: Router,
    private ngZone: NgZone,
    @Inject(DOCUMENT) private document: Document
  ) {}

  /**
   * Implements Angular's ErrorHandler interface to catch all unhandled errors
   */
  handleError(error: any): void {
    // Make sure we handle errors inside NgZone to trigger change detection
    this.ngZone.run(() => {
      console.error('Global error handler caught unhandled error:', error);
      let appError: AppError;
      
      // Format the error consistently
      if (error instanceof HttpErrorResponse) {
        appError = this.formatHttpError(error, 'GlobalErrorHandler');
      } else if (error instanceof Error) {
        appError = error as AppError;
        appError.severity = 'medium';
        appError.code = 'unhandled_exception';
      } else {
        appError = new Error('An unknown error occurred') as AppError;
        appError.severity = 'medium';
        appError.code = 'unknown_error';
      }
      
      // Broadcast the error to any subscribers
      this.errorEvents.next(appError);
      
      // Show user-friendly message for uncaught errors
      if (!appError.isHandled) {
        this.showError('An unexpected error occurred. Please try again.', 5000);
      }
      
      // Log to monitoring service in production
      this.logError('Unhandled application error', appError);
    });
  }

  /**
   * Handles and formats HTTP errors with consistent error messages and logging
   * @param error The HTTP error response
   * @param serviceName Name of the service reporting the error (for logging)
   * @returns Observable that emits the formatted error
   */
  handleHttpError(error: HttpErrorResponse, serviceName: string): Observable<never> {
    // Format the error to our standard
    const appError = this.formatHttpError(error, serviceName);
    
    // Mark as handled so global handler doesn't show duplicate notifications
    appError.isHandled = true;
    
    // Handle network connectivity issues
    if (appError.isNetworkError) {
      // For network errors, component might want to retry
      console.warn(`[${serviceName}] Network error detected, components may retry`);
    }
    
    // Handle authentication issues
    if (appError.isAuthError && !this.handlingAuthError) {
      console.log(`[${serviceName}] Authentication error detected, handling auth flow`);
      this.handleUnauthorized();
    }
    
    // Broadcast the error to any subscribers
    this.errorEvents.next(appError);
    
    // Return a custom error object with additional context
    return throwError(() => appError);
  }
  
  /**
   * Formats an HTTP error into our standard AppError format
   */
  private formatHttpError(error: HttpErrorResponse, serviceName: string): AppError {
    let errorMessage = 'An error occurred';
    let errorCode = 'unknown_error';
    let severity: AppError['severity'] = 'medium';
    
    // Log the error for debugging purposes
    console.error(`[${serviceName}] Error details:`, error);
    
    // Check for network connectivity issues
    const isNetworkError = error.status === 0;
    const isAuthError = error.status === 401 || error.status === 403;
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
      errorCode = 'client_error';
      severity = 'medium';
    } else {
      // Server-side error
      if (error.error?.code) {
        errorCode = error.error.code;
      } else if (error.status) {
        errorCode = `http_${error.status}`;
      }
      
      // Determine severity based on status code
      if (error.status >= 500) {
        severity = 'high'; // Server errors are high priority
      } else if (error.status === 0) {
        severity = 'medium'; // Network errors are medium priority
      } else if (error.status === 401 || error.status === 403) {
        severity = 'medium'; // Auth errors are medium priority
      } else {
        severity = 'low'; // Client errors are low priority
      }
      
      // Check for HTML response by examining content-type header
      const contentType = error.headers?.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        errorMessage = 'The API server may be down or returning an error page.';
        errorCode = 'html_response';
        console.warn(`[${serviceName}] Received HTML instead of JSON response:`, {
          url: error.url,
          status: error.status,
          contentType
        });
      }
      // Handle JSON parse errors specifically
      else if (error.error instanceof SyntaxError && error.error.message.includes('JSON')) {
        errorMessage = 'The server response was not valid. This might indicate API issues.';
        errorCode = 'invalid_json';
        
        // Check for HTML response
        if (error.error.message.includes('Unexpected token \'<\'')) {
          errorMessage = 'The API server may be down or returning an error page.';
          errorCode = 'html_response';
        }
      } else {
        errorMessage = error.error?.message || this.getErrorMessage(error.status);
      }
    }

    // Add timestamp for logging/tracking purposes
    const errorContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: error.url || 'unknown',
      code: errorCode,
      status: error.status,
      details: error.error?.details
    };

    console.error(`[${serviceName}] Formatted error:`, { message: errorMessage, ...errorContext });
    
    // Create enhanced error object
    const enhancedError = new Error(errorMessage) as AppError;
    enhancedError.context = errorContext;
    enhancedError.code = errorCode;
    enhancedError.severity = severity;
    enhancedError.isNetworkError = isNetworkError;
    enhancedError.isAuthError = isAuthError;
    
    return enhancedError;
  }

  /**
   * Gets a user-friendly error message based on HTTP status code
   * @param status HTTP status code
   * @returns User-friendly error message
   */
  getErrorMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request - please check the data you submitted';
      case 401:
        return 'Invalid credentials or session expired';
      case 403:
        return 'Access denied - you do not have permission to access this resource';
      case 404:
        return 'Resource not found';
      case 409:
        return 'Conflict detected - this resource may already exist';
      case 422:
        return 'Validation error - please check your input';
      case 429:
        return 'Too many attempts - please try again later';
      case 500:
        return 'Server error - our team has been notified';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable - please try again later';
      default:
        return 'An unexpected error occurred';
    }
  }

  /**
   * Processes an error object and gets a user-friendly message
   * @param error Error object (can be of type AppError)
   * @param defaultMessage Default message to show if no specific message is found
   * @returns User-friendly error message
   */
  getDisplayErrorMessage(error: any, defaultMessage: string): string {
    if (!error) {
      return defaultMessage;
    }

    // Check if it's our enhanced error type
    if (error.code) {
      // Handle specific error codes
      switch (error.code) {
        case 'http_401':
          return 'Your session has expired. Please log in again.';
        case 'http_403':
          return 'You do not have permission to perform this action.';
        case 'http_404':
          return 'The requested resource could not be found.';
        case 'client_error':
          return 'Connection error. Please check your internet and try again.';
        default:
          return error.message || defaultMessage;
      }
    }

    // Regular error object
    return error.message || error.error?.message || defaultMessage;
  }

  /**
   * Creates a standardized retry configuration for HTTP requests
   * @param customConfig Optional custom retry settings
   */
  createRetryConfig(customConfig?: Partial<typeof this.defaultRetryConfig>) {
    const config = { ...this.defaultRetryConfig, ...customConfig };
    
    // Return a function that can be used with RxJS retry operator
    return (errors: Observable<any>) => {
      return errors.pipe(
        retry({
          count: config.count,
          delay: (error, retryCount) => {
            // Only retry network errors and 5xx server errors
            if (error.status !== 0 && (error.status < 500 || error.status >= 600)) {
              console.log(`Not retrying error with status ${error.status}`);
              return throwError(() => error);
            }
            
            // Calculate delay with exponential backoff if enabled
            let delayMs = config.delay;
            if (config.exponentialBackoff) {
              delayMs = Math.min(delayMs * Math.pow(2, retryCount - 1), config.maxDelay);
            }
            
            console.log(`Retrying after ${delayMs}ms (attempt ${retryCount}/${config.count})`);
            // Now we can use delay with the proper import
            return of(null).pipe(delay(delayMs));
          }
        })
      );
    };
  }

  /**
   * Shows an error message to the user via snackbar with standardized styling
   * @param message Error message to display
   * @param duration Duration to show the message (in ms)
   * @param severity Optional severity level that affects visual styling
   */
  showError(message: string, duration: number = 5000, severity: AppError['severity'] = 'medium'): void {
    // Choose CSS class based on severity
    let panelClass = ['error-snackbar'];
    
    switch (severity) {
      case 'critical':
        panelClass = ['error-snackbar', 'error-critical'];
        duration = 10000; // Critical errors stay longer
        break;
      case 'high':
        panelClass = ['error-snackbar', 'error-high'];
        duration = 7000; // High severity errors stay longer
        break;
      case 'medium':
        panelClass = ['error-snackbar', 'error-medium'];
        break;
      case 'low':
        panelClass = ['error-snackbar', 'error-low'];
        duration = 3000; // Low severity errors disappear faster
        break;
    }
    
    this.snackBar.open(message, 'Close', {
      duration,
      panelClass,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  /**
   * Show a network connectivity error with options to retry
   * @param message Error message
   * @param retryCallback Optional callback function if user wants to retry
   */
  showNetworkError(message: string = 'Network connectivity issue. Please check your connection.', 
                   retryCallback?: () => void): void {
    const snackBarRef = this.snackBar.open(message, 'Retry', {
      duration: 10000,
      panelClass: ['error-snackbar', 'network-error'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
    
    if (retryCallback) {
      snackBarRef.onAction().subscribe(() => {
        console.log('User requested retry after network error');
        retryCallback();
      });
    }
  }

  /**
   * Logs an error for debugging and tracking
   * @param message The main error message
   * @param context Additional context about the error
   */
  logError(message: string, context: any = {}): void {
    const timestamp = new Date().toISOString();
    const errorLog = {
      timestamp,
      message,
      appVersion: '1.0.0', // Should be automatically pulled from environment
      browser: this.getBrowserInfo(),
      url: this.document.location.href,
      ...context
    };
    
    console.error('[ErrorHandler] Error logged:', errorLog);
    
    // In a production app, we would send this to a monitoring service
    // like Sentry, LogRocket, etc.
    // For example:
    // if (environment.production) {
    //   Sentry.captureException(context instanceof Error ? context : new Error(message), {
    //     extra: errorLog
    //   });
    // }
  }
  
  /**
   * Get browser information for error logging
   */
  private getBrowserInfo(): string {
    // Simple browser detection for logging
    const userAgent = this.document.defaultView?.navigator.userAgent || 'Unknown';
    
    if (userAgent.indexOf('Firefox') !== -1) {
      return `Firefox ${userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || ''}`;
    } else if (userAgent.indexOf('Chrome') !== -1) {
      return `Chrome ${userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || ''}`;
    } else if (userAgent.indexOf('Safari') !== -1) {
      return `Safari ${userAgent.match(/Version\/([0-9.]+)/)?.[1] || ''}`;
    } else if (userAgent.indexOf('Edge') !== -1) {
      return `Edge ${userAgent.match(/Edge\/([0-9.]+)/)?.[1] || ''}`;
    } else {
      return userAgent;
    }
  }

  /**
   * Handles unauthorized errors (401)
   * Redirects to login and shows appropriate message
   */
  handleUnauthorized(): void {
    // Prevent multiple redirects
    if (this.handlingAuthError) {
      return;
    }
    
    this.handlingAuthError = true;
    console.log('Handling unauthorized error, redirecting to login');
    
    // Clear all auth-related data from local storage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('github_oauth_state');
    localStorage.removeItem('github_state');
    localStorage.removeItem('github_state_created');
    
    // Clear session storage items too
    sessionStorage.removeItem('auth_check_in_progress');
    sessionStorage.removeItem('auth_check_start_time');
    sessionStorage.removeItem('auth_check_id');
    sessionStorage.removeItem('auth_fail_count');
    
    // Navigate to login with a message
    this.ngZone.run(() => {
      this.router.navigate(['/login'], { 
        queryParams: { 
          error: 'session_expired' 
        }
      }).then(() => {
        this.showError('Your session has expired. Please log in again.', 5000, 'medium');
        
        // Reset the flag after a delay to allow for potential failed redirects
        setTimeout(() => {
          this.handlingAuthError = false;
        }, 5000);
      }).catch(err => {
        console.error('Error navigating to login:', err);
        this.handlingAuthError = false;
      });
    });
  }
}
