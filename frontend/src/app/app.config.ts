import { ApplicationConfig, LOCALE_ID, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { APP_ICONS } from './shared/ui/lucide-icons';

registerLocaleData(localeFr);

/**
 * Configuration applicative (Angular 19+ : aucune NgModule).
 *
 * - `provideZonelessChangeDetection` : l'app repose uniquement sur les Signals
 *   et la détection `OnPush`, donc plus besoin de zone.js à l'exécution.
 * - Interceptors fonctionnels ordonnés : auth (token + 401) puis loading.
 * - Icônes Lucide fournies globalement, consommables en standalone.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, loadingInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(APP_ICONS) },
  ],
};
