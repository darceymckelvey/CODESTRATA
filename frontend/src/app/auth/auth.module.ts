import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

// Auth Components
import { SessionWarningComponent } from './components/session-warning/session-warning.component';
import { GithubCallbackComponent } from './github-callback/github-callback.component';

// Auth Services
import { AuthService } from './services/auth.service';
import { AuthGuard } from './guards/auth.guard';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { TokenStorageService } from './services/token/token-storage.service';
import { TokenValidationService } from './services/token/token-validation.service';
import { SessionTimerService } from './services/session-timer.service';

// JWT Configuration
import { JwtHelperService } from '@auth0/angular-jwt';

@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    
    // Angular Material
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatProgressBarModule,
    MatDividerModule,
    
    // Auth Components
    SessionWarningComponent,
    GithubCallbackComponent
  ],
  exports: [
    // Angular Material
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    
    // Auth Components
    SessionWarningComponent,
    GithubCallbackComponent
  ],
  providers: [
    AuthService,
    AuthGuard,
    TokenStorageService,
    TokenValidationService,
    SessionTimerService,
    JwtHelperService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
})
export class AuthModule { }