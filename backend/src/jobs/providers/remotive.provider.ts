import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JobProvider,
  NormalizedOffer,
  ProviderQuery,
} from './job-provider.interface';
import { mapRemotiveJob, RemotiveJob } from './remotive.mapper';

/**
 * Fournisseur Remotive — agrégateur public d'offres remote.
 * API ouverte, sans clé : idéale pour enrichir le catalogue côté « remote ».
 *
 * Doc : https://remotive.com/api-documentation
 * La normalisation des données vit dans `remotive.mapper.ts` (testable sans HTTP).
 */
@Injectable()
export class RemotiveProvider implements JobProvider {
  readonly name = 'remotive';
  readonly label = 'Remotive (remote)';

  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<boolean>('REMOTIVE_ENABLED', true) !== false;
  }

  async search(query: ProviderQuery): Promise<NormalizedOffer[]> {
    // Remotive ne gère pas les filtres ville/contrat : on filtre après coup.
    const baseUrl = this.config.get<string>(
      'REMOTIVE_API_URL',
      'https://remotive.com/api/remote-jobs',
    );
    const url = new URL(baseUrl);
    url.searchParams.set('limit', String(Math.min(query.limit, 100)));
    if (query.keywords) url.searchParams.set('search', query.keywords);

    const response = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'JobRadar/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Remotive a répondu ${response.status}`);
    }

    const payload = (await response.json()) as { jobs?: RemotiveJob[] };
    const offers = (payload.jobs ?? []).map(mapRemotiveJob);

    return offers.filter((offer) => {
      if (query.contractTypes?.length && !query.contractTypes.includes(offer.contractType)) {
        return false;
      }
      if (query.workModes?.length && !query.workModes.includes(offer.workMode)) {
        return false;
      }
      return true;
    });
  }
}
