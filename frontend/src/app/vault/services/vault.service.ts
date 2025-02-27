import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TokenStorageService } from '../../auth/services/token/token-storage.service';
import { ErrorHandlerService } from '../../shared/services/error-handler.service';

// Define the CommandResponse interface
export interface CommandResponse {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VaultService {
  private apiUrl = 'http://localhost:3000/api'; // Using correct API URL

  constructor(
    private http: HttpClient,
    private router: Router,
    private tokenStorage: TokenStorageService,
    private errorHandler: ErrorHandlerService
  ) {}

  // Improved executeCommand method with better error handling and debugging
  executeCommand(vaultName: string, command: string, args: any[] = []): Observable<CommandResponse> {
    console.log(`[VAULT SERVICE] Executing command ${command} on vault ${vaultName} with args:`, args);
    
    // Check if we have authentication before making the request
    if (!this.tokenStorage.getToken()) {
      console.error('[VAULT SERVICE] No authentication token available');
      return throwError(() => new Error('No authentication token available'));
    }
    
    const url = `${this.apiUrl}/vaults/${vaultName}/command`;
    const payload = { command, args };
    
    console.log(`[VAULT SERVICE] Sending request to ${url} with payload:`, payload);
    
    return this.http.post<CommandResponse>(url, payload).pipe(
      tap(response => console.log(`[VAULT SERVICE] Command ${command} executed successfully:`, response)),
      catchError(error => {
        console.error(`[VAULT SERVICE] Error executing command ${command}:`, error);
        
        // Enhanced error handling for authentication errors
        if (error.status === 401) {
          console.error('[VAULT SERVICE] Authentication error - redirecting to login');
          // Create a custom error with authentication message
          const authError = new Error('Authentication required. Please log in again.');
          this.errorHandler.handleError(authError);
          this.router.navigate(['/login']);
          return throwError(() => new Error('Authentication required'));
        }
        
        return this.errorHandler.handleHttpError(error, `Failed to execute ${command}`);
      })
    );
  }

  // Improved createVault method with better error handling
  createVault(name: string): Observable<any> {
    console.log(`[VAULT SERVICE] Creating vault: ${name}`);
    
    // Check if we have authentication before making the request
    if (!this.tokenStorage.getToken()) {
      console.error('[VAULT SERVICE] No authentication token available for vault creation');
      return throwError(() => new Error('No authentication token available'));
    }
    
    return this.http.post(`${this.apiUrl}/vaults`, { name }).pipe(
      tap(response => console.log(`[VAULT SERVICE] Vault created successfully:`, response)),
      catchError(error => {
        console.error(`[VAULT SERVICE] Error creating vault:`, error);
        
        // Enhanced error handling for authentication errors
        if (error.status === 401) {
          console.error('[VAULT SERVICE] Authentication error during vault creation - redirecting to login');
          // Create a custom error with authentication message
          const authError = new Error('Authentication required to create a vault. Please log in again.');
          this.errorHandler.handleError(authError);
          this.router.navigate(['/login']);
          return throwError(() => new Error('Authentication required'));
        }
        
        return this.errorHandler.handleHttpError(error, 'Failed to create vault');
      })
    );
  }
} 