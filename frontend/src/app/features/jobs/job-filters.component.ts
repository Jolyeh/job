import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import {
  LucideAngularModule,
  ChevronDown,
  Funnel,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-angular';
import {
  ContractType,
  ExperienceLevel,
  OfferLanguage,
  WorkMode,
} from '../../core/models/api.models';
import { JobsStore } from '../../core/services/jobs.store';
import { I18nService } from '../../core/i18n/i18n.service';

interface Option<T extends string> {
  value: T;
  label: string;
}

/**
 * Panneau de filtres. Contrôles 100 % customisés : recherche, sélecteur
 * d'expérience, puces de contrat / mode de travail, sliders de score et de
 * fraîcheur. Chaque interaction délègue au JobsStore (source de vérité).
 */
@Component({
  selector: 'app-job-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="card p-5">
      <header class="mb-4 flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-sm font-bold text-ink-900">
          <lucide-angular [img]="FilterIcon" class="size-4 text-brand-600" />
          {{ i18n.t('filters.title') }}
          @if (store.activeFilterCount() > 0) {
            <span class="badge-brand">{{ store.activeFilterCount() }}</span>
          }
        </h2>
        @if (store.activeFilterCount() > 0) {
          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
            (click)="store.resetFilters()"
          >
            <lucide-angular [img]="ResetIcon" class="size-3.5" />
            {{ i18n.t('common.reset') }}
          </button>
        }
      </header>

      <div class="space-y-5">
        <!-- Mot-clé -->
        <div>
          <label class="field-label" for="filter-q">{{ i18n.t("filters.keyword") }}</label>
          <div class="relative">
            <lucide-angular
              [img]="SearchIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              id="filter-q"
              type="search"
              class="input pl-9.5"
              [placeholder]="i18n.t('filters.keywordPlaceholder')"
              [value]="store.filters().q ?? ''"
              (input)="onKeyword($event)"
            />
          </div>
        </div>

        <!-- Ville -->
        <div>
          <label class="field-label" for="filter-city">{{ i18n.t("filters.city") }}</label>
          <input
            id="filter-city"
            type="text"
            class="input"
            [placeholder]="i18n.t('filters.cityPlaceholder')"
            [value]="store.filters().city ?? ''"
            (input)="onCity($event)"
          />
        </div>

        <!-- Type de contrat (puces custom) -->
        <fieldset>
          <legend class="field-label">{{ i18n.t("filters.contract") }}</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (option of contractOptions; track option.value) {
              <label class="chip">
                <input
                  type="checkbox"
                  [checked]="isContractSelected(option.value)"
                  (change)="store.toggleMulti('contractType', option.value)"
                />
                {{ i18n.t(option.label) }}
                @if (contractCount(option.value); as count) {
                  <span class="text-ink-400">{{ count }}</span>
                }
              </label>
            }
          </div>
        </fieldset>

        <!-- Mode de travail -->
        <fieldset>
          <legend class="field-label">{{ i18n.t("filters.workMode") }}</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (option of workModeOptions; track option.value) {
              <label class="chip">
                <input
                  type="checkbox"
                  [checked]="isWorkModeSelected(option.value)"
                  (change)="store.toggleMulti('workMode', option.value)"
                />
                {{ i18n.t(option.label) }}
                @if (workModeCount(option.value); as count) {
                  <span class="text-ink-400">{{ count }}</span>
                }
              </label>
            }
          </div>
        </fieldset>

        <!-- Langue de l'offre (filtre demandé explicitement) -->
        <fieldset>
          <legend class="field-label">{{ i18n.t('filters.language') }}</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (option of languageOptions; track option.value) {
              <label class="chip">
                <input
                  type="checkbox"
                  [checked]="isLanguageSelected(option.value)"
                  (change)="store.toggleMulti('languages', option.value)"
                />
                {{ i18n.t(option.label) }}
                @if (languageCount(option.value); as count) {
                  <span class="text-ink-400">{{ count }}</span>
                }
              </label>
            }
          </div>
          <p class="field-hint">{{ i18n.t('filters.languageHint') }}</p>
        </fieldset>

        <!-- Niveau d'expérience -->
        <div>
          <label class="field-label" for="filter-experience">{{ i18n.t("filters.experience") }}</label>
          <select
            id="filter-experience"
            class="select"
            [value]="store.filters().experienceLevel ?? ''"
            (change)="onExperience($event)"
          >
            <option value="">{{ i18n.t("filters.allLevels") }}</option>
            @for (option of experienceOptions; track option.value) {
              <option [value]="option.value">{{ i18n.t(option.label) }}</option>
            }
          </select>
        </div>

        <!-- Score minimum -->
        <div>
          <label class="field-label" for="filter-score">
            Score minimum
            <span class="ml-1 font-normal text-ink-500">
              {{ store.filters().minScore ? "≥ " + store.filters().minScore : i18n.t("filters.any") }}
            </span>
          </label>
          <input
            id="filter-score"
            type="range"
            min="0"
            max="95"
            step="5"
            class="h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow"
            [value]="store.filters().minScore ?? 0"
            (input)="onMinScore($event)"
          />
          <div class="mt-1 flex justify-between text-[11px] text-ink-400">
            <span>{{ i18n.t("filters.any") }}</span>
            <span>{{ i18n.t("filters.highMatch") }}</span>
          </div>
        </div>

        <!-- Fraîcheur -->
        <fieldset>
          <legend class="field-label">{{ i18n.t("filters.freshness") }}</legend>
          <div class="grid grid-cols-2 gap-1.5">
            @for (option of freshnessOptions; track option.value) {
              <label class="chip justify-center">
                <input
                  type="radio"
                  name="maxAgeDays"
                  [checked]="store.filters().maxAgeDays === option.value"
                  (change)="store.patchFilters({ maxAgeDays: option.value })"
                />
                {{ i18n.t(option.labelKey) }}
              </label>
            }
          </div>
        </fieldset>

        <!-- Rémunération minimum -->
        <div>
          <label class="field-label" for="filter-salary">{{ i18n.t("filters.salary") }}</label>
          <div class="relative">
            <input
              id="filter-salary"
              type="number"
              min="0"
              step="5000"
              class="input pr-8 tabular-nums"
              [placeholder]="i18n.t('filters.noMinimum')"
              [value]="store.filters().salaryMin ?? ''"
              (change)="onSalary($event)"
            />
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">€</span>
          </div>
        </div>

        <!-- Tri -->
        <div>
          <label class="field-label" for="filter-sort">{{ i18n.t("filters.sortBy") }}</label>
          <div class="relative">
            <select
              id="filter-sort"
              class="select"
              [value]="store.filters().sort ?? 'relevance'"
              (change)="onSort($event)"
            >
              <option value="relevance">{{ i18n.t("filters.sort.relevance") }}</option>
              <option value="recent">{{ i18n.t("filters.sort.recent") }}</option>
              <option value="salary">{{ i18n.t("filters.sort.salary") }}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class JobFiltersComponent {
  readonly store = inject(JobsStore);
  readonly i18n = inject(I18nService);

  /** Version mobile : le panneau est affiché en tiroir. */
  readonly compact = input(false);
  readonly closed = output<void>();

  readonly FilterIcon = Funnel;
  readonly SearchIcon = Search;
  readonly ResetIcon = RotateCcw;
  readonly SlidersIcon = SlidersHorizontal;
  readonly ChevronIcon = ChevronDown;
  readonly XIcon = X;

  /** Enums complets : la valeur est l'enum, le libellé une clé i18n. */
  readonly contractOptions: Option<ContractType>[] = (
    ['CDI', 'CDD', 'STAGE', 'ALTERNANCE', 'FREELANCE', 'INTERIM'] as ContractType[]
  ).map((value) => ({ value, label: `contract.${value}` }));

  readonly workModeOptions: Option<WorkMode>[] = (
    ['ONSITE', 'HYBRID', 'REMOTE'] as WorkMode[]
  ).map((value) => ({ value, label: `workMode.${value}` }));

  readonly experienceOptions: Option<ExperienceLevel>[] = (
    ['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'LEAD'] as ExperienceLevel[]
  ).map((value) => ({ value, label: `experience.${value}` }));

  /** Le filtre de langue est obligatoire dans l'interface. */
  readonly languageOptions: Option<OfferLanguage>[] = (
    ['FR', 'EN'] as OfferLanguage[]
  ).map((value) => ({ value, label: `language.${value}` }));

  readonly freshnessOptions: Array<{ value: number | undefined; labelKey: string }> = [
    { value: 7, labelKey: 'filters.days7' },
    { value: 30, labelKey: 'filters.days30' },
    { value: 90, labelKey: 'filters.days90' },
    { value: undefined, labelKey: 'filters.any' },
  ];

  private readonly keywordTimer = signal<ReturnType<typeof setTimeout> | null>(null);

  readonly facets = computed(() => this.store.facets());

  isContractSelected(value: ContractType): boolean {
    return (this.store.filters().contractType ?? []).includes(value);
  }

  isWorkModeSelected(value: WorkMode): boolean {
    return (this.store.filters().workMode ?? []).includes(value);
  }

  isLanguageSelected(value: OfferLanguage): boolean {
    return (this.store.filters().languages ?? []).includes(value);
  }

  languageCount(value: OfferLanguage): number {
    return this.facets()?.languages?.find((facet) => facet.value === value)?.count ?? 0;
  }

  contractCount(value: ContractType): number {
    return this.facets()?.contractTypes.find((facet) => facet.value === value)?.count ?? 0;
  }

  workModeCount(value: WorkMode): number {
    return this.facets()?.workModes.find((facet) => facet.value === value)?.count ?? 0;
  }

  /** Anti-rebond sur la saisie libre (300 ms) pour éviter une requête par frappe. */
  onKeyword(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const timer = this.keywordTimer();
    if (timer) clearTimeout(timer);
    this.keywordTimer.set(
      setTimeout(() => this.store.patchFilters({ q: value || undefined }), 300),
    );
  }

  onCity(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const timer = this.keywordTimer();
    if (timer) clearTimeout(timer);
    this.keywordTimer.set(
      setTimeout(() => this.store.patchFilters({ city: value || undefined }), 300),
    );
  }

  onExperience(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.store.patchFilters({
      experienceLevel: (value || undefined) as ExperienceLevel | undefined,
    });
  }

  onMinScore(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.patchFilters({ minScore: value > 0 ? value : undefined });
  }

  onSalary(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.store.patchFilters({ salaryMin: value > 0 ? value : undefined });
  }

  onSort(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'relevance' | 'recent' | 'salary';
    this.store.patchFilters({ sort: value });
  }
}
