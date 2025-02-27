import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { Observable, firstValueFrom, of } from 'rxjs';
import { take, map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  async canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    try {
      // Skip all checks in non-browser environment
      if (typeof window === 'undefined') {
        console.log('Auth guard running in SSR, allowing all routes');
        return true;
      }
      
      // Extract public page paths that don't need auth
      const isPublicPage = ['/home', '/docs', '/faq', '/blog', '/about'].includes(state.url);
      
      // Public pages are always accessible regardless of auth state
      if (isPublicPage) {
        console.log('Public page access allowed');
        return true;
      }
      
      // Fix: Check exact paths for login and register
      const isLoginPage = state.url === '/login' || state.url.startsWith('/login?');
      const isRegisterPage = state.url === '/register' || state.url.startsWith('/register?');
      
      // Check if user is already authenticated - only do this once
      const isAuthenticated = this.authService.isAuthenticated();
      
      // For login routes only, redirect to dashboard if already authenticated
      // Allow access to register page even when authenticated
      if (isLoginPage && isAuthenticated) {
        console.log('User already authenticated, redirecting away from login');
        this.router.navigate(['/vaults']);
        return false;
      }
      
      // For protected routes, check authentication
      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login');
        this.redirectToLogin(state.url);
        return false;
      }
      
      // Check for required roles if specified
      const requiredRoles = route.data['roles'] as string[];
      if (requiredRoles && requiredRoles.length > 0) {
        // Get the current user to check their role
        try {
          const currentUser = await firstValueFrom(
            this.authService.user$.pipe(take(1))
          );
          
          // If we have no user data despite being authenticated
          if (!currentUser) {
            console.log('No user data available, attempting to load profile');
            // Try to get the user profile
            const userProfile = await firstValueFrom(
              this.authService.getUserProfile().pipe(
                take(1),
                catchError(error => {
                  console.error('Error loading user profile in guard:', error);
                  // Don't redirect to login if there's a network error
                  if (error.status === 0) {
                    console.log('Network error detected, maintaining auth state');
                    return of(null);
                  }
                  
                  // Only redirect for actual authentication errors
                  if (error.status === 401) {
                    this.redirectToLogin(state.url);
                  }
                  return of(null);
                })
              )
            );
            
            // If we still don't have user data but not due to auth error
            // allow access rather than redirect (prevents logout loops)
            if (!userProfile) {
              console.log('Could not load user profile, but will allow access to preserve session');
              return true;
            }
            
            // Check if user has the required role
            if (this.checkUserHasRequiredRole(userProfile, requiredRoles)) {
              return true;
            } else {
              console.log('User does not have required role, redirecting to unauthorized');
              this.router.navigate(['/unauthorized']);
              return false;
            }
          }
          
          // Check if the user has the required role
          if (this.checkUserHasRequiredRole(currentUser, requiredRoles)) {
            return true;
          } else {
            console.log('User does not have required role, redirecting to unauthorized');
            this.router.navigate(['/unauthorized']);
            return false;
          }
        } catch (error) {
          console.error('Error checking user roles:', error);
          // Don't redirect for errors - maintain auth state when in doubt
          return true;
        }
      }
      
      // If we get here, the user is authenticated and no roles are required
      return true;
    } catch (error) {
      console.error('Error in auth guard:', error);
      // For stability, allow access during unexpected errors rather than redirect
      return true;
    }
  }
  
  /**
   * Check if a user has any of the required roles
   */
  private checkUserHasRequiredRole(user: User, requiredRoles: string[]): boolean {
    // If no user or no role in user object, deny access
    if (!user || !user.role) {
      return false;
    }
    
    // Check if the user's role is in the list of required roles
    return requiredRoles.includes(user.role);
  }

  private redirectToLogin(returnUrl: string): void {
    // Prevent redirect loops - always check current URL
    const currentUrl = this.router.url;
    
    // If already on login or register page, don't redirect again
    if (currentUrl === '/login' || currentUrl === '/register') {
      console.log('Already on login/register page, not redirecting');
      return;
    }
    
    // Don't redirect to login from public pages
    if (['/home', '/docs', '/faq', '/blog', '/about'].includes(currentUrl)) {
      console.log('On public page, not redirecting to login');
      return;
    }
    
    // To prevent loops, navigate directly to home page
    // This is simpler than trying to maintain return URLs which can cause problems
    this.router.navigate(['/home']);
  }
}
