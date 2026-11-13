import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Format d'erreur unique pour toute l'API :
 * { statusCode, error, message, details?, path, timestamp }
 * `details` reprend les erreurs de validation champ par champ.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = isHttp ? exception.getResponse() : null;
    const rawMessage =
      typeof payload === 'string'
        ? payload
        : (payload as { message?: string | string[] } | null)?.message;
    const message = Array.isArray(rawMessage)
      ? 'Certains champs sont invalides'
      : (rawMessage ?? "Une erreur interne s'est produite");
    const details = Array.isArray(rawMessage) ? rawMessage : undefined;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      error: isHttp ? (payload as { error?: string })?.error ?? 'Error' : 'Internal Server Error',
      message,
      ...(details ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
