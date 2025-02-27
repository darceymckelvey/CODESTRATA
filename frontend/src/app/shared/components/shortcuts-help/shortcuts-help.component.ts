import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { KeyboardShortcutsService } from '../../keyboard-shortcuts.service';

@Component({
  selector: 'app-shortcuts-help',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <button 
      mat-icon-button 
      (click)="showShortcutsDialog()"
      aria-label="Keyboard shortcuts"
      matTooltip="Keyboard shortcuts (Alt+/)"
      class="shortcuts-help-button relative">
      <mat-icon>keyboard</mat-icon>
      <span class="shortcut-hint">Alt+/</span>
    </button>
  `,
  styles: [`
    .shortcuts-help-button {
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }
    
    .shortcuts-help-button:hover {
      opacity: 1;
    }
  `]
})
export class ShortcutsHelpComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private dialog: MatDialog,
    private shortcutsService: KeyboardShortcutsService
  ) {}

  ngOnInit(): void {
    // Listen for shortcut dialog events
    this.shortcutsService.showShortcutsDialog$
      .pipe(takeUntil(this.destroy$))
      .subscribe(show => {
        if (show) {
          this.showShortcutsDialog();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Show the keyboard shortcuts dialog
   */
  showShortcutsDialog(): void {
    import('../shortcuts-dialog/shortcuts-dialog.component')
      .then(({ ShortcutsDialogComponent }) => {
        this.dialog.open(ShortcutsDialogComponent, {
          width: '700px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          ariaLabel: 'Keyboard shortcuts',
          panelClass: 'shortcuts-dialog-container'
        });
      })
      .catch(err => {
        console.error('Could not load shortcuts dialog component', err);
      });
  }

  /**
   * Listen for Alt+/ to show shortcuts dialog directly
   */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Alt + / to show shortcuts help
    if (event.altKey && event.key === '/') {
      event.preventDefault();
      this.showShortcutsDialog();
    }
  }
}