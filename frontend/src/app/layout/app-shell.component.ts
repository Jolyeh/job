import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideAngularModule,
  type LucideIconData,
  Bookmark,
  Briefcase,
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
import { UiStore } from '../core/services/ui.store';
import { ApiService } from '../core/services/api.service';

interface NavItem {
  label: string;
  link: string;
  icon: LucideIconData;
  badge?: () => number | null;
}

/**
 * Coquille authentifiée : barre latérale de navigation + en-tête mobile.
 * Utilise la détection OnPush et des Signals dérivés pour les compteurs.
 */
@Component({
  selector: 'app-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <!-- Voile mobile -->
      @if (mobileOpen()) {
        <div
          class="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          (click)="mobileOpen.set(false)"
          aria-hidden="true"
        ></div>
      }

      <!-- Barre latérale -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-ink-200/80 bg-white/90 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0"
        [class.-translate-x-full]="!mobileOpen()"
      >
        <div class="flex items-center justify-between gap-2 px-5 py-5">
          <a routerLink="/app/jobs" class="flex items-center gap-2.5" aria-label="JobRadar, accueil">
            <span
              class="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm"
            >
              <lucide-angular [img]="Target" class="size-5" />
            </span>
            <span class="font-display text-lg font-extrabold tracking-tight text-ink-900">
              Job<span class="text-brand-600">Radar</span>
            </span>
          </a>
          <button
            type="button"
            class="btn-icon lg:hidden"
            aria-label="Fermer le menu"
            (click)="mobileOpen.set(false)"
          >
            <lucide-angular [img]="X" class="size-5" />
          </button>
        </div>

        <nav class="flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label="Navigation principale">
          @for (item of navItems(); track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="bg-brand-50 text-brand-700 ring-1 ring-brand-200"
              class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900"
              (click)="mobileOpen.set(false)"
            >
              <lucide-angular [img]="item.icon" class="size-5 shrink-0" />
              <span class="flex-1">{{ item.label }}</span>
              @if (item.badge && item.badge(); as count) {
                <span class="badge-brand tabular-nums">{{ count }}</span>
              }
            </a>
          }
        </nav>

        <!-- Carte de complétion du profil -->
        <div class="mx-3 mb-3 rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
          <div class="flex items-center justify-between text-xs font-semibold text-brand-800">
            <span>Profil complété</span>
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
          >
            <lucide-angular [img]="WandSparkles" class="size-3.5" />
            Affiner mon profil
          </a>
        </div>

        <!-- Utilisateur -->
        <div class="border-t border-ink-200/80 p-3">
          <div class="flex items-center gap-3 rounded-xl px-2 py-2">
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
            <button type="button" class="btn-icon" aria-label="Se déconnecter" (click)="logout()">
              <lucide-angular [img]="LogOut" class="size-4.5" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Contenu -->
      <div class="flex min-w-0 flex-col">
        <!-- En-tête mobile -->
        <header
          class="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200/70 bg-white/80 px-4 py-3 backdrop-blur-lg lg:hidden"
        >
          <button type="button" class="btn-icon" aria-label="Ouvrir le menu" (click)="mobileOpen.set(true)">
            <lucide-angular [img]="Menu" class="size-5" />
          </button>
          <span class="font-display text-base font-extrabold text-ink-900">
            Job<span class="text-brand-600">Radar</span>
          </span>
        </header>

        <!-- Barre de progression réseau globale -->
        @if (ui.isLoading()) {
          <div class="fixed inset-x-0 top-0 z-100 h-0.5 overflow-hidden bg-brand-100">
            <div class="h-full w-1/3 animate-[fade-up_1s_ease-in-out_infinite] bg-brand-600"></div>
          </div>
        }

        <main id="contenu" class="min-w-0 flex-1 px-4 pb-16 pt-5 sm:px-6 lg:px-8 lg:pt-8">
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
  private readonly bookmarksStore = inject(BookmarksStore);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly mobileOpen = signal(false);

  readonly Target = Target;
  readonly X = X;
  readonly Menu = Menu;
  readonly LogOut = LogOut;
  readonly WandSparkles = WandSparkles;

  readonly navItems = computed<NavItem[]>(() => [
    {
      label: 'Offres recommandées',
      link: '/app/jobs',
      icon: Briefcase,
      badge: () => null,
    },
    {
      label: 'Tableau de bord',
      link: '/app/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Mon suivi',
      link: '/app/bookmarks',
      icon: Bookmark,
      badge: () => this.bookmarksStore.total() || null,
    },
    {
      label: 'Mon profil',
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
    this.ui.notify('Vous êtes déconnecté.', 'info');
    void this.router.navigate(['/login']);
  }
}
