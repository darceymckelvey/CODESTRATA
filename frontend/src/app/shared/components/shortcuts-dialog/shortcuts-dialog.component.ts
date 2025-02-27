import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { KeyboardShortcutsService, KeyboardShortcut } from '../../keyboard-shortcuts.service';

@Component({
  selector: 'app-shortcuts-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule
  ],
  template: `
    <div class="shortcuts-dialog">
      <div class="shortcuts-header">
        <h2>Keyboard Shortcuts</h2>
        <button mat-icon-button (click)="close()" aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      
      <mat-tab-group class="shortcuts-tabs">
        <mat-tab *ngFor="let group of shortcutGroups | keyvalue" [label]="group.key">
          <div class="shortcuts-group">
            <div class="menu-container">
              <div class="menu-section" *ngFor="let shortcut of group.value">
                <div class="menu-item">
                  <span class="menu-item-label">{{shortcut.description}}</span>
                  <div class="menu-item-shortcut">
                    <span class="shortcut-key" *ngFor="let key of getKeys(shortcut)">{{key}}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
      
      <div class="shortcuts-footer">
        <button mat-flat-button color="primary" (click)="close()">
          Got it
        </button>
      </div>
    </div>
  `,
  styles: [`
    .shortcuts-dialog {
      min-width: 500px;
      max-width: 800px;
      padding: 0;
    }
    
    .shortcuts-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    }
    
    .shortcuts-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }
    
    .shortcuts-group {
      padding: 16px 24px;
    }
    
    /* Menu-like styling for shortcuts */
    .menu-container {
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .menu-section {
      border-bottom: 1px solid #f0f0f0;
    }
    
    .menu-section:last-child {
      border-bottom: none;
    }
    
    .menu-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      transition: background-color 0.2s;
    }
    
    .menu-item:hover {
      background-color: #f5f5f5;
    }
    
    .menu-item-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }
    
    .menu-item-shortcut {
      display: flex;
      align-items: center;
    }
    
    .shortcut-key {
      display: inline-block;
      padding: 4px 8px;
      background-color: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 12px;
      margin-left: 4px;
      box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
    }
    
    .shortcuts-footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid rgba(0, 0, 0, 0.12);
    }
    
    /* Dark theme support */
    :host-context(.dark) .menu-container {
      background-color: #2d3748;
    }
    
    :host-context(.dark) .menu-section {
      border-color: #374151;
    }
    
    :host-context(.dark) .menu-item:hover {
      background-color: #374151;
    }
    
    :host-context(.dark) .menu-item-label {
      color: #e2e8f0;
    }
    
    :host-context(.dark) .shortcut-key {
      background-color: #424242;
      border-color: #616161;
      color: #e0e0e0;
    }
  `]
})
export class ShortcutsDialogComponent implements OnInit {
  shortcutGroups: Record<string, KeyboardShortcut[]> = {};

  constructor(
    private dialogRef: MatDialogRef<ShortcutsDialogComponent>,
    private shortcutsService: KeyboardShortcutsService
  ) {}

  ngOnInit(): void {
    this.shortcutGroups = this.shortcutsService.getShortcutsByGroup();
  }

  close(): void {
    this.dialogRef.close();
  }

  /**
   * Convert a shortcut to an array of key parts for display
   * Example: { key: 'h', alt: true } -> ['Alt', 'H']
   */
  getKeys(shortcut: KeyboardShortcut): string[] {
    const keys: string[] = [];
    
    if (shortcut.ctrl) keys.push('Ctrl');
    if (shortcut.alt) keys.push('Alt');
    if (shortcut.shift) keys.push('Shift');
    
    keys.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase());
    
    return keys;
  }
}