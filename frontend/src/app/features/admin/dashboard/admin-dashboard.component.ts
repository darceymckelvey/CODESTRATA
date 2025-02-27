import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService, User } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
    <div class="admin-dashboard">
      <h1>Administrator Dashboard</h1>
      
      <div class="welcome-card" *ngIf="currentUser">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>admin_panel_settings</mat-icon>
            <mat-card-title>Welcome, {{ currentUser.username }}!</mat-card-title>
            <mat-card-subtitle>Administrator Access</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>You have full administrative access to manage users, system settings, and all platform resources.</p>
          </mat-card-content>
        </mat-card>
      </div>
      
      <div class="dashboard-grid">
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">admin_panel_settings</mat-icon>
            <mat-card-title>User Management</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Manage all user accounts and roles across the platform.</p>
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-value">237</span>
                <span class="stat-label">Total Users</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">24</span>
                <span class="stat-label">Instructors</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">210</span>
                <span class="stat-label">Students</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">3</span>
                <span class="stat-label">Admins</span>
              </div>
            </div>
            <mat-divider class="divider"></mat-divider>
            <div class="admin-notice">
              <mat-icon color="warn">warning</mat-icon>
              <span>2 pending admin approval requests</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" routerLink="/admin/users">
              <mat-icon>manage_accounts</mat-icon> Manage Users
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">security</mat-icon>
            <mat-card-title>System Security</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Monitor system security, manage permissions, and security settings.</p>
            <div class="security-status">
              <div class="security-status-item">
                <mat-icon color="primary">check_circle</mat-icon>
                <span>Authentication System</span>
              </div>
              <div class="security-status-item">
                <mat-icon color="primary">check_circle</mat-icon>
                <span>Data Encryption</span>
              </div>
              <div class="security-status-item">
                <mat-icon color="primary">check_circle</mat-icon>
                <span>Backup Systems</span>
              </div>
              <div class="security-status-item">
                <mat-icon color="warn">warning</mat-icon>
                <span>Failed Login Attempts (4)</span>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" routerLink="/admin/security">
              <mat-icon>shield</mat-icon> Security Settings
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">build</mat-icon>
            <mat-card-title>System Configuration</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Configure platform settings, integrations, and global preferences.</p>
            <div class="system-settings">
              <div class="settings-group">
                <h4>General Settings</h4>
                <div class="setting-item">
                  <span>GitHub Integration</span>
                  <mat-chip-listbox aria-label="GitHub Status">
                    <mat-chip color="primary" selected>Enabled</mat-chip>
                  </mat-chip-listbox>
                </div>
                <div class="setting-item">
                  <span>User Registration</span>
                  <mat-chip-listbox aria-label="Registration Status">
                    <mat-chip color="primary" selected>Enabled</mat-chip>
                  </mat-chip-listbox>
                </div>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" routerLink="/admin/settings">
              <mat-icon>settings</mat-icon> System Settings
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="warn">bar_chart</mat-icon>
            <mat-card-title>Analytics & Reporting</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>View comprehensive analytics about platform usage and performance.</p>
            <div class="analytics-summary">
              <div class="analytics-item">
                <span class="analytics-value">15.4K</span>
                <span class="analytics-label">API Requests</span>
                <span class="analytics-change positive">+12% ↑</span>
              </div>
              <div class="analytics-item">
                <span class="analytics-value">3.2K</span>
                <span class="analytics-label">GitHub Operations</span>
                <span class="analytics-change positive">+8% ↑</span>
              </div>
              <div class="analytics-item">
                <span class="analytics-value">842</span>
                <span class="analytics-label">New Vaults</span>
                <span class="analytics-change positive">+24% ↑</span>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="warn" routerLink="/admin/analytics">
              <mat-icon>insights</mat-icon> Full Analytics
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
      
      <div class="action-buttons">
        <button mat-raised-button color="warn" routerLink="/admin/log">
          <mat-icon>history</mat-icon> System Logs
        </button>
        <button mat-raised-button color="primary" routerLink="/vaults">
          <mat-icon>folder</mat-icon> My Vaults
        </button>
        <button mat-raised-button color="accent" routerLink="/profile">
          <mat-icon>account_circle</mat-icon> Profile
        </button>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 24px;
      color: #f44336; /* Admin uses red theme */
      border-bottom: 2px solid #e0e0e0;
      padding-bottom: 12px;
    }
    
    .welcome-card {
      margin-bottom: 32px;
    }
    
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .dashboard-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .dashboard-card mat-card-content {
      flex-grow: 1;
    }
    
    .user-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 16px 0;
    }
    
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      min-width: 75px;
      padding: 8px;
      border-radius: 4px;
      background-color: #f5f5f5;
    }
    
    .stat-value {
      font-size: 20px;
      font-weight: bold;
      color: #f44336;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
    }
    
    .admin-notice {
      display: flex;
      align-items: center;
      margin: 16px 0;
      padding: 8px;
      border-radius: 4px;
      background-color: #fff3e0;
      color: #f57c00;
    }
    
    .admin-notice mat-icon {
      margin-right: 8px;
    }
    
    .divider {
      margin: 16px 0;
    }
    
    .security-status {
      margin-top: 16px;
    }
    
    .security-status-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .security-status-item mat-icon {
      margin-right: 8px;
    }
    
    .system-settings {
      margin-top: 16px;
    }
    
    .settings-group h4 {
      margin-bottom: 8px;
      color: #555;
    }
    
    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .analytics-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-top: 16px;
    }
    
    .analytics-item {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 100px;
      padding: 8px;
      border-radius: 4px;
      background-color: #f5f5f5;
    }
    
    .analytics-value {
      font-size: 18px;
      font-weight: bold;
      color: #f44336;
    }
    
    .analytics-label {
      font-size: 12px;
      color: #666;
    }
    
    .analytics-change {
      font-size: 12px;
      margin-top: 4px;
    }
    
    .analytics-change.positive {
      color: #4caf50;
    }
    
    .analytics-change.negative {
      color: #f44336;
    }
    
    .action-buttons {
      display: flex;
      gap: 16px;
      margin-top: 24px;
    }
    
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
      
      .action-buttons {
        flex-direction: column;
        gap: 12px;
      }
      
      .user-stats, .analytics-summary {
        flex-direction: column;
        gap: 8px;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }
}