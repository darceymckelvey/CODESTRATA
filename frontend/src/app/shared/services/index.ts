/**
 * Barrel file for shared services
 * This allows for cleaner imports like:
 * import { ThemeService } from '@shared/services';
 */

// ThemeService has been moved to '../../theme/theme.service'
export * from '../../theme/theme.service';
export * from './error-handler.service'; 