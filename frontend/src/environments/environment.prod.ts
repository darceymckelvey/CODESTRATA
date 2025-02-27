import { Environment } from '../app/auth/services/auth.service';

export const environment: Environment = {
  production: true,
  apiUrl: '/api', // Relative path for production deployment
  github: {
    clientId: 'Ov23lihjSuTuFWvjj43F',
    redirectUri: 'https://your-domain.com/github-callback',
  },
  auth: {
    tokenRefreshThreshold: 5 * 60 * 1000, // 5 minutes
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },
};
