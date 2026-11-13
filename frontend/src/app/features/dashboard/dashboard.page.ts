import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
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
  MapPin,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  User,
  WandSparkles,
} from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { BookmarksStore, STATUS_LABELS } from '../../core/services/bookmarks.store';
import { JobsStore } from '../../core/services/jobs.store';
import { ProfileStore } from '../../core/services/profile.store';
import { JobOffer } from '../../core/models/api.models';
import { ScoreRingComponent } from '../../shared/ui/score-ring.component';

/** Tableau de bord : santé du profil, meilleures offres, suivi et critères. */
@Component({
  selector: 'app-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LucideAngularModule,
    RouterLink,
    ScoreRingComponent,
    DatePipe,
  ],
  template: `
    <div class="mx-auto max-w-7xl space-y-6">
      <!-- En-tête -->
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="badge-brand">
            <lucide-angular [img]="ChartIcon" class="size-3.5" />
            Tableau de bord
          </p>
          <h1 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Bonjour {{ firstName() }} 👋
          </h1>
          <p class="mt-1.5 text-sm text-ink-500">
            Vos recommandations, votre suivi et la qualité de votre profil en un coup d'œil.
          </p>
        </div>
        <a routerLink="/app/jobs" class="btn-primary">
          <lucide-angular [img]="BriefcaseIcon" class="size-4" />
          Explorer les offres
        </a>
      </header>

      <!-- Indicateurs -->
      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Offres classées</p>
            <span class="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <lucide-angular [img]="BriefcaseIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ jobsStore.total() }}
          </p>
          <p class="mt-1 text-xs text-ink-500">
            Score moyen {{ jobsStore.facets()?.averageScore ?? 0 }}/100
          </p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Meilleur match</p>
            <span class="grid size-8 place-items-center rounded-lg bg-success-50 text-success-700">
              <lucide-angular [img]="TargetIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ jobsStore.facets()?.topScore ?? 0 }}<span class="text-base text-ink-400">/100</span>
          </p>
          <p class="mt-1 truncate text-xs text-ink-500">
            {{ topOffer()?.title ?? 'Complétez votre profil' }}
          </p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Candidatures</p>
            <span class="grid size-8 place-items-center rounded-lg bg-warn-50 text-warn-700">
              <lucide-angular [img]="SendIcon" class="size-4" />
            </span>
          </div>
          <p class="mt-2 font-display text-3xl font-extrabold tabular-nums">
            {{ bookmarks.stats()?.applied ?? 0 }}
          </p>
          <p class="mt-1 text-xs text-ink-500">
            {{ bookmarks.total() }} offre(s) suivie(s) · {{ bookmarks.stats()?.responseRate ?? 0 }}% de réponses
          </p>
        </div>

        <div class="card p-5">
          <div class="flex items-center justify-between">
            <p class="text-xs font-semibold uppercase tracking-wide text-ink-500">Profil</p>
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
              Vos meilleures correspondances
            </h2>
            <a
              routerLink="/app/jobs"
              class="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Tout voir
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
              <p class="text-sm font-semibold text-ink-800">Aucune recommandation pour l'instant</p>
              <p class="mt-1 text-sm text-ink-500">
                Complétez votre profil pour activer le classement par pertinence.
              </p>
              <a routerLink="/app/profile" class="btn-primary mt-4">Compléter mon profil</a>
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
                        <span>{{ offer.contractType }}</span>
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
          <!-- Prochaines actions -->
          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-bold">
              <lucide-angular [img]="CalendarIcon" class="size-4 text-warn-700" />
              Prochaines actions
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
                        {{ bookmark.nextActionAt | date: 'EEEE d MMMM' }} ·
                        {{ labels[bookmark.status] }}
                      </p>
                    </div>
                  </li>
                }
              </ul>
            } @else {
              <p class="rounded-xl border border-dashed border-ink-200 p-3 text-center text-xs text-ink-500">
                Aucune relance planifiée.
                <a routerLink="/app/bookmarks" class="link">Gérer mon suivi</a>
              </p>
            }
          </section>

          <!-- Répartition des candidatures -->
          <section class="card p-5">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-bold">
              <lucide-angular [img]="ChartIcon" class="size-4 text-brand-600" />
              Entonnoir de candidature
            </h2>
            @if (bookmarks.total()) {
              <ul class="space-y-2">
                @for (row of funnel(); track row.status) {
                  <li>
                    <div class="mb-1 flex items-center justify-between text-xs">
                      <span class="font-medium text-ink-700">{{ labels[row.status] }}</span>
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
                Sauvegardez des offres pour visualiser votre entonnoir.
              </p>
            }
          </section>

          <!-- Compétences du profil -->
          @if (profileStore.topSkills().length) {
            <section class="card p-5">
              <div class="mb-3 flex items-center justify-between">
                <h2 class="flex items-center gap-2 text-sm font-bold">
                  <lucide-angular [img]="AwardIcon" class="size-4 text-brand-600" />
                  Vos compétences clés
                </h2>
                <a routerLink="/app/profile" class="text-xs font-semibold text-brand-700">Modifier</a>
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
                Votre profil est complété à {{ profileStore.completeness() }} %
              </p>
              <p class="text-sm text-brand-800/80">
                Ajoutez vos compétences et vos prétentions pour affiner le classement.
              </p>
            </div>
          </div>
          <a routerLink="/app/profile" class="btn-primary shrink-0">
            Affiner mon profil
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

  readonly labels = STATUS_LABELS;

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
    this.profileStore.load();
    this.bookmarks.load();
    this.jobsStore.load({ pageSize: 12 });
  }
}
