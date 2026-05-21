import { LoggerService } from '@nestjs/common';
import { requestContext } from '../request-context';

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'verbose';

export class StructuredLoggerService implements LoggerService {
  private format(level: LogLevel, message: unknown, context?: string): string {
    const ctx = requestContext.getStore();
    return JSON.stringify({
      level,
      message: String(message),
      context: context ?? 'App',
      requestId: ctx?.requestId ?? null,
      userId: ctx?.userId ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  log(message: unknown, context?: string): void {
    process.stdout.write(this.format('info', message, context) + '\n');
  }

  warn(message: unknown, context?: string): void {
    process.stdout.write(this.format('warn', message, context) + '\n');
  }

  error(message: unknown, trace?: string, context?: string): void {
    const ctx = requestContext.getStore();
    process.stderr.write(
      JSON.stringify({
        level: 'error',
        message: String(message),
        trace: trace ?? null,
        context: context ?? 'App',
        requestId: ctx?.requestId ?? null,
        userId: ctx?.userId ?? null,
        timestamp: new Date().toISOString(),
      }) + '\n',
    );
  }

  debug(message: unknown, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(this.format('debug', message, context) + '\n');
    }
  }

  verbose(message: unknown, context?: string): void {
    if (process.env.NODE_ENV !== 'production') {
      process.stdout.write(this.format('verbose', message, context) + '\n');
    }
  }
}
