import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Enveloppe de réponse homogène : { data, meta }.
 * Permet d'ajouter des métadonnées (durée de traitement) sans casser le contrat
 * côté Angular.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T; meta: { durationMs: number } }> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<{ data: T; meta: { durationMs: number } }> {
    const startedAt = Date.now();
    return next.handle().pipe(
      map((data) => ({
        data,
        meta: { durationMs: Date.now() - startedAt },
      })),
    );
  }
}
