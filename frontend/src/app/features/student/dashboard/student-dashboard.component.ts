import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService, User } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressBarModule
  ],
  template: `
    <div class="student-dashboard">
      <h1>Student Dashboard</h1>
      
      <div class="welcome-card" *ngIf="currentUser">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_circle</mat-icon>
            <mat-card-title>Welcome, {{ currentUser.username }}!</mat-card-title>
            <mat-card-subtitle>Student Account</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Track your progress, manage your assignments, and access learning resources.</p>
          </mat-card-content>
        </mat-card>
      </div>
      
      <div class="dashboard-grid">
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>assignment</mat-icon>
            <mat-card-title>My Assignments</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="assignment-summary">
              <div class="assignment-stat">
                <span class="stat-value">3</span>
                <span class="stat-label">Due Soon</span>
              </div>
              <div class="assignment-stat">
                <span class="stat-value">2</span>
                <span class="stat-label">Completed</span>
              </div>
              <div class="assignment-stat">
                <span class="stat-value">1</span>
                <span class="stat-label">Graded</span>
              </div>
            </div>
            <mat-divider class="divider"></mat-divider>
            <div class="assignment-item">
              <span class="assignment-name">Geological Dating Project</span>
              <span class="assignment-due">Due in 3 days</span>
            </div>
            <div class="assignment-item">
              <span class="assignment-name">Rock Formation Analysis</span>
              <span class="assignment-due">Due in 5 days</span>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/student/assignments">
              <mat-icon>list</mat-icon> View All Assignments
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>trending_up</mat-icon>
            <mat-card-title>My Progress</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="progress-item">
              <div class="progress-header">
                <span>Strata Fundamentals</span>
                <span>75%</span>
              </div>
              <mat-progress-bar mode="determinate" value="75"></mat-progress-bar>
            </div>
            <div class="progress-item">
              <div class="progress-header">
                <span>Git Integration</span>
                <span>60%</span>
              </div>
              <mat-progress-bar mode="determinate" value="60"></mat-progress-bar>
            </div>
            <div class="progress-item">
              <div class="progress-header">
                <span>Code Analysis</span>
                <span>40%</span>
              </div>
              <mat-progress-bar mode="determinate" value="40"></mat-progress-bar>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/student/progress">
              <mat-icon>insights</mat-icon> View Detailed Progress
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>folder</mat-icon>
            <mat-card-title>My Vaults</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Manage your code repositories and strata vaults.</p>
            <div class="vault-count">
              <mat-icon>folder_special</mat-icon>
              <span>3 Active Vaults</span>
            </div>
            <mat-divider class="divider"></mat-divider>
            <p class="recent-activity">Recent activity: Fossilized changes to "Project Alpha" 2 hours ago</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/vaults">
              <mat-icon>storage</mat-icon> Go to My Vaults
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>school</mat-icon>
            <mat-card-title>Learning Resources</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Access course materials, tutorials, and documentation.</p>
            <div class="resource-list">
              <div class="resource-item">
                <mat-icon>video_library</mat-icon>
                <span>Video Tutorials</span>
              </div>
              <div class="resource-item">
                <mat-icon>menu_book</mat-icon>
                <span>Documentation</span>
              </div>
              <div class="resource-item">
                <mat-icon>forum</mat-icon>
                <span>Discussion Forums</span>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/student/resources">
              <mat-icon>library_books</mat-icon> Browse Resources
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .student-dashboard {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 24px;
      color: #3f51b5;
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
    
    .assignment-summary {
      display: flex;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    
    .assignment-stat {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #3f51b5;
    }
    
    .stat-label {
      font-size: 12px;
      color: #666;
    }
    
    .divider {
      margin: 12px 0;
    }
    
    .assignment-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .assignment-due {
      color: #f44336;
      font-size: 12px;
      font-weight: 500;
    }
    
    .progress-item {
      margin-bottom: 16px;
    }
    
    .progress-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 14px;
    }
    
    .vault-count {
      display: flex;
      align-items: center;
      margin: 16px 0;
      color: #3f51b5;
    }
    
    .vault-count mat-icon {
      margin-right: 8px;
    }
    
    .recent-activity {
      font-size: 13px;
      color: #666;
      font-style: italic;
    }
    
    .resource-list {
      margin-top: 12px;
    }
    
    .resource-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    
    .resource-item mat-icon {
      margin-right: 8px;
      color: #3f51b5;
    }
    
    @media (max-width: 768px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StudentDashboardComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }
}