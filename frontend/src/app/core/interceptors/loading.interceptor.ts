import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { UiStore } from '../services/ui.store';

/** Permet de désactiver la barre de progression pour une requête précise. */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/**
 * Compteur de requêtes en vol → barre de progression globale.
 * Un compteur (et non un booléen) évite les clignotements quand plusieurs
 * requêtes parallèles se chevauchent.
 */
export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_LOADING)) return next(request);

  const ui = inject(UiStore);
  ui.startRequest();
  return next(request).pipe(finalize(() => ui.endRequest()));
};
