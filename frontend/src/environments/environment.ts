import { Environment } from '../app/auth/services/auth.service';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  github: {
    clientId: 'Ov23lihjSuTuFWvjj43F',
    redirectUri: 'http://localhost:3000/api/auth/github/callback',
  },
  auth: {
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },
};
