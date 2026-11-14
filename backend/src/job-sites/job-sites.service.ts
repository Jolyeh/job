import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateJobSiteDto,
  JobSiteView,
  UpdateUserJobSiteDto,
} from './dto/job-site.dto';

/**
 * Sites d'emploi.
 *
 * Deux niveaux :
 *  - le **catalogue** (`job_sites`) : données de référence, partagées ;
 *  - les **abonnements** (`user_job_sites`) : les sites qu'un utilisateur
 *    choisit de suivre. Les sites `isDefault` sont rattachés automatiquement
 *    à la création du compte (cf. `followDefaults`).
 */
@Injectable()
export class JobSitesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Rattache les sites marqués « par défaut » (idempotent). */
  async followDefaults(userId: string): Promise<number> {
    const defaults = await this.prisma.jobSite.findMany({
      where: { isDefault: true, isActive: true },
      select: { id: true },
    });

    const created = await this.prisma.userJobSite.createMany({
      data: defaults.map((site) => ({ userId, jobSiteId: site.id })),
      skipDuplicates: true,
    });

    return created.count;
  }

  /** Catalogue complet + état d'abonnement de l'utilisateur. */
  async list(userId: string): Promise<JobSiteView[]> {
    const [sites, follows, counts] = await Promise.all([
      this.prisma.jobSite.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.userJobSite.findMany({ where: { userId } }),
      this.prisma.jobOffer.groupBy({
        by: ['jobSiteId'],
        where: { jobSiteId: { not: null } },
        _count: { _all: true },
      }),
    ]);

    const followBySite = new Map(follows.map((follow) => [follow.jobSiteId, follow]));
    const countBySite = new Map(
      counts
        .filter((row) => row.jobSiteId)
        .map((row) => [row.jobSiteId as string, row._count._all]),
    );

    return sites.map((site) => {
      const follow = followBySite.get(site.id);
      return {
        id: site.id,
        slug: site.slug,
        name: follow?.customName ?? site.name,
        url: site.url,
        kind: site.kind,
        country: site.country,
        language: site.language,
        description: site.description,
        logoUrl: site.logoUrl,
        isDefault: site.isDefault,
        position: site.position,
        followed: Boolean(follow),
        customName: follow?.customName ?? null,
        accountLabel: follow?.accountLabel ?? null,
        notes: follow?.notes ?? null,
        offerCount: countBySite.get(site.id) ?? 0,
      };
    });
  }

  /** Sites effectivement suivis par l'utilisateur. */
  async listFollowed(userId: string): Promise<JobSiteView[]> {
    return (await this.list(userId)).filter((site) => site.followed);
  }

  /**
   * Ajoute un site au suivi.
   *
   * - `jobSiteId` fourni → abonnement à une entrée du catalogue ;
   * - sinon `name` + `url` → création d'une entrée de catalogue personnalisée
   *   (site non référencé : entreprise, ATS interne…), puis abonnement.
   */
  async follow(userId: string, dto: CreateJobSiteDto): Promise<JobSiteView> {
    let jobSiteId = dto.jobSiteId;

    if (jobSiteId) {
      const exists = await this.prisma.jobSite.findUnique({ where: { id: jobSiteId } });
      if (!exists) throw new NotFoundException('Site introuvable');
    } else {
      if (!dto.name || !dto.url) {
        throw new BadRequestException(
          'Indiquez un site du catalogue (jobSiteId) ou un nom et une URL',
        );
      }
      const slug = await this.uniqueSlug(dto.name);
      const created = await this.prisma.jobSite.create({
        data: {
          slug,
          name: dto.name,
          url: dto.url,
          kind: dto.kind ?? 'OTHER',
          country: 'INT',
          language: 'EN',
          description: null,
          // Les sites libres ne sont pas proposés par défaut aux autres comptes.
          isDefault: false,
          isActive: true,
          position: 100,
        },
      });
      jobSiteId = created.id;
    }

    await this.prisma.userJobSite.upsert({
      where: { userId_jobSiteId: { userId, jobSiteId } },
      create: {
        userId,
        jobSiteId,
        accountLabel: dto.accountLabel,
        notes: dto.notes,
      },
      update: {
        accountLabel: dto.accountLabel,
        notes: dto.notes,
        isActive: true,
      },
    });

    const site = (await this.list(userId)).find((entry) => entry.id === jobSiteId);
    if (!site) throw new NotFoundException('Site introuvable');
    return site;
  }

  async updateFollow(
    userId: string,
    jobSiteId: string,
    dto: UpdateUserJobSiteDto,
  ): Promise<JobSiteView> {
    const follow = await this.prisma.userJobSite.findUnique({
      where: { userId_jobSiteId: { userId, jobSiteId } },
    });
    if (!follow) throw new NotFoundException('Ce site n’est pas suivi par ce compte');

    await this.prisma.userJobSite.update({
      where: { id: follow.id },
      data: {
        isActive: dto.isActive,
        accountLabel: dto.accountLabel,
        notes: dto.notes,
      },
    });

    const site = (await this.list(userId)).find((entry) => entry.id === jobSiteId);
    if (!site) throw new NotFoundException('Site introuvable');
    return site;
  }

  /** Retire un site du suivi (le catalogue n'est pas modifié). */
  async unfollow(userId: string, jobSiteId: string): Promise<{ removed: true }> {
    await this.prisma.userJobSite.deleteMany({ where: { userId, jobSiteId } });
    return { removed: true };
  }

  /** Slug unique pour un site ajouté à la main. */
  private async uniqueSlug(name: string): Promise<string> {
    const base =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'site';

    let slug = base;
    let suffix = 2;
    while (await this.prisma.jobSite.findUnique({ where: { slug } })) {
      slug = `${base}-${suffix++}`;
    }
    return slug;
  }
}
