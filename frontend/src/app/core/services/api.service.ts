import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { ApiEnvelope, ApiErrorBody } from '../models/api.models';

/**
 * Erreur API normalisée : le composant ne manipule jamais HttpErrorResponse.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type QueryValue = string | number | boolean | undefined | null | ReadonlyArray<string>;

/**
 * Accès HTTP générique : préfixe d'URL, déballage de l'enveloppe { data, meta }
 * et conversion des erreurs NestJS en `ApiError`.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api';

  get<T>(path: string, query?: Record<string, QueryValue>): Observable<T> {
    return this.request<T>('GET', path, { params: this.toParams(query) });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('POST', path, { body });
  }

  put<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('PUT', path, { body });
  }

  patch<T>(path: string, body?: unknown): Observable<T> {
    return this.request<T>('PATCH', path, { body });
  }

  delete<T>(path: string): Observable<T> {
    return this.request<T>('DELETE', path, {});
  }

  private request<T>(
    method: string,
    path: string,
    options: { body?: unknown; params?: HttpParams },
  ): Observable<T> {
    return this.http
      .request<ApiEnvelope<T> | T>(method, `${this.baseUrl}${path}`, {
        body: options.body,
        params: options.params,
      })
      .pipe(
        map((response) => unwrap<T>(response)),
        catchError((error: unknown) => throwError(() => toApiError(error))),
      );
  }

  /** Les tableaux deviennent des paramètres répétés (?x=A&x=B), acceptés par l'API. */
  private toParams(query?: Record<string, QueryValue>): HttpParams {
    let params = new HttpParams();
    if (!query) return params;

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) params = params.append(key, String(item));
      } else {
        params = params.set(key, String(value));
      }
    }
    return params;
  }
}

function unwrap<T>(response: ApiEnvelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in (response as ApiEnvelope<T>)) {
    return (response as ApiEnvelope<T>).data;
  }
  return response as T;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ApiErrorBody | string | null;
    if (body && typeof body === 'object') {
      return new ApiError(error.status, body.message ?? error.statusText, body.details ?? []);
    }
    if (typeof body === 'string' && body.length > 0) {
      return new ApiError(error.status, body);
    }
    return new ApiError(
      error.status,
      error.status === 0
        ? 'API injoignable. Vérifiez que le serveur NestJS est démarré.'
        : error.statusText || 'Erreur inattendue',
    );
  }
  return new ApiError(0, error instanceof Error ? error.message : 'Erreur inconnue');
}
