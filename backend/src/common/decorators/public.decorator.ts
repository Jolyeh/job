import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Désactive le JwtAuthGuard global pour une route (login, register, health…).
 * Le guard est appliqué globalement : la sécurité par défaut est donc « fermée ».
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
