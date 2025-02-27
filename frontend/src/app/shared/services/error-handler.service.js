"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlerService = void 0;
const core_1 = require("@angular/core");
const http_1 = require("@angular/common/http");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let ErrorHandlerService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({
            providedIn: 'root'
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var ErrorHandlerService = _classThis = class {
        constructor(snackBar, router, ngZone, document) {
            this.snackBar = snackBar;
            this.router = router;
            this.ngZone = ngZone;
            this.document = document;
            // Subject for broadcasting error events to any interested components
            this.errorEvents = new rxjs_1.Subject();
            this.errorEvents$ = this.errorEvents.asObservable();
            // Tracks if we're currently in the process of handling an auth error
            this.handlingAuthError = false;
            // Standard retry configuration for network errors
            this.defaultRetryConfig = {
                count: 2,
                delay: 1000,
                exponentialBackoff: true,
                maxDelay: 6000
            };
        }
        /**
         * Implements Angular's ErrorHandler interface to catch all unhandled errors
         */
        handleError(error) {
            // Make sure we handle errors inside NgZone to trigger change detection
            this.ngZone.run(() => {
                console.error('Global error handler caught unhandled error:', error);
                let appError;
                // Format the error consistently
                if (error instanceof http_1.HttpErrorResponse) {
                    appError = this.formatHttpError(error, 'GlobalErrorHandler');
                }
                else if (error instanceof Error) {
                    appError = error;
                    appError.severity = 'medium';
                    appError.code = 'unhandled_exception';
                }
                else {
                    appError = new Error('An unknown error occurred');
                    appError.severity = 'medium';
                    appError.code = 'unknown_error';
                }
                // Broadcast the error to any subscribers
                this.errorEvents.next(appError);
                // Show user-friendly message for uncaught errors
                if (!appError.isHandled) {
                    this.showError('An unexpected error occurred. Please try again.', 5000);
                }
                // Log to monitoring service in production
                this.logError('Unhandled application error', appError);
            });
        }
        /**
         * Handles and formats HTTP errors with consistent error messages and logging
         * @param error The HTTP error response
         * @param serviceName Name of the service reporting the error (for logging)
         * @returns Observable that emits the formatted error
         */
        handleHttpError(error, serviceName) {
            // Format the error to our standard
            const appError = this.formatHttpError(error, serviceName);
            // Mark as handled so global handler doesn't show duplicate notifications
            appError.isHandled = true;
            // Handle network connectivity issues
            if (appError.isNetworkError) {
                // For network errors, component might want to retry
                console.warn(`[${serviceName}] Network error detected, components may retry`);
            }
            // Handle authentication issues
            if (appError.isAuthError && !this.handlingAuthError) {
                console.log(`[${serviceName}] Authentication error detected, handling auth flow`);
                this.handleUnauthorized();
            }
            // Broadcast the error to any subscribers
            this.errorEvents.next(appError);
            // Return a custom error object with additional context
            return (0, rxjs_1.throwError)(() => appError);
        }
        /**
         * Formats an HTTP error into our standard AppError format
         */
        formatHttpError(error, serviceName) {
            var _a, _b, _c, _d;
            let errorMessage = 'An error occurred';
            let errorCode = 'unknown_error';
            let severity = 'medium';
            // Log the error for debugging purposes
            console.error(`[${serviceName}] Error details:`, error);
            // Check for network connectivity issues
            const isNetworkError = error.status === 0;
            const isAuthError = error.status === 401 || error.status === 403;
            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = error.error.message;
                errorCode = 'client_error';
                severity = 'medium';
            }
            else {
                // Server-side error
                if ((_a = error.error) === null || _a === void 0 ? void 0 : _a.code) {
                    errorCode = error.error.code;
                }
                else if (error.status) {
                    errorCode = `http_${error.status}`;
                }
                // Determine severity based on status code
                if (error.status >= 500) {
                    severity = 'high'; // Server errors are high priority
                }
                else if (error.status === 0) {
                    severity = 'medium'; // Network errors are medium priority
                }
                else if (error.status === 401 || error.status === 403) {
                    severity = 'medium'; // Auth errors are medium priority
                }
                else {
                    severity = 'low'; // Client errors are low priority
                }
                // Check for HTML response by examining content-type header
                const contentType = (_b = error.headers) === null || _b === void 0 ? void 0 : _b.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    errorMessage = 'The API server may be down or returning an error page.';
                    errorCode = 'html_response';
                    console.warn(`[${serviceName}] Received HTML instead of JSON response:`, {
                        url: error.url,
                        status: error.status,
                        contentType
                    });
                }
                // Handle JSON parse errors specifically
                else if (error.error instanceof SyntaxError && error.error.message.includes('JSON')) {
                    errorMessage = 'The server response was not valid. This might indicate API issues.';
                    errorCode = 'invalid_json';
                    // Check for HTML response
                    if (error.error.message.includes('Unexpected token \'<\'')) {
                        errorMessage = 'The API server may be down or returning an error page.';
                        errorCode = 'html_response';
                    }
                }
                else {
                    errorMessage = ((_c = error.error) === null || _c === void 0 ? void 0 : _c.message) || this.getErrorMessage(error.status);
                }
            }
            // Add timestamp for logging/tracking purposes
            const errorContext = {
                timestamp: new Date().toISOString(),
                url: error.url || 'unknown',
                code: errorCode,
                status: error.status,
                details: (_d = error.error) === null || _d === void 0 ? void 0 : _d.details
            };
            console.error(`[${serviceName}] Formatted error:`, Object.assign({ message: errorMessage }, errorContext));
            // Create enhanced error object
            const enhancedError = new Error(errorMessage);
            enhancedError.context = errorContext;
            enhancedError.code = errorCode;
            enhancedError.severity = severity;
            enhancedError.isNetworkError = isNetworkError;
            enhancedError.isAuthError = isAuthError;
            return enhancedError;
        }
        /**
         * Gets a user-friendly error message based on HTTP status code
         * @param status HTTP status code
         * @returns User-friendly error message
         */
        getErrorMessage(status) {
            switch (status) {
                case 400:
                    return 'Invalid request - please check the data you submitted';
                case 401:
                    return 'Invalid credentials or session expired';
                case 403:
                    return 'Access denied - you do not have permission to access this resource';
                case 404:
                    return 'Resource not found';
                case 409:
                    return 'Conflict detected - this resource may already exist';
                case 422:
                    return 'Validation error - please check your input';
                case 429:
                    return 'Too many attempts - please try again later';
                case 500:
                    return 'Server error - our team has been notified';
                case 502:
                case 503:
                case 504:
                    return 'Service temporarily unavailable - please try again later';
                default:
                    return 'An unexpected error occurred';
            }
        }
        /**
         * Processes an error object and gets a user-friendly message
         * @param error Error object (can be of type AppError)
         * @param defaultMessage Default message to show if no specific message is found
         * @returns User-friendly error message
         */
        getDisplayErrorMessage(error, defaultMessage) {
            var _a;
            if (!error) {
                return defaultMessage;
            }
            // Check if it's our enhanced error type
            if (error.code) {
                // Handle specific error codes
                switch (error.code) {
                    case 'http_401':
                        return 'Your session has expired. Please log in again.';
                    case 'http_403':
                        return 'You do not have permission to perform this action.';
                    case 'http_404':
                        return 'The requested resource could not be found.';
                    case 'client_error':
                        return 'Connection error. Please check your internet and try again.';
                    default:
                        return error.message || defaultMessage;
                }
            }
            // Regular error object
            return error.message || ((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || defaultMessage;
        }
        /**
         * Creates a standardized retry configuration for HTTP requests
         * @param customConfig Optional custom retry settings
         */
        createRetryConfig(customConfig) {
            const config = Object.assign(Object.assign({}, this.defaultRetryConfig), customConfig);
            // Return a function that can be used with RxJS retry operator
            return (errors) => {
                return errors.pipe((0, operators_1.retry)({
                    count: config.count,
                    delay: (error, retryCount) => {
                        // Only retry network errors and 5xx server errors
                        if (error.status !== 0 && (error.status < 500 || error.status >= 600)) {
                            console.log(`Not retrying error with status ${error.status}`);
                            return (0, rxjs_1.throwError)(() => error);
                        }
                        // Calculate delay with exponential backoff if enabled
                        let delayMs = config.delay;
                        if (config.exponentialBackoff) {
                            delayMs = Math.min(delayMs * Math.pow(2, retryCount - 1), config.maxDelay);
                        }
                        console.log(`Retrying after ${delayMs}ms (attempt ${retryCount}/${config.count})`);
                        // Now we can use delay with the proper import
                        return (0, rxjs_1.of)(null).pipe((0, operators_1.delay)(delayMs));
                    }
                }));
            };
        }
        /**
         * Shows an error message to the user via snackbar with standardized styling
         * @param message Error message to display
         * @param duration Duration to show the message (in ms)
         * @param severity Optional severity level that affects visual styling
         */
        showError(message, duration = 5000, severity = 'medium') {
            // Choose CSS class based on severity
            let panelClass = ['error-snackbar'];
            switch (severity) {
                case 'critical':
                    panelClass = ['error-snackbar', 'error-critical'];
                    duration = 10000; // Critical errors stay longer
                    break;
                case 'high':
                    panelClass = ['error-snackbar', 'error-high'];
                    duration = 7000; // High severity errors stay longer
                    break;
                case 'medium':
                    panelClass = ['error-snackbar', 'error-medium'];
                    break;
                case 'low':
                    panelClass = ['error-snackbar', 'error-low'];
                    duration = 3000; // Low severity errors disappear faster
                    break;
            }
            this.snackBar.open(message, 'Close', {
                duration,
                panelClass,
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
            });
        }
        /**
         * Show a network connectivity error with options to retry
         * @param message Error message
         * @param retryCallback Optional callback function if user wants to retry
         */
        showNetworkError(message = 'Network connectivity issue. Please check your connection.', retryCallback) {
            const snackBarRef = this.snackBar.open(message, 'Retry', {
                duration: 10000,
                panelClass: ['error-snackbar', 'network-error'],
                horizontalPosition: 'center',
                verticalPosition: 'bottom',
            });
            if (retryCallback) {
                snackBarRef.onAction().subscribe(() => {
                    console.log('User requested retry after network error');
                    retryCallback();
                });
            }
        }
        /**
         * Logs an error for debugging and tracking
         * @param message The main error message
         * @param context Additional context about the error
         */
        logError(message, context = {}) {
            const timestamp = new Date().toISOString();
            const errorLog = Object.assign({ timestamp,
                message, appVersion: '1.0.0', browser: this.getBrowserInfo(), url: this.document.location.href }, context);
            console.error('[ErrorHandler] Error logged:', errorLog);
            // In a production app, we would send this to a monitoring service
            // like Sentry, LogRocket, etc.
            // For example:
            // if (environment.production) {
            //   Sentry.captureException(context instanceof Error ? context : new Error(message), {
            //     extra: errorLog
            //   });
            // }
        }
        /**
         * Get browser information for error logging
         */
        getBrowserInfo() {
            var _a, _b, _c, _d, _e;
            // Simple browser detection for logging
            const userAgent = ((_a = this.document.defaultView) === null || _a === void 0 ? void 0 : _a.navigator.userAgent) || 'Unknown';
            if (userAgent.indexOf('Firefox') !== -1) {
                return `Firefox ${((_b = userAgent.match(/Firefox\/([0-9.]+)/)) === null || _b === void 0 ? void 0 : _b[1]) || ''}`;
            }
            else if (userAgent.indexOf('Chrome') !== -1) {
                return `Chrome ${((_c = userAgent.match(/Chrome\/([0-9.]+)/)) === null || _c === void 0 ? void 0 : _c[1]) || ''}`;
            }
            else if (userAgent.indexOf('Safari') !== -1) {
                return `Safari ${((_d = userAgent.match(/Version\/([0-9.]+)/)) === null || _d === void 0 ? void 0 : _d[1]) || ''}`;
            }
            else if (userAgent.indexOf('Edge') !== -1) {
                return `Edge ${((_e = userAgent.match(/Edge\/([0-9.]+)/)) === null || _e === void 0 ? void 0 : _e[1]) || ''}`;
            }
            else {
                return userAgent;
            }
        }
        /**
         * Handles unauthorized errors (401)
         * Redirects to login and shows appropriate message
         */
        handleUnauthorized() {
            // Prevent multiple redirects
            if (this.handlingAuthError) {
                return;
            }
            this.handlingAuthError = true;
            console.log('Handling unauthorized error, redirecting to login');
            // Clear all auth-related data from local storage
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('github_oauth_state');
            localStorage.removeItem('github_state');
            localStorage.removeItem('github_state_created');
            // Clear session storage items too
            sessionStorage.removeItem('auth_check_in_progress');
            sessionStorage.removeItem('auth_check_start_time');
            sessionStorage.removeItem('auth_check_id');
            sessionStorage.removeItem('auth_fail_count');
            // Navigate to login with a message
            this.ngZone.run(() => {
                this.router.navigate(['/login'], {
                    queryParams: {
                        error: 'session_expired'
                    }
                }).then(() => {
                    this.showError('Your session has expired. Please log in again.', 5000, 'medium');
                    // Reset the flag after a delay to allow for potential failed redirects
                    setTimeout(() => {
                        this.handlingAuthError = false;
                    }, 5000);
                }).catch(err => {
                    console.error('Error navigating to login:', err);
                    this.handlingAuthError = false;
                });
            });
        }
    };
    __setFunctionName(_classThis, "ErrorHandlerService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ErrorHandlerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ErrorHandlerService = _classThis;
})();
exports.ErrorHandlerService = ErrorHandlerService;
