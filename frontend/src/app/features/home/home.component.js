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
exports.HomeComponent = void 0;
// src/app/features/home/home.component.ts
const core_1 = require("@angular/core");
const common_1 = require("@angular/common");
const router_1 = require("@angular/router");
const button_1 = require("@angular/material/button");
const card_1 = require("@angular/material/card");
const icon_1 = require("@angular/material/icon");
const progress_spinner_1 = require("@angular/material/progress-spinner");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let HomeComponent = (() => {
    let _classDecorators = [(0, core_1.Component)({
            selector: 'app-home',
            standalone: true,
            imports: [
                common_1.CommonModule,
                router_1.RouterModule,
                button_1.MatButtonModule,
                card_1.MatCardModule,
                icon_1.MatIconModule,
                progress_spinner_1.MatProgressSpinnerModule
            ],
            templateUrl: './home.component.html',
            styleUrls: ['./home.component.css']
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var HomeComponent = _classThis = class {
        constructor(authService, router, ngZone, cdr) {
            this.authService = authService;
            this.router = router;
            this.ngZone = ngZone;
            this.cdr = cdr;
            this.destroy$ = new rxjs_1.Subject();
            this.isLoading = false;
            this.isAuthenticated = false;
            this.username = '';
            // Initialize authentication directly in constructor
            try {
                this.isAuthenticated = localStorage.getItem('auth_token') !== null;
            }
            catch (e) {
                this.isAuthenticated = false;
            }
            this.authState$ = this.authService.authState$;
        }
        ngOnInit() {
            // Authentication state already initialized in constructor
            // Subscribe to auth state changes outside Angular zone to avoid detection issues
            this.ngZone.runOutsideAngular(() => {
                setTimeout(() => {
                    this.authService.authState$
                        .pipe((0, operators_1.takeUntil)(this.destroy$))
                        .subscribe(isAuthenticated => {
                        if (this.isAuthenticated !== isAuthenticated) {
                            // Run inside zone for UI updates
                            this.ngZone.run(() => {
                                this.isAuthenticated = isAuthenticated;
                                if (isAuthenticated) {
                                    this.loadUserData();
                                }
                                this.cdr.detectChanges();
                            });
                        }
                    });
                }, 50);
            });
            // If already authenticated, load user data
            if (this.isAuthenticated) {
                this.loadUserData();
            }
        }
        ngOnDestroy() {
            this.destroy$.next();
            this.destroy$.complete();
        }
        login() {
            this.router.navigate(['/login']);
        }
        register() {
            this.router.navigate(['/register']);
        }
        navigateToProfile() {
            this.router.navigate(['/profile']);
        }
        navigateToVaults() {
            this.router.navigate(['/vaults']);
        }
        loadUserData() {
            this.isLoading = true;
            // Explicitly use getUserProfile method from AuthService
            this.authService.getUserProfile()
                .pipe((0, operators_1.takeUntil)(this.destroy$))
                .subscribe({
                next: (user) => {
                    if (user) {
                        this.username = user.username || user.email || '';
                    }
                    this.isLoading = false;
                },
                error: () => {
                    this.isLoading = false;
                }
            });
        }
    };
    __setFunctionName(_classThis, "HomeComponent");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HomeComponent = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HomeComponent = _classThis;
})();
exports.HomeComponent = HomeComponent;
