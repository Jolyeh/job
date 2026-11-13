import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ApplicationStatus } from '../generated/prisma/enums';
import { scoreOffer } from '../jobs/scoring/match-scoring';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileService } from '../user-profile/user-profile.service';
import {
  BookmarkResponseDto,
  BookmarkStatsDto,
} from './dto/bookmark-response.dto';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';

/**
 * Favoris et suivi de candidatures.
 * Un favori est une machine à états : SAVED → APPLIED → INTERVIEW → OFFER,
 * chaque transition étant journalisée dans `application_events`.
 */
@Injectable()
export class BookmarksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: UserProfileService,
  ) {}

  async create(
    userId: string,
    dto: CreateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: dto.jobOfferId },
      select: { id: true },
    });
    if (!offer) throw new NotFoundException('Offre introuvable');

    const existing = await this.prisma.bookmark.findUnique({
      where: { userId_jobOfferId: { userId, jobOfferId: dto.jobOfferId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Cette offre est déjà dans vos favoris');
    }

    const matchScore = await this.computeScore(userId, dto.jobOfferId);

    const bookmark = await this.prisma.bookmark.create({
      data: {
        userId,
        jobOfferId: dto.jobOfferId,
        notes: dto.notes,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
        matchScore,
        events: {
          create: { status: ApplicationStatus.SAVED, comment: 'Offre mise en favori' },
        },
      },
      include: bookmarkInclude,
    });

    return this.toResponse(bookmark);
  }

  async findAll(
    userId: string,
    status?: ApplicationStatus,
  ): Promise<BookmarkResponseDto[]> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: bookmarkInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return bookmarks.map((bookmark) => this.toResponse(bookmark));
  }

  async findOne(userId: string, id: string): Promise<BookmarkResponseDto> {
    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id, userId },
      include: bookmarkInclude,
    });
    if (!bookmark) throw new NotFoundException('Favori introuvable');
    return this.toResponse(bookmark);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    const current = await this.prisma.bookmark.findFirst({
      where: { id, userId },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundException('Favori introuvable');

    const statusChanged = dto.status !== undefined && dto.status !== current.status;

    // Dates métier calculées automatiquement lors des transitions.
    const dates: { appliedAt?: Date; interviewAt?: Date } = {};
    if (statusChanged) {
      if (dto.status === ApplicationStatus.APPLIED) dates.appliedAt = new Date();
      if (dto.status === ApplicationStatus.INTERVIEW) {
        dates.interviewAt = new Date();
      }
    }

    const bookmark = await this.prisma.bookmark.update({
      where: { id: current.id },
      data: {
        status: dto.status,
        notes: dto.notes,
        nextActionAt: dto.nextActionAt ? new Date(dto.nextActionAt) : undefined,
        ...dates,
        ...(statusChanged
          ? {
              events: {
                create: {
                  status: dto.status!,
                  comment: dto.comment ?? statusLabel(dto.status!),
                },
              },
            }
          : {}),
      },
      include: bookmarkInclude,
    });

    return this.toResponse(bookmark);
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    const result = await this.prisma.bookmark.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Favori introuvable');
    return { deleted: true };
  }

  /** Indicateurs du tableau de bord « suivi de candidatures ». */
  async stats(userId: string): Promise<BookmarkStatsDto> {
    const bookmarks = await this.prisma.bookmark.findMany({
      where: { userId },
      select: { status: true, appliedAt: true, nextActionAt: true },
    });

    const byStatus = Object.fromEntries(
      Object.values(ApplicationStatus).map((status) => [status, 0]),
    ) as Record<ApplicationStatus, number>;
    for (const bookmark of bookmarks) byStatus[bookmark.status] += 1;

    const applied = bookmarks.filter((bookmark) => bookmark.appliedAt !== null).length;
    const positive =
      byStatus.INTERVIEW + byStatus.OFFER;
    const answered = positive + byStatus.REJECTED;

    return {
      total: bookmarks.length,
      byStatus,
      applied,
      responseRate: applied > 0 ? Math.round((answered / applied) * 100) : 0,
      upcomingActions: bookmarks.filter(
        (bookmark) => bookmark.nextActionAt && bookmark.nextActionAt > new Date(),
      ).length,
    };
  }

  /** Score de matching historisé au moment de la mise en favori. */
  private async computeScore(userId: string, jobOfferId: string): Promise<number> {
    try {
      const [profile, offer] = await Promise.all([
        this.profileService.getRawForScoring(userId),
        this.prisma.jobOffer.findUniqueOrThrow({
          where: { id: jobOfferId },
          include: { skills: { include: { skill: true } } },
        }),
      ]);

      return scoreOffer(profile, {
        id: offer.id,
        title: offer.title,
        city: offer.city,
        country: offer.country,
        contractType: offer.contractType,
        workMode: offer.workMode,
        experienceLevel: offer.experienceLevel,
        salaryMin: offer.salaryMin,
        salaryMax: offer.salaryMax,
        salaryCurrency: offer.salaryCurrency,
        publishedAt: offer.publishedAt,
        skills: offer.skills.map((entry) => ({
          slug: entry.skill.slug,
          label: entry.skill.label,
          weight: entry.weight,
          required: entry.required,
        })),
      }).score;
    } catch {
      return 0;
    }
  }

  private toResponse(bookmark: BookmarkWithRelations): BookmarkResponseDto {
    return {
      id: bookmark.id,
      status: bookmark.status,
      matchScore: bookmark.matchScore,
      notes: bookmark.notes,
      appliedAt: bookmark.appliedAt,
      interviewAt: bookmark.interviewAt,
      nextActionAt: bookmark.nextActionAt,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
      offer: {
        id: bookmark.jobOffer.id,
        title: bookmark.jobOffer.title,
        company: bookmark.jobOffer.company,
        city: bookmark.jobOffer.city,
        contractType: bookmark.jobOffer.contractType,
        workMode: bookmark.jobOffer.workMode,
        salaryMin: bookmark.jobOffer.salaryMin,
        salaryMax: bookmark.jobOffer.salaryMax,
        salaryCurrency: bookmark.jobOffer.salaryCurrency,
        url: bookmark.jobOffer.url,
        publishedAt: bookmark.jobOffer.publishedAt,
        logoUrl: bookmark.jobOffer.logoUrl,
        skills: bookmark.jobOffer.skills.map((entry) => entry.skill.label),
      },
      events: bookmark.events.map((event) => ({
        id: event.id,
        status: event.status,
        comment: event.comment,
        createdAt: event.createdAt,
      })),
    };
  }
}

const bookmarkInclude = {
  jobOffer: { include: { skills: { include: { skill: true } } } },
  events: { orderBy: { createdAt: 'asc' as const } },
} as const;

type BookmarkWithRelations = {
  id: string;
  status: ApplicationStatus;
  matchScore: number;
  notes: string | null;
  appliedAt: Date | null;
  interviewAt: Date | null;
  nextActionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  jobOffer: {
    id: string;
    title: string;
    company: string;
    city: string;
    contractType: string;
    workMode: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string;
    url: string;
    publishedAt: Date;
    logoUrl: string | null;
    skills: Array<{ skill: { label: string } }>;
  };
  events: Array<{
    id: string;
    status: ApplicationStatus;
    comment: string | null;
    createdAt: Date;
  }>;
};

function statusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    SAVED: 'Offre mise en favori',
    APPLIED: 'Candidature envoyée',
    INTERVIEW: 'Entretien obtenu',
    OFFER: 'Proposition reçue',
    REJECTED: 'Candidature refusée',
    WITHDRAWN: 'Candidature retirée',
  };
  return labels[status];
}
