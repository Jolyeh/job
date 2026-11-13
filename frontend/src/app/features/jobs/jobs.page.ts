import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAngularModule,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-angular';
import { BookmarksStore } from '../../core/services/bookmarks.store';
import { JobsStore } from '../../core/services/jobs.store';
import { ProfileStore } from '../../core/services/profile.store';
import { EmptyStateComponent } from '../../shared/ui/empty-state.component';
import { JobCardComponent } from './job-card.component';
import { JobFiltersComponent } from './job-filters.component';

/**
 * Catalogue d'offres recommandées : en-tête de contexte, panneau de filtres
 * (barre latérale ou tiroir), grille de cartes et pagination.
 */
@Component({
  selector: 'app-jobs-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    JobCardComponent,
    JobFiltersComponent,
    EmptyStateComponent,
    LucideAngularModule,
    RouterLink,
  ],
  template: `
    <div class="mx-auto max-w-7xl">
      <!-- En-tête -->
      <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="badge-brand">
            <lucide-angular [img]="SparklesIcon" class="size-3.5" />
            @if (jobsStore.meta()?.personalized) {
              Recommandations personnalisées
            } @else {
              Catalogue complet
            }
          </p>
          <h1 class="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {{ jobsStore.total() }} offre{{ jobsStore.total() > 1 ? 's' : '' }}
            <span class="text-ink-400">pour vous</span>
          </h1>
          <p class="mt-1.5 text-sm text-ink-500">
            @if (jobsStore.meta()?.profileHeadline; as headline) {
              Classées selon votre profil « {{ headline }} »
            } @else {
              <a routerLink="/app/profile" class="link">Complétez votre profil</a>
              pour obtenir un score de correspondance personnalisé.
            }
            · Score moyen {{ jobsStore.facets()?.averageScore ?? 0 }}/100
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="btn-secondary lg:hidden"
            (click)="filtersOpen.set(true)"
          >
            <lucide-angular [img]="FiltersIcon" class="size-4" />
            Filtres
            @if (jobsStore.activeFilterCount() > 0) {
              <span class="badge-brand">{{ jobsStore.activeFilterCount() }}</span>
            }
          </button>
          <button
            type="button"
            class="btn-secondary"
            [disabled]="jobsStore.isRefreshing()"
            (click)="jobsStore.refresh()"
          >
            <lucide-angular
              [img]="RefreshIcon"
              class="size-4"
              [class.animate-spin]="jobsStore.isRefreshing()"
            />
            Actualiser
          </button>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-[19rem_1fr]">
        <!-- Filtres (bureau) -->
        <aside class="hidden lg:block">
          <div class="sticky top-8">
            <app-job-filters />
          </div>
        </aside>

        <!-- Filtres (tiroir mobile) -->
        @if (filtersOpen()) {
          <div class="fixed inset-0 z-60 lg:hidden">
            <div
              class="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
              (click)="filtersOpen.set(false)"
              aria-hidden="true"
            ></div>
            <div
              class="absolute inset-y-0 right-0 w-[min(22rem,88vw)] overflow-y-auto bg-ink-50 p-4 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Filtres de recherche"
            >
              <div class="mb-3 flex items-center justify-between">
                <p class="font-display text-lg font-bold">Filtres</p>
                <button
                  type="button"
                  class="btn-icon"
                  aria-label="Fermer les filtres"
                  (click)="filtersOpen.set(false)"
                >
                  <lucide-angular [img]="CloseIcon" class="size-5" />
                </button>
              </div>
              <app-job-filters [compact]="true" />
              <button
                type="button"
                class="btn-primary mt-4 w-full"
                (click)="filtersOpen.set(false)"
              >
                Voir {{ jobsStore.total() }} offre{{ jobsStore.total() > 1 ? 's' : '' }}
              </button>
            </div>
          </div>
        }

        <!-- Résultats -->
        <section class="min-w-0">
          <!-- Barre de contexte -->
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-ink-500">
              @if (jobsStore.isLoading()) {
                Chargement des offres…
              } @else {
                Affichage {{ rangeStart() }}–{{ rangeEnd() }} sur {{ jobsStore.total() }}
              }
            </p>
            @if (jobsStore.activeFilterCount() > 0) {
              <button
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 transition hover:text-brand-700"
                (click)="jobsStore.resetFilters()"
              >
                Effacer les {{ jobsStore.activeFilterCount() }} filtre(s)
                <lucide-angular [img]="CloseIcon" class="size-3.5" />
              </button>
            }
          </div>

          @if (jobsStore.error(); as error) {
            <div
              class="mb-4 flex items-start gap-2.5 rounded-xl border border-danger-500/30 bg-danger-50 p-4 text-sm text-danger-700"
              role="alert"
            >
              <lucide-angular [img]="AlertIcon" class="mt-0.5 size-4 shrink-0" />
              <div>
                <p class="font-semibold">Impossible de charger les offres</p>
                <p>{{ error }}</p>
              </div>
            </div>
          }

          @if (jobsStore.isLoading() && jobsStore.offers().length === 0) {
            <!-- Squelettes -->
            <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              @for (item of skeletons; track item) {
                <div class="card space-y-3 p-5">
                  <div class="flex gap-3">
                    <div class="skeleton size-11 rounded-xl"></div>
                    <div class="flex-1 space-y-2">
                      <div class="skeleton h-4 w-3/4"></div>
                      <div class="skeleton h-3 w-1/2"></div>
                    </div>
                    <div class="skeleton size-13 rounded-full"></div>
                  </div>
                  <div class="skeleton h-3 w-2/3"></div>
                  <div class="flex gap-1.5">
                    <div class="skeleton h-6 w-16 rounded-full"></div>
                    <div class="skeleton h-6 w-20 rounded-full"></div>
                  </div>
                  <div class="skeleton h-16 w-full"></div>
                </div>
              }
            </div>
          } @else if (jobsStore.isEmpty()) {
            <div class="card">
              <app-empty-state
                title="Aucune offre ne correspond"
                description="Élargissez vos critères : retirez le score minimum, augmentez la période ou changez la ville."
                actionLabel="Réinitialiser les filtres"
                (action)="jobsStore.resetFilters()"
              />
            </div>
          } @else {
            <div class="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              @for (offer of jobsStore.offers(); track offer.id) {
                <app-job-card [offer]="offer" class="animate-fade-up" />
              }
            </div>

            <!-- Pagination -->
            @if (jobsStore.totalPages() > 1) {
              <nav
                class="mt-8 flex items-center justify-center gap-1.5"
                aria-label="Pagination des offres"
              >
                <button
                  type="button"
                  class="btn-secondary px-3 py-2"
                  [disabled]="jobsStore.page() === 1"
                  aria-label="Page précédente"
                  (click)="jobsStore.goToPage(jobsStore.page() - 1)"
                >
                  <lucide-angular [img]="PrevIcon" class="size-4" />
                </button>

                @for (page of pages(); track page) {
                  @if (page === -1) {
                    <span class="px-2 text-sm text-ink-400">…</span>
                  } @else {
                    <button
                      type="button"
                      class="size-9 rounded-xl text-sm font-semibold transition"
                      [class]="
                        page === jobsStore.page()
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50'
                      "
                      [attr.aria-current]="page === jobsStore.page() ? 'page' : null"
                      (click)="jobsStore.goToPage(page)"
                    >
                      {{ page }}
                    </button>
                  }
                }

                <button
                  type="button"
                  class="btn-secondary px-3 py-2"
                  [disabled]="jobsStore.page() === jobsStore.totalPages()"
                  aria-label="Page suivante"
                  (click)="jobsStore.goToPage(jobsStore.page() + 1)"
                >
                  <lucide-angular [img]="NextIcon" class="size-4" />
                </button>
              </nav>
            }
          }

          <!-- Sources agrégées -->
          @if (jobsStore.meta()?.sources?.length) {
            <footer class="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-400">
              <span class="inline-flex items-center gap-1 font-semibold text-ink-500">
                <lucide-angular [img]="TrendingIcon" class="size-3.5" />
                Sources
              </span>
              @for (source of jobsStore.meta()!.sources; track source.source) {
                <span class="inline-flex items-center gap-1">
                  <span class="size-1.5 rounded-full bg-success-500"></span>
                  {{ source.source }}
                  @if (source.fetched) {
                    <span>({{ source.fetched }})</span>
                  }
                </span>
              }
            </footer>
          }
        </section>
      </div>
    </div>
  `,
})
export class JobsPageComponent implements OnInit {
  readonly jobsStore = inject(JobsStore);
  private readonly profileStore = inject(ProfileStore);
  private readonly bookmarksStore = inject(BookmarksStore);

