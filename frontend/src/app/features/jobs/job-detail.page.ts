import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowLeft,
  Banknote,
  Bookmark,
  BookmarkCheck,
  Building2,
  CalendarClock,
  CircleCheck,
  ExternalLink,
  Laptop,
  LoaderCircle,
  MapPin,
  Sparkles,
  Target,
  TriangleAlert,
} from 'lucide-angular';
import { JobOffer } from '../../core/models/api.models';
import { BookmarksStore } from '../../core/services/bookmarks.store';
import { I18nService } from '../../core/i18n/i18n.service';
import { JobsStore } from '../../core/services/jobs.store';
import { ScoreRingComponent } from '../../shared/ui/score-ring.component';

/** Fiche détaillée d'une offre, avec le détail du score critère par critère. */
@Component({
  selector: 'app-job-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ScoreRingComponent, LucideAngularModule],
  template: `
    <div class="mx-auto max-w-5xl">
      <a
        routerLink="/app/jobs"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-brand-700"
      >
        <lucide-angular [img]="BackIcon" class="size-4" />
        {{ i18n.t('jobs.detail.back') }}
      </a>

      @if (loading()) {
        <div class="mt-5 card space-y-4 p-6">
          <div class="skeleton h-7 w-2/3"></div>
          <div class="skeleton h-4 w-1/3"></div>
          <div class="skeleton h-24 w-full"></div>
        </div>
      } @else if (offer(); as job) {
        <article class="mt-5 space-y-6">
          <!-- En-tête -->
          <header class="card p-6">
            <div class="flex flex-wrap items-start gap-5">
              <div
                class="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-ink-100 text-base font-bold text-ink-500"
                aria-hidden="true"
              >
                @if (job.logoUrl) {
                  <img [src]="job.logoUrl" alt="" class="size-full object-cover" referrerpolicy="no-referrer" />
                } @else {
                  {{ companyInitials() }}
                }
              </div>

              <div class="min-w-0 flex-1">
                <h1 class="font-display text-2xl font-extrabold leading-tight tracking-tight">
                  {{ job.title }}
                </h1>
                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-600">
                  <span class="inline-flex items-center gap-1.5 font-semibold text-ink-800">
                    <lucide-angular [img]="BuildingIcon" class="size-4 text-ink-400" />
                    {{ job.company }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <lucide-angular [img]="MapPinIcon" class="size-4 text-ink-400" />
                    {{ job.city }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <lucide-angular [img]="LaptopIcon" class="size-4 text-ink-400" />
                    {{ workModeLabel() }}
                  </span>
                  <span class="inline-flex items-center gap-1.5">
                    <lucide-angular [img]="CalendarIcon" class="size-4 text-ink-400" />
                    {{ i18n.t('jobs.detail.published', { date: i18n.formatDate(job.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' }) }) }}
                  </span>
                </p>

                <div class="mt-3 flex flex-wrap gap-1.5">
                  <span class="badge-brand">{{ contractLabel() }}</span>
                  <span class="badge-neutral">{{ experienceLabel() }}</span>
                  @if (salaryLabel(); as salary) {
                    <span class="badge-success">
                      <lucide-angular [img]="BanknoteIcon" class="size-3" />
                      {{ salary }}
                    </span>
                  }
                  <span class="badge-neutral">source : {{ job.source }}</span>
                </div>
              </div>

              <div class="flex flex-col items-center gap-3">
                <app-score-ring [score]="job.match.score" [size]="76" />
                <p class="text-center text-xs font-semibold text-ink-500">
                  {{ i18n.t('jobs.detail.match') }}
                </p>
              </div>
            </div>

            <div class="mt-6 flex flex-wrap gap-2 border-t border-ink-100 pt-5">
              <a
                [href]="job.applyUrl ?? job.url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn-primary"
              >
                {{ i18n.t('jobs.detail.applyOnSite') }}
                <lucide-angular [img]="ExternalIcon" class="size-4" />
              </a>
              <button
                type="button"
                class="btn-secondary"
                [disabled]="bookmarks.isPending(job.id)"
                (click)="toggleBookmark()"
              >
                <lucide-angular
                  [img]="isBookmarked() ? BookmarkCheckIcon : BookmarkIcon"
                  class="size-4"
                  [class.text-brand-600]="isBookmarked()"
                />
                {{ isBookmarked() ? 'Dans votre suivi' : 'Sauvegarder' }}
              </button>
            </div>
          </header>

          <div class="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <!-- Description -->
            <section class="card p-6">
              <h2 class="mb-4 text-base font-bold">{{ i18n.t('jobs.detail.description') }}</h2>
              <div class="space-y-3 text-sm leading-relaxed text-ink-700">
                @for (paragraph of description(); track $index) {
                  <p class="whitespace-pre-line">{{ paragraph }}</p>
                }
              </div>

              @if (job.tags.length) {
                <div class="mt-5 flex flex-wrap gap-1.5 border-t border-ink-100 pt-4">
                  @for (tag of job.tags; track tag) {
                    <span class="badge-neutral">#{{ tag }}</span>
                  }
                </div>
              }
            </section>

            <!-- Analyse du match -->
            <aside class="space-y-4">
              <section class="card p-5">
                <h2 class="mb-1 flex items-center gap-2 text-sm font-bold">
                  <lucide-angular [img]="TargetIcon" class="size-4 text-brand-600" />
                  {{ i18n.t('jobs.detail.whyScore') }}
                </h2>
                <p class="mb-4 text-xs text-ink-500">
                  {{ i18n.t('jobs.detail.whyScoreHint') }}
                </p>

                <ul class="space-y-3">
                  @for (criterion of criteria(); track criterion.key) {
                    <li>
                      <div class="mb-1 flex items-center justify-between text-xs">
                        <span class="font-semibold text-ink-700">{{ criterion.label }}</span>
                        <span class="tabular-nums text-ink-500">{{ criterion.value }}%</span>
                      </div>
                      <div class="h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div
                          class="h-full rounded-full transition-all duration-500"
                          [class]="barClass(criterion.value)"
                          [style.width.%]="criterion.value"
                        ></div>
                      </div>
                    </li>
                  }
                </ul>
              </section>

              @if (job.match.reasons.length) {
                <section class="rounded-2xl border border-success-500/25 bg-success-50/60 p-4">
                  <h3 class="mb-2 flex items-center gap-1.5 text-sm font-bold text-success-700">
                    <lucide-angular [img]="CheckIcon" class="size-4" />
                    {{ i18n.t('jobs.detail.strengths') }}
                  </h3>
                  <ul class="space-y-1.5 text-xs text-success-700">
                    @for (reason of job.match.reasons; track reason) {
                      <li class="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span>{{ reason }}</span>
                      </li>
                    }
                  </ul>
                </section>
              }

              @if (job.match.warnings.length) {
                <section class="rounded-2xl border border-warn-500/25 bg-warn-50/70 p-4">
                  <h3 class="mb-2 flex items-center gap-1.5 text-sm font-bold text-warn-700">
                    <lucide-angular [img]="WarnIcon" class="size-4" />
                    {{ i18n.t('jobs.detail.warnings') }}
                  </h3>
                  <ul class="space-y-1.5 text-xs text-warn-700">
                    @for (warning of job.match.warnings; track warning) {
                      <li class="flex gap-1.5">
                        <span aria-hidden="true">•</span>
                        <span>{{ warning }}</span>
                      </li>
                    }
                  </ul>
                </section>
              }

              <!-- Compétences -->
              <section class="card p-5">
                <h2 class="mb-3 flex items-center gap-2 text-sm font-bold">
                  <lucide-angular [img]="SparklesIcon" class="size-4 text-brand-600" />
                  {{ i18n.t('jobs.detail.skills') }}
                </h2>
                <div class="flex flex-wrap gap-1.5">
                  @for (skill of job.skills; track skill.slug) {
                    <span
                      class="badge"
                      [class]="
                        isMatched(skill.label)
                          ? 'bg-success-50 text-success-700'
                          : 'bg-ink-100 text-ink-500'
                      "
                    >
                      @if (isMatched(skill.label)) {
                        <lucide-angular [img]="CheckIcon" class="size-3" />
                      }
                      {{ skill.label }}
                      @if (skill.required) {
                        <span class="opacity-60">*</span>
                      }
                    </span>
                  }
                </div>
                <p class="mt-2 text-[11px] text-ink-400">{{ i18n.t('jobs.detail.skillsHint') }}</p>
              </section>
            </aside>
          </div>
        </article>
      } @else {
        <div class="card mt-5 p-10 text-center">
          <p class="font-semibold text-ink-900">{{ i18n.t('jobs.detail.gone') }}</p>
          <a routerLink="/app/jobs" class="btn-primary mt-4">{{ i18n.t('jobs.detail.seeOthers') }}</a>
        </div>
      }
    </div>
  `,
})
export class JobDetailPageComponent implements OnInit {
  /** Liaison automatique depuis le paramètre de route `:id` (withComponentInputBinding). */
  readonly id = input.required<string>();

