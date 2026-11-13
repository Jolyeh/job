import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, tap, throwError } from 'rxjs';
import { ApiError } from './api.service';
import { AuthResponse, AuthUser } from '../models/api.models';

const TOKEN_KEY = 'jobradar.token';
const USER_KEY = 'jobradar.user';

/**
 * État d'authentification piloté par Signals.
 *
 * - `currentUser` / `isAuthenticated` sont des `computed` dérivés du signal
 *   source `user`, consommables directement dans les templates.
 * - le token est persisté en localStorage pour survivre au rechargement.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  /** Source de vérité unique de l'état de session. */
  private readonly userState = signal<AuthUser | null>(readStoredUser());
  private readonly tokenState = signal<string | null>(readStorage(TOKEN_KEY));
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly isLoading = computed(() => this.loadingState());
  readonly error = computed(() => this.errorState());
  readonly initials = computed(() => {
    const name = this.userState()?.fullName ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  });

  get token(): string | null {
    return this.tokenState();
  }

  /** À appeler après un appel HTTP d'auth (login/register). */
  persist(response: AuthResponse): void {
    writeStorage(TOKEN_KEY, response.accessToken);
    writeStorage(USER_KEY, JSON.stringify(response.user));
    this.tokenState.set(response.accessToken);
    this.userState.set(response.user);
    this.errorState.set(null);
  }

  /** Met à jour l'utilisateur local (ex. retour de GET /auth/me). */
  syncUser(user: AuthUser): void {
    writeStorage(USER_KEY, JSON.stringify(user));
    this.userState.set(user);
  }

  setError(message: string | null): void {
    this.errorState.set(message);
  }

  startLoading(): void {
    this.loadingState.set(true);
    this.errorState.set(null);
  }

  stopLoading(): void {
    this.loadingState.set(false);
  }

  /** Déconnexion locale immédiate (le serveur révoque les JWT via /auth/logout). */
  clear(): void {
    removeStorage(TOKEN_KEY);
    removeStorage(USER_KEY);
    this.tokenState.set(null);
    this.userState.set(null);
  }

  /**
   * Décorateur d'appel d'authentification : gère `isLoading` et l'erreur
   * affichable, et persiste la session en cas de succès.
   */
  runAuthRequest(source: Observable<AuthResponse>): Observable<AuthResponse> {
    this.startLoading();
    return source.pipe(
      tap((response) => this.persist(response)),
      catchError((error: unknown) => {
        this.errorState.set(
          error instanceof ApiError ? error.message : 'Connexion impossible',
        );
        return throwError(() => error);
      }),
      finalize(() => this.stopLoading()),
    );
  }
}

// ---------------------------------------------------------------------------
//  Helpers de stockage (tolérants aux navigateurs restrictifs)
// ---------------------------------------------------------------------------

function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* quota / mode privé : on ignore, la session reste en mémoire */
  }
}

function removeStorage(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* noop */
  }
}

function readStoredUser(): AuthUser | null {
  const raw = readStorage(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
