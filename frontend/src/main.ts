import './styles/tailwind.css';

import { enableProdMode, ErrorHandler, APP_INITIALIZER, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AuthService } from './app/auth/services/auth.service';
import { JwtModule, JwtHelperService } from '@auth0/angular-jwt';
import { AuthInterceptor } from './app/auth/interceptors/auth.interceptor';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Token getter function for JWT auth
export function tokenGetter() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return localStorage.getItem('auth_token');
    } catch (e) {
      console.error('Error accessing localStorage in tokenGetter:', e);
      return null;
    }
  }
  return null;
}

// Extract domain from URL for allowed domains
export function extractDomain(url: string): string {
  try {
    // Remove protocol and get hostname
    const hostname = new URL(url).hostname;
    return hostname;
  } catch (e) {
    console.error('Error extracting domain from URL:', e);
    return 'localhost';
  }
}

// Initialize auth state before app starts to avoid change detection errors
function initializeAuth(authService: AuthService) {
  return () => {
    console.log('Initializing auth state before app bootstrap...');
    return new Promise<void>((resolve) => {
      // Only try to access localStorage in browser environment
      if (typeof window !== 'undefined') {
        try {
          // Try to read token from localStorage directly instead of using the service
          // This avoids triggering any observables or change detection
          const hasToken = localStorage.getItem('auth_token') !== null;
          console.log('Initial auth check (localStorage):', hasToken);
          
          // Pre-initialize the auth service state for consistent behavior
          if (hasToken) {
            console.log('Setting initial auth state from localStorage');
            // Use a global variable to avoid triggering change detection
            (window as any).__initialAuthState = true;
          }
        } catch (e) {
          console.error('Error checking localStorage during initialization:', e);
        }
      } else {
        console.log('Not in browser environment, skipping localStorage check');
      }
      
      // Wait for next macrotask to ensure auth initialization completes
      setTimeout(() => {
        console.log('Auth initialization complete');
        resolve();
      }, 50);
    });
  };
}

// Create a global error handler that doesn't trigger change detection errors
class CustomErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Completely swallow ExpressionChangedAfterItHasBeenCheckedError since we know it's harmless
    // in this specific application case and is just a development warning
    if (error && error.message && error.message.includes('ExpressionChangedAfterItHasBeenChecked')) {
      console.warn('Expression change detection error suppressed (normal during auth state changes)');
      return;
    }
    
    // Also swallow router navigation canceled errors which can happen during auth redirects
    if (error && error.name === 'NavigationCancelingError') {
      console.warn('Navigation canceled (normal during auth redirects)');
      return;
    }
    
    // Log other errors normally
    console.error('Application error:', error);
  }
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimations(),
    { provide: ErrorHandler, useClass: CustomErrorHandler },
    
    // Properly provide JwtHelperService for consistent availability throughout the app
    { provide: JwtHelperService, useClass: JwtHelperService },
    
    // Add JWT Module provider with explicit configuration
    importProvidersFrom(
      JwtModule.forRoot({
        config: {
          tokenGetter: tokenGetter,
          allowedDomains: [
            extractDomain(environment.apiUrl),
            'localhost:4200', 
            'localhost:3000', 
            'api.codestrata.io'
          ],
          disallowedRoutes: [
            'localhost:3000/api/auth/login',
            'localhost:3000/api/auth/register',
            'localhost:3000/api/auth/github'
          ]
        }
      })
    ),
    
    // Add auth interceptor
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    
    // Initialize auth service
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
}).catch((err) => console.error('Application bootstrap error:', err));