  readonly filtersOpen = signal(false);

  readonly SparklesIcon = Sparkles;
  readonly TargetIcon = Target;
  readonly FiltersIcon = SlidersHorizontal;
  readonly RefreshIcon = RefreshCw;
  readonly CloseIcon = X;
  readonly AlertIcon = CircleAlert;
  readonly PrevIcon = ChevronLeft;
  readonly NextIcon = ChevronRight;
  readonly TrendingIcon = TrendingUp;

  readonly skeletons = [1, 2, 3, 4, 5, 6];

  readonly rangeStart = computed(() =>
    this.jobsStore.total() === 0 ? 0 : (this.jobsStore.page() - 1) * this.jobsStore.filters().pageSize! + 1,
  );

  readonly rangeEnd = computed(() =>
    Math.min(
      this.jobsStore.page() * (this.jobsStore.filters().pageSize ?? 9),
      this.jobsStore.total(),
    ),
  );

  /** Pagination condensée avec ellipses (−1 = « … »). */
  readonly pages = computed(() => {
    const total = this.jobsStore.totalPages();
    const current = this.jobsStore.page();
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) {
      pages.push(page);
    }
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  ngOnInit(): void {
    // Chargement initial : profil (pour le scoring) et favoris (pour l'état des
    // cartes) en parallèle, puis catalogue. Un seul appel par store et par
    // session : revenir sur la page ne relance pas les requêtes.
    this.profileStore.load();
    this.bookmarksStore.load();
    this.jobsStore.load();
  }
}
