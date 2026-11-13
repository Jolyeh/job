import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'USER' | 'ADMIN';
  tokenVersion: number;
}

/**
 * Injecte l'utilisateur authentifié (posé sur la requête par JwtStrategy).
 *   @CurrentUser() user: AuthUser
 *   @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (key: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return key ? request.user?.[key] : request.user;
  },
);
