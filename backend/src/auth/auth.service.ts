import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { JobSitesService } from '../job-sites/job-sites.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
  /** Version du token : permet de révoquer toutes les sessions d'un coup. */
  ver: number;
}

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly jobSites: JobSitesService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cette adresse e-mail');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        tokenVersion: true,
      },
    });

    // Les sites d'emploi marqués « par défaut » sont rattachés d'emblée :
    // l'utilisateur peut les décocher, mais il n'a rien à faire pour démarrer.
    await this.jobSites
      .followDefaults(user.id)
      .catch((error) =>
        this.logger.warn(`Sites par défaut non rattachés : ${(error as Error).message}`),
      );

    this.logger.log(`Nouveau compte créé : ${user.email}`);
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Comparaison systématique (même quand l'utilisateur n'existe pas) pour
    // éviter une attaque temporelle révélant les e-mails enregistrés.
    const passwordHash = user?.passwordHash ?? '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
    const passwordMatches = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.buildAuthResponse(user);
  }

  /** Révoque tous les JWT émis pour l'utilisateur (déconnexion globale). */
  async revokeAllSessions(userId: string): Promise<{ revoked: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { revoked: true };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true, tokenVersion: true },
    });
    if (!user) {
      throw new UnauthorizedException('Compte introuvable');
    }
    return user;
  }

  private buildAuthResponse(user: AuthUser): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      ver: user.tokenVersion,
    };

    return {
      accessToken: this.jwt.sign(payload),
      expiresIn: this.expiresInSeconds(),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        tokenVersion: user.tokenVersion,
      },
    };
  }

  private expiresInSeconds(): number {
    const raw = this.config.get<string>('JWT_EXPIRES_IN', '7d');
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 7 * 24 * 3600;
    const value = Number(match[1]);
    const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
    return value * unit;
  }
}
