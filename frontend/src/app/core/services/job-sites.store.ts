import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import { ApiError, ApiService } from './api.service';
import { JobSite, JobSitePayload } from '../models/api.models';
import { UiStore } from './ui.store';
import { I18nService } from '../i18n/i18n.service';

/**
 * État partagé des sites d'emploi suivis.
 *
 * Le catalogue (12 sites de référence) et les abonnements de l'utilisateur
 * arrivent dans une seule liste : `items` porte `followed`, ce qui évite deux
 * sources de vérité et permet des `computed` triviaux.
 */
@Injectable({ providedIn: 'root' })
export class JobSitesStore {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiStore);
  private readonly i18n = inject(I18nService);

  private readonly itemsState = signal<JobSite[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadedState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly items = this.itemsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /** Sites effectivement suivis (par ordre du catalogue). */
  readonly followed = computed(() => this.itemsState().filter((site) => site.followed));

  readonly followedCount = computed(() => this.followed().length);

  /** Sites du catalogue non encore suivis. */
  readonly available = computed(() => this.itemsState().filter((site) => !site.followed));

  /** Nombre total d'offres rattachées aux sites suivis. */
  readonly offerCount = computed(() =>
    this.followed().reduce((total, site) => total + site.offerCount, 0),
  );

  /** Charge le catalogue (une seule fois sauf `force`). */
  load(force = false): void {
    if (this.loadedState() && !force) return;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.api
      .get<JobSite[]>('/job-sites')
      .pipe(
        tap((sites) => {
          this.itemsState.set(sites);
          this.loadedState.set(true);
        }),
        catchError((error: unknown) => {
          this.errorState.set((error as ApiError).message ?? this.i18n.t('error.network'));
          return of(null);
        }),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe();
  }

  /** Suit un site du catalogue ou en crée un à la volée. */
  follow(payload: JobSitePayload): Observable<JobSite | null> {
    this.savingState.set(true);
    return this.api.post<JobSite>('/job-sites', payload).pipe(
      tap((site) => {
        this.itemsState.update((items) => {
          const exists = items.some((entry) => entry.id === site.id);
          return exists
            ? items.map((entry) => (entry.id === site.id ? site : entry))
            : [...items, site];
        });
        this.ui.notify(this.i18n.t('sites.add.success'), 'success');
      }),
      catchError((error: unknown) => {
        this.ui.notify((error as ApiError).message ?? this.i18n.t('common.error'), 'error');
        return of(null);
      }),
      finalize(() => this.savingState.set(false)),
    );
  }

  /** Retire un site du suivi (le catalogue n'est pas modifié). */
  unfollow(siteId: string): Observable<{ removed: true } | null> {
    this.savingState.set(true);
    return this.api.delete<{ removed: true }>(`/job-sites/${siteId}`).pipe(
      tap(() => {
        this.itemsState.update((items) =>
          items.map((site) =>
            site.id === siteId
              ? { ...site, followed: false, accountLabel: null, notes: null }
              : site,
          ),
        );
        this.ui.notify(this.i18n.t('sites.removed'), 'info');
      }),
      catchError((error: unknown) => {
        this.ui.notify((error as ApiError).message ?? this.i18n.t('common.error'), 'error');
        return of(null);
      }),
      finalize(() => this.savingState.set(false)),
    );
  }

  /** Met à jour l'abonnement (identifiant sur le site, notes, activation). */
  update(siteId: string, payload: { accountLabel?: string; notes?: string }): Observable<JobSite | null> {
    return this.api.patch<JobSite>(`/job-sites/${siteId}`, payload).pipe(
      tap((site) => {
        this.itemsState.update((items) =>
          items.map((entry) => (entry.id === site.id ? site : entry)),
        );
      }),
      catchError((error: unknown) => {
        this.ui.notify((error as ApiError).message ?? this.i18n.t('common.error'), 'error');
        return of(null);
      }),
    );
  }

  reset(): void {
    this.itemsState.set([]);
    this.loadedState.set(false);
  }
}
