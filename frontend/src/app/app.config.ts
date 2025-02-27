import { ApplicationConfig, APP_INITIALIZER, importProvidersFrom, inject, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HttpClientModule, provideHttpClient, withFetch, withInterceptors, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, DomSanitizer } from '@angular/platform-browser';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { MatIconRegistry } from '@angular/material/icon';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faGithub } from '@fortawesome/free-brands-svg-icons';

import { routes } from './app.routes';
import { ThemeService } from './theme/theme.service';
import { AuthInterceptor } from './auth/interceptors/auth.interceptor';
import { AuthService } from './auth/services/auth.service';
import { ErrorHandlerService } from './shared/services/error-handler.service';

export function initializeApp() {
  const iconRegistry = inject(MatIconRegistry);
  const domSanitizer = inject(DomSanitizer);
  
  return () => {
    // Register GitHub icon
    iconRegistry.addSvgIconLiteral(
      ':github',
      domSanitizer.bypassSecurityTrustHtml(`
        <svg width="98" height="96" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z" fill="currentColor"/>
        </svg>
      `)
    );
  };
}

// Factory function to initialize theme
export function initializeTheme(themeService: ThemeService) {
  return () => {
    // This will trigger the theme service constructor which sets up themes
    console.log('Theme service initialized');
    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideAnimations(),
    provideClientHydration(),
    importProvidersFrom(HttpClientModule),
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { duration: 3000 }
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      multi: true,
    },
    // Theme service initializer
    {
      provide: APP_INITIALIZER,
      useFactory: initializeTheme,
      deps: [ThemeService],
      multi: true
    },
    AuthService,
    ErrorHandlerService,
    { provide: ErrorHandler, useClass: ErrorHandlerService },
  ]
};
