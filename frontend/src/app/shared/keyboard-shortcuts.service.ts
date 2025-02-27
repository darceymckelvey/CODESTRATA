import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, fromEvent, filter, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ThemeService } from '../theme/theme.service';

export interface KeyboardShortcut {
  key: string;        // Key code (e.g., 'h', '/')
  alt?: boolean;      // Whether Alt is required
  ctrl?: boolean;     // Whether Ctrl is required
  shift?: boolean;    // Whether Shift is required
  description: string; // Human-readable description
  action: () => void;  // Action to perform
  group: string;       // Logical grouping
}

/**
 * Service responsible for managing keyboard shortcuts throughout the application.
 * Handles registration, execution, and display of shortcuts.
 */
@Injectable({
  providedIn: 'root'
})
export class KeyboardShortcutsService {
  private shortcuts: KeyboardShortcut[] = [];
  private unsubscribe$ = new Subject<void>();
  
  // Observable that emits when shortcuts dialog should be shown/hidden
  private showShortcutsDialogSubject = new Subject<boolean>();
  showShortcutsDialog$ = this.showShortcutsDialogSubject.asObservable();
  
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
    private themeService: ThemeService
  ) {
    // Initialize global keyboard shortcut listener
    this.initKeyboardListener();
    
    // Register global shortcuts
    this.registerGlobalShortcuts();
  }
  
  /**
   * Initializes keyboard event listener for the entire application
   */
  private initKeyboardListener(): void {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return;
    
    fromEvent<KeyboardEvent>(this.document, 'keydown')
      .pipe(
        takeUntil(this.unsubscribe$),
        filter(event => 
          // Skip keyboard handling when typing in input fields
          !(event.target instanceof HTMLInputElement || 
            event.target instanceof HTMLTextAreaElement))
      )
      .subscribe(event => {
        // Find a matching shortcut
        const shortcut = this.shortcuts.find(s => this.matchesShortcut(event, s));
        
        if (shortcut) {
          event.preventDefault();
          shortcut.action();
        }
      });
  }
  
  /**
   * Register a new keyboard shortcut
   */
  register(shortcut: KeyboardShortcut): void {
    this.shortcuts.push(shortcut);
  }
  
  /**
   * Register multiple shortcuts at once
   */
  registerMany(shortcuts: KeyboardShortcut[]): void {
    shortcuts.forEach(shortcut => this.register(shortcut));
  }
  
  /**
   * Unregister a shortcut by its key and modifiers
   */
  unregister(key: string, alt = false, ctrl = false, shift = false): void {
    this.shortcuts = this.shortcuts.filter(s => 
      !(s.key === key && 
        s.alt === alt && 
        s.ctrl === ctrl && 
        s.shift === shift)
    );
  }
  
  /**
   * Get all registered shortcuts
   */
  getShortcuts(): KeyboardShortcut[] {
    return [...this.shortcuts];
  }
  
  /**
   * Get shortcuts grouped by category
   */
  getShortcutsByGroup(): Record<string, KeyboardShortcut[]> {
    const groups: Record<string, KeyboardShortcut[]> = {};
    
    this.shortcuts.forEach(shortcut => {
      if (!groups[shortcut.group]) {
        groups[shortcut.group] = [];
      }
      groups[shortcut.group].push(shortcut);
    });
    
    return groups;
  }
  
  /**
   * Show the keyboard shortcuts help dialog
   */
  showShortcuts(): void {
    this.showShortcutsDialogSubject.next(true);
  }
  
  /**
   * Hide the keyboard shortcuts help dialog
   */
  hideShortcuts(): void {
    this.showShortcutsDialogSubject.next(false);
  }
  
  /**
   * Toggle the visibility of the keyboard shortcuts help dialog
   */
  toggleShortcutsDialog(): void {
    this.showShortcutsDialogSubject.next(true);
  }
  
  /**
   * Clean up resources on service destruction
   */
  destroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }
  
  /**
   * Check if an event matches a shortcut definition
   */
  private matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      !!event.altKey === !!shortcut.alt &&
      !!event.ctrlKey === !!shortcut.ctrl &&
      !!event.shiftKey === !!shortcut.shift
    );
  }
  
  /**
   * Register global shortcuts used throughout the application
   */
  private registerGlobalShortcuts(): void {
    // Group shortcuts by their functionality
    const navigationShortcuts = [
      {
        key: 'h',
        alt: true,
        description: 'Go to Home page',
        action: () => this.router.navigate(['/home']),
        group: 'Navigation'
      },
      {
        key: 'v',
        alt: true,
        description: 'Go to Vaults page',
        action: () => this.router.navigate(['/vaults']),
        group: 'Navigation'
      },
      {
        key: 'l',
        alt: true,
        description: 'Go to Learning page',
        action: () => this.router.navigate(['/learning']),
        group: 'Navigation'
      },
      {
        key: 'c',
        alt: true,
        description: 'Go to Community page',
        action: () => this.router.navigate(['/community']),
        group: 'Navigation'
      },
      {
        key: 'p',
        alt: true,
        description: 'Go to Profile page',
        action: () => this.router.navigate(['/profile']),
        group: 'Navigation'
      }
    ];
    
    const formShortcuts = [
      {
        key: 'e',
        alt: true,
        description: 'Focus email field',
        action: () => {}, // This is handled in component-specific code
        group: 'Forms'
      },
      {
        key: 'p',
        alt: true,
        description: 'Focus password field',
        action: () => {}, // This is handled in component-specific code
        group: 'Forms'
      },
      {
        key: 'g',
        alt: true,
        description: 'GitHub login',
        action: () => {}, // This is handled in component-specific code
        group: 'Forms'
      }
    ];
    
    const appearanceShortcuts = [
      {
        key: 't',
        alt: true,
        description: 'Toggle dark/light theme',
        action: () => this.themeService.toggleTheme(),
        group: 'Appearance'
      }
    ];
    
    const helpShortcuts = [
      {
        key: '/',
        alt: true,
        description: 'Show keyboard shortcuts',
        action: () => this.toggleShortcutsDialog(),
        group: 'Help'
      },
      {
        key: 'Escape',
        description: 'Close dialog or cancel operation',
        action: () => this.hideShortcuts(),
        group: 'Help'
      }
    ];
    
    // Register all shortcut groups
    this.registerMany([
      ...navigationShortcuts,
      ...formShortcuts,
      ...appearanceShortcuts,
      ...helpShortcuts
    ]);
  }
  
  /**
   * Format shortcut for display
   */
  getShortcutDisplay(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.shift) parts.push('Shift');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  }
}