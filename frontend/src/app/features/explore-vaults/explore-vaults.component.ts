import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, firstValueFrom } from 'rxjs';
import { StrataVault } from '../../auth/services/auth.service';
import { VaultService } from '../user-strata-vaults/vault.service';

@Component({
  selector: 'app-explore-vaults',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="explore-vaults-container">
      <!-- Search Bar -->
      <div class="search-container">
        <h1>Explore All Vaults</h1>
        <div class="search-bar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search vaults</mat-label>
            <input matInput [(ngModel)]="searchTerm" placeholder="Search by name or description" (keyup.enter)="searchVaults()">
            <button *ngIf="searchTerm" matSuffix mat-icon-button aria-label="Clear" (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="searchVaults()">Search</button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading" class="loading-container">
        <mat-spinner diameter="50" color="accent"></mat-spinner>
        <p>Loading vaults...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error-container mat-elevation-z2">
        <mat-icon color="warn">error</mat-icon>
        <p>{{ error }}</p>
        <button mat-raised-button color="accent" (click)="retrySearch()">
          <mat-icon>refresh</mat-icon>
          Retry
        </button>
      </div>

      <!-- Content State -->
      <ng-container *ngIf="!isLoading && !error">
        <!-- No Results Message -->
        <div *ngIf="vaults.length === 0" class="no-results">
          <mat-icon>sentiment_dissatisfied</mat-icon>
          <p>No vaults found{{ searchTerm ? ' matching "' + searchTerm + '"' : '' }}</p>
          <button *ngIf="searchTerm" mat-raised-button color="primary" (click)="clearSearch()">Clear Search</button>
        </div>

        <!-- Vaults Grid -->
        <div class="vaults-grid" *ngIf="vaults.length > 0">
          <mat-card *ngFor="let vault of vaults" class="vault-card mat-elevation-z2">
            <mat-card-header>
              <div class="vault-header-content">
                <mat-icon mat-card-avatar class="vault-icon">folder</mat-icon>
                <div class="vault-titles">
                  <mat-card-title>{{ vault.name }}</mat-card-title>
                  <mat-card-subtitle>
                    <span class="subtitle-item">
                      <mat-icon class="mini-icon">person</mat-icon>
                      {{ vault.owner?.username || 'Unknown User' }}
                    </span>
                    <span class="subtitle-item">
                      <mat-icon class="mini-icon">update</mat-icon>
                      {{ vault.updatedAt | date:'short' }}
                    </span>
                  </mat-card-subtitle>
                </div>
              </div>
              <div class="vault-ownership" *ngIf="vault.isOwner">
                <span class="ownership-badge">
                  Yours
                </span>
              </div>
            </mat-card-header>
            
            <mat-card-content>
              <p class="vault-description">{{ vault.description || 'No description provided' }}</p>
              
              <!-- Artifacts Section with count -->
              <div class="content-section">
                <div class="section-header">
                  <h3>Artifacts</h3>
                  <span class="count-badge">{{ vault.artifacts?.length || 0 }}</span>
                </div>
              </div>

              <!-- Strata Section -->
              <div class="content-section">
                <div class="section-header">
                  <h3>Strata</h3>
                  <span class="count-badge">{{ vault.strata?.length || 0 }}</span>
                </div>
              </div>
            </mat-card-content>
            
            <mat-divider></mat-divider>
            
            <mat-card-actions>
              <!-- View Button - Available for all vaults -->
              <button mat-button color="basic" [routerLink]="['/vault', vault.id]" class="action-button">
                <mat-icon>visibility</mat-icon>
                View Details
              </button>
              
              <!-- Edit Buttons - Only available for vaults you own -->
              <ng-container *ngIf="vault.isOwner">
                <button mat-button color="primary" [routerLink]="['/vaults']" class="action-button">
                  <mat-icon>edit</mat-icon>
                  Edit Vault
                </button>
              </ng-container>
            </mat-card-actions>
          </mat-card>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .explore-vaults-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .search-container {
      display: flex;
      flex-direction: column;
      margin-bottom: 24px;
    }
    
    h1 {
      font-size: 32px;
      margin-bottom: 16px;
      color: #3f51b5;
    }
    
    .search-bar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }
    
    .search-field {
      flex: 1;
      width: 100%;
    }
    
    .loading-container, .error-container, .no-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      background-color: #f5f5f5;
      border-radius: 8px;
      margin: 24px 0;
    }
    
    .error-container {
      background-color: #ffebee;
    }
    
    .error-container mat-icon, .no-results mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    
    .error-container mat-icon {
      color: #f44336;
    }
    
    .no-results mat-icon {
      color: #9e9e9e;
    }
    
    .vaults-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    
    .vault-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .vault-header-content {
      display: flex;
      align-items: center;
      flex: 1;
    }
    
    .vault-titles {
      display: flex;
      flex-direction: column;
    }
    
    .vault-ownership {
      margin-left: auto;
    }
    
    .ownership-badge {
      background-color: #4caf50;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .vault-description {
      font-size: 14px;
      color: #666;
      margin-bottom: 16px;
      min-height: 40px;
    }
    
    .subtitle-item {
      display: flex;
      align-items: center;
      margin-right: 16px;
      color: #666;
      font-size: 12px;
    }
    
    .mini-icon {
      font-size: 14px;
      height: 14px;
      width: 14px;
      margin-right: 4px;
    }
    
    .content-section {
      margin-bottom: 16px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .section-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
      color: #3f51b5;
    }
    
    .count-badge {
      background-color: #e0e0e0;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .action-button {
      display: flex;
      align-items: center;
    }
    
    .action-button mat-icon {
      margin-right: 4px;
    }
    
    @media (max-width: 600px) {
      .search-bar {
        flex-direction: column;
      }
      
      .search-field {
        width: 100%;
      }
      
      .vaults-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ExploreVaultsComponent implements OnInit, OnDestroy {
  vaults: any[] = [];
  isLoading = true;
  error: string | null = null;
  searchTerm = '';
  private destroy$ = new Subject<void>();

  constructor(
    private vaultService: VaultService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadVaults();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadVaults() {
    try {
      this.isLoading = true;
      this.error = null;
      
      const vaults = await firstValueFrom(
        this.vaultService.getVaults(true, this.searchTerm)
          .pipe(takeUntil(this.destroy$))
      );
      
      this.vaults = vaults;
      this.isLoading = false;
    } catch (error) {
      this.handleError(error);
    }
  }

  searchVaults() {
    this.loadVaults();
  }

  clearSearch() {
    this.searchTerm = '';
    this.loadVaults();
  }

  retrySearch() {
    this.loadVaults();
  }

  private handleError(error: any) {
    console.error('Error loading vaults:', error);
    
    this.isLoading = false;
    
    if (error.status === 401) {
      this.error = 'Authentication required. Please log in to explore vaults.';
    } else if (error.status === 0) {
      this.error = 'Network error. Please check your connection and try again.';
    } else {
      this.error = error.message || 'Failed to load vaults. Please try again later.';
    }
    
    if (this.error) {
      this.showError(this.error);
    } else {
      this.showError('Unknown error occurred');
    }
  }

  private showError(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  }

  private showInfo(message: string) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
    });
  }
}