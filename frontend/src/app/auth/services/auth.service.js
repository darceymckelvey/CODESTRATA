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
exports.AuthService = void 0;
const core_1 = require("@angular/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const common_1 = require("@angular/common");
const api_config_1 = require("../../core/config/api.config");
const environment_1 = require("../../../environments/environment");
let AuthService = (() => {
    let _classDecorators = [(0, core_1.Injectable)({ providedIn: 'root' })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AuthService = _classThis = class {
        constructor(http, router, errorHandler, platformId) {
            this.http = http;
            this.router = router;
            this.errorHandler = errorHandler;
            this.platformId = platformId;
            this.TOKEN_KEY = 'auth_token';
            this.REFRESH_TOKEN_KEY = 'refresh_token';
            this.MAX_REFRESH_ATTEMPTS = 3;
            this.userSubject = new rxjs_1.BehaviorSubject(null);
            this.authStateSubject = new rxjs_1.BehaviorSubject(false);
            this.refreshInProgress = false;
            this.refreshAttempts = 0;
            this.refreshTokenSubject = new rxjs_1.Subject();
            // For cleaning up resources when service is destroyed
            this.destroy$ = new rxjs_1.Subject();
            this.usesCookies = false; // Flag to track if we're using cookies for auth
            this.user$ = this.userSubject.asObservable();
            this.authState$ = this.authStateSubject.asObservable();
            this.fetchProfileInProgress = false;
            // Store subscription references for later cleanup
            this.initAuthSubscription = null;
            // Store timeout IDs for cleanup
            this.timeoutIds = [];
            this.profileFetchSubscription = null;
            if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                this.initializeAuth();
            }
        }
        initializeAuth() {
            try {
                console.log('Initializing authentication state');
                // Check for potential localStorage access issues early
                try {
                    // Test localStorage availability
                    localStorage.setItem('_auth_test', '1');
                    localStorage.removeItem('_auth_test');
                }
                catch (storageError) {
                    console.error('Cannot access localStorage:', storageError);
                    // If localStorage is not available, we can't proceed with token-based auth
                    this.authStateSubject.next(false);
                    this.usesCookies = true; // Fall back to cookies as we can't use localStorage
                    return;
                }
                // First check if we have a token in localStorage
                const token = this.getToken();
                const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
                if (token) {
                    console.log('Found token in localStorage, validating...');
                    // Check if there's also a refresh token
                    if (!refreshToken) {
                        console.warn('No refresh token found but access token exists');
                    }
                    // Validate the token
                    if (this.isTokenValid(token)) {
                        console.log('Token is valid, setting auth state to true');
                        // We have a valid token in localStorage, update auth state immediately
                        this.authStateSubject.next(true);
                        // Try to load the user profile
                        this.initAuthSubscription = this.getUserProfile().subscribe({
                            next: (user) => {
                                console.log('User profile loaded successfully during initialization');
                                this.userSubject.next(user);
                                // Cleanup subscription
                                if (this.initAuthSubscription) {
                                    this.initAuthSubscription.unsubscribe();
                                    this.initAuthSubscription = null;
                                }
                            },
                            error: (error) => {
                                // Cleanup subscription
                                if (this.initAuthSubscription) {
                                    this.initAuthSubscription.unsubscribe();
                                    this.initAuthSubscription = null;
                                }
                                // Don't show connection errors as they're expected when backend is down
                                if (error.status === 0) {
                                    console.log('Backend not available during initialization, will retry later');
                                    return;
                                }
                                console.error('Error loading user profile from token:', error);
                                // Even if profile loading fails, we keep auth state true if token is valid
                                // This helps prevent unwanted redirects to login
                                if (error.status !== 401) {
                                    console.log('Error is not 401, keeping auth state true');
                                }
                                else {
                                    console.log('401 error, clearing auth state');
                                    this.clearAuth();
                                    // If we have a refresh token but got a 401, try refreshing the token
                                    if (refreshToken && !this.refreshInProgress && this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
                                        console.log('Attempting to refresh token after 401 during initialization');
                                        const refreshSubscription = this.refreshToken().subscribe({
                                            next: () => {
                                                console.log('Token refreshed successfully during initialization');
                                                // Retry loading profile after token refresh
                                                const profileSubscription = this.getUserProfile().subscribe({
                                                    next: (user) => {
                                                        console.log('User profile loaded after token refresh during initialization');
                                                        profileSubscription.unsubscribe();
                                                    },
                                                    error: (err) => {
                                                        console.error('Failed to load profile after token refresh:', err);
                                                        profileSubscription.unsubscribe();
                                                    }
                                                });
                                                refreshSubscription.unsubscribe();
                                            },
                                            error: (err) => {
                                                console.error('Failed to refresh token during initialization:', err);
                                                refreshSubscription.unsubscribe();
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                    else {
                        console.log('Token found but is invalid, attempting refresh');
                        // If we have a refresh token, try to use it to get a new access token
                        if (refreshToken && !this.refreshInProgress) {
                            const refreshSubscription = this.refreshToken().subscribe({
                                next: () => {
                                    console.log('Successfully refreshed token during initialization');
                                    // After successful refresh, we should have valid tokens and auth state
                                    // Try to load the user profile
                                    const profileSubscription = this.getUserProfile().subscribe({
                                        next: (user) => {
                                            console.log('User profile loaded after token refresh during initialization');
                                            profileSubscription.unsubscribe();
                                        },
                                        error: (err) => {
                                            console.error('Failed to load profile after token refresh:', err);
                                            profileSubscription.unsubscribe();
                                        }
                                    });
                                    refreshSubscription.unsubscribe();
                                },
                                error: () => {
                                    console.log('Failed to refresh token during initialization, clearing auth state');
                                    this.clearAuth();
                                    refreshSubscription.unsubscribe();
                                }
                            });
                        }
                        else {
                            console.log('No valid refresh token available, clearing auth state');
                            this.clearAuth();
                        }
                    }
                }
                else {
                    console.log('No token found in localStorage');
                    // Check if we have just a refresh token (unusual but possible)
                    if (refreshToken && !this.refreshInProgress) {
                        console.log('No access token but refresh token found, attempting refresh');
                        const refreshOnlySubscription = this.refreshToken().subscribe({
                            next: () => {
                                console.log('Successfully refreshed token from refresh-only state');
                                refreshOnlySubscription.unsubscribe();
                            },
                            error: () => {
                                console.log('Failed to refresh with refresh-only token, clearing auth');
                                this.clearAuth();
                                refreshOnlySubscription.unsubscribe();
                            }
                        });
                        return;
                    }
                    // If we're in development, don't try to check for cookie-based session
                    // to avoid unnecessary network errors
                    if (environment_1.environment.production) {
                        // Try to check if we have a cookie-based session
                        const cookieCheckSubscription = this.refreshAuthState().subscribe({
                            next: (success) => {
                                console.log(success ? 'Cookie-based session found' : 'No cookie-based session');
                                cookieCheckSubscription.unsubscribe();
                            },
                            error: () => {
                                console.log('No cookie-based session found');
                                cookieCheckSubscription.unsubscribe();
                            }
                        });
                    }
                    else {
                        console.log('Skipping cookie-based session check in development environment');
                    }
                }
            }
            catch (error) {
                console.error('Error during auth initialization:', error);
                this.clearAuth();
            }
        }
        clearAuth() {
            if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                try {
                    // Clear all auth-related items
                    localStorage.removeItem(this.TOKEN_KEY);
                    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
                    localStorage.removeItem('github_oauth_state');
                    localStorage.removeItem('github_state');
                    // Clear session storage items too
                    sessionStorage.removeItem('auth_check_in_progress');
                    sessionStorage.removeItem('auth_check_start_time');
                    console.log('Authentication data cleared from storage');
                }
                catch (error) {
                    console.error('Error clearing auth storage:', error);
                }
            }
            // Reset state
            this.userSubject.next(null);
            this.authStateSubject.next(false);
            this.usesCookies = false;
            this.refreshAttempts = 0;
            this.refreshInProgress = false;
        }
        login(email, password) {
            return this.http.post(api_config_1.AUTH.LOGIN, { email, password }).pipe((0, operators_1.tap)((response) => {
                console.log('Login response received:', {
                    useCookies: response.useCookies,
                    hasToken: !!response.token,
                    hasUser: !!response.user
                });
                this.handleAuthSuccess(response);
                // Log the current authentication state after handling the response
                console.log('Auth state after login:', {
                    isAuthenticated: this.isAuthenticated(),
                    usingCookies: this.usesCookies,
                    hasUserData: !!this.userSubject.value
                });
            }), (0, operators_1.catchError)((error) => {
                console.error('Login error:', error);
                return this.errorHandler.handleHttpError(error, 'AuthService');
            }));
        }
        register(username, email, password) {
            return this.http
                .post(api_config_1.AUTH.REGISTER, { username, email, password })
                .pipe((0, operators_1.tap)((response) => {
                this.handleAuthSuccess(response);
                this.authStateSubject.next(true);
            }), (0, operators_1.catchError)((error) => this.errorHandler.handleHttpError(error, 'AuthService')));
        }
        refreshToken() {
            console.log('Attempting to refresh token...');
            // If a refresh is already in progress, return the existing refresh observable
            if (this.refreshInProgress) {
                console.log('Refresh already in progress, returning existing observable');
                return this.refreshTokenSubject.pipe((0, operators_1.filter)(token => token !== null), (0, operators_1.take)(1), (0, operators_1.switchMap)(() => {
                    // Return a new AuthResponse when the refresh completes
                    const currentUser = this.userSubject.value;
                    const token = this.getToken();
                    const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
                    if (!token || !currentUser) {
                        return (0, rxjs_1.throwError)(() => new Error('Token refresh failed'));
                    }
                    return (0, rxjs_1.of)({
                        token,
                        refreshToken: refreshToken || '',
                        user: currentUser
                    });
                }));
            }
            const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
            if (!refreshToken) {
                console.error('No refresh token available in localStorage');
                this.clearAuth();
                return (0, rxjs_1.throwError)(() => new Error('No refresh token available'));
            }
            // Ensure refreshTokenSubject is ready for new subscribers
            if (!this.refreshTokenSubject || this.refreshTokenSubject.closed) {
                this.refreshTokenSubject = new rxjs_1.Subject();
            }
            // Increment refresh attempt counter
            this.refreshAttempts++;
            // Mark refresh as in progress to prevent multiple concurrent requests
            this.refreshInProgress = true;
            console.log(`Refresh attempt ${this.refreshAttempts}/${this.MAX_REFRESH_ATTEMPTS}`);
            // Send refresh token to server
            return this.http
                .post(api_config_1.AUTH.REFRESH, { refreshToken })
                .pipe((0, operators_1.tap)((response) => {
                // Reset refresh attempts on success
                this.refreshAttempts = 0;
                console.log('Token refreshed successfully');
                // Store the new tokens
                if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                    if (response.token) {
                        localStorage.setItem(this.TOKEN_KEY, response.token);
                    }
                    else {
                        console.warn('No token received in refresh response');
                    }
                    if (response.refreshToken) {
                        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
                    }
                    else {
                        console.warn('No refresh token received in refresh response');
                    }
                }
                // Update the authentication state
                this.authStateSubject.next(true);
                // Update user data if included in response
                if (response.user) {
                    console.log('User data included in refresh response:', response.user.username);
                    this.userSubject.next(response.user);
                }
                // Notify subscribers that token refresh is complete
                this.refreshTokenSubject.next(response.token);
            }), (0, operators_1.catchError)((error) => {
                var _a, _b, _c;
                console.error('[AuthService] Token refresh failed:', error);
                // Notify subscribers that refresh failed
                this.refreshTokenSubject.next(null);
                // Handle specific error cases
                if ((error === null || error === void 0 ? void 0 : error.status) === 401 ||
                    ((_a = error === null || error === void 0 ? void 0 : error.error) === null || _a === void 0 ? void 0 : _a.message) === 'Invalid refresh token' ||
                    ((_b = error === null || error === void 0 ? void 0 : error.error) === null || _b === void 0 ? void 0 : _b.code) === 'TOKEN_EXPIRED' ||
                    ((_c = error === null || error === void 0 ? void 0 : error.error) === null || _c === void 0 ? void 0 : _c.code) === 'TOKEN_INVALID') {
                    console.log('Invalid or expired refresh token, clearing auth state');
                    this.clearAuth();
                    // Create an error that preserves the HTTP status
                    const enhancedError = new Error('Invalid or expired refresh token');
                    enhancedError.status = error.status;
                    enhancedError.originalError = error;
                    return (0, rxjs_1.throwError)(() => enhancedError);
                }
                // For network errors, don't clear auth if this could be a temporary issue
                if (error.status === 0) {
                    console.log('Network error during token refresh, might be temporary');
                    const networkError = new Error('Network error during token refresh');
                    networkError.status = 0;
                    return (0, rxjs_1.throwError)(() => networkError);
                }
                // For other errors, preserve the original error status
                const otherError = new Error(error.message || 'Token refresh failed');
                otherError.status = error.status;
                otherError.originalError = error;
                return (0, rxjs_1.throwError)(() => otherError);
            }), (0, operators_1.finalize)(() => {
                console.log('Token refresh request completed');
                // Mark refresh as no longer in progress
                this.refreshInProgress = false;
            }));
        }
        logout() {
            console.log('Logging out user');
            // Reset auth state first
            this.authStateSubject.next(false);
            this.userSubject.next(null);
            // Clear any refresh attempts in progress
            this.refreshInProgress = false;
            this.refreshAttempts = 0;
            this.fetchProfileInProgress = false;
            // Notify any pending refresh requests
            this.refreshTokenSubject.next(null);
            this.refreshTokenSubject.complete();
            // Create a new subject for future refreshes
            this.refreshTokenSubject = new rxjs_1.Subject();
            // Clear all stored tokens and states
            if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                try {
                    localStorage.removeItem(this.TOKEN_KEY);
                    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
                    // Clear GitHub related state
                    localStorage.removeItem('github_oauth_state');
                    localStorage.removeItem('github_state');
                    // Clear any other auth related state
                    sessionStorage.removeItem('auth_check_in_progress');
                    sessionStorage.removeItem('auth_check_start_time');
                    console.log('Auth storage cleared successfully');
                }
                catch (error) {
                    console.error('Error clearing auth storage:', error);
                }
            }
            // Navigate to login using a Promise to avoid potential race conditions
            Promise.resolve().then(() => {
                this.router.navigate(['/login'], {
                    queryParams: { logout: 'success' }
                }).catch(err => {
                    console.error('Error navigating to login page:', err);
                });
            });
        }
        getUserProfile() {
            console.debug('Fetching user profile from API...');
            // If we're already fetching the profile, return the ongoing request
            if (this.fetchProfileInProgress) {
                console.debug('Profile fetch already in progress, returning existing observable');
                return this.userSubject.asObservable().pipe((0, operators_1.filter)((user) => !!user), // Type guard to ensure non-null
                (0, operators_1.first)(), (0, operators_1.timeout)(10000), // 10 second timeout for user fetch
                (0, operators_1.catchError)(err => {
                    console.warn('Timeout waiting for user profile', err);
                    return (0, rxjs_1.throwError)(() => new Error('Timeout waiting for user profile'));
                }));
            }
            // Check if token exists before making the request
            const token = this.getToken();
            if (!token) {
                console.error('Attempted to fetch user profile without a valid token');
                return (0, rxjs_1.throwError)(() => new Error('No authentication token available'));
            }
            this.fetchProfileInProgress = true;
            return this.http.get(api_config_1.AUTH.PROFILE).pipe((0, operators_1.tap)((user) => {
                console.debug('User profile fetched successfully:', user.username);
                this.userSubject.next(user);
                this.authStateSubject.next(true);
            }), (0, operators_1.catchError)((error) => {
                console.error('Error fetching user profile:', error);
                // Check if we can try to refresh the token
                if (error.status === 401 && !this.refreshInProgress && this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
                    console.log('Attempting to refresh token after 401 error in getUserProfile');
                    return this.refreshToken().pipe((0, operators_1.switchMap)((response) => {
                        console.log('Token refreshed successfully, retrying profile fetch');
                        // Verify we have a token before retrying
                        if (!response.token) {
                            return (0, rxjs_1.throwError)(() => new Error('Token refresh succeeded but no token returned'));
                        }
                        // Retry the request with the new token
                        return this.http.get(api_config_1.AUTH.PROFILE).pipe((0, operators_1.tap)((user) => {
                            console.log('User profile fetch successful after token refresh');
                            this.userSubject.next(user);
                            this.authStateSubject.next(true);
                        }));
                    }), (0, operators_1.catchError)((refreshError) => {
                        console.error('Token refresh failed during profile fetch:', refreshError);
                        // If the refresh token failed with an auth error, ensure we're logged out
                        if (refreshError.status === 401) {
                            this.clearAuth();
                            console.debug('Auth state cleared due to 401 during token refresh');
                            return (0, rxjs_1.throwError)(() => new Error('Authentication required'));
                        }
                        // For network errors, keep the auth state but return the error
                        if (refreshError.status === 0) {
                            console.log('Network error during refresh, maintaining auth state');
                            return (0, rxjs_1.throwError)(() => new Error('Network error during authentication'));
                        }
                        // For other errors, retain the auth state unless explicitly told not to
                        if (refreshError.clearAuth === true) {
                            this.clearAuth();
                        }
                        else {
                            console.warn('Error is not 401, keeping auth state pending network recovery');
                        }
                        return (0, rxjs_1.throwError)(() => refreshError);
                    }), (0, operators_1.finalize)(() => {
                        this.fetchProfileInProgress = false;
                    }));
                }
                else if (error.status === 401) {
                    // If we can't refresh the token (max attempts reached or already in progress)
                    console.warn('Unable to refresh token for profile fetch: ' +
                        (this.refreshInProgress ? 'refresh in progress' : 'max attempts reached'));
                    this.clearAuth();
                    this.fetchProfileInProgress = false;
                    return (0, rxjs_1.throwError)(() => new Error('Authentication required'));
                }
                // For network errors, keep auth state
                if (error.status === 0) {
                    console.log('Network error during profile fetch, maintaining auth state');
                    this.fetchProfileInProgress = false;
                    return (0, rxjs_1.throwError)(() => new Error('Network error loading user profile'));
                }
                // For other errors, log and rethrow but don't clear auth
                console.log('Error loading user profile from token:', error);
                console.log('Error is not 401, keeping auth state true');
                this.fetchProfileInProgress = false;
                return (0, rxjs_1.throwError)(() => error);
            }), (0, operators_1.finalize)(() => {
                this.fetchProfileInProgress = false;
            }));
        }
        /**
         * Handle successful authentication response
         */
        handleAuthSuccess(response) {
            // Check if we should use cookies for authentication
            this.usesCookies = !!response.useCookies;
            // Store the user
            this.userSubject.next(response.user);
            this.authStateSubject.next(true);
            // If cookies are not being used, store tokens in localStorage
            if (!this.usesCookies && (0, common_1.isPlatformBrowser)(this.platformId)) {
                try {
                    localStorage.setItem(this.TOKEN_KEY, response.token);
                    if (response.refreshToken) {
                        localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
                    }
                }
                catch (error) {
                    console.error('Error storing tokens in localStorage:', error);
                }
            }
        }
        /**
         * Get authentication token from localStorage if available
         */
        getToken() {
            if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                try {
                    return localStorage.getItem(this.TOKEN_KEY);
                }
                catch (error) {
                    console.error('Error accessing localStorage:', error);
                    return null;
                }
            }
            return null;
        }
        /**
         * Check if the user is authenticated either via cookies or localStorage token
         */
        isAuthenticated() {
            console.log('isAuthenticated: checking token validity', this.getToken() ? 'has token' : 'no token');
            // First check for token in localStorage
            const token = this.getToken();
            if (token) {
                try {
                    // Validate the token format and check for expiration
                    const isValid = this.isTokenValid(token);
                    return isValid;
                }
                catch (error) {
                    console.error('Error validating token:', error);
                    return false;
                }
            }
            // If no valid token in localStorage, check if we have a cookie-based session
            if (this.usesCookies) {
                // TODO: Add logic to check if the user has a valid cookie-based session
                return true;
            }
            // No valid authentication found
            return false;
        }
        handleGithubAuthSuccess(token, refreshToken, user) {
            console.log('Handling GitHub auth success');
            if (!token) {
                console.error('No token provided to handleGithubAuthSuccess');
                return;
            }
            // Skip token validation for GitHub authentication to avoid issues with different token formats
            // We'll validate during actual API usage instead
            console.log('Storing tokens received from GitHub auth');
            // First clear any existing auth state to avoid conflicts
            try {
                // Clear any pending timeouts first
                this.timeoutIds.forEach(id => window.clearTimeout(id));
                this.timeoutIds = [];
                // Unsubscribe from any profile fetch in progress
                if (this.profileFetchSubscription) {
                    this.profileFetchSubscription.unsubscribe();
                    this.profileFetchSubscription = null;
                }
                this.clearAuth();
                console.log('Previous auth state cleared');
            }
            catch (clearError) {
                console.error('Error clearing previous auth state:', clearError);
            }
            // Store tokens and update auth state
            try {
                // Store the tokens securely
                if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                    console.log('Storing tokens in localStorage');
                    // First attempt to store tokens
                    try {
                        localStorage.setItem(this.TOKEN_KEY, token);
                        if (refreshToken) {
                            localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
                        }
                        else {
                            console.warn('No refresh token provided during GitHub authentication');
                        }
                    }
                    catch (storageError) {
                        console.error('Initial token storage failed:', storageError);
                    }
                    // Force a verification of token availability after storage with multiple retries
                    let retryCount = 0;
                    const maxRetries = 3;
                    const verifyStorage = () => {
                        try {
                            const storedToken = localStorage.getItem(this.TOKEN_KEY);
                            console.log('Verifying token storage (attempt ' + (retryCount + 1) + '/' + maxRetries + '):', storedToken ? 'Token stored successfully' : 'Token storage failed');
                            if (!storedToken && retryCount < maxRetries) {
                                console.warn('Token storage verification failed - retrying storage');
                                try {
                                    localStorage.setItem(this.TOKEN_KEY, token);
                                    if (refreshToken) {
                                        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
                                    }
                                    retryCount++;
                                    const timeoutId = window.setTimeout(verifyStorage, 200); // Check again after delay
                                    this.timeoutIds.push(timeoutId);
                                }
                                catch (retryError) {
                                    console.error('Token retry storage failed:', retryError);
                                }
                            }
                            else if (!storedToken) {
                                console.error('All token storage attempts failed');
                                // Use cookie-based auth as fallback
                                this.usesCookies = true;
                            }
                        }
                        catch (verifyError) {
                            console.error('Error during token storage verification:', verifyError);
                        }
                    };
                    // Start the verification process
                    const initialTimeoutId = window.setTimeout(verifyStorage, 50);
                    this.timeoutIds.push(initialTimeoutId);
                }
                // Update authentication state immediately to avoid race conditions
                this.authStateSubject.next(true);
                // Then update user data if available
                if (user) {
                    console.log('Using provided user data from GitHub callback');
                    this.userSubject.next(user);
                }
                else {
                    // If no user data was provided, try to fetch it
                    console.log('No user data from GitHub callback, fetching profile');
                    const profileTimeoutId = window.setTimeout(() => {
                        // Only fetch if we still don't have user data
                        if (!this.userSubject.value) {
                            console.log('Fetching user profile after GitHub auth');
                            this.profileFetchSubscription = this.getUserProfile()
                                .pipe(
                            // Add timeout to prevent UI hanging
                            (0, operators_1.timeout)(5000), (0, operators_1.catchError)(error => {
                                console.error('Profile fetch failed after GitHub auth:', error);
                                // Even if profile fetch fails, authentication is still valid
                                // Just log error and continue
                                return (0, rxjs_1.of)(null);
                            }))
                                .subscribe({
                                next: (userData) => {
                                    if (userData) {
                                        console.log('Successfully fetched user profile after GitHub auth');
                                    }
                                    // Clean up subscription
                                    if (this.profileFetchSubscription) {
                                        this.profileFetchSubscription.unsubscribe();
                                        this.profileFetchSubscription = null;
                                    }
                                },
                                error: () => {
                                    // Clean up subscription on error too
                                    if (this.profileFetchSubscription) {
                                        this.profileFetchSubscription.unsubscribe();
                                        this.profileFetchSubscription = null;
                                    }
                                }
                            });
                        }
                    }, 500);
                    this.timeoutIds.push(profileTimeoutId);
                }
                console.log('GitHub authentication state updated, user is now authenticated');
            }
            catch (error) {
                console.error('Error handling GitHub authentication success:', error);
                // Log error but don't clear auth state as token might still be valid
                this.errorHandler.logError('Warning during GitHub authentication', error);
            }
        }
        handleInvalidToken() {
            if ((0, common_1.isPlatformBrowser)(this.platformId)) {
                localStorage.removeItem(this.TOKEN_KEY);
                localStorage.removeItem(this.REFRESH_TOKEN_KEY);
            }
            this.userSubject.next(null);
            this.authStateSubject.next(false);
        }
        isTokenValid(token) {
            if (!token) {
                console.log('Token validation failed: No token provided');
                return false;
            }
            try {
                // Check if token has the expected JWT format
                const parts = token.split('.');
                // Log token format for debugging
                console.log(`[AuthService] Token format check: ${parts.length} parts`);
                // Standard JWT validation for production
                if (environment_1.environment.production) {
                    // In production, require strict JWT format
                    if (parts.length !== 3) {
                        console.warn('[AuthService] Invalid token format - token does not have 3 parts');
                        // Special case for GitHub tokens which aren't JWTs
                        if (token.length > 20 && token.startsWith('gho_')) {
                            console.log('[AuthService] Detected GitHub token format, allowing');
                            return true;
                        }
                        return false;
                    }
                }
                else {
                    // In development, be more lenient
                    if (parts.length !== 3) {
                        console.warn('[AuthService] Non-standard token format in development, allowing');
                        return true;
                    }
                }
                // If we have a standard JWT, decode and validate it
                if (parts.length === 3) {
                    // Decode the token payload
                    const base64Url = parts[1];
                    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                    let jsonPayload = '';
                    try {
                        const decoded = atob(base64);
                        jsonPayload = decodeURIComponent(decoded
                            .split('')
                            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                            .join(''));
                    }
                    catch (decodeError) {
                        console.error('[AuthService] Failed to decode token payload:', decodeError);
                        // Don't crash on decode errors in development
                        if (!environment_1.environment.production) {
                            console.log('[AuthService] Allowing invalid token in development despite decode error');
                            return true;
                        }
                        return false;
                    }
                    // Try to parse the JSON payload
                    try {
                        const payload = JSON.parse(jsonPayload);
                        // Check if token has expired
                        if (payload.exp) {
                            const expirationMs = payload.exp * 1000; // Convert seconds to milliseconds
                            const now = Date.now();
                            // If token has expired
                            if (expirationMs <= now) {
                                console.warn('[AuthService] Token has expired');
                                return false;
                            }
                            // Log expiration details
                            const expiresInMinutes = Math.round((expirationMs - now) / 60000);
                            console.log(`[AuthService] Token expires in approximately ${expiresInMinutes} minutes`);
                            // If token is close to expiring, initiate background refresh
                            const refreshThreshold = environment_1.environment.auth.tokenRefreshThreshold || 300000; // 5 minutes default
                            if (expirationMs - now < refreshThreshold) {
                                console.log('[AuthService] Token is about to expire, triggering refresh');
                                // Only try to refresh if not already in progress
                                if (!this.refreshInProgress && this.refreshAttempts < this.MAX_REFRESH_ATTEMPTS) {
                                    setTimeout(() => {
                                        // Check if refresh is still needed
                                        if (!this.refreshInProgress) {
                                            this.refreshToken().subscribe({
                                                next: () => console.log('Background token refresh succeeded'),
                                                error: (err) => console.error('Background token refresh failed:', err)
                                            });
                                        }
                                    }, 0);
                                }
                            }
                        }
                        else {
                            console.log('[AuthService] Token has no expiration claim');
                            // In production, reject tokens without expiration
                            if (environment_1.environment.production) {
                                console.warn('[AuthService] Token without expiration rejected in production');
                                return false;
                            }
                        }
                        // Additional validation checks could be added here
                        // For example, validating issuer, audience, etc.
                        return true;
                    }
                    catch (parseError) {
                        console.error('[AuthService] Failed to parse token payload:', parseError);
                        // Only accept invalid JSON in development
                        if (!environment_1.environment.production) {
                            console.log('[AuthService] Allowing invalid JSON payload in development');
                            return true;
                        }
                        return false;
                    }
                }
                // Default for non-JWT tokens in development
                return !environment_1.environment.production;
            }
            catch (error) {
                console.error('[AuthService] Token validation failed with error:', error);
                return false;
            }
        }
        handleError(error) {
            var _a, _b;
            let errorMessage = 'An error occurred';
            let errorCode = 'unknown_error';
            // Log the error for debugging purposes
            console.error('[AuthService] Error details:', error);
            if (error.error instanceof ErrorEvent) {
                // Client-side error
                errorMessage = error.error.message;
                errorCode = 'client_error';
            }
            else {
                // Server-side error
                if ((_a = error.error) === null || _a === void 0 ? void 0 : _a.code) {
                    errorCode = error.error.code;
                }
                else if (error.status) {
                    errorCode = `http_${error.status}`;
                }
                errorMessage = ((_b = error.error) === null || _b === void 0 ? void 0 : _b.message) || this.getErrorMessage(error.status);
            }
            // Add timestamp for logging/tracking purposes
            const errorContext = {
                timestamp: new Date().toISOString(),
                url: error.url || 'unknown',
                code: errorCode,
                status: error.status,
            };
            console.error('[AuthService] Formatted error:', Object.assign({ message: errorMessage }, errorContext));
            // Return a custom error object with additional context
            return (0, rxjs_1.throwError)(() => {
                const enhancedError = new Error(errorMessage);
                enhancedError.context = errorContext;
                enhancedError.code = errorCode;
                return enhancedError;
            });
        }
        getErrorMessage(status) {
            switch (status) {
                case 401:
                    return 'Invalid credentials or session expired';
                case 403:
                    return 'Access denied - you do not have permission to access this resource';
                case 404:
                    return 'Service or resource not found';
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
         * Get GitHub authorization URL for signup/login
         * Returns an observable with the GitHub authorization URL
         * @param source Indicates if this is for signup or login
         */
        getGithubAuthUrl(source = 'login') {
            return this.http.get(`${api_config_1.AUTH.GITHUB_LOGIN}?source=${source}&getUrl=true`).pipe((0, operators_1.tap)(response => {
                console.log('GitHub auth URL received:', response);
            }), (0, operators_1.catchError)(error => {
                console.error('Error getting GitHub auth URL:', error);
                return this.errorHandler.handleHttpError(error, 'AuthService');
            }));
        }
        /**
         * Refresh authentication state by fetching the user profile
         * This is used when we're using cookie-based authentication
         */
        refreshAuthState() {
            console.log('Refreshing authentication state');
            if (!(0, common_1.isPlatformBrowser)(this.platformId)) {
                return (0, rxjs_1.of)(false);
            }
            return this.getUserProfile().pipe((0, operators_1.tap)(() => console.log('Auth state refreshed successfully')), (0, operators_1.map)(() => true), (0, operators_1.catchError)((error) => {
                // Don't log network or connection errors as they're expected when backend is down
                if (error.status === 0) {
                    console.log('Backend connection not available, skipping auth refresh');
                    return (0, rxjs_1.of)(false);
                }
                console.error('Error refreshing auth state:', error);
                this.clearAuth();
                return (0, rxjs_1.of)(false);
            }));
        }
        /**
         * Forces logout and redirects to login page with optional error message
         * Used when authentication is completely broken and needs re-login
         * @param errorMessage Optional error message to display on login page
         */
        forceLogoutAndRedirect(errorMessage) {
            console.error(`Forcing logout: ${errorMessage || 'Authentication required'}`);
            this.clearAuth();
            // Construct query params if we have an error message
            const queryParams = {};
            if (errorMessage) {
                queryParams.error = 'session_expired';
            }
            // Use a Promise to navigate to ensure we don't have race conditions
            return this.router.navigate(['/login'], {
                queryParams
            }).catch(err => {
                console.error('Navigation error during forced logout:', err);
                return false;
            });
        }
        /**
         * Check if a token refresh is currently in progress
         * @returns True if a refresh is in progress, false otherwise
         */
        isRefreshInProgress() {
            return this.refreshInProgress;
        }
        /**
         * Completely resets the authentication state
         * This is a static method that can be called from the browser console for debugging
         */
        static resetAuthState() {
            console.log('Resetting authentication state...');
            try {
                // Clear all auth-related items from localStorage
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('github_oauth_state');
                localStorage.removeItem('github_state');
                // Clear session storage items too
                sessionStorage.removeItem('auth_check_in_progress');
                sessionStorage.removeItem('auth_check_start_time');
                sessionStorage.removeItem('auth_check_id');
                console.log('Authentication storage completely cleared. Please refresh the page.');
            }
            catch (error) {
                console.error('Error clearing authentication state:', error);
            }
        }
        /**
         * Clean up resources when service is destroyed
         */
        ngOnDestroy() {
            console.log('AuthService being destroyed, cleaning up resources');
            // Clean up any subscriptions
            if (this.initAuthSubscription) {
                this.initAuthSubscription.unsubscribe();
                this.initAuthSubscription = null;
            }
            if (this.profileFetchSubscription) {
                this.profileFetchSubscription.unsubscribe();
                this.profileFetchSubscription = null;
            }
            // Clear any pending timeouts
            this.timeoutIds.forEach(id => window.clearTimeout(id));
            this.timeoutIds = [];
            // Complete subjects
            this.destroy$.next();
            this.destroy$.complete();
            this.refreshTokenSubject.complete();
            // Note: We do not complete userSubject and authStateSubject here
            // as they are service-level subjects and the service is singleton
        }
        /**
         * Debug helper to safely log token information
         * Can be called from browser console to diagnose auth issues
         */
        debugTokenInfo() {
            // Only run in browser
            if (!(0, common_1.isPlatformBrowser)(this.platformId)) {
                return { tokenStatus: 'N/A - SSR', refreshTokenStatus: 'N/A - SSR' };
            }
            try {
                const token = localStorage.getItem(this.TOKEN_KEY);
                const refreshToken = localStorage.getItem(this.REFRESH_TOKEN_KEY);
                // Check token
                let tokenStatus = 'No token found';
                if (token) {
                    const isValid = this.isTokenValid(token);
                    tokenStatus = isValid ? 'Valid' : 'Invalid';
                    // Get token parts if it's a JWT
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        try {
                            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                            const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration';
                            tokenStatus += ` (Expires: ${exp})`;
                        }
                        catch (e) {
                            tokenStatus += ' (Error parsing token)';
                        }
                    }
                    else {
                        tokenStatus += ' (Non-JWT format)';
                    }
                }
                // Check refresh token
                let refreshTokenStatus = 'No refresh token found';
                if (refreshToken) {
                    refreshTokenStatus = 'Present';
                    // If it's a JWT, try to get expiration
                    if (refreshToken.split('.').length === 3) {
                        try {
                            const parts = refreshToken.split('.');
                            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                            const exp = payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration';
                            refreshTokenStatus += ` (Expires: ${exp})`;
                        }
                        catch (e) {
                            refreshTokenStatus += ' (Error parsing token)';
                        }
                    }
                }
                const result = { tokenStatus, refreshTokenStatus };
                console.log('Auth debug info:', result);
                return result;
            }
            catch (error) {
                console.error('Error getting debug token info:', error);
                return {
                    tokenStatus: `Error: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`,
                    refreshTokenStatus: `Error: ${(error === null || error === void 0 ? void 0 : error.message) || 'Unknown error'}`
                };
            }
        }
    };
    __setFunctionName(_classThis, "AuthService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
})();
exports.AuthService = AuthService;
