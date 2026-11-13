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
import { ContractType, ExperienceLevel, WorkMode } from '../../core/models/api.models';
import {
  CONTRACT_LABELS,
  EXPERIENCE_LABELS,
  JobsStore,
  WORK_MODE_LABELS,
} from '../../core/services/jobs.store';

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
          Filtres
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
            Réinitialiser
          </button>
        }
      </header>

      <div class="space-y-5">
        <!-- Mot-clé -->
        <div>
          <label class="field-label" for="filter-q">Mot-clé</label>
          <div class="relative">
            <lucide-angular
              [img]="SearchIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              id="filter-q"
              type="search"
              class="input pl-9.5"
              placeholder="Angular, data, design…"
              [value]="store.filters().q ?? ''"
              (input)="onKeyword($event)"
            />
          </div>
        </div>

        <!-- Ville -->
        <div>
          <label class="field-label" for="filter-city">Ville</label>
          <input
            id="filter-city"
            type="text"
            class="input"
            placeholder="Paris, Lyon, télétravail…"
            [value]="store.filters().city ?? ''"
            (input)="onCity($event)"
          />
        </div>

        <!-- Type de contrat (puces custom) -->
        <fieldset>
          <legend class="field-label">Type de contrat</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (option of contractOptions; track option.value) {
              <label class="chip">
                <input
                  type="checkbox"
                  [checked]="isContractSelected(option.value)"
                  (change)="store.toggleMulti('contractType', option.value)"
                />
                {{ option.label }}
                @if (contractCount(option.value); as count) {
                  <span class="text-ink-400">{{ count }}</span>
                }
              </label>
            }
          </div>
        </fieldset>

        <!-- Mode de travail -->
        <fieldset>
          <legend class="field-label">Mode de travail</legend>
          <div class="flex flex-wrap gap-1.5">
            @for (option of workModeOptions; track option.value) {
              <label class="chip">
                <input
                  type="checkbox"
                  [checked]="isWorkModeSelected(option.value)"
                  (change)="store.toggleMulti('workMode', option.value)"
                />
                {{ option.label }}
                @if (workModeCount(option.value); as count) {
                  <span class="text-ink-400">{{ count }}</span>
                }
              </label>
            }
          </div>
        </fieldset>

        <!-- Niveau d'expérience -->
        <div>
          <label class="field-label" for="filter-experience">Niveau requis</label>
          <select
            id="filter-experience"
            class="select"
            [value]="store.filters().experienceLevel ?? ''"
            (change)="onExperience($event)"
          >
            <option value="">Tous les niveaux</option>
            @for (option of experienceOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>

        <!-- Score minimum -->
        <div>
          <label class="field-label" for="filter-score">
            Score minimum
            <span class="ml-1 font-normal text-ink-500">
              {{ store.filters().minScore ? '≥ ' + store.filters().minScore : 'tous' }}
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
            <span>Toutes</span>
            <span>Très pertinentes</span>
          </div>
        </div>

        <!-- Fraîcheur -->
        <fieldset>
          <legend class="field-label">Fraîcheur</legend>
          <div class="grid grid-cols-2 gap-1.5">
            @for (option of freshnessOptions; track option.value) {
              <label class="chip justify-center">
                <input
                  type="radio"
                  name="maxAgeDays"
                  [checked]="store.filters().maxAgeDays === option.value"
                  (change)="store.patchFilters({ maxAgeDays: option.value })"
                />
                {{ option.label }}
              </label>
            }
          </div>
        </fieldset>

        <!-- Rémunération minimum -->
        <div>
          <label class="field-label" for="filter-salary">Salaire minimum annuel</label>
          <div class="relative">
            <input
              id="filter-salary"
              type="number"
              min="0"
              step="5000"
              class="input pr-8 tabular-nums"
              placeholder="Aucun minimum"
              [value]="store.filters().salaryMin ?? ''"
              (change)="onSalary($event)"
            />
            <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">€</span>
          </div>
        </div>

        <!-- Tri -->
        <div>
          <label class="field-label" for="filter-sort">Trier par</label>
          <div class="relative">
            <select
              id="filter-sort"
              class="select"
              [value]="store.filters().sort ?? 'relevance'"
              (change)="onSort($event)"
            >
              <option value="relevance">Pertinence (score)</option>
              <option value="recent">Plus récentes</option>
              <option value="salary">Salaire le plus élevé</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class JobFiltersComponent {
  readonly store = inject(JobsStore);

  /** Version mobile : le panneau est affiché en tiroir. */
  readonly compact = input(false);
  readonly closed = output<void>();

  readonly FilterIcon = Funnel;
  readonly SearchIcon = Search;
  readonly ResetIcon = RotateCcw;
  readonly SlidersIcon = SlidersHorizontal;
  readonly ChevronIcon = ChevronDown;
  readonly XIcon = X;

  readonly contractOptions: Option<ContractType>[] = (
    Object.keys(CONTRACT_LABELS) as ContractType[]
  ).map((value) => ({ value, label: CONTRACT_LABELS[value] }));

  readonly workModeOptions: Option<WorkMode>[] = (
    Object.keys(WORK_MODE_LABELS) as WorkMode[]
  ).map((value) => ({ value, label: WORK_MODE_LABELS[value] }));

  readonly experienceOptions: Option<ExperienceLevel>[] = (
    Object.keys(EXPERIENCE_LABELS) as ExperienceLevel[]
  ).map((value) => ({ value, label: EXPERIENCE_LABELS[value] }));

  readonly freshnessOptions: Array<{ value: number | undefined; label: string }> = [
    { value: 7, label: '7 derniers jours' },
    { value: 30, label: '30 jours' },
    { value: 90, label: '3 mois' },
    { value: undefined, label: 'Tout' },
  ];

  private readonly keywordTimer = signal<ReturnType<typeof setTimeout> | null>(null);

  readonly facets = computed(() => this.store.facets());

  isContractSelected(value: ContractType): boolean {
    return (this.store.filters().contractType ?? []).includes(value);
  }

  isWorkModeSelected(value: WorkMode): boolean {
    return (this.store.filters().workMode ?? []).includes(value);
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
