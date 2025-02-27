import { environment } from '../../../environments/environment';

// Single source of truth for API paths
const PATHS = {
  AUTH: '/auth',
  VAULTS: '/vaults',
  CORE: '/core',
  TERRAIN: '/terrain',
} as const;

// Simplified API routes with grouped endpoints
export const API_ROUTES = {
  AUTH: {
    LOGIN: `${environment.apiUrl}${PATHS.AUTH}/login`,
    REGISTER: `${environment.apiUrl}${PATHS.AUTH}/register`,
    PROFILE: `${environment.apiUrl}${PATHS.AUTH}/profile`,
    REFRESH: `${environment.apiUrl}${PATHS.AUTH}/refresh-token`,
    GITHUB: `${environment.apiUrl}${PATHS.AUTH}/github/callback`,
    GITHUB_LOGIN: `${environment.apiUrl}${PATHS.AUTH}/github/login`,
  },
  VAULTS: {
    BASE: `${environment.apiUrl}${PATHS.VAULTS}`,
    // Use consistent endpoints for all vault operations
    UPLOAD: `${environment.apiUrl}${PATHS.VAULTS}/upload`,
    CREATE: `${environment.apiUrl}${PATHS.VAULTS}/create`,
    EXECUTE: `${environment.apiUrl}${PATHS.VAULTS}/execute`,
  },
  CORE: {
    SAMPLES: `${environment.apiUrl}${PATHS.CORE}/samples`,
    FOSSILS: `${environment.apiUrl}${PATHS.CORE}/fossils`,
    PROFILES: `${environment.apiUrl}${PATHS.CORE}/profiles`,
  },
  TERRAIN: {
    PATHS: `${environment.apiUrl}${PATHS.TERRAIN}/paths`,
    PROGRESS: `${environment.apiUrl}${PATHS.TERRAIN}/progress`,
    REVIEWS: `${environment.apiUrl}${PATHS.TERRAIN}/reviews`,
  },
};

// Export endpoints for direct use
export const { AUTH, VAULTS, CORE, TERRAIN } = API_ROUTES;
