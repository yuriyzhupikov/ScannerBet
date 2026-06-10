import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable()
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    const record = {
      level,
      timestamp: new Date().toISOString(),
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      trace,
    };

    const line = JSON.stringify(record);
    if (level === 'error') {
      console.error(line);
      return;
    }

    console.log(line);
  }
}

