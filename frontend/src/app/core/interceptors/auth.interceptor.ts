import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Interceptor fonctionnel (Angular 19+) :
 *  - ajoute le Bearer token à chaque requête sortante ;
 *  - purge la session et redirige vers /login sur 401.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const authorized =
    token && !request.url.endsWith('/auth/login') && !request.url.endsWith('/auth/register')
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && auth.isAuthenticated()) {
        auth.clear();
        const redirect = encodeURIComponent(globalThis.location?.pathname ?? '/');
        globalThis.location?.assign(`/login?redirect=${redirect}`);
      }
      return throwError(() => error);
    }),
  );
};
