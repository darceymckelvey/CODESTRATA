import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { take, finalize } from 'rxjs/operators';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { DOCUMENT } from '@angular/common';
import { faGithub } from '@fortawesome/free-brands-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    FontAwesomeModule,
    MatCheckboxModule,
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  registerForm!: FormGroup;
  formInitialized = false;
  submitted = false;
  loading = false;
  error = '';
  hidePassword = true;
  hideConfirmPassword = true;
  githubIcon = faGithub;
  private destroy$ = new Subject<void>();
  
  // Define available roles
  availableRoles = [
    { value: 'student', label: 'Student', description: 'Access learning materials and participate in courses' },
    { value: 'instructor', label: 'Instructor', description: 'Create and manage courses, evaluate student work' }
  ];
  
  // Admin role is separate as it requires approval
  adminRoleInfo = {
    value: 'admin',
    label: 'Administrator',
    description: 'Full system access. Requires approval. Please contact us for an interview.'
  };

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Removed authentication check to allow direct access to signup page
  }

  ngOnInit() {
    // Skip initialization in SSR
    if (typeof window === 'undefined') {
      console.log('Register component initialized in SSR mode');
      return;
    }
    
    console.log('Register component initialized in browser mode');
    
    this.registerForm = this.formBuilder.group(
      {
        username: ['', [Validators.required, Validators.minLength(3)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
        role: ['student', Validators.required],
        adminRequestReason: [''],
        acceptTerms: [false, Validators.requiredTrue]
      },
      {
        validator: this.passwordMatchValidator,
      }
    );
    
    this.formInitialized = true;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Custom validator for password match
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    } else {
      const errors = formGroup.get('confirmPassword')?.errors;
      if (errors) {
        delete errors['passwordMismatch'];
        formGroup.get('confirmPassword')?.setErrors(
          Object.keys(errors).length > 0 ? errors : null
        );
      }
    }
  }

  get f() {
    return this.registerForm.controls;
  }

  onSubmit() {
    this.submitted = true;

    // Check if form is valid
    if (this.registerForm.invalid) {
      // Scroll to first error field
      const firstError = document.querySelector('.mat-form-field.ng-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Check if admin role is selected but no reason is provided
    if (this.f['role'].value === 'admin' && !this.f['adminRequestReason'].value.trim()) {
      this.error = 'Please provide a reason for requesting admin access.';
      return;
    }

    this.loading = true;
    this.error = '';

    // For admin role, show a message and don't actually register yet
    if (this.f['role'].value === 'admin') {
      // Store the admin request information or send to a separate endpoint
      this.handleAdminRequest();
      return;
    }

    // For student and instructor roles, proceed with registration
    this.authService
      .register(
        this.f['username'].value,
        this.f['email'].value,
        this.f['password'].value,
        this.f['role'].value
      )
      .pipe(
        take(1),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: () => {
          this.showSuccessMessage('Registration successful!');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.error = error.message || 'Registration failed. Please try again.';
        },
      });
  }
  
  /**
   * Handle admin role request separately
   */
  private handleAdminRequest(): void {
    // Here you would typically send this to a different endpoint
    // For now, just show a message and redirect
    
    setTimeout(() => {
      this.loading = false;
      this.showSuccessMessage('Admin access request submitted. We will contact you for an interview.');
      this.router.navigate(['/login']);
    }, 1000);
  }

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  // GitHub signup functionality removed
  
  // Keyboard shortcuts have been removed
}