import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ArrowRight,
  Award,
  Bookmark,
  Briefcase,
  CalendarClock,
  ChartNoAxesColumn,
  CircleCheck,
  Globe,
  MapPin,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  User,
  WandSparkles,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { BookmarksStore } from '../../core/services/bookmarks.store';
import { JobsStore } from '../../core/services/jobs.store';
import { JobSitesStore } from '../../core/services/job-sites.store';
import { ProfileStore } from '../../core/services/profile.store';
import { JobOffer } from '../../core/models/api.models';
import { I18nService } from '../../core/i18n/i18n.service';
import { ScoreRingComponent } from '../../shared/ui/score-ring.component';

/** Tableau de bord : santé du profil, meilleures offres, suivi et critères. */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, RouterLink, ScoreRingComponent],
  template: `
    <div class="mx-auto max-w-7xl space-y-6">
      <!-- En-tête -->
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="badge-brand">
            <lucide-angular [img]="ChartIcon" class="size-3.5" />
            {{ i18n.t('dashboard.title') }}
          </p>
          <h1 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {{ i18n.t('dashboard.greeting', { name: firstName() }) }}
          </h1>
          <p class="mt-1.5 text-sm text-ink-500">
            {{ i18n.t('dashboard.subtitle') }}
          </p>
        </div>
        <a routerLink="/app/jobs" class="btn-primary">
          <lucide-angular [img]="BriefcaseIcon" class="size-4" />
          {{ i18n.t('dashboard.explore') }}
        </a>
      </header>

      <!-- Indicateurs -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t("dashboard.kpi.matches") }}</p>
            <span class="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <lucide-angular [img]="BriefcaseIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ jobsStore.total() }}
          </p>
          <p class="mt-1 text-xs text-ink-500">
            {{ i18n.t("dashboard.kpi.average", { score: jobsStore.facets()?.averageScore ?? 0 }) }}
          </p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t("dashboard.kpi.best") }}</p>
            <span class="grid size-8 place-items-center rounded-lg bg-success-50 text-success-700">
              <lucide-angular [img]="TargetIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ jobsStore.facets()?.topScore ?? 0 }}<span class="text-base text-ink-400">/100</span>
          </p>
          <p class="mt-1 truncate text-xs text-ink-500">
            {{ topOffer()?.title ?? i18n.t('dashboard.onboarding.cta') }}
          </p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t("dashboard.kpi.applications") }}</p>
            <span class="grid size-8 place-items-center rounded-lg bg-warn-50 text-warn-700">
              <lucide-angular [img]="SendIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ bookmarks.stats()?.applied ?? 0 }}
          </p>
          <p class="mt-1 text-xs text-ink-500">
            {{ i18n.t("dashboard.kpi.tracked", { count: bookmarks.total(), rate: bookmarks.stats()?.responseRate ?? 0 }) }}
          </p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">{{ i18n.t("dashboard.kpi.profile") }}</p>
            <span class="grid size-8 place-items-center rounded-lg bg-ink-100 text-ink-600">
              <lucide-angular [img]="UserIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ profileStore.completeness() }}<span class="text-base text-ink-400">%</span>
          </p>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              class="h-full rounded-full bg-brand-600 transition-all duration-500"
              [style.width.%]="profileStore.completeness()"
            ></div>
          </div>
        </div>
      </section>

      <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <!-- Meilleures recommandations -->
        <section class="card overflow-hidden">
          <header class="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 class="flex items-center gap-2 text-sm font-bold">
              <lucide-angular [img]="SparklesIcon" class="size-4 text-brand-600" />
              {{ i18n.t('dashboard.top.title') }}
            </h2>
            <a
              routerLink="/app/jobs"
              class="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              {{ i18n.t('dashboard.top.seeAll') }}
              <lucide-angular [img]="ArrowIcon" class="size-3.5" />
            </a>
          </header>

          @if (jobsStore.isLoading() && topOffers().length === 0) {
            <div class="space-y-3 p-5">
              @for (item of [1, 2, 3]; track item) {
                <div class="flex items-center gap-3">
                  <div class="skeleton size-11 rounded-full"></div>
                  <div class="flex-1 space-y-2">
                    <div class="skeleton h-4 w-2/3"></div>
                    <div class="skeleton h-3 w-1/3"></div>
                  </div>
                </div>
              }
            </div>
          } @else if (topOffers().length === 0) {
            <div class="p-6 text-center">
              <p class="text-sm font-semibold text-ink-800">{{ i18n.t('dashboard.top.emptyTitle') }}</p>
              <p class="mt-1 text-sm text-ink-500">
                {{ i18n.t('dashboard.top.emptyText') }}
              </p>
              <a routerLink="/app/profile" class="btn-primary mt-4">{{ i18n.t('dashboard.onboarding.cta') }}</a>
            </div>
          } @else {
            <ul class="divide-y divide-ink-100">
              @for (offer of topOffers(); track offer.id) {
                <li>
                  <a
                    [routerLink]="['/app/jobs', offer.id]"
                    class="flex items-center gap-4 px-5 py-3.5 transition hover:bg-ink-50"
                  >
                    <app-score-ring [score]="offer.match.score" [size]="46" />
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-ink-900">{{ offer.title }}</p>
                      <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                        <span>{{ offer.company }}</span>
                        <span class="inline-flex items-center gap-0.5">
                          <lucide-angular [img]="PinIcon" class="size-3" />
                          {{ offer.city }}
                        </span>
                        <span>{{ i18n.t('contract.' + offer.contractType) }}</span>
                      </p>
                    </div>
                    @if (offer.match.reasons[0]; as reason) {
                      <span class="hidden max-w-[14rem] truncate text-xs text-ink-400 lg:block">
                        {{ reason }}
                      </span>
                    }
                  </a>
                </li>
              }
            </ul>
          }
        </section>

        <!-- Colonne latérale -->
        <div class="space-y-6">
          <!-- {{ i18n.t('dashboard.actions.title') }} -->
          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-bold">
              <lucide-angular [img]="CalendarIcon" class="size-4 text-warn-700" />
              {{ i18n.t('dashboard.actions.title') }}
            </h2>
            @if (bookmarks.upcoming().length) {
              <ul class="space-y-2.5">
                @for (bookmark of bookmarks.upcoming(); track bookmark.id) {
                  <li class="flex items-start gap-2.5 rounded-xl bg-warn-50/60 p-2.5">
                    <span class="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-warn-500/15 text-warn-700">
                      <lucide-angular [img]="ClockIcon" class="size-3.5" />
                    </span>
                    <div class="min-w-0">
                      <p class="truncate text-xs font-semibold text-ink-900">{{ bookmark.offer.title }}</p>
                      <p class="text-[11px] text-ink-500">
                        {{ i18n.formatDate(bookmark.nextActionAt ?? '', { weekday: 'long', day: 'numeric', month: 'long' }) }} ·
                        {{ i18n.t('status.' + bookmark.status) }}
                      </p>
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <p class="rounded-xl border border-dashed border-ink-200 p-3 text-center text-xs text-ink-500">
                {{ i18n.t('dashboard.actions.empty') }}
                <a routerLink="/app/bookmarks" class="link">{{ i18n.t('dashboard.actions.manage') }}</a>
              </p>
            }
          </section>

          <!-- Répartition des candidatures -->
          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-bold">
              <lucide-angular [img]="ChartIcon" class="size-4 text-brand-600" />
              {{ i18n.t('dashboard.funnel.title') }}
            </h2>
            @if (bookmarks.total()) {
              <ul class="space-y-2">
                @for (row of funnel(); track row.status) {
                  <li>
                    <div class="mb-1 flex items-center justify-between text-xs">
                      <span class="font-medium text-ink-700">{{ i18n.t('status.' + row.status) }}</span>
                      <span class="tabular-nums text-ink-500">{{ row.count }}</span>
                    </div>
                    <div class="h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        class="h-full rounded-full"
                        [class]="row.color"
                        [style.width.%]="row.percent"
                      ></div>
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <p class="text-xs text-ink-500">
                {{ i18n.t('dashboard.funnel.empty') }}
              </p>
            }
          </section>

          <!-- Sites d'emploi suivis -->
          <section class="card p-5">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-2 text-sm font-bold">
                <lucide-angular [img]="GlobeIcon" class="size-4 text-brand-600" />
                {{ i18n.t('dashboard.sites.title') }}
              </h2>
              <a routerLink="/app/sites" class="text-xs font-semibold text-brand-700">
                {{ i18n.t('common.edit') }}
              </a>
            </div>
            @if (sites.followed().length) {
              <ul class="flex flex-wrap gap-1.5">
                @for (site of sites.followed().slice(0, 6); track site.id) {
                  <li class="badge">{{ site.customName || site.name }}</li>
                }
                @if (sites.followed().length > 6) {
                  <li class="badge-brand">+{{ sites.followed().length - 6 }}</li>
                }
              </ul>
              <p class="mt-3 text-xs text-ink-500">
                {{ i18n.t('dashboard.sites.count', { count: sites.followedCount() }) }}
              </p>
            } @else {
              <p class="text-xs text-ink-500">{{ i18n.t('sites.empty.followed') }}</p>
              <a routerLink="/app/sites" class="btn-secondary mt-3 w-full">
                {{ i18n.t('sites.follow') }}
              </a>
            }
          </section>

          <!-- Compétences du profil -->
          @if (profileStore.topSkills().length) {
            <section class="card p-5">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="flex items-center gap-2 text-sm font-bold">
                  <lucide-angular [img]="AwardIcon" class="size-4 text-brand-600" />
                  {{ i18n.t('dashboard.skills.title') }}
                </h2>
                <a routerLink="/app/profile" class="text-xs font-semibold text-brand-700">{{ i18n.t("common.edit") }}</a>
              </div>
              <ul class="space-y-2">
                @for (skill of profileStore.topSkills(); track skill.slug) {
                  <li class="flex items-center gap-2">
                    <span class="w-28 shrink-0 truncate text-xs font-medium text-ink-700">{{ skill.label }}</span>
                    <div class="flex flex-1 gap-0.5">
                      @for (level of [1, 2, 3, 4, 5]; track level) {
                        <span
                          class="h-1.5 flex-1 rounded-full"
                          [class]="level <= skill.weight ? 'bg-brand-600' : 'bg-ink-200'"
                        ></span>
                      }
                    </div>
                  </li>
                }
              </ul>
            </section>
          }
        </div>
      </div>

      <!-- Bandeau d'activation du profil -->
      @if (profileStore.completeness() < 80) {
        <section
          class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white p-5"
        >
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white">
              <lucide-angular [img]="WandIcon" class="size-5" />
            </span>
            <div>
              <p class="text-sm font-bold text-brand-900">
                {{ i18n.t("dashboard.onboarding.progress", { percent: profileStore.completeness() }) }}
              </p>
              <p class="text-sm text-brand-800/80">
                {{ i18n.t("dashboard.onboarding.text") }}
              </p>
            </div>
          </div>
          <a routerLink="/app/profile" class="btn-primary shrink-0">
            {{ i18n.t("dashboard.onboarding.cta") }}
            <lucide-angular [img]="ArrowIcon" class="size-4" />
          </a>
        </section>
      }
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  readonly jobsStore = inject(JobsStore);
  private readonly auth = inject(AuthService);
  readonly profileStore = inject(ProfileStore);
  readonly bookmarks = inject(BookmarksStore);

  readonly i18n = inject(I18nService);
  readonly sites = inject(JobSitesStore);

  readonly ChartIcon = ChartNoAxesColumn;
  readonly BriefcaseIcon = Briefcase;
  readonly TargetIcon = Target;
  readonly SendIcon = Send;
  readonly UserIcon = User;
  readonly SparklesIcon = Sparkles;
  readonly ArrowIcon = ArrowRight;
  readonly PinIcon = MapPin;
  readonly CalendarIcon = CalendarClock;
  readonly ClockIcon = CalendarClock;
  readonly AwardIcon = Award;
  readonly WandIcon = WandSparkles;
  readonly BookmarkIcon = Bookmark;
  readonly CheckIcon = CircleCheck;
  readonly TrendingIcon = TrendingUp;
  readonly GlobeIcon = Globe;

  readonly firstName = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    return name.split(' ').filter(Boolean)[0] ?? 'à vous';
  });

  readonly topOffers = computed(() => this.jobsStore.offers().slice(0, 5));
  readonly topOffer = computed<JobOffer | null>(() => this.jobsStore.offers()[0] ?? null);

  /** Entonnoir : répartition par statut, en pourcentage du total. */
  readonly funnel = computed(() => {
    const total = Math.max(1, this.bookmarks.total());
    const colors: Record<string, string> = {
      SAVED: 'bg-ink-400',
      APPLIED: 'bg-brand-500',
      INTERVIEW: 'bg-accent-500',
      OFFER: 'bg-success-500',
      REJECTED: 'bg-danger-500',
      WITHDRAWN: 'bg-ink-300',
    };
    const byStatus = this.bookmarks.byStatus();
    return [...byStatus.entries()]
      .filter(([status]) => status !== 'WITHDRAWN')
      .map(([status, items]) => ({
        status,
        count: items.length,
        percent: Math.round((items.length / total) * 100),
        color: colors[status] ?? 'bg-ink-300',
      }));
  });

  ngOnInit(): void {
    this.profileStore.load().subscribe(() => this.jobsStore.load({ pageSize: 12 }));
    this.bookmarks.load();
    this.sites.load();
  }
}
