import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

/**
 * Routage par lazy loading (`loadComponent`) : chaque écran est un chunk
 * séparé et un composant standalone.
 *
 * Ordre voulu par le produit : **vitrine publique → tableau de bord → offres**.
 * La vitrine est la seule route publique ; tout `/app/**` exige une session.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'JobRadar — Trouvez les offres qui vous correspondent',
    loadComponent: () =>
      import('./features/landing/landing.page').then((module) => module.LandingPageComponent),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Connexion — JobRadar',
    loadComponent: () =>
      import('./features/auth/login.page').then((module) => module.LoginPageComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    title: 'Créer un compte — JobRadar',
    loadComponent: () =>
      import('./features/auth/register.page').then((module) => module.RegisterPageComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      // Le tableau de bord est le point d'entrée de l'espace connecté.
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Tableau de bord — JobRadar',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((module) => module.DashboardPageComponent),
      },
      {
        path: 'jobs',
        title: 'Offres recommandées — JobRadar',
        loadComponent: () =>
          import('./features/jobs/jobs.page').then((module) => module.JobsPageComponent),
      },
      {
        path: 'jobs/:id',
        title: 'Détail de l’offre — JobRadar',
        loadComponent: () =>
          import('./features/jobs/job-detail.page').then((module) => module.JobDetailPageComponent),
      },
      {
        path: 'bookmarks',
        title: 'Mon suivi de candidatures — JobRadar',
        loadComponent: () =>
          import('./features/bookmarks/bookmarks.page').then((module) => module.BookmarksPageComponent),
      },
      {
        path: 'sites',
        title: 'Sites d’emploi — JobRadar',
        loadComponent: () =>
          import('./features/job-sites/job-sites.page').then((module) => module.JobSitesPageComponent),
      },
      {
        path: 'profile',
        title: 'Mon profil — JobRadar',
        loadComponent: () =>
          import('./features/profile/profile.page').then((module) => module.ProfilePageComponent),
      },
    ],
  },
  // Toute URL inconnue ramène à la vitrine (et non plus aux offres).
  { path: '**', redirectTo: '' },
];
