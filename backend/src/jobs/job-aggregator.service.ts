import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_PROVIDERS } from './providers/tokens';
import {
  JobProvider,
  NormalizedOffer,
  ProviderQuery,
  ProviderResult,
} from './providers/job-provider.interface';

/**
 * Orchestrateur multi-sources.
 *
 * Responsabilités :
 *  1. interroger tous les providers actifs **en parallèle** (un provider lent
 *     ou en erreur ne bloque pas les autres) ;
 *  2. dédupliquer les offres (même source + externalId) ;
 *  3. persister via `upsert` idempotent + rattachement des compétences ;
 *  4. tracer l'exécution dans `search_runs` (observabilité).
 */
@Injectable()
export class JobAggregatorService {
  private readonly logger = new Logger(JobAggregatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(JOB_PROVIDERS) private readonly providers: JobProvider[],
  ) {}

  get activeProviders(): JobProvider[] {
    return this.providers.filter((provider) => provider.isEnabled());
  }

  async aggregate(query: ProviderQuery): Promise<{
    results: ProviderResult[];
    offers: NormalizedOffer[];
    persisted: number;
  }> {
    const providers = query.onlyProvider
      ? this.activeProviders.filter((provider) => provider.name === query.onlyProvider)
      : this.activeProviders;

    const settled = await Promise.all(
      providers.map(async (provider): Promise<ProviderResult> => {
        const start = Date.now();
        try {
          const offers = await provider.search(query);
          return {
            source: provider.name,
            offers,
            errors: [],
            durationMs: Date.now() - start,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Provider ${provider.name} en échec : ${message}`);
          return {
            source: provider.name,
            offers: [],
            errors: [message],
            durationMs: Date.now() - start,
          };
        }
      }),
    );

    const seen = new Set<string>();
    const offers: NormalizedOffer[] = [];
    for (const result of settled) {
      for (const offer of result.offers) {
        const key = `${offer.source}:${offer.externalId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        offers.push(offer);
      }
    }

    const persisted = await this.persist(offers);

    return { results: settled, offers, persisted };
  }

  /**
   * Upsert idempotent : rejouer une recherche met à jour les offres existantes
   * sans créer de doublon (contrainte unique `[source, externalId]`).
   */
  async persist(offers: NormalizedOffer[]): Promise<number> {
    let persisted = 0;

    for (const offer of offers) {
      try {
        const skillIds = await this.ensureSkills(offer);

        const data = {
          title: offer.title.slice(0, 240),
          company: offer.company.slice(0, 160),
          description: offer.description,
          city: offer.city || 'Non précisé',
          country: offer.country,
          contractType: offer.contractType,
          workMode: offer.workMode,
          experienceLevel: offer.experienceLevel,
          salaryMin: offer.salaryMin ?? null,
          salaryMax: offer.salaryMax ?? null,
          salaryCurrency: offer.salaryCurrency ?? 'EUR',
          url: offer.url,
          applyUrl: offer.applyUrl ?? null,
          logoUrl: offer.logoUrl ?? null,
          tags: offer.tags.slice(0, 15),
          publishedAt: offer.publishedAt,
          rawPayload: (offer.rawPayload ?? {}) as object,
          isActive: true,
        };

        const jobOffer = await this.prisma.jobOffer.upsert({
          where: {
            source_externalId: {
              source: offer.source,
              externalId: offer.externalId,
            },
          },
          create: { ...data, source: offer.source, externalId: offer.externalId },
          update: { ...data, syncedAt: new Date() } as never,
          select: { id: true },
        });

        if (skillIds.length) {
          await this.prisma.jobOfferSkill.createMany({
            data: skillIds.map(({ id, required }) => ({
              jobOfferId: jobOffer.id,
              skillId: id,
              required,
            })),
            skipDuplicates: true,
          });
        }

        persisted += 1;
      } catch (error) {
        this.logger.warn(
          `Impossible de persister ${offer.source}:${offer.externalId} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return persisted;
  }

  /** Crée à la volée les compétences inconnues et renvoie leurs identifiants. */
  private async ensureSkills(
    offer: NormalizedOffer,
  ): Promise<Array<{ id: string; required: boolean }>> {
    if (!offer.skills.length) return [];

    const unique = new Map(offer.skills.map((skill) => [skill.slug, skill]));
    const skills = [...unique.values()];

    const existing = await this.prisma.skill.findMany({
      where: { slug: { in: skills.map((skill) => skill.slug) } },
      select: { id: true, slug: true },
    });
    const bySlug = new Map(existing.map((skill) => [skill.slug, skill.id]));

    const missing = skills.filter((skill) => !bySlug.has(skill.slug));
    if (missing.length) {
      await this.prisma.skill.createMany({
        data: missing.map((skill) => ({
          slug: skill.slug,
          label: skill.label,
          category: detectCategory(skill.slug),
        })),
        skipDuplicates: true,
      });
      const created = await this.prisma.skill.findMany({
        where: { slug: { in: missing.map((skill) => skill.slug) } },
        select: { id: true, slug: true },
      });
      for (const skill of created) bySlug.set(skill.slug, skill.id);
    }

    return skills
      .filter((skill) => bySlug.has(skill.slug))
      .map((skill) => ({ id: bySlug.get(skill.slug)!, required: skill.required }));
  }

  async recordRun(input: {
    userId?: string | null;
    profileSnapshot: unknown;
    sources: string[];
    offersFetched: number;
    offersPersisted: number;
    durationMs: number;
    errors?: unknown;
  }): Promise<void> {
    await this.prisma.searchRun
      .create({
        data: {
          userId: input.userId ?? null,
          profileSnapshot: input.profileSnapshot as object,
          sources: input.sources,
          offersFetched: input.offersFetched,
          offersPersisted: input.offersPersisted,
          durationMs: input.durationMs,
          errors: (input.errors ?? undefined) as object | undefined,
        },
      })
      .catch((error) => {
        // L'observabilité ne doit jamais casser une recherche utilisateur.
        this.logger.warn(`search_run non enregistré : ${error}`);
      });
  }
}

function detectCategory(slug: string): string {
  return /angular|react|vue|tailwind|css|html|rxjs/.test(slug) ? 'frontend' : 'general';
}
