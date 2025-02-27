"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TERRAIN = exports.CORE = exports.VAULTS = exports.AUTH = exports.API_ROUTES = void 0;
const environment_1 = require("../../../environments/environment");
// Single source of truth for API paths
const PATHS = {
    AUTH: '/auth',
    VAULTS: '/vaults',
    CORE: '/core',
    TERRAIN: '/terrain',
};
// Simplified API routes with grouped endpoints
exports.API_ROUTES = {
    AUTH: {
        LOGIN: `${environment_1.environment.apiUrl}${PATHS.AUTH}/login`,
        REGISTER: `${environment_1.environment.apiUrl}${PATHS.AUTH}/register`,
        PROFILE: `${environment_1.environment.apiUrl}${PATHS.AUTH}/profile`,
        REFRESH: `${environment_1.environment.apiUrl}${PATHS.AUTH}/refresh-token`,
        GITHUB: `${environment_1.environment.apiUrl}${PATHS.AUTH}/github/callback`,
        GITHUB_LOGIN: `${environment_1.environment.apiUrl}${PATHS.AUTH}/github/login`,
    },
    VAULTS: {
        BASE: `${environment_1.environment.apiUrl}${PATHS.VAULTS}`,
        UPLOAD: `${environment_1.environment.apiUrl}${PATHS.VAULTS}/upload`,
        CREATE: `${environment_1.environment.apiUrl}${PATHS.VAULTS}/create`,
    },
    CORE: {
        SAMPLES: `${environment_1.environment.apiUrl}${PATHS.CORE}/samples`,
        FOSSILS: `${environment_1.environment.apiUrl}${PATHS.CORE}/fossils`,
        PROFILES: `${environment_1.environment.apiUrl}${PATHS.CORE}/profiles`,
    },
    TERRAIN: {
        PATHS: `${environment_1.environment.apiUrl}${PATHS.TERRAIN}/paths`,
        PROGRESS: `${environment_1.environment.apiUrl}${PATHS.TERRAIN}/progress`,
        REVIEWS: `${environment_1.environment.apiUrl}${PATHS.TERRAIN}/reviews`,
    },
};
// Export endpoints for direct use
exports.AUTH = exports.API_ROUTES.AUTH, exports.VAULTS = exports.API_ROUTES.VAULTS, exports.CORE = exports.API_ROUTES.CORE, exports.TERRAIN = exports.API_ROUTES.TERRAIN;