  private readonly jobsStore = inject(JobsStore);
  readonly bookmarks = inject(BookmarksStore);
  readonly i18n = inject(I18nService);

  readonly offer = signal<JobOffer | null>(null);
  readonly loading = signal(true);

  readonly BackIcon = ArrowLeft;
  readonly BuildingIcon = Building2;
  readonly MapPinIcon = MapPin;
  readonly LaptopIcon = Laptop;
  readonly CalendarIcon = CalendarClock;
  readonly BanknoteIcon = Banknote;
  readonly ExternalIcon = ExternalLink;
  readonly BookmarkIcon = Bookmark;
  readonly BookmarkCheckIcon = BookmarkCheck;
  readonly TargetIcon = Target;
  readonly SparklesIcon = Sparkles;
  readonly CheckIcon = CircleCheck;
  readonly WarnIcon = TriangleAlert;
  readonly LoaderIcon = LoaderCircle;

  readonly isBookmarked = computed(() => {
    const job = this.offer();
    return job ? this.bookmarks.isBookmarked(job.id) : false;
  });

  readonly companyInitials = computed(() =>
    (this.offer()?.company ?? '')
      .split(/[\s-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join(''),
  );

  readonly contractLabel = computed(() => {
    const job = this.offer();
    return job ? this.i18n.t(`contract.${job.contractType}`) : '';
  });

  readonly workModeLabel = computed(() => {
    const job = this.offer();
    return job ? this.i18n.t(`workMode.${job.workMode}`) : '';
  });

  readonly experienceLabel = computed(() => {
    const job = this.offer();
    return job ? this.i18n.t(`experience.${job.experienceLevel}`) : '';
  });

  readonly salaryLabel = computed(() => {
    const job = this.offer();
    if (!job || (!job.salaryMin && !job.salaryMax)) return null;
    const format = (value: number) =>
      new Intl.NumberFormat(this.i18n.locale(), {
        style: 'currency',
        currency: job.salaryCurrency,
        maximumFractionDigits: 0,
        notation: 'compact',
      }).format(value);
    return job.salaryMin && job.salaryMax
      ? `${format(job.salaryMin)} – ${format(job.salaryMax)}`
      : format((job.salaryMin ?? job.salaryMax)!);
  });

  readonly description = computed(() => {
    const text = this.offer()?.description ?? '';
    return text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph.length > 0)
      .slice(0, 8);
  });

  readonly criteria = computed(() => {
    const match = this.offer()?.match;
    if (!match) return [];
    const labels: Record<string, string> = {
      skills: 'Compétences (40 %)',
      title: 'Intitulé du poste (20 %)',
      salary: 'Rémunération (13 %)',
      experience: 'Expérience (10 %)',
      location: 'Localisation (10 %)',
      contract: 'Contrat (7 %)',
    };
    return Object.entries(match.breakdown).map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
    }));
  });

  ngOnInit(): void {
    this.load();
    this.bookmarks.load();
  }

  isMatched(label: string): boolean {
    return this.offer()?.match.matchedSkills.includes(label) ?? false;
  }

  barClass(value: number): string {
    if (value >= 75) return 'bg-success-500';
    if (value >= 50) return 'bg-warn-500';
    if (value === 0) return 'bg-ink-300';
    return 'bg-danger-500';
  }

  toggleBookmark(): void {
    const job = this.offer();
    if (!job) return;
    if (this.isBookmarked()) {
      const bookmark = this.bookmarks.items().find((item) => item.offer.id === job.id);
      if (bookmark) this.bookmarks.remove(bookmark.id);
      return;
    }
    this.bookmarks.add(job.id).subscribe();
  }

  private load(): void {
    this.loading.set(true);
    this.jobsStore.offerById(this.id()).subscribe({
      next: (offer) => {
        this.offer.set(offer);
        this.loading.set(false);
      },
      error: () => {
        this.offer.set(null);
        this.loading.set(false);
      },
    });
  }
}
