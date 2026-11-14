import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import {
  ContractType,
  JobOffer,
  JobSearchFilters,
  JobSearchResponse,
  OfferLanguage,
  SkillOption,
  WorkMode,
} from '../models/api.models';
import { ApiError, ApiService } from './api.service';
import { ProfileStore } from './profile.store';
import { UiStore } from './ui.store';
import { I18nService } from '../i18n/i18n.service';

export const DEFAULT_FILTERS: JobSearchFilters = {
  sort: 'relevance',
  page: 1,
  pageSize: 9,
};

/** Libellés français centralisés (utilisés dans les templates et les filtres). */
export const CONTRACT_LABELS: Record<ContractType, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  ALTERNANCE: 'Alternance',
  FREELANCE: 'Freelance',
  INTERIM: 'Intérim',
};

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  ONSITE: 'Sur site',
  HYBRID: 'Hybride',
  REMOTE: 'Télétravail',
};

export const LANGUAGE_LABELS: Record<OfferLanguage, string> = {
  FR: 'Français',
  EN: 'English',
};

export const EXPERIENCE_LABELS: Record<string, string> = {
  JUNIOR: 'Junior',
  INTERMEDIATE: 'Confirmé',
  SENIOR: 'Senior',
  LEAD: 'Lead',
};

/**
 * Store du catalogue d'offres (Signals).
 *
 * Toutes les vues (catalogue, tableau de bord, détail) lisent ce même état :
 * changer un filtre met à jour les cartes, les facettes et les compteurs
 * sans recharger la page.
 */
@Injectable({ providedIn: 'root' })
export class JobsStore {
  private readonly api = inject(ApiService);
  private readonly profileStore = inject(ProfileStore);
  private readonly ui = inject(UiStore);
  private readonly i18n = inject(I18nService);

  private readonly filtersState = signal<JobSearchFilters>({ ...DEFAULT_FILTERS });
  private readonly resultState = signal<JobSearchResponse | null>(null);
  private readonly loadingState = signal(false);
  private readonly refreshingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  /** Vrai dès que les langues du profil ont servi de valeurs par défaut. */
  private languagesSeeded = false;

  readonly filters = this.filtersState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly isRefreshing = this.refreshingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly result = this.resultState.asReadonly();

  readonly offers = computed(() => this.resultState()?.items ?? []);
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly facets = computed(() => this.resultState()?.facets ?? null);
  readonly meta = computed(() => this.resultState()?.meta ?? null);
  readonly page = computed(() => this.resultState()?.page ?? 1);
  readonly totalPages = computed(() => this.resultState()?.totalPages ?? 1);
  readonly isEmpty = computed(
    () => !this.isLoading() && this.resultState() !== null && this.offers().length === 0,
  );
  /** Nombre de filtres actifs (hors pagination/tri). */
  readonly activeFilterCount = computed(() => {
    const filters = this.filtersState();
    let count = 0;
    if (filters.q) count += 1;
    if (filters.city) count += 1;
    if (filters.contractType?.length) count += filters.contractType.length;
    if (filters.workMode?.length) count += filters.workMode.length;
    if (filters.languages?.length) count += filters.languages.length;
    if (filters.experienceLevel) count += 1;
    if (filters.minScore) count += 1;
    if (filters.maxAgeDays) count += 1;
    if (filters.salaryMin) count += 1;
    return count;
  });

  /**
   * Charge les offres en appliquant les filtres courants.
   *
   * Au premier chargement, le filtre de langue est initialisé avec les langues
   * du profil : l'API applique déjà ce défaut côté serveur, donc l'afficher
   * évite un décalage entre les puces cochées et les résultats reçus.
   */
  load(overrides: Partial<JobSearchFilters> = {}): void {
    const filters: JobSearchFilters = { ...this.filtersState(), ...overrides };
    if (filters.languages === undefined) {
      const profileLanguages = this.profileStore.languages();
      if (profileLanguages.length) {
        filters.languages = [...profileLanguages];
        this.languagesSeeded = true;
      }
    }
    this.filtersState.set(filters);
    this.loadingState.set(true);
    this.errorState.set(null);

    this.api
      .get<JobSearchResponse>('/jobs', toQuery(filters))
      .pipe(
        tap((result) => this.resultState.set(result)),
        catchError((error: unknown) => {
          const apiError = error as ApiError;
          this.errorState.set(apiError.message);
          return of(null);
        }),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe();
  }

  /** Met à jour un filtre puis recharge (remise en page 1). */
  patchFilters(patch: Partial<JobSearchFilters>): void {
    const resetsPage = Object.keys(patch).some(
      (key) => key !== 'page' && key !== 'pageSize' && key !== 'sort',
    );
    this.load({ ...patch, ...(resetsPage ? { page: 1 } : {}) });
  }

  /** Bascule une valeur dans un filtre multivalué (contrat, mode, langue). */
  toggleMulti<K extends 'contractType' | 'workMode' | 'languages'>(
    key: K,
    value: ContractType | WorkMode | OfferLanguage,
  ): void {
    const current = (this.filtersState()[key] ?? []) as Array<
      ContractType | WorkMode | OfferLanguage
    >;
    const next = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value];
    this.patchFilters({ [key]: next } as Partial<JobSearchFilters>);
  }

  resetFilters(): void {
    // Les langues du profil redeviennent le défaut après réinitialisation.
    const profileLanguages = this.profileStore.languages();
    this.load({
      ...DEFAULT_FILTERS,
      ...(profileLanguages.length ? { languages: [...profileLanguages] } : {}),
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.load({ page });
  }

  /** Synchronise les providers externes (France Travail, Remotive…) puis recharge. */
  refresh(): void {
    this.refreshingState.set(true);
    this.api
      .post<JobSearchResponse>('/jobs/refresh', toQuery(this.filtersState()))
      .pipe(
        tap((result) => {
          this.resultState.set(result);
          this.ui.notify(this.i18n.t('toast.sourcesSynced'), 'success');
        }),
        catchError((error: unknown) => {
          this.ui.notify((error as ApiError).message, 'error');
          return of(null);
        }),
        finalize(() => this.refreshingState.set(false)),
      )
      .subscribe();
  }

  offerById(id: string): Observable<JobOffer> {
    return this.api.get<JobOffer>(`/jobs/${id}`);
  }

  skillOptions(query = ''): Observable<SkillOption[]> {
    return this.api.get<SkillOption[]>('/skills', { q: query || undefined }).pipe(
      catchError(() => of([])),
    );
  }

  /** Un profil qui change invalide les scores affichés. */
  reloadAfterProfileChange(): void {
    if (this.profileStore.hasProfile()) this.load();
  }
}

/** Aplatit les filtres en query params (les tableaux sont répétés). */
export function toQuery(filters: JobSearchFilters): Record<string, string | number | string[] | undefined> {
  return {
    q: filters.q,
    city: filters.city,
    contractType: filters.contractType,
    workMode: filters.workMode,
    languages: filters.languages,
    experienceLevel: filters.experienceLevel,
    salaryMin: filters.salaryMin,
    minScore: filters.minScore,
    maxAgeDays: filters.maxAgeDays,
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
    source: filters.source,
  };
}
