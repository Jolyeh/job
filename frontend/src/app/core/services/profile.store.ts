import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { Profile, ProfilePayload } from '../models/api.models';
import { ApiError, ApiService } from './api.service';
import { UiStore } from './ui.store';
import { I18nService } from '../i18n/i18n.service';

/**
 * Store du profil de recherche (Signals).
 *
 * `computed` dérive des indicateurs directement consommables dans les templates :
 * complétion, nombre de compétences, top compétences…
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiStore);
  private readonly i18n = inject(I18nService);

  private readonly profileState = signal<Profile | null>(null);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly loadedState = signal(false);

  readonly profile = this.profileState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly isSaving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly hasProfile = computed(() => this.profileState() !== null);

  readonly completeness = computed(() => this.profileState()?.completeness ?? 0);
  readonly skillCount = computed(() => this.profileState()?.skills.length ?? 0);
  readonly topSkills = computed(() => (this.profileState()?.skills ?? []).slice(0, 6));
  /** Langues d'offres acceptées par le profil (sert de valeur par défaut au filtre). */
  readonly languages = computed(() => this.profileState()?.languages ?? []);
  readonly headline = computed(() => this.profileState()?.headline ?? null);
  readonly lastSearchLabel = computed(() => {
    const value = this.profileState()?.lastSearchAt;
    return value ? formatRelative(value) : this.i18n.t('profile.never');
  });

  /** Chargement paresseux : une seule requête par session. */
  load(force = false): Observable<Profile | null> {
    if (this.loadedState() && !force) return of(this.profileState());

    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api.get<Profile>('/profile').pipe(
      tap((profile) => {
        this.profileState.set(profile);
        this.loadedState.set(true);
      }),
      map((profile) => profile),
      catchError((error: unknown) => {
        const apiError = error as ApiError;
        // 404 = profil pas encore créé : ce n'est pas une erreur applicative.
        if (apiError.status !== 404) {
          this.errorState.set(apiError.message);
        }
        this.profileState.set(null);
        this.loadedState.set(true);
        return of(null);
      }),
      finalize(() => this.loadingState.set(false)),
    );
  }

  save(payload: ProfilePayload): Observable<Profile> {
    this.savingState.set(true);
    this.errorState.set(null);

    return this.api.put<Profile>('/profile', payload).pipe(
      tap((profile) => {
        this.profileState.set(profile);
        this.loadedState.set(true);
        this.ui.notify(this.i18n.t('toast.profileSaved'), 'success');
      }),
      catchError((error: unknown) => {
        const apiError = error as ApiError;
        this.errorState.set(
          apiError.details?.length ? apiError.details.join(' · ') : apiError.message,
        );
        throw error;
      }),
      finalize(() => this.savingState.set(false)),
    );
  }

  reset(): void {
    this.profileState.set(null);
    this.loadedState.set(false);
    this.errorState.set(null);
  }
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  const hours = Math.round(diffMinutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `il y a ${days} j`;
}
