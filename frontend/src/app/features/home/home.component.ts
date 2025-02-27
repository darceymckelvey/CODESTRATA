// src/app/features/home/home.component.ts
import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService, User } from '../../auth/services/auth.service';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  authState$: Observable<boolean>;
  private destroy$ = new Subject<void>();

  isLoading = false;
  isAuthenticated = false;
  username = '';
  userRole: string | null = null;
  isPlatformBrowser = false; // For template usage

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize authentication directly in constructor - SSR safe
    this.isPlatformBrowser = isPlatformBrowser(this.platformId);
    
    if (this.isPlatformBrowser) {
      try {
        this.isAuthenticated = localStorage.getItem('auth_token') !== null;
      } catch (e) {
        console.warn('Error accessing localStorage:', e);
        this.isAuthenticated = false;
      }
    } else {
      // Server-side rendering - no localStorage access
      console.log('Server-side rendering detected, skipping browser-only operations');
      this.isAuthenticated = false;
    }
    
    this.authState$ = this.authService.authState$;
  }

  ngOnInit() {
    // Authentication state already initialized in constructor
    
    // Get query parameters to check for login action - SSR safe approach
    if (isPlatformBrowser(this.platformId)) {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const action = queryParams.get('action');
        const returnUrl = queryParams.get('returnUrl');
        
        // If action is 'login', redirect to login page
        if (action === 'login') {
          setTimeout(() => {
            if (returnUrl) {
              this.router.navigate(['/login'], { queryParams: { returnUrl }});
            } else {
              this.router.navigate(['/login']);
            }
          }, 100);
        }
      } catch (e) {
        console.error('Error processing query parameters:', e);
      }
    } else {
      // Server-side rendering path - no window object available
      console.log('Running in SSR mode, skipping window.location access');
    }
    
    // Handle route query params
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['action'] === 'login') {
        const returnUrl = params['returnUrl'];
        if (isPlatformBrowser(this.platformId)) {
          setTimeout(() => {
            if (returnUrl) {
              this.router.navigate(['/login'], { queryParams: { returnUrl }});
            } else {
              this.router.navigate(['/login']);
            }
          }, 100);
        }
      }
    });
    
    // Subscribe to auth state changes outside Angular zone to avoid detection issues
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.authService.authState$
          .pipe(takeUntil(this.destroy$))
          .subscribe(isAuthenticated => {
            if (this.isAuthenticated !== isAuthenticated) {
              // Run inside zone for UI updates
              this.ngZone.run(() => {
                this.isAuthenticated = isAuthenticated;
                if (isAuthenticated) {
                  this.loadUserData();
                }
                this.cdr.detectChanges();
              });
            }
          });
      }, 50);
    });
    
    // If already authenticated, load user data
    if (this.isAuthenticated && isPlatformBrowser(this.platformId)) {
      this.loadUserData();
    }
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  login() {
    this.router.navigate(['/login']);
  }
  
  register() {
    this.router.navigate(['/register']);
  }
  
  navigateToProfile() {
    this.router.navigate(['/profile']);
  }
  
  navigateToVaults() {
    this.router.navigate(['/vaults']);
  }
  
  navigateToDashboard() {
    // Navigate based on user role
    if (this.userRole === 'instructor' || this.userRole === 'admin') {
      this.router.navigate(['/instructor']);
    } else if (this.userRole === 'student') {
      this.router.navigate(['/student']);
    } else {
      // Default dashboard for any other role
      this.router.navigate(['/vaults']);
    }
  }
  
  private loadUserData(): void {
    this.isLoading = true;
    
    // Explicitly use getUserProfile method from AuthService
    this.authService.getUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user: User) => {
          if (user) {
            this.username = user.username || user.email || '';
            this.userRole = user.role;
            console.log(`User loaded with role: ${this.userRole}`);
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
  }
}
