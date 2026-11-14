import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserProfileService } from '../user-profile/user-profile.service';
import { OfferLanguage } from '../generated/prisma/enums';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { JobAggregatorService } from './job-aggregator.service';
import {
  MatchResult,
  ScoringOffer,
  ScoringProfile,
  rankOffers,
} from './scoring/match-scoring';
import { ProviderQuery } from './providers/job-provider.interface';

export interface RankedJobOffer {
  id: string;
  title: string;
  company: string;
  description: string;
  city: string;
  country: string;
  contractType: string;
  workMode: string;
  experienceLevel: string;
  /** Langue de rédaction de l'offre (FR / EN). */
  language: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  url: string;
  applyUrl: string | null;
  logoUrl: string | null;
  tags: string[];
  publishedAt: Date;
  source: string;
  skills: Array<{ slug: string; label: string; required: boolean }>;
  match: MatchResult;
}

export interface JobSearchResponse {
  items: RankedJobOffer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Scores du catalogue complet, avant filtrage : sert aux facettes. */
  facets: {
    contractTypes: Array<{ value: string; count: number }>;
    workModes: Array<{ value: string; count: number }>;
    languages: Array<{ value: string; count: number }>;
    sources: Array<{ value: string; count: number }>;
    averageScore: number;
    topScore: number;
  };
  meta: {
    personalized: boolean;
    profileHeadline: string | null;
    sources: Array<{ source: string; fetched: number; errors: string[]; durationMs: number }>;
    aggregatedAt: string;
  };
}

/**
 * Cœur fonctionnel : traduit un profil + des filtres en une liste d'offres
 * classées par pertinence, avec explication du score.
 */
@Injectable()
export class JobSearchService {
  private readonly logger = new Logger(JobSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: UserProfileService,
    private readonly aggregator: JobAggregatorService,
  ) {}

