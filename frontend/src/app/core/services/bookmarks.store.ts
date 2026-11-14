import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';
import {
  ApplicationStatus,
  Bookmark,
  BookmarkStats,
} from '../models/api.models';
import { ApiError, ApiService } from './api.service';
import { UiStore } from './ui.store';
import { I18nService } from '../i18n/i18n.service';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  SAVED: 'Sauvegardée',
  APPLIED: 'Candidature envoyée',
  INTERVIEW: 'Entretien',
  OFFER: 'Proposition',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Retirée',
};

export const STATUS_ORDER: ApplicationStatus[] = [
  'SAVED',
  'APPLIED',
  'INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

/**
 * Store des favoris / suivi de candidatures.
 * `bookmarkedIds` permet aux cartes d'offres de savoir instantanément si
 * l'offre est déjà suivie (optimistic-friendly, sans requête supplémentaire).
 */
@Injectable({ providedIn: 'root' })
export class BookmarksStore {
  private readonly api = inject(ApiService);
  private readonly ui = inject(UiStore);
  private readonly i18n = inject(I18nService);

  private readonly itemsState = signal<Bookmark[]>([]);
  private readonly statsState = signal<BookmarkStats | null>(null);
  private readonly loadingState = signal(false);
  private readonly pendingState = signal<Set<string>>(new Set());
  private readonly errorState = signal<string | null>(null);

  readonly items = this.itemsState.asReadonly();
  readonly stats = this.statsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  readonly total = computed(() => this.itemsState().length);
  readonly bookmarkedIds = computed(
    () => new Set(this.itemsState().map((bookmark) => bookmark.offer.id)),
  );
  readonly byStatus = computed(() => {
    const map = new Map<ApplicationStatus, Bookmark[]>(
      STATUS_ORDER.map((status) => [status, []]),
    );
    for (const bookmark of this.itemsState()) {
      map.get(bookmark.status)?.push(bookmark);
    }
    return map;
  });
  readonly upcoming = computed(() =>
    [...this.itemsState()]
      .filter((bookmark) => bookmark.nextActionAt)
      .sort(
        (a, b) =>
          new Date(a.nextActionAt!).getTime() - new Date(b.nextActionAt!).getTime(),
      )
      .slice(0, 4),
  );

  isBookmarked(offerId: string): boolean {
    return this.bookmarkedIds().has(offerId);
  }

  isPending(offerId: string): boolean {
    return this.pendingState().has(offerId);
  }

  load(): void {
    this.loadingState.set(true);
    this.api
      .get<Bookmark[]>('/bookmarks')
      .pipe(
        tap((items) => this.itemsState.set(items)),
        catchError((error: unknown) => {
          this.errorState.set((error as ApiError).message);
          return of([]);
        }),
        finalize(() => this.loadingState.set(false)),
      )
      .subscribe();

    this.api
      .get<BookmarkStats>('/bookmarks/stats')
      .pipe(
        tap((stats) => this.statsState.set(stats)),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  /** Ajoute l'offre aux favoris (bouton « sauvegarder » des cartes). */
  add(offerId: string): Observable<Bookmark | null> {
    this.setPending(offerId, true);
    return this.api.post<Bookmark>('/bookmarks', { jobOfferId: offerId }).pipe(
      tap((bookmark) => {
        this.itemsState.update((items) => [bookmark, ...items]);
        this.ui.notify(this.i18n.t('toast.bookmarkAdded'), 'success');
        this.refreshStats();
      }),
      catchError((error: unknown) => {
        this.ui.notify((error as ApiError).message, 'error');
        return of(null);
      }),
      finalize(() => this.setPending(offerId, false)),
    );
  }

  remove(bookmarkId: string): void {
    const previous = this.itemsState();
    this.itemsState.update((items) => items.filter((item) => item.id !== bookmarkId));

    this.api
      .delete<{ deleted: true }>(`/bookmarks/${bookmarkId}`)
      .pipe(
        tap(() => {
          this.ui.notify(this.i18n.t('toast.bookmarkRemoved'), 'info');
          this.refreshStats();
        }),
        catchError((error: unknown) => {
          // Rollback optimiste en cas d'échec.
          this.itemsState.set(previous);
          this.ui.notify((error as ApiError).message, 'error');
          return of(null);
        }),
      )
      .subscribe();
  }

  update(
    bookmarkId: string,
    patch: { status?: ApplicationStatus; notes?: string; nextActionAt?: string; comment?: string },
  ): Observable<Bookmark | null> {
    return this.api.patch<Bookmark>(`/bookmarks/${bookmarkId}`, patch).pipe(
      tap((updated) => {
        this.itemsState.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.refreshStats();
        if (patch.status) {
          this.ui.notify(`Statut mis à jour : ${STATUS_LABELS[updated.status]}.`, 'success');
        }
      }),
      catchError((error: unknown) => {
        this.ui.notify((error as ApiError).message, 'error');
        return of(null);
      }),
    );
  }

  private refreshStats(): void {
    this.api
      .get<BookmarkStats>('/bookmarks/stats')
      .pipe(tap((stats) => this.statsState.set(stats)), catchError(() => of(null)))
      .subscribe();
  }

  private setPending(offerId: string, pending: boolean): void {
    this.pendingState.update((set) => {
      const next = new Set(set);
      if (pending) next.add(offerId);
      else next.delete(offerId);
      return next;
    });
  }
}
