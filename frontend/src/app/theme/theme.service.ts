import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'preferred_theme';
  private defaultTheme: Theme = 'system';
  private memoryTheme: Theme | null = null;
  private useMemoryFallback = false;
  
  // Theme observable that components can subscribe to
  private themeSubject = new BehaviorSubject<Theme>(this.defaultTheme);
  public theme$ = this.themeSubject.asObservable();
  
  // Media query for detecting system preference
  private prefersDarkMedia: MediaQueryList | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Initialize theme
    this.initializeTheme();
    
    // Listen for system preference changes if browser supports it
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.prefersDarkMedia = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Use newer method if available (avoid deprecated addListener)
        if (this.prefersDarkMedia.addEventListener) {
          this.prefersDarkMedia.addEventListener('change', this.handleSystemThemeChange.bind(this));
        } else if (this.prefersDarkMedia.addListener) {
          // Fallback for older browsers
          this.prefersDarkMedia.addListener(this.handleSystemThemeChange.bind(this));
        }
      } catch (error) {
        console.error('Error setting up theme listener:', error);
      }
    }
  }

  /**
   * Initializes the theme from storage or defaults to system preference
   */
  private initializeTheme(): void {
    let storedTheme: Theme | null = null;
    
    if (isPlatformBrowser(this.platformId)) {
      try {
        // Try to get theme from localStorage
        const themeFromStorage = localStorage.getItem(this.THEME_KEY) as Theme | null;
        
        if (themeFromStorage && this.isValidTheme(themeFromStorage)) {
          storedTheme = themeFromStorage;
        }
      } catch (error) {
        console.warn('Unable to access localStorage for theme:', error);
        this.useMemoryFallback = true;
      }
    } else {
      // In SSR, use memory fallback
      this.useMemoryFallback = true;
    }
    
    // Set initial theme (fallback to default if none found)
    const initialTheme = storedTheme || this.memoryTheme || this.defaultTheme;
    this.themeSubject.next(initialTheme);
    
    // Apply theme to document if in browser
    if (isPlatformBrowser(this.platformId)) {
      this.applyThemeToDocument(initialTheme);
    }
  }

  /**
   * Validates if a theme string is a valid theme option
   */
  private isValidTheme(theme: string): theme is Theme {
    return ['light', 'dark', 'system'].includes(theme);
  }

  /**
   * Gets the current selected theme
   */
  public getCurrentTheme(): Theme {
    return this.themeSubject.getValue();
  }

  /**
   * Sets a new theme and stores the preference
   */
  public setTheme(theme: Theme): void {
    if (!this.isValidTheme(theme)) {
      console.error(`Invalid theme: ${theme}`);
      return;
    }
    
    // Update theme in memory
    this.themeSubject.next(theme);
    
    // Store in memory fallback if needed
    if (this.useMemoryFallback) {
      this.memoryTheme = theme;
    }
    
    // Also store in localStorage if in browser context
    if (isPlatformBrowser(this.platformId) && !this.useMemoryFallback) {
      try {
        localStorage.setItem(this.THEME_KEY, theme);
      } catch (error) {
        console.warn('Could not save theme preference to localStorage:', error);
        this.useMemoryFallback = true;
        this.memoryTheme = theme;
      }
    }
    
    // Apply theme to document
    if (isPlatformBrowser(this.platformId)) {
      this.applyThemeToDocument(theme);
    }
  }

  /**
   * Applies the theme to the document by setting the appropriate class
   */
  private applyThemeToDocument(theme: Theme): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      const isDark = theme === 'dark' || 
        (theme === 'system' && this.prefersDarkMedia?.matches);
      
      // Remove existing theme classes
      document.documentElement.classList.remove('light-theme', 'dark-theme');
      
      // Add the appropriate theme class
      document.documentElement.classList.add(isDark ? 'dark-theme' : 'light-theme');
      
      // For Tailwind dark mode support
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch (error) {
      console.error('Error applying theme to document:', error);
    }
  }

  /**
   * Handle system theme preference changes
   */
  private handleSystemThemeChange(event: MediaQueryListEvent): void {
    // Only re-apply if current theme is set to follow system
    if (this.getCurrentTheme() === 'system' && isPlatformBrowser(this.platformId)) {
      this.applyThemeToDocument('system');
    }
  }

  /**
   * Toggle between light and dark themes
   * If current theme is system, switches to light/dark based on current system theme
   */
  public toggleTheme(): void {
    const currentTheme = this.getCurrentTheme();
    
    if (currentTheme === 'light') {
      this.setTheme('dark');
    } else if (currentTheme === 'dark') {
      this.setTheme('light');
    } else if (currentTheme === 'system') {
      // If system, toggle to opposite of current system preference
      if (isPlatformBrowser(this.platformId) && this.prefersDarkMedia?.matches) {
        this.setTheme('light');
      } else {
        this.setTheme('dark');
      }
    }
  }
} 