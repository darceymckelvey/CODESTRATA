import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService, Theme } from '../../../theme/theme.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  template: `
    <button mat-icon-button
            [matTooltip]="isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'"
            aria-label="Toggle dark mode"
            (click)="toggleTheme()"
            class="theme-toggle-button">
      <mat-icon>{{ isDarkMode ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: [`
    .theme-toggle-button {
      transition: transform 0.3s ease;
    }
    
    .theme-toggle-button:hover {
      transform: rotate(12deg);
    }
  `]
})
export class ThemeToggleComponent implements OnInit, OnDestroy {
  isDarkMode = false;
  private destroy$ = new Subject<void>();

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme: Theme) => {
        this.isDarkMode = theme === 'dark';
      });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 