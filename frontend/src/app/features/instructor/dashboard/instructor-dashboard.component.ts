import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService, User } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-instructor-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="instructor-dashboard">
      <h1>Instructor Dashboard</h1>
      
      <div class="welcome-card" *ngIf="currentUser">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>school</mat-icon>
            <mat-card-title>Welcome, {{ currentUser.username }}!</mat-card-title>
            <mat-card-subtitle>Instructor Access</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>You have access to instructor-specific features and resources.</p>
          </mat-card-content>
        </mat-card>
      </div>
      
      <div class="dashboard-grid">
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>groups</mat-icon>
            <mat-card-title>Student Management</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Manage your students, track progress, and provide feedback.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/instructor/students">
              <mat-icon>person_search</mat-icon> View Students
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>assignment</mat-icon>
            <mat-card-title>Assignments</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Create, manage, and grade assignments and projects.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/instructor/assignments">
              <mat-icon>add_task</mat-icon> Manage Assignments
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>analytics</mat-icon>
            <mat-card-title>Progress Analytics</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>View detailed analytics on student performance and engagement.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/instructor/analytics">
              <mat-icon>bar_chart</mat-icon> View Analytics
            </button>
          </mat-card-actions>
        </mat-card>
        
        <mat-card class="dashboard-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>book</mat-icon>
            <mat-card-title>Course Materials</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>Create and manage course content, reading materials, and resources.</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-button color="primary" routerLink="/instructor/materials">
              <mat-icon>library_books</mat-icon> Manage Materials
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
      
      <div class="action-buttons">
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
    .instructor-dashboard {
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
    }
  `]
})
export class InstructorDashboardComponent implements OnInit {
  currentUser: User | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
    });
  }
}