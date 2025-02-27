import { LithoProfile } from '../../modules/auth/profile.model';

declare global {
  namespace Express {
    interface Request {
      user?: LithoProfile;
    }
  }
}
