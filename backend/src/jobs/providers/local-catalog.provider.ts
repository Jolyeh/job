import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { extractSkills } from '../scoring/skill-extractor';
import {
  JobProvider,
  NormalizedOffer,
  ProviderQuery,
} from './job-provider.interface';

/**
 * Fournisseur « catalogue interne ».
 *
 * Rôle : garantir que la plateforme reste utilisable quand aucune API externe
 * n'est configurée (démo, tests, environnement hors-ligne). Il recherche dans
 * les offres déjà persistées — alimentées par le seed ou par les autres
 * providers — et les re-propose à l'agrégateur.
 */
@Injectable()
export class LocalCatalogProvider implements JobProvider {
  readonly name = 'catalog';
  readonly label = 'Catalogue JobRadar';

  constructor(private readonly prisma: PrismaService) {}

  isEnabled(): boolean {
    return true;
  }

  async search(query: ProviderQuery): Promise<NormalizedOffer[]> {
    const keywords = query.keywords.trim();

    const offers = await this.prisma.jobOffer.findMany({
      where: {
        isActive: true,
        source: { not: this.name },
        ...(keywords
          ? {
              OR: [
                { title: { contains: keywords, mode: 'insensitive' } },
                { company: { contains: keywords, mode: 'insensitive' } },
                { description: { contains: keywords, mode: 'insensitive' } },
                { tags: { has: keywords } },
              ],
            }
          : {}),
      },
      include: { skills: { include: { skill: true } } },
      orderBy: { publishedAt: 'desc' },
      take: query.limit,
    });

    return offers.map((offer) => {
      const text = `${offer.title} ${offer.description} ${offer.tags.join(' ')}`;
      return {
        externalId: offer.externalId,
        source: offer.source,
        title: offer.title,
        company: offer.company,
        description: offer.description,
        city: offer.city,
        country: offer.country,
        contractType: offer.contractType,
        workMode: offer.workMode,
        experienceLevel: offer.experienceLevel,
        salaryMin: offer.salaryMin,
        salaryMax: offer.salaryMax,
        salaryCurrency: offer.salaryCurrency,
        url: offer.url,
        applyUrl: offer.applyUrl,
        logoUrl: offer.logoUrl,
        tags: offer.tags,
        publishedAt: offer.publishedAt,
        skills: offer.skills.length
          ? offer.skills.map((entry) => ({
              slug: entry.skill.slug,
              label: entry.skill.label,
              required: entry.required,
            }))
          : extractSkills(text),
      };
    });
  }
}
