import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  type LucideIconData,
  Bookmark,
  Briefcase,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Target,
  User,
  WandSparkles,
  X,
} from 'lucide-angular';
import { AuthService } from '../core/services/auth.service';
import { BookmarksStore } from '../core/services/bookmarks.store';
import { ProfileStore } from '../core/services/profile.store';
import { JobSitesStore } from '../core/services/job-sites.store';
import { UiStore } from '../core/services/ui.store';
import { ApiService } from '../core/services/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from '../shared/ui/language-switcher.component';

interface NavItem {
  labelKey: string;
  link: string;
  icon: LucideIconData;
  badge?: () => number | null;
}

/**
 * Coquille authentifiée.
 *
 * Structure responsive (le point qui posait problème) :
 *  - **≥ lg** : grille `[17rem_1fr]`. La colonne de navigation est collée en
 *    haut (`sticky top-0 h-dvh`) dans sa propre colonne : elle ne défile pas
 *    avec le contenu et ne bouge donc jamais.
 *  - **< lg** : la barre devient un tiroir hors-écran (`fixed`), ouvert par le
 *    bouton du menu, fermé au clic sur un lien ou sur le voile.
 *
 * L'ancienne version combinait `fixed` et `lg:static` dans la même grille, ce
 * qui faisait « sauter » la barre au défilement et au redimensionnement.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule,
    LanguageSwitcherComponent,
  ],
  host: { class: 'block' },
  template: `
    <!-- Voile mobile -->
    @if (mobileOpen()) {
      <div
        class="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden"
        (click)="mobileOpen.set(false)"
        aria-hidden="true"
      ></div>
    }

    <div class="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <!-- ================= Barre latérale (fixe en desktop) ================ -->
      <aside
        id="sidebar"
        class="fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[85vw] flex-col border-r border-ink-200 bg-white
               transition-transform duration-200 ease-out
               lg:sticky lg:top-0 lg:z-30 lg:h-dvh lg:w-auto lg:max-w-none lg:translate-x-0"
        [class.-translate-x-full]="!mobileOpen() && !isDesktop()"
        [attr.inert]="isDrawerHidden() ? '' : null"
        [attr.aria-label]="i18n.t('nav.main')"
      >
        <div class="flex items-center justify-between gap-2 px-4 py-4 lg:px-5 lg:py-5">
          <a routerLink="/app/dashboard" class="flex items-center gap-2.5" [attr.aria-label]="i18n.t('app.name')">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm"
            >
              <lucide-angular [img]="TargetIcon" class="size-5" />
            </span>
            <span class="font-display text-lg font-extrabold tracking-tight text-ink-900">
              Job<span class="text-brand-600">Radar</span>
            </span>
          </a>
          <button
            type="button"
            class="btn-icon lg:hidden"
            [attr.aria-label]="i18n.t('nav.closeMenu')"
            (click)="mobileOpen.set(false)"
          >
            <lucide-angular [img]="XIcon" class="size-5" />
          </button>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-4" [attr.aria-label]="i18n.t('nav.main')">
          @for (item of navItems(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-brand-50 text-brand-700 ring-1 ring-brand-200"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
              (click)="mobileOpen.set(false)"
            >
              <lucide-angular [img]="item.icon" class="size-5 shrink-0" />
              <span class="flex-1 truncate">{{ i18n.t(item.labelKey) }}</span>
              @if (item.badge && item.badge(); as count) {
                <span class="badge-brand tabular-nums">{{ count }}</span>
              }
            </a>
          }
        </nav>

        <!-- Complétion du profil -->
        <div class="mx-3 mb-3 rounded-xl border border-brand-100 bg-brand-50/70 p-3.5">
          <div class="flex items-center justify-between text-xs font-semibold text-brand-800">
            <span>{{ i18n.t('profile.completeness') }}</span>
            <span class="tabular-nums">{{ profileStore.completeness() }}%</span>
          </div>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100">
            <div
              class="h-full rounded-full bg-brand-600 transition-all duration-500"
              [style.width.%]="profileStore.completeness()"
            ></div>
          </div>
          <a
            routerLink="/app/profile"
            class="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            (click)="mobileOpen.set(false)"
          >
            <lucide-angular [img]="WandSparklesIcon" class="size-3.5" />
            {{ i18n.t('dashboard.onboarding.cta') }}
          </a>
        </div>

        <!-- Langue + compte -->
        <div class="border-t border-ink-200 px-3 py-3">
          <div class="mb-2.5 flex items-center justify-between gap-2">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {{ i18n.t('common.language') }}
            </span>
            <app-language-switcher [compact]="true" />
          </div>
          <div class="flex items-center gap-2.5 rounded-xl px-1 py-1.5">
            <span
              class="grid size-9 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-bold text-white"
              aria-hidden="true"
            >
              {{ auth.initials() }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-semibold text-ink-900">{{ auth.user()?.fullName }}</p>
              <p class="truncate text-xs text-ink-500">{{ auth.user()?.email }}</p>
            </div>
            <button
              type="button"
              class="btn-icon"
              [attr.aria-label]="i18n.t('nav.logout')"
              (click)="logout()"
            >
              <lucide-angular [img]="LogOutIcon" class="size-4" />
            </button>
          </div>
        </div>
      </aside>

      <!-- ============================ Contenu ============================== -->
      <div class="flex min-w-0 flex-col">
        <header
          class="sticky top-0 z-30 flex items-center gap-2 border-b border-ink-200 bg-white/90 px-3 py-2.5 backdrop-blur-lg sm:px-4 lg:hidden"
        >
          <button
            type="button"
            class="btn-icon shrink-0"
            [attr.aria-label]="i18n.t('nav.menu')"
            aria-controls="sidebar"
            [attr.aria-expanded]="mobileOpen()"
            (click)="mobileOpen.set(true)"
          >
            <lucide-angular [img]="MenuIcon" class="size-5" />
          </button>
          <span class="min-w-0 flex-1 truncate font-display text-base font-extrabold text-ink-900">
            Job<span class="text-brand-600">Radar</span>
          </span>
          <app-language-switcher [compact]="true" class="shrink-0" />
        </header>

        @if (ui.isLoading()) {
          <div class="fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-brand-100">
            <div class="h-full w-1/3 animate-pulse bg-brand-600"></div>
          </div>
        }

        <main
          id="contenu"
          class="min-w-0 flex-1 px-3 pb-16 pt-4 sm:px-5 sm:pt-6 lg:px-8 lg:pt-8"
        >
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  readonly profileStore = inject(ProfileStore);
  readonly ui = inject(UiStore);
  readonly i18n = inject(I18nService);
  private readonly bookmarksStore = inject(BookmarksStore);
  private readonly jobSitesStore = inject(JobSitesStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mobileOpen = signal(false);

  readonly TargetIcon = Target;
  readonly XIcon = X;
  readonly MenuIcon = Menu;
  readonly LogOutIcon = LogOut;
  readonly WandSparklesIcon = WandSparkles;

  /** Vrai au-delà du breakpoint `lg` (1024 px) : la barre est alors fixe. */
  readonly isDesktop = signal(false);

  /**
   * Le tiroir mobile est masqué quand il est fermé — mais uniquement sur
   * petit écran : en desktop la barre est visible en permanence, et la rendre
   * `inert` casserait toute la navigation.
   */
  readonly isDrawerHidden = computed(() => !this.isDesktop() && !this.mobileOpen());

  constructor() {
    // Fermeture du tiroir à chaque navigation (y compris bouton retour).
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationEnd) this.mobileOpen.set(false);
    });

    // Suivi du breakpoint : évite les états incohérents au redimensionnement.
    if (typeof matchMedia === 'function') {
      const query = matchMedia('(min-width: 1024px)');
      this.isDesktop.set(query.matches);
      const onChange = (event: MediaQueryListEvent) => {
        this.isDesktop.set(event.matches);
        if (event.matches) this.mobileOpen.set(false);
      };
      query.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }
  }

  /**
   * Ordre de navigation : le tableau de bord d'abord (point d'entrée),
   * puis les offres, le suivi, les sites et le profil.
   */
  readonly navItems = computed<NavItem[]>(() => [
    {
      labelKey: 'nav.dashboard',
      link: '/app/dashboard',
      icon: LayoutDashboard,
    },
    {
      labelKey: 'nav.jobs',
      link: '/app/jobs',
      icon: Briefcase,
    },
    {
      labelKey: 'nav.bookmarks',
      link: '/app/bookmarks',
      icon: Bookmark,
      badge: () => this.bookmarksStore.total() || null,
    },
    {
      labelKey: 'nav.sites',
      link: '/app/sites',
      icon: Globe,
      badge: () => this.jobSitesStore.followedCount() || null,
    },
    {
      labelKey: 'nav.profile',
      link: '/app/profile',
      icon: User,
    },
  ]);

  logout(): void {
    this.api.post<{ revoked: true }>('/auth/logout').subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.auth.clear();
    this.profileStore.reset();
    this.ui.notify(this.i18n.t('nav.logout'), 'info');
    void this.router.navigate(['/']);
  }
}
