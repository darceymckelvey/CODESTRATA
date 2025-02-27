import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="unauthorized-container">
      <div class="unauthorized-content">
        <mat-icon class="unauthorized-icon">security</mat-icon>
        <h1>Access Denied</h1>
        <p>You don't have permission to access this page.</p>
        <p class="user-role" *ngIf="userRole">Your current role is: <strong>{{ userRole }}</strong></p>
        <div class="actions">
          <button mat-raised-button color="primary" routerLink="/vaults">
            Go to My Vaults
          </button>
          <button mat-stroked-button color="warn" (click)="logout()">
            Logout
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 20px;
    }
    .unauthorized-content {
      max-width: 500px;
      text-align: center;
      padding: 40px;
      border-radius: 8px;
      background-color: #f8f9fa;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .unauthorized-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #f44336;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 16px;
      color: #f44336;
    }
    p {
      font-size: 16px;
      margin-bottom: 24px;
      color: #555;
    }
    .user-role {
      background-color: rgba(0,0,0,0.05);
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 24px;
    }
    .actions {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
  `]
})
export class UnauthorizedComponent {
  userRole: string | null = null;

  constructor(private authService: AuthService) {
    // Get user role if available
    this.authService.user$.subscribe(user => {
      if (user && user.role) {
        this.userRole = user.role;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}