import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  FormField,
  form,
  max,
  min,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import {
  LucideAngularModule,
  BadgeCheck,
  CircleAlert,
  LoaderCircle,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-angular';
import {
  CONTRACT_LABELS,
  EXPERIENCE_LABELS,
  WORK_MODE_LABELS,
  JobsStore,
} from '../../core/services/jobs.store';
import { ProfileStore } from '../../core/services/profile.store';
import {
  ContractType,
  ExperienceLevel,
  Profile,
  ProfilePayload,
  SkillOption,
  WorkMode,
} from '../../core/models/api.models';

interface SkillEntry {
  slug: string;
  label: string;
  weight: number;
  years: number;
}

interface ProfileFormModel {
  headline: string;
  experienceLevel: ExperienceLevel;
  yearsExperience: number;
  locationCity: string;
  radiusKm: number;
  salaryMin: number;
  salaryPeriod: 'YEAR' | 'MONTH' | 'DAY';
  bio: string;
  isPublished: boolean;
}

/** Profil vide : sert de valeur initiale en création. */
const EMPTY_PROFILE: ProfileFormModel = {
  headline: '',
  experienceLevel: 'INTERMEDIATE',
  yearsExperience: 3,
  locationCity: '',
  radiusKm: 30,
  salaryMin: 45000,
  salaryPeriod: 'YEAR',
  bio: '',
  isPublished: true,
};

const EMPTY_SKILLS: SkillEntry[] = [];

/**
 * Formulaire de profil de recherche.
 *
 * Points clés :
 *  - données scalaires via **Signal Forms** (`form()` + schéma de validation) ;
 *  - contrats et modes de travail dans des `signal()` (chips custom) ;
 *  - compétences gérées avec un **`linkedSignal()`** : la liste de travail se
 *    réinitialise automatiquement quand le profil source change, tout en
 *    restant modifiable localement (ajout / retrait / pondération).
 */
@Component({
  selector: 'app-profile-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, FormField],
  template: `
    <form class="grid gap-6 xl:grid-cols-[1.6fr_1fr]" (submit)="submit($event)" novalidate>
      <!-- Colonne principale -->
      <div class="space-y-6">
        <!-- 1. Poste & expérience -->
        <section class="card p-5 sm:p-6">
          <header class="mb-5 flex items-center gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <lucide-angular [img]="Sparkles" class="size-4.5" />
            </span>
            <div>
              <h2 class="text-base font-bold">Poste recherché</h2>
              <p class="text-xs text-ink-500">Ce que vous voulez faire, et à quel niveau.</p>
            </div>
          </header>

          <div class="space-y-4">
            <div>
              <label class="field-label" for="headline">Intitulé de poste</label>
              <input
                id="headline"
                type="text"
                [formField]="profileForm.headline"
                class="input"
                [class.input-invalid]="showError('headline')"
                placeholder="Ex. Développeur Full-Stack Angular / NestJS"
                autocomplete="organization-title"
              />
              @if (showError('headline')) {
                <p class="field-error">
                  <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
                  {{ message(profileForm.headline().errors(), 'Indiquez un intitulé de poste') }}
                </p>
              } @else {
                <p class="field-hint">
                  Ce libellé influence 20 % du score : reprenez les termes des offres visées.
                </p>
              }
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="field-label" for="experienceLevel">Niveau d'expérience</label>
                <select
                  id="experienceLevel"
                  [formField]="profileForm.experienceLevel"
                  class="select"
                >
                  @for (option of experienceOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>

              <div>
                <label class="field-label" for="yearsExperience">Années d'expérience</label>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn-icon size-10 shrink-0 rounded-xl border border-ink-200"
                    aria-label="Diminuer les années d'expérience"
                    (click)="stepYears(-1)"
                  >
                    <lucide-angular [img]="MinusIcon" class="size-4" />
                  </button>
                  <input
                    id="yearsExperience"
                    type="number"
                    inputmode="numeric"
                    [formField]="profileForm.yearsExperience"
                    class="input text-center tabular-nums"
                  />
                  <button
                    type="button"
                    class="btn-icon size-10 shrink-0 rounded-xl border border-ink-200"
                    aria-label="Augmenter les années d'expérience"
                    (click)="stepYears(1)"
                  >
                    <lucide-angular [img]="PlusIcon" class="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. Compétences -->
        <section class="card p-5 sm:p-6">
          <header class="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <lucide-angular [img]="BadgeCheckIcon" class="size-4.5" />
              </span>
              <div>
                <h2 class="text-base font-bold">Compétences</h2>
                <p class="text-xs text-ink-500">
                  Critère principal du matching (40 % du score).
                </p>
              </div>
            </div>
            <span class="badge-brand">{{ skills().length }} / 40</span>
          </header>

          <!-- Recherche + suggestions -->
          <div class="relative">
            <lucide-angular
              [img]="SearchIcon"
              class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400"
            />
            <input
              type="search"
              class="input pl-9.5"
              placeholder="Rechercher une compétence (Angular, Docker, SQL…)"
              [value]="skillQuery()"
              (input)="onSkillQuery($event)"
              (keydown.enter)="addCustomSkill($event)"
              aria-label="Rechercher une compétence"
            />
          </div>

          @if (suggestions().length) {
            <ul class="mt-2 flex flex-wrap gap-1.5">
              @for (suggestion of suggestions(); track suggestion.slug) {
                <li>
                  <button
                    type="button"
                    class="chip"
                    [disabled]="hasSkill(suggestion.slug) || skills().length >= 40"
                    (click)="addSkill(suggestion)"
                  >
                    <lucide-angular [img]="PlusIcon" class="size-3.5" />
                    {{ suggestion.label }}
                    @if (suggestion.usage > 0) {
                      <span class="text-ink-400">· {{ suggestion.usage }}</span>
                    }
                  </button>
                </li>
              }
            </ul>
          }

          <!-- Compétences sélectionnées avec pondération -->
          @if (skills().length) {
            <ul class="mt-4 space-y-2">
              @for (skill of skills(); track skill.slug) {
                <li
                  class="flex flex-wrap items-center gap-3 rounded-xl border border-ink-200 bg-white p-3"
                >
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-ink-900">
                      {{ skill.label }}
                    </span>
                    <span class="text-xs text-ink-500">{{ weightLabel(skill.weight) }}</span>
                  </span>

                  <!-- Notation 1-5 custom (boutons radio stylisés) -->
                  <div class="flex items-center gap-1" role="radiogroup" [attr.aria-label]="'Niveau sur ' + skill.label">
                    @for (level of [1, 2, 3, 4, 5]; track level) {
                      <button
                        type="button"
                        class="size-7 rounded-md text-xs font-bold transition"
                        [class]="
                          level <= skill.weight
                            ? 'bg-brand-600 text-white'
                            : 'bg-ink-100 text-ink-400 hover:bg-ink-200'
                        "
                        role="radio"
                        [attr.aria-checked]="level === skill.weight"
                        [attr.aria-label]="level + ' sur 5'"
                        (click)="setWeight(skill.slug, level)"
                      >
                        {{ level }}
                      </button>
                    }
                  </div>

                  <button
                    type="button"
                    class="btn-icon text-ink-400 hover:bg-danger-50 hover:text-danger-700"
                    [attr.aria-label]="'Retirer ' + skill.label"
                    (click)="removeSkill(skill.slug)"
                  >
                    <lucide-angular [img]="TrashIcon" class="size-4" />
                  </button>
                </li>
              }
            </ul>
          } @else {
            <p class="mt-4 rounded-xl border border-dashed border-ink-300 p-4 text-center text-sm text-ink-500">
              Ajoutez au moins 3 compétences pour un matching pertinent.
            </p>
          }
        </section>

        <!-- 3. Localisation & rémunération -->
        <section class="card p-5 sm:p-6">
          <header class="mb-5 flex items-center gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <lucide-angular [img]="MapPinIcon" class="size-4.5" />
            </span>
            <div>
              <h2 class="text-base font-bold">Localisation & rémunération</h2>
              <p class="text-xs text-ink-500">Ville, rayon de recherche et prétentions.</p>
            </div>
          </header>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="field-label" for="locationCity">Ville</label>
              <input
                id="locationCity"
                type="text"
                [formField]="profileForm.locationCity"
                class="input"
                [class.input-invalid]="showError('locationCity')"
                placeholder="Paris"
                autocomplete="address-level2"
              />
              @if (showError('locationCity')) {
                <p class="field-error">
                  <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
                  {{ message(profileForm.locationCity().errors(), 'Indiquez votre ville') }}
                </p>
              }
            </div>

            <div>
              <label class="field-label" for="radiusKm">
                Rayon de recherche
                <span class="ml-1 font-normal text-ink-500">{{ profileForm.radiusKm().value() }} km</span>
              </label>
              <input
                id="radiusKm"
                type="range"
                step="10"
                [formField]="profileForm.radiusKm"
                class="mt-2.5 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink-200 accent-brand-600 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow"
              />
            </div>

            <div>
              <label class="field-label" for="salaryMin">Prétentions salariales</label>
              <div class="flex gap-2">
                <div class="relative flex-1">
                  <input
                    id="salaryMin"
                    type="number"
                    inputmode="numeric"
                    step="500"
                    [formField]="profileForm.salaryMin"
                    class="input pr-8 tabular-nums"
                    placeholder="45000"
                  />
                  <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">
                    €
                  </span>
                </div>
                <select
                  [formField]="profileForm.salaryPeriod"
                  class="select w-32"
                  aria-label="Périodicité du salaire"
                >
                  <option value="YEAR">/ an</option>
                  <option value="MONTH">/ mois</option>
                  <option value="DAY">/ jour</option>
                </select>
              </div>
            </div>

            <div>
              <label class="field-label" for="contractTypes">Types de contrat acceptés</label>
              <div class="flex flex-wrap gap-1.5" id="contractTypes">
                @for (option of contractOptions; track option.value) {
                  <label class="chip">
                    <input
                      type="checkbox"
                      [checked]="contractTypes().includes(option.value)"
                      (change)="toggleContract(option.value)"
                    />
                    {{ option.label }}
                  </label>
                }
              </div>
              @if (contractTypes().length === 0) {
                <p class="field-error">
                  <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
                  Sélectionnez au moins un type de contrat
                </p>
              }
            </div>
          </div>
        </section>

        <!-- 4. Modes de travail & présentation -->
        <section class="card p-5 sm:p-6">
          <header class="mb-5 flex items-center gap-2.5">
            <span class="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <lucide-angular [img]="WandSparklesIcon" class="size-4.5" />
            </span>
            <div>
              <h2 class="text-base font-bold">Mode de travail & présentation</h2>
              <p class="text-xs text-ink-500">Télétravail accepté et résumé de votre parcours.</p>
            </div>
          </header>

          <div class="space-y-4">
            <div>
              <span class="field-label">Modes de travail acceptés</span>
              <div class="flex flex-wrap gap-1.5">
                @for (option of workModeOptions; track option.value) {
                  <label class="chip">
                    <input
                      type="checkbox"
                      [checked]="workModes().includes(option.value)"
                      (change)="toggleWorkMode(option.value)"
                    />
                    {{ option.label }}
                  </label>
                }
              </div>
              @if (workModes().length === 0) {
                <p class="field-error">
                  <lucide-angular [img]="CircleAlertIcon" class="size-3.5" />
                  Sélectionnez au moins un mode de travail
                </p>
              }
            </div>

            <div>
              <label class="field-label" for="bio">Présentation</label>
              <textarea
                id="bio"
                rows="4"
                [formField]="profileForm.bio"
                class="textarea resize-y"
                placeholder="Votre parcours, vos spécialités, ce que vous recherchez…"
              ></textarea>
              <p class="field-hint">
                {{ profileForm.bio().value().length }} / 2000 caractères
              </p>
            </div>

            <!-- Toggle de visibilité -->
            <div class="flex items-center justify-between gap-4 rounded-xl bg-ink-50 p-3.5">
              <div>
                <p class="text-sm font-semibold text-ink-900">Profil actif</p>
                <p class="text-xs text-ink-500">
                  Désactivé, le profil n'est pas pris en compte pour les recommandations.
                </p>
              </div>
              <label class="toggle">
                <input type="checkbox" [formField]="profileForm.isPublished" />
                <span class="toggle-track"></span>
                <span class="sr-only">Activer le profil pour les recommandations</span>
              </label>
            </div>
          </div>
        </section>
      </div>

      <!-- Colonne latérale : récapitulatif & actions -->
      <aside class="space-y-4 xl:sticky xl:top-8 xl:self-start">
        <div class="card overflow-hidden">
          <div class="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
            <p class="text-xs font-semibold uppercase tracking-wider text-brand-200">
              Complétion du profil
            </p>
            <p class="mt-1 font-display text-4xl font-extrabold tabular-nums">
              {{ completeness() }}<span class="text-xl text-brand-200">%</span>
            </p>
            <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                class="h-full rounded-full bg-white transition-all duration-500"
                [style.width.%]="completeness()"
              ></div>
            </div>
          </div>

          <dl class="divide-y divide-ink-100 px-5 py-2 text-sm">
            <div class="flex items-center justify-between py-2.5">
              <dt class="text-ink-500">Compétences</dt>
              <dd class="font-semibold tabular-nums">{{ skills().length }}</dd>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <dt class="text-ink-500">Contrats</dt>
              <dd class="font-semibold tabular-nums">{{ contractTypes().length }}</dd>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <dt class="text-ink-500">Modes</dt>
              <dd class="font-semibold tabular-nums">{{ workModes().length }}</dd>
            </div>
            <div class="flex items-center justify-between py-2.5">
              <dt class="text-ink-500">Prétentions</dt>
              <dd class="font-semibold tabular-nums">{{ salaryLabel() }}</dd>
            </div>
          </dl>

          <div class="space-y-2 border-t border-ink-100 p-4">
            <button type="submit" class="btn-primary w-full" [disabled]="store.isSaving() || !isValid()">
              @if (store.isSaving()) {
                <lucide-angular [img]="LoaderIcon" class="size-4 animate-spin" />
                Enregistrement…
              } @else {
                <lucide-angular [img]="SaveIcon" class="size-4" />
                Enregistrer mon profil
              }
            </button>
            <button type="button" class="btn-secondary w-full" (click)="reset()">
              <lucide-angular [img]="RotateIcon" class="size-4" />
              Réinitialiser
            </button>
          </div>
        </div>

        @if (store.error()) {
          <div class="rounded-xl border border-danger-500/30 bg-danger-50 p-3.5 text-sm text-danger-700">
            <div class="flex items-start gap-2">
              <lucide-angular [img]="CircleAlertIcon" class="mt-0.5 size-4 shrink-0" />
              <span>{{ store.error() }}</span>
            </div>
          </div>
        }

        <div class="surface-muted p-4 text-xs leading-relaxed text-ink-500">
          <p class="mb-1 font-semibold text-ink-700">Comment le score est calculé ?</p>
          Compétences 40 % · Intitulé 20 % · Rémunération 13 % · Expérience 10 % ·
          Localisation 10 % · Contrat 7 %. Les critères non renseignés sont redistribués.
        </div>
      </aside>
    </form>
  `,
})
export class ProfileFormComponent implements OnInit {
  readonly store = inject(ProfileStore);
  private readonly jobsStore = inject(JobsStore);

  /** Profil à éditer (null = création). */
  readonly profile = input<Profile | null>(null);
  readonly saved = output<Profile>();

  readonly CircleAlertIcon = CircleAlert;
  readonly Sparkles = Sparkles;
  readonly BadgeCheckIcon = BadgeCheck;
  readonly MapPinIcon = MapPin;
  readonly SearchIcon = Search;
  readonly PlusIcon = Plus;
  readonly MinusIcon = Minus;
  readonly TrashIcon = Trash2;
  readonly SaveIcon = Save;
  readonly RotateIcon = RotateCcw;
  readonly LoaderIcon = LoaderCircle;
  readonly WandSparklesIcon = WandSparkles;

  readonly experienceOptions = Object.entries(EXPERIENCE_LABELS).map(([value, label]) => ({
    value: value as ExperienceLevel,
    label,
  }));
  readonly contractOptions = Object.entries(CONTRACT_LABELS).map(([value, label]) => ({
    value: value as ContractType,
    label,
  }));
  readonly workModeOptions = Object.entries(WORK_MODE_LABELS).map(([value, label]) => ({
    value: value as WorkMode,
    label,
  }));

  // --- État du formulaire -------------------------------------------------
  private readonly submitted = signal(false);
  readonly model = signal<ProfileFormModel>({ ...EMPTY_PROFILE });

  readonly contractTypes = signal<ContractType[]>(['CDI']);
  readonly workModes = signal<WorkMode[]>(['HYBRID', 'REMOTE']);
  readonly skillQuery = signal('');
  readonly catalog = signal<SkillOption[]>([]);

  /**
   * `linkedSignal` : la liste des compétences suit le profil fourni en entrée
   * (réinitialisation quand un autre profil est chargé) tout en restant
   * librement modifiable par l'utilisateur.
   */
  readonly skills = linkedSignal<Profile | null, SkillEntry[]>({
    source: () => this.profile(),
    computation: (profile, previous) => {
      if (!profile) return previous?.value ?? [...EMPTY_SKILLS];
      return profile.skills.map((skill) => ({
        slug: skill.slug,
        label: skill.label,
        weight: skill.weight,
        years: skill.years,
      }));
    },
  });

  readonly profileForm = form(this.model, (path) => {
    required(path.headline, { message: "L'intitulé de poste est requis" });
    minLength(path.headline, 2, { message: 'Intitulé trop court' });

    required(path.locationCity, { message: 'Indiquez votre ville' });
    minLength(path.locationCity, 2, { message: 'Ville trop courte' });

    min(path.yearsExperience, 0, { message: 'Valeur positive attendue' });
    max(path.yearsExperience, 50, { message: 'Maximum 50 ans' });
    min(path.radiusKm, 0);
    max(path.radiusKm, 200);
    min(path.salaryMin, 0, { message: 'Montant positif attendu' });

    // Validation croisée : les listes de chips doivent rester non vides.
    validate(path, ({ value }) => {
      const errors = [];
      if (this.contractTypes().length === 0) {
        errors.push({
          kind: 'contracts',
          message: 'Sélectionnez au moins un type de contrat',
        });
      }
      if (this.workModes().length === 0) {
        errors.push({
          kind: 'workModes',
          message: 'Sélectionnez au moins un mode de travail',
        });
      }
      return errors;
    });
  });

  readonly completeness = computed(() => {
    const value = this.model();
    let score = 0;
    if (value.headline.trim().length > 2) score += 20;
    if (value.locationCity.trim().length > 1) score += 15;
    score += Math.min(30, this.skills().length * 5);
    if (value.salaryMin > 0) score += 15;
    if (value.bio.trim().length > 40) score += 10;
    if (value.yearsExperience > 0) score += 10;
    return Math.min(100, score);
  });

  readonly isValid = computed(
    () =>
      this.profileForm().valid() &&
      this.contractTypes().length > 0 &&
      this.workModes().length > 0 &&
      this.skills().length > 0,
  );

  readonly suggestions = computed(() => {
    const query = this.skillQuery().trim().toLowerCase();
    const selected = new Set(this.skills().map((skill) => skill.slug));
    const candidates = this.catalog().filter((skill) => !selected.has(skill.slug));

    if (!query) {
      return candidates.filter((skill) => skill.usage > 0).slice(0, 8);
    }
    return candidates
      .filter(
        (skill) =>
          skill.label.toLowerCase().includes(query) || skill.slug.includes(query),
      )
      .slice(0, 10);
  });

  readonly salaryLabel = computed(() => {
    const { salaryMin, salaryPeriod } = this.model();
    if (!salaryMin) return '—';
    const suffix = salaryPeriod === 'YEAR' ? '/ an' : salaryPeriod === 'MONTH' ? '/ mois' : '/ jour';
    return `${new Intl.NumberFormat('fr-FR').format(salaryMin)} € ${suffix}`;
  });

  constructor() {
    // Synchronise le formulaire dès qu'un profil arrive (ou change).
    effect(() => {
      const profile = this.profile();
      if (profile) {
        this.applyProfile(profile);
      }
    });
  }

  ngOnInit(): void {
    this.jobsStore.skillOptions().subscribe((skills) => this.catalog.set(skills));
  }

  // --- Actions de formulaire ---------------------------------------------

  showError(field: 'headline' | 'locationCity' | 'salaryMin'): boolean {
    const state = this.profileForm[field]();
    return (state.touched() || this.submitted()) && state.invalid();
  }

  message(errors: ReadonlyArray<{ message?: string }> | undefined, fallback: string): string {
    return errors?.[0]?.message ?? fallback;
  }

  stepYears(delta: number): void {
    const current = Number(this.profileForm.yearsExperience().value() ?? 0);
    this.profileForm.yearsExperience().value.set(
      Math.max(0, Math.min(50, current + delta)),
    );
  }

  toggleContract(value: ContractType): void {
    this.contractTypes.update((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  toggleWorkMode(value: WorkMode): void {
    this.workModes.update((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  onSkillQuery(event: Event): void {
    this.skillQuery.set((event.target as HTMLInputElement).value);
  }

  hasSkill(slug: string): boolean {
    return this.skills().some((skill) => skill.slug === slug);
  }

  addSkill(option: { slug: string; label: string }): void {
    if (this.hasSkill(option.slug) || this.skills().length >= 40) return;
    this.skills.update((current) => [
      ...current,
      { slug: option.slug, label: option.label, weight: 3, years: 0 },
    ]);
    this.skillQuery.set('');
  }

  /** Permet d'ajouter une compétence absente du référentiel. */
  addCustomSkill(event: Event): void {
    event.preventDefault();
    const label = this.skillQuery().trim();
    if (!label) return;
    this.addSkill({
      slug: label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9+#.]+/g, '-')
        .replace(/^-|-$/g, ''),
      label,
    });
  }

  removeSkill(slug: string): void {
    this.skills.update((current) => current.filter((skill) => skill.slug !== slug));
  }

  setWeight(slug: string, weight: number): void {
    this.skills.update((current) =>
      current.map((skill) => (skill.slug === slug ? { ...skill, weight } : skill)),
    );
  }

  weightLabel(weight: number): string {
    const labels = ['Notions', 'Débutant', 'Intermédiaire', 'Avancé', 'Expert'];
    return labels[Math.max(0, Math.min(4, weight - 1))];
  }

  reset(): void {
    const profile = this.profile();
    if (profile) {
      this.applyProfile(profile);
    } else {
      this.model.set({ ...EMPTY_PROFILE });
      this.contractTypes.set(['CDI']);
      this.workModes.set(['HYBRID', 'REMOTE']);
      this.skills.set([]);
    }
    this.submitted.set(false);
  }

  submit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.profileForm().markAsTouched();

    if (!this.isValid()) return;

    const value = this.model();
    const payload: ProfilePayload = {
      headline: value.headline.trim(),
      experienceLevel: value.experienceLevel,
      yearsExperience: Number(value.yearsExperience),
      locationCity: value.locationCity.trim(),
      locationCountry: 'FR',
      radiusKm: Number(value.radiusKm),
      contractTypes: this.contractTypes(),
      workModes: this.workModes(),
      salaryMin: Number(value.salaryMin) || 0,
      salaryCurrency: 'EUR',
      salaryPeriod: value.salaryPeriod,
      bio: value.bio.trim() || undefined,
      isPublished: value.isPublished,
      skills: this.skills().map((skill) => ({
        slug: skill.slug,
        weight: skill.weight,
        years: skill.years,
      })),
    };

    this.store.save(payload).subscribe({
      next: (profile) => {
        this.saved.emit(profile);
        // Les scores affichés dépendent du profil : on rafraîchit le catalogue.
        this.jobsStore.reloadAfterProfileChange();
      },
    });
  }

  private applyProfile(profile: Profile): void {
    this.model.set({
      headline: profile.headline,
      experienceLevel: profile.experienceLevel,
      yearsExperience: profile.yearsExperience,
      locationCity: profile.locationCity,
      radiusKm: profile.radiusKm,
      salaryMin: profile.salaryMin ?? 0,
      salaryPeriod: (profile.salaryPeriod as 'YEAR' | 'MONTH' | 'DAY') ?? 'YEAR',
      bio: profile.bio ?? '',
      isPublished: profile.isPublished,
    });
    this.contractTypes.set([...profile.contractTypes]);
    this.workModes.set([...profile.workModes]);
  }
}
