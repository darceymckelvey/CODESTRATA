import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    FontAwesomeModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  loginForm!: FormGroup;
  formInitialized = false;
  loading = false;
  errorMessage = '';
  hidePassword = true;
  githubIcon = faGithub;
  error = '';
  returnUrl: string = '/vaults';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit() {
    // Ensure browser environment
    if (typeof window === 'undefined') {
      console.log('Login component initialized in SSR mode');
      return;
    }
    
    console.log('Login component initialized in browser mode');
    
    // Initialize login form - only in browser environment
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
    this.formInitialized = true;
    
    // Keyboard shortcuts have been removed
    
    // Log that we're now in the login component to confirm navigation worked
    console.log('Login component loaded successfully at path: ' + window.location.pathname);

    // Get return URL from route parameters or default to dashboard
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        console.log('Login component received route params:', params);
        
        if (params['returnUrl']) {
          this.returnUrl = params['returnUrl'];
        }
        
        if (params['message']) {
          this.error = params['message'];
          
          // Auto-populate email if provided
          if (params['email']) {
            this.loginForm.patchValue({
              email: params['email']
            });
          }
          
          // Highlight GitHub button if the source is GitHub using safer DOM handling
          if (params['source'] === 'github') {
            setTimeout(() => {
              const githubButton = document.querySelector('.github-button') as HTMLElement;
              if (githubButton) {
                githubButton.classList.add('highlight-button');
                setTimeout(() => {
                  githubButton.classList.remove('highlight-button');
                }, 3000);
              }
            }, 500);
          }
        }
        
        // Check for login error messages
        if (params['error']) {
          this.showErrorMessage(this.getErrorMessageFromCode(params['error']));
        }
        
        // Check for successful logout message
        if (params['logout'] === 'success') {
          this.showSuccessMessage('You have been successfully logged out.');
        }
      });
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() {
    return this.loginForm?.controls || {};
  }

  onSubmit(): void {
    // Ensure form exists - for SSR safety
    if (!this.loginForm) {
      console.error('Form is not initialized');
      return;
    }

    // Mark all fields as touched to trigger validation
    if (this.loginForm.invalid) {
      Object.keys(this.loginForm.controls).forEach(key => {
        const control = this.loginForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const email = this.loginForm.get('email')?.value;
    const password = this.loginForm.get('password')?.value;

    this.authService.login(email, password)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.showSuccessMessage('Login successful!');
          this.router.navigate([this.returnUrl]);
        },
        error: (error) => {
          if (error.status === 0) {
            this.errorMessage = 'Could not connect to the server. Please make sure the backend is running.';
          } else {
            // Use the error handler service for consistent error messages
            this.errorMessage = this.errorHandler.getDisplayErrorMessage(
              error, 
              'Login failed. Please check your credentials.'
            );
          }
          console.error('Login error:', error);
        }
      });
  }

  loginWithGithub(): void {
    console.log('Starting GitHub login process...');
    this.loading = true;
    this.errorMessage = '';
    
    this.authService.getGithubAuthUrl('login')
      .pipe(
        finalize(() => {
          console.log('GitHub login process completed');
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('Received GitHub auth URL response:', response);
          if (response && response.url) {
            // Store the current URL to return to after login
            const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
            localStorage.setItem('returnUrl', returnUrl);
            
            console.log('Redirecting to GitHub authorization URL:', response.url);
            try {
              window.location.href = response.url;
            } catch (error) {
              console.error('Error redirecting to GitHub:', error);
              this.errorMessage = 'Failed to redirect to GitHub. Please try again.';
            }
          } else {
            console.error('Invalid GitHub auth URL response:', response);
            this.errorMessage = 'Failed to get GitHub authorization URL. Please try again.';
          }
        },
        error: (error) => {
          console.error('Failed to get GitHub auth URL:', error);
          this.errorMessage = 'Failed to connect to authentication server. Please try again.';
        }
      });
  }
  
  private getErrorMessageFromCode(code: string): string {
    switch (code) {
      case 'session_expired':
        return 'Your session has expired. Please log in again.';
      case 'invalid_credentials':
        return 'Invalid email or password. Please try again.';
      case 'account_locked':
        return 'Your account has been locked. Please contact support.';
      case 'github_error':
        return 'An error occurred during GitHub authentication.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  private showSuccessMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['success-snackbar'],
    });
  }

  private showErrorMessage(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }
  
  // Keyboard shortcuts have been removed
}
