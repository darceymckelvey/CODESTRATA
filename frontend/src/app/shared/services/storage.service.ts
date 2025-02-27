import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Service to handle storage operations abstracting localStorage/sessionStorage
 * to be safe in both browser and server environments.
 * Also supports storing objects with automatic JSON serialization.
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private isBrowser: boolean;
  private memoryStorage: Map<string, string> = new Map();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Determines if we can use localStorage
   */
  canUseLocalStorage(): boolean {
    if (!this.isBrowser || typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    // Test if localStorage is actually available (it might be disabled)
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get an item from storage (localStorage or memory fallback)
   */
  getItem(key: string): string | null {
    if (this.canUseLocalStorage()) {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        return this.memoryStorage.get(key) || null;
      }
    } else {
      return this.memoryStorage.get(key) || null;
    }
  }

  /**
   * Set an item in storage (localStorage or memory fallback)
   */
  setItem(key: string, value: string): boolean {
    if (this.canUseLocalStorage()) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (error) {
        console.error('Error writing to localStorage:', error);
        this.memoryStorage.set(key, value);
        return false;
      }
    } else {
      this.memoryStorage.set(key, value);
      return false;
    }
  }

  /**
   * Remove an item from storage
   */
  removeItem(key: string): void {
    if (this.canUseLocalStorage()) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    }
    this.memoryStorage.delete(key);
  }

  /**
   * Clear all items from storage
   */
  clear(): void {
    if (this.canUseLocalStorage()) {
      try {
        localStorage.clear();
      } catch (error) {
        console.error('Error clearing localStorage:', error);
      }
    }
    this.memoryStorage.clear();
  }
  
  /**
   * Get and parse a JSON object from storage
   */
  getObject<T>(key: string): T | null {
    const value = this.getItem(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error parsing stored JSON for key "${key}":`, error);
      return null;
    }
  }
  
  /**
   * Stringify and store an object
   */
  setObject<T>(key: string, value: T): boolean {
    try {
      const serialized = JSON.stringify(value);
      return this.setItem(key, serialized);
    } catch (error) {
      console.error(`Error stringifying object for key "${key}":`, error);
      return false;
    }
  }
}
