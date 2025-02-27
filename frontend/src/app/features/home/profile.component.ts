import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../auth/services/auth.service';
import { VaultService } from '../../features/user-strata-vaults/vault.service';
import { Subject, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { StrataVault } from '../../auth/services/auth.service';

@Component({
  imports: [
    MatCardModule,
    MatButtonModule,
    MatProgressBarModule,
    RouterModule,
    CommonModule,
  ],
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html',
  styleUrls: ['./home.component.css'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  vaultCount = 0;
  isLoading = true;
  hasLearningPlan = false;
  private destroy$ = new Subject<void>();

  constructor(
    public authService: AuthService, 
    private vaultService: VaultService,
    private router: Router
  ) {}

  ngOnInit() {
    // Load user's vaults to get the count
    this.vaultService.getVaults()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (vaults: StrataVault[]) => {
          this.vaultCount = vaults.length;
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading vaults:', error);
          this.isLoading = false;
        }
      });
    
    // Check if user has a learning plan (just a mock for now)
    this.hasLearningPlan = false; // We'll default to no learning plan
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startLearningPlan() {
    // Navigate to the learning plan page when implemented
    this.router.navigate(['/learning']);
  }

  createVault() {
    this.router.navigate(['/vaults/new']);
  }

  viewProjects() {
    this.router.navigate(['/vaults']);
  }
}
