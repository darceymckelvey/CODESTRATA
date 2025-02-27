import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { SessionTimerService } from '../../services/session-timer.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './session-warning.component.html',
  styleUrls: ['./session-warning.component.css']
})
export class SessionWarningComponent implements OnInit, OnDestroy {
  showWarning = false;
  secondsRemaining = 0;
  private destroy$ = new Subject<void>();
  
  constructor(
    private sessionTimer: SessionTimerService,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    // Subscribe to session warning events
    this.sessionTimer.sessionWarning$
      .pipe(takeUntil(this.destroy$))
      .subscribe(seconds => {
        // Only show if there's a warning (seconds > 0)
        this.secondsRemaining = seconds;
        this.showWarning = seconds > 0;
        
        // For short warnings, use a snackbar instead of the full card
        if (seconds > 0 && seconds < 30) {
          this.showSnackBarWarning(seconds);
        }
      });
  }
  
  /**
   * Show a simple snackbar warning for short expiration times
   */
  private showSnackBarWarning(seconds: number): void {
    this.snackBar.open(
      `Your session will expire in ${seconds} seconds`,
      'EXTEND',
      {
        duration: seconds * 1000, // Show for the remaining time
        panelClass: 'warning-snackbar'
      }
    ).onAction().subscribe(() => {
      this.extend();
    });
  }
  
  /**
   * Extend the session 
   */
  extend(): void {
    this.sessionTimer.extendSession();
    this.showWarning = false;
    
    // Show confirmation
    this.snackBar.open('Your session has been extended', 'DISMISS', {
      duration: 3000
    });
  }
  
  /**
   * Log out immediately
   */
  logout(): void {
    // The service will handle the actual logout
    this.sessionTimer.extendSession();
    
    // We just need to hide our warning
    this.showWarning = false;
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 