import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const isProduction = process.env.NODE_ENV === 'production';
    const requestId = req.id ?? (req.headers['x-request-id'] as string) ?? 'unknown';

    let message: string | object;
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      message = typeof response === 'string' ? response : (response as any).message ?? response;
    } else {
      // 5xx — never leak internals in production
      message = isProduction ? 'Internal server error' : String(exception);
    }

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${status} ${req.method} ${req.url} — ${String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json({
      statusCode: status,
      message,
      requestId,
      timestamp: new Date().toISOString(),
      path: req.url,
    });
  }
}
