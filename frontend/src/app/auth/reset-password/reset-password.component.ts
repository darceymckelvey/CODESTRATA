import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../services/auth.service';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css'],
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Form for requesting password reset
  requestForm!: FormGroup;
  
  // Form for setting new password (when token is provided)
  resetForm!: FormGroup;
  
  loading = false;
  errorMessage = '';
  successMessage = '';
  hidePassword = true;
  hideConfirmPassword = true;
  
  // Flag to determine if we're in request mode or reset mode
  hasResetToken = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private errorHandler: ErrorHandlerService
  ) { }

  ngOnInit() {
    // Initialize request form
    this.requestForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });

    // Initialize reset form
    this.resetForm = this.formBuilder.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.checkPasswords });

    // Check for token in the route
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['token']) {
          this.hasResetToken = true;
        }
        
        if (params['email']) {
          this.requestForm.patchValue({
            email: params['email']
          });
        }
        
        if (params['error']) {
          this.showErrorMessage(this.getErrorMessageFromCode(params['error']));
        }
      });
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Check if passwords match
  checkPasswords(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    return password === confirmPassword ? null : { notMatching: true };
  }

  // For easier access to form controls
  get requestControls() {
    return this.requestForm.controls;
  }

  get resetControls() {
    return this.resetForm.controls;
  }

  // Request a password reset
  onRequestSubmit(): void {
    if (this.requestForm.invalid) {
      Object.keys(this.requestForm.controls).forEach(key => {
        const control = this.requestForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const email = this.requestForm.get('email')?.value;

    // In a real implementation, you'd call the auth service to request a password reset
    // For now, we'll just simulate it with a timeout
    setTimeout(() => {
      this.loading = false;
      this.successMessage = `Password reset link has been sent to ${email}. Please check your email.`;
      this.showSuccessMessage(this.successMessage);
    }, 1500);

    // Actual implementation would look like:
    /*
    this.authService.requestPasswordReset(email)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.successMessage = `Password reset link has been sent to ${email}. Please check your email.`;
          this.showSuccessMessage(this.successMessage);
        },
        error: (error) => {
          this.errorMessage = this.errorHandler.getDisplayErrorMessage(
            error, 
            'Failed to send reset link. Please try again.'
          );
        }
      });
    */
  }

  // Reset password with token
  onResetSubmit(): void {
    if (this.resetForm.invalid) {
      Object.keys(this.resetForm.controls).forEach(key => {
        const control = this.resetForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const password = this.resetForm.get('password')?.value;
    const token = this.route.snapshot.queryParams['token'];

    // In a real implementation, you'd call the auth service to reset the password
    // For now, we'll just simulate it with a timeout
    setTimeout(() => {
      this.loading = false;
      this.successMessage = 'Your password has been reset successfully.';
      this.showSuccessMessage(this.successMessage);
      
      // Redirect to login page after success
      setTimeout(() => {
        this.router.navigate(['/login'], { 
          queryParams: { 
            message: 'Your password has been reset. Please log in with your new password.' 
          } 
        });
      }, 2000);
    }, 1500);

    // Actual implementation would look like:
    /*
    this.authService.resetPassword(token, password)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Your password has been reset successfully.';
          this.showSuccessMessage(this.successMessage);
          
          // Redirect to login page after success
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { 
                message: 'Your password has been reset. Please log in with your new password.' 
              } 
            });
          }, 2000);
        },
        error: (error) => {
          this.errorMessage = this.errorHandler.getDisplayErrorMessage(
            error, 
            'Failed to reset password. Please try again.'
          );
        }
      });
    */
  }

  private getErrorMessageFromCode(code: string): string {
    switch (code) {
      case 'invalid_token':
        return 'The password reset link is invalid or has expired. Please request a new one.';
      case 'user_not_found':
        return 'We could not find an account with that email address.';
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
}