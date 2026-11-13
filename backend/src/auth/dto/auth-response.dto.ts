import { AuthUser } from '../../common/decorators/current-user.decorator';

export interface AuthResponseDto {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
