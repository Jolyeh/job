import { SetMetadata } from '@nestjs/common';
import { AuthUser } from './current-user.decorator';

export const ROLES_KEY = 'roles';

/** Restreint une route à certains rôles, ex. @Roles('ADMIN'). */
export const Roles = (...roles: AuthUser['role'][]) => SetMetadata(ROLES_KEY, roles);
