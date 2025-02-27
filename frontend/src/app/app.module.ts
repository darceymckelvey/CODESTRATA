import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AppRoutingModule } from './app.routes';
import { AppComponent } from './app.component';
import { ErrorHandlerService } from './shared/services/error-handler.service';
import { AuthInterceptor } from './auth/interceptors/auth.interceptor';

/**
 * This module is only used for defining shared providers and imports.
 * The application is bootstrapped using standalone components in main.ts.
 */
@NgModule({
  declarations: [
    // No declarations - AppComponent is standalone
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    AppRoutingModule,
    MatSnackBarModule
    // Do not import AppComponent as it's standalone and bootstrapped directly
  ],
  providers: [
    // Use our custom error handler for all unhandled exceptions
    {
      provide: ErrorHandler,
      useClass: ErrorHandlerService
    },
    // Auth interceptor for handling authentication
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  exports: [
    // Export shared modules that might be needed by other parts of the app
  ]
  // No bootstrap array - AppComponent is bootstrapped directly in main.ts
})
export class AppModule { }