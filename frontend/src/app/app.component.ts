import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, AfterViewInit, NgZone, ApplicationRef, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { AuthService, User } from './auth/services/auth.service';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle.component';
import { ThemeService } from './theme/theme.service';
import { SessionWarningComponent } from './auth/components/session-warning/session-warning.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    ThemeToggleComponent,
    SessionWarningComponent
  ]
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('sidenav') sidenav!: MatSidenav;
  
  title = 'CodeStrata';
  isAuthenticated = false;
  isHandset = false;
  currentUser: User | null = null;
  userRole: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private appRef: ApplicationRef,
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) private platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {
    console.log("Setting initial auth state in constructor");
    // Just initialize without localStorage access
    this.isAuthenticated = false;
    
    // Monitor screen size changes
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isHandset = result.matches;
      });
  }

  ngOnInit(): void {
    // Initialize authenticated state and listen for changes
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isAuthenticated: boolean) => {
        this.isAuthenticated = isAuthenticated;
      });
    
    // Get current user and their role
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user: User | null) => {
        this.currentUser = user;
        this.userRole = user?.role || '';
      });
    
    // Initialize theme based on stored preference or system default
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        console.log(`Theme set to: ${theme}`);
      });
  }
  
  ngAfterViewInit(): void {
    // Don't remove splash screen here - we'll let the timer in index.html handle it
    // This allows the splash screen to show for the minimum display time
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home'], { queryParams: { logout: 'success' } });
    if (this.isHandset) {
      this.closeSidenav();
    }
  }
  
  /**
   * Navigate to login page with proper parameters
   */
  navigateToLogin(): void {
    // Force direct navigation without auth guard
    window.location.href = '/login';
    if (this.isHandset) {
      this.closeSidenav();
    }
  }
  
  /**
   * Navigate to register page with proper parameters
   */
  navigateToRegister(): void {
    // Force direct navigation without auth guard
    window.location.href = '/register';
    if (this.isHandset) {
      this.closeSidenav();
    }
  }

  closeSidenav(): void {
    if (this.sidenav) {
      this.sidenav.close();
    }
  }
  
  toggleSidenav(): void {
    if (this.sidenav) {
      this.sidenav.toggle();
    }
  }
  
  
}