  async search(userId: string, filters: SearchJobsDto): Promise<JobSearchResponse> {
    const startedAt = Date.now();

    // 1. Profil de scoring (facultatif : sans profil, tri par date).
    let profile: ScoringProfile | null = null;
    try {
      profile = await this.profileService.getRawForScoring(userId);
    } catch {
      profile = null;
    }

    // 2. Agrégation éventuelle (synchronisation des sources externes).
    const providerQuery: ProviderQuery = {
      keywords: filters.q?.trim() || profile?.headline || '',
      city: filters.city ?? profile?.locationCity,
      country: profile?.locationCountry ?? 'FR',
      contractTypes: filters.contractType ?? (profile?.contractTypes as never),
      workModes: filters.workMode ?? (profile?.workModes as never),
      languages: filters.languages,
      limit: Math.max(filters.pageSize * 4, 40),
      onlyProvider: filters.source,
    };

    let providerMeta: Array<{ source: string; fetched: number; errors: string[]; durationMs: number }> = [];
    if (filters.refresh) {
      const { results, offers, persisted } = await this.aggregator.aggregate(providerQuery);
      providerMeta = results.map((result) => ({
        source: result.source,
        fetched: result.offers.length,
        errors: result.errors,
        durationMs: result.durationMs,
      }));
      await this.aggregator.recordRun({
        userId,
        profileSnapshot: profile ?? { headline: providerQuery.keywords },
        sources: providerMeta.map((meta) => meta.source),
        offersFetched: offers.length,
        offersPersisted: persisted,
        durationMs: Date.now() - startedAt,
        errors: Object.fromEntries(
          results.filter((result) => result.errors.length).map((result) => [result.source, result.errors]),
        ),
      });
      await this.profileService.touchLastSearch(userId).catch(() => undefined);
    }

    // 3. Lecture du catalogue (le filtrage fin se fait en mémoire pour pouvoir
    //    scorer l'ensemble des offres avant de paginer).
    const publishedAfter =
      filters.maxAgeDays
        ? new Date(Date.now() - filters.maxAgeDays * 86_400_000)
        : undefined;

    // Langues acceptées : le filtre de l'interface prime sur le profil.
    const effectiveLanguages =
      filters.languages?.length ? filters.languages : (profile?.languages ?? []);

    const offers = await this.prisma.jobOffer.findMany({
      where: {
        isActive: true,
        ...(publishedAfter ? { publishedAt: { gte: publishedAfter } } : {}),
        ...(filters.source ? { source: filters.source } : {}),
        ...(filters.city
          ? { city: { contains: filters.city, mode: 'insensitive' as const } }
          : {}),
        ...(filters.contractType?.length
          ? { contractType: { in: filters.contractType } }
          : {}),
        ...(filters.workMode?.length ? { workMode: { in: filters.workMode } } : {}),
        // Langue : le filtre explicite prime, sinon les préférences du profil.
        ...(effectiveLanguages.length
          ? { language: { in: effectiveLanguages as OfferLanguage[] } }
          : {}),
        ...(filters.experienceLevel ? { experienceLevel: filters.experienceLevel } : {}),
        ...(filters.salaryMin ? { salaryMax: { gte: filters.salaryMin } } : {}),
        ...(filters.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: 'insensitive' as const } },
                { company: { contains: filters.q, mode: 'insensitive' as const } },
                { description: { contains: filters.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: { skills: { include: { skill: true } } },
      orderBy: { publishedAt: 'desc' },
      // Garde-fou : on borne le volume scoré pour rester sous la seconde.
      take: 400,
    });

    const scoringOffers: Array<ScoringOffer & { raw: (typeof offers)[number] }> = offers.map(
      (offer) => ({
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
        raw: offer,
      }),
    );

    // 4. Scoring + filtrage par score minimal.
    const neutralProfile: ScoringProfile = {
      headline: filters.q ?? '',
      experienceLevel: 'INTERMEDIATE',
      yearsExperience: 0,
      locationCity: filters.city ?? '',
      locationCountry: 'FR',
      radiusKm: 0,
      contractTypes: [],
      workModes: [],
      languages: [],
      salaryMin: 0,
      salaryCurrency: 'EUR',
      skills: [],
    };

    let ranked = profile
      ? rankOffers(profile, scoringOffers)
      : scoringOffers
          .map((offer) => ({ offer, match: rankNeutral(offer) }))
          .sort(
            (a, b) =>
              new Date(b.offer.publishedAt).getTime() -
              new Date(a.offer.publishedAt).getTime(),
          );

    if (filters.minScore !== undefined) {
      ranked = ranked.filter((entry) => entry.match.score >= filters.minScore!);
    }

    if (filters.sort === 'recent') {
      ranked = [...ranked].sort(
        (a, b) =>
          new Date(b.offer.publishedAt).getTime() -
          new Date(a.offer.publishedAt).getTime(),
      );
    } else if (filters.sort === 'salary') {
      ranked = [...ranked].sort(
        (a, b) => (b.offer.salaryMax ?? b.offer.salaryMin ?? 0) - (a.offer.salaryMax ?? a.offer.salaryMin ?? 0),
      );
    }

    // 5. Facettes calculées sur l'ensemble scoré (avant pagination).
    const facets = {
      contractTypes: countBy(ranked.map((entry) => entry.offer.contractType)),
      workModes: countBy(ranked.map((entry) => entry.offer.workMode)),
      languages: countBy(ranked.map((entry) => entry.offer.raw.language)),
      sources: countBy(ranked.map((entry) => entry.offer.raw.source)),
      averageScore: ranked.length
        ? Math.round(ranked.reduce((sum, entry) => sum + entry.match.score, 0) / ranked.length)
        : 0,
      topScore: ranked[0]?.match.score ?? 0,
    };

    // 6. Pagination.
    const total = ranked.length;
    const pageSize = filters.pageSize;
    const page = Math.min(filters.page, Math.max(1, Math.ceil(total / pageSize)));
    const start = (page - 1) * pageSize;
    const pageItems = ranked.slice(start, start + pageSize);

    return {
      items: pageItems.map(({ offer, match }) => {
        const { raw } = offer;
        return {
          id: raw.id,
          title: raw.title,
          company: raw.company,
          description: raw.description,
          city: raw.city,
          country: raw.country,
          contractType: raw.contractType,
          workMode: raw.workMode,
          experienceLevel: raw.experienceLevel,
          language: raw.language,
          salaryMin: raw.salaryMin,
          salaryMax: raw.salaryMax,
          salaryCurrency: raw.salaryCurrency,
          url: raw.url,
          applyUrl: raw.applyUrl,
          logoUrl: raw.logoUrl,
          tags: raw.tags,
          publishedAt: raw.publishedAt,
          source: raw.source,
          skills: offer.skills.map((skill) => ({
            slug: skill.slug,
            label: skill.label,
            required: skill.required ?? true,
          })),
          match,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      facets,
      meta: {
        personalized: Boolean(profile),
        profileHeadline: profile?.headline ?? null,
        sources: providerMeta.length
          ? providerMeta
          : this.aggregator.activeProviders.map((provider) => ({
              source: provider.name,
              fetched: 0,
              errors: [],
              durationMs: 0,
            })),
        aggregatedAt: new Date().toISOString(),
      },
    };
  }

  async detail(userId: string, jobOfferId: string): Promise<RankedJobOffer | null> {
    const offer = await this.prisma.jobOffer.findUnique({
      where: { id: jobOfferId },
      include: { skills: { include: { skill: true } } },
    });
    if (!offer) return null;

    let profile: ScoringProfile | null = null;
    try {
      profile = await this.profileService.getRawForScoring(userId);
    } catch {
      profile = null;
    }

    const scoringOffer: ScoringOffer = {
      id: offer.id,
      title: offer.title,
      city: offer.city,
      country: offer.country,
      contractType: offer.contractType,
      workMode: offer.workMode,
      experienceLevel: offer.experienceLevel,
      language: offer.language,
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
    };

    const match = profile
      ? rankOffers(profile, [scoringOffer])[0].match
      : rankNeutral(scoringOffer);

    return {
      id: offer.id,
      title: offer.title,
      company: offer.company,
      description: offer.description,
      city: offer.city,
      country: offer.country,
      contractType: offer.contractType,
      workMode: offer.workMode,
      experienceLevel: offer.experienceLevel,
      language: offer.language,
      salaryMin: offer.salaryMin,
      salaryMax: offer.salaryMax,
      salaryCurrency: offer.salaryCurrency,
      url: offer.url,
      applyUrl: offer.applyUrl,
      logoUrl: offer.logoUrl,
      tags: offer.tags,
      publishedAt: offer.publishedAt,
      source: offer.source,
      skills: scoringOffer.skills.map((skill) => ({
        slug: skill.slug,
        label: skill.label,
        required: skill.required ?? true,
      })),
      match,
    };
  }

  /** Déclenche une synchronisation complète des sources (usage manuel/cron). */
  async refresh(userId: string, filters: SearchJobsDto) {
    return this.search(userId, { ...filters, refresh: true });
  }
}

/** Score « neutre » quand l'utilisateur n'a pas encore de profil. */
function rankNeutral(offer: ScoringOffer): MatchResult {
  const ageDays = Math.max(
    0,
    (Date.now() - new Date(offer.publishedAt).getTime()) / 86_400_000,
  );
  const freshness = ageDays <= 2 ? 40 : ageDays <= 7 ? 25 : ageDays <= 30 ? 10 : 0;
  return {
    score: Math.min(60, freshness + 20),
    breakdown: { skills: 0, title: 0, salary: 0, experience: 0, location: 0, contract: 0 },
    matchedSkills: [],
    missingSkills: [],
    reasons: ['Complétez votre profil pour un score personnalisé'],
    warnings: [],
  };
}

function countBy(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}
