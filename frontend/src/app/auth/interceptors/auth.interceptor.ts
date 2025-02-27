import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, EMPTY, Subject } from 'rxjs';
import { catchError, filter, take, switchMap, finalize, takeUntil, timeout } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser } from '@angular/common';
import { TokenStorageService } from '../services/token/token-storage.service';

export interface AuthInterceptorConfig {
  useCookies: boolean;
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor, OnDestroy {
  private destroy$ = new Subject<void>();
  private isRefreshing = false;
  
  // Configuration for the interceptor
  private authConfig: AuthInterceptorConfig = {
    useCookies: true // Default to using cookies
  };

  constructor(
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private tokenStorage: TokenStorageService
  ) {
    // Subscribe to auth state changes to update our configuration
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAuthenticated => {
        if (!isAuthenticated) {
          // Reset refresh state when auth state changes to not authenticated
          this.isRefreshing = false;
        }
      });
    
    // Default to using cookies for auth
    this.authConfig.useCookies = true;
    console.log('Auth interceptor initialized with cookies enabled');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Public method to configure the interceptor
  configure(config: Partial<AuthInterceptorConfig>): void {
    this.authConfig = { ...this.authConfig, ...config };
    console.log(`Auth interceptor configured with: ${JSON.stringify(this.authConfig)}`);
  }

  intercept(
    request: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {
    // Skip auth for specific endpoints
    if (this.shouldSkipAuth(request.url) || this.isPublicAuthRoute(request.url)) {
      console.debug(`[AUTH INTERCEPTOR] Skipping auth for public endpoint: ${request.url}`);
      return next.handle(request.clone({ withCredentials: true }));
    }

    console.log(`[AUTH INTERCEPTOR] Processing authenticated request: ${request.url}`);
    
    // Check if the request already has an Authorization header
    if (request.headers.has('Authorization')) {
      console.log(`[AUTH INTERCEPTOR] Request already has Authorization header: ${request.url}`);
      return next.handle(request.clone({ withCredentials: true }));
    }
    
    // Get token from storage for non-public endpoints
    const token = this.getAuthToken();
    
    // Enhanced debugging for the request url and token
    console.log(`[AUTH INTERCEPTOR] Auth token for ${request.url}:`, {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenStart: token ? token.substring(0, 10) + '...' : 'null',
      url: request.url,
      method: request.method
    });
    
    // Create a clone of the request with the token if available
    const modifiedRequest = this.addAuthorizationHeader(request, token);
    
    // Log the final request headers for debugging
    console.log(`[AUTH INTERCEPTOR] Final request headers for ${request.url}:`, {
      hasAuthHeader: modifiedRequest.headers.has('Authorization'),
      authHeader: modifiedRequest.headers.has('Authorization') ? 
        modifiedRequest.headers.get('Authorization')?.substring(0, 20) + '...' : 'None',
      allHeaders: Array.from(modifiedRequest.headers.keys())
    });
    
    return next.handle(modifiedRequest).pipe(
      catchError((error) => {
        if (
          error instanceof HttpErrorResponse &&
          error.status === 401 &&
          !request.url.includes('login')
        ) {
          console.log(`[AUTH INTERCEPTOR] Handling 401 for ${request.url}`);
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Add Authorization header to the request with a simpler, more reliable approach
   */
  private addAuthorizationHeader(request: HttpRequest<any>, token: string | null): HttpRequest<any> {
    // Always include credentials for all requests
    let modifiedRequest = request.clone({ withCredentials: true });
    
    // If we don't have a token, just return the request with credentials
    if (!token) {
      console.warn(`[AUTH INTERCEPTOR] No token available for authenticated request: ${request.url}`);
      return modifiedRequest;
    }
    
    console.log(`[AUTH INTERCEPTOR] Adding token to request: ${request.url} (Token: ${token.substring(0, 10)}...)`);
    
    try {
      // Use the simpler and more direct approach with setHeaders
      const authHeader = `Bearer ${token}`;
      
      // Create a completely new request with the Authorization header
      modifiedRequest = request.clone({
        setHeaders: {
          Authorization: authHeader
        },
        withCredentials: true
      });
      
      // Verify and log the header status
      const hasHeader = modifiedRequest.headers.has('Authorization');
      const finalHeader = modifiedRequest.headers.get('Authorization');
      console.log(`[AUTH INTERCEPTOR] Header verification:`, {
        headerAdded: hasHeader,
        finalHeader: finalHeader ? finalHeader.substring(0, 20) + '...' : 'none',
        method: request.method,
        url: request.url
      });
      
      if (!hasHeader) {
        console.error(`[AUTH INTERCEPTOR] Failed to add Authorization header to ${request.url}`);
      }
      
      return modifiedRequest;
    } catch (error) {
      console.error('[AUTH INTERCEPTOR] Error adding token to request:', error);
      // Return the original request with credentials in case of error
      return modifiedRequest;
    }
  }

  private getAuthToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[AUTH INTERCEPTOR] Not in browser environment, cannot get token');
      return null;
    }
    
    // Try getting token from storage first
    let token = this.tokenStorage.getToken();
    console.log('[AUTH INTERCEPTOR] Token from storage:', token ? `${token.substring(0, 10)}...` : 'null');
    
    // If not found, try from the auth service
    if (!token) {
      token = this.authService.getToken();
      console.log('[AUTH INTERCEPTOR] Token from auth service:', token ? `${token.substring(0, 10)}...` : 'null');
    }
    
    // Validate token before returning
    if (token && token.trim() !== '') {
      console.log('[AUTH INTERCEPTOR] Valid token found, length:', token.length);
      return token;
    }
    
    console.warn('[AUTH INTERCEPTOR] No valid token found for request');
    return null;
  }

  private shouldSkipAuth(url: string): boolean {
    // Normalize URLs for better comparison
    const normalizedUrl = url.toLowerCase();
    const apiUrl = environment.apiUrl.toLowerCase();
    
    // Skip auth for non-API endpoints
    // Make sure we're checking all types of API URLs
    if (normalizedUrl.includes('/api/') || 
        normalizedUrl.includes('localhost:3000/api') || 
        normalizedUrl.includes(apiUrl)) {
      // This is an API endpoint that should have auth
      console.log(`[AUTH INTERCEPTOR] API endpoint detected, should include auth: ${url}`);
      return false;
    }
    
    console.log(`[AUTH INTERCEPTOR] Non-API endpoint, skipping auth: ${url}`);
    return true;
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Log the unauthorized request for debugging
    console.log('[AUTH INTERCEPTOR] 401 Unauthorized error:', {
      url: request.url,
      method: request.method,
      hasAuthHeader: request.headers.has('Authorization'),
      isPublicRoute: this.isPublicAuthRoute(request.url),
      isRefreshing: this.isRefreshing
    });
    
    // If we're already refreshing, wait for it to complete
    if (this.isRefreshing) {
      console.log('[AUTH INTERCEPTOR] Refresh already in progress, waiting for it to complete');
      // Wait for refresh to complete before retrying
      return this.authService.user$.pipe(
        filter(user => !!user),
        take(1),
        switchMap(() => {
          console.log('[AUTH INTERCEPTOR] Refresh completed, retrying request');
          // Get fresh token
          const newToken = this.getAuthToken();
          
          // Create new request with the fresh token
          const authReq = this.addAuthorizationHeader(request, newToken);
          
          return next.handle(authReq);
        })
      );
    }
    
    // Start the token refresh process
    this.isRefreshing = true;
    console.log('[AUTH INTERCEPTOR] Starting token refresh');
    
    // Attempt to refresh the token
    return this.authService.refreshToken().pipe(
      switchMap((response) => {
        console.log('[AUTH INTERCEPTOR] Token refreshed, retrying original request');
        this.isRefreshing = false;
        
        // Get the new token
        const newToken = response.token;
        if (!newToken) {
          return throwError(() => new Error('Refresh succeeded but no token returned'));
        }
        
        // Create a new request with the new token
        const authReq = this.addAuthorizationHeader(request, newToken);
        
        // Log final request state for debugging
        console.log(`[AUTH INTERCEPTOR] Retrying request after refresh: ${authReq.url}`, {
          hasAuthHeader: authReq.headers.has('Authorization')
        });
        
        // Retry the request with the new token
        return next.handle(authReq);
      }),
      catchError(error => {
        this.isRefreshing = false;
        
        // If refresh fails, clear auth state and redirect to login
        console.error('[AUTH INTERCEPTOR] Token refresh failed:', error);
        this.authService.logout();
        
        return throwError(() => error);
      }),
      finalize(() => {
        this.isRefreshing = false;
      })
    );
  }

  private isPublicAuthRoute(url: string): boolean {
    const publicRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh-token',
      '/auth/password-reset/request',
      '/auth/password-reset/confirm',
      '/auth/github/callback',
      '/auth/github/login',
      // Include paths with /api prefix as well
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh-token',
      '/api/auth/github/callback',
      '/api/auth/github/login',
      // Add health endpoint
      '/api/health'
    ];

    const isPublic = publicRoutes.some(route => 
      url.toLowerCase().includes(route.toLowerCase())
    );

    // Only log in development to reduce console noise
    if (!environment.production) {
      console.debug('[AUTH INTERCEPTOR] Route check:', {
        url,
        isPublic
      });
    }

    return isPublic;
  }
}
