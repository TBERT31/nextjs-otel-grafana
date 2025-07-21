import { Injectable, Logger } from '@nestjs/common';
import { appendFileSync } from 'fs';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  service: string;
  stack?: string;
  traceId?: string;
}

@Injectable()
export class CustomLoggerService extends Logger {
  
  info(message: string, context?: string): void {
    const logEntry: LogEntry = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      service: process.env.OTEL_SERVICE_NAME || 'nest-app',
    };
    
    console.log(JSON.stringify(logEntry));
    
    if (process.env.LOG_FILE) {
      appendFileSync(process.env.LOG_FILE, JSON.stringify(logEntry) + '\n');
    }
    
    super.log(message, context);
  }

  // @ts-ignore
  error(message: string, error?: Error, context?: string): void {
    const logEntry: LogEntry = {
      level: 'error',
      message: error ? `${message}: ${error.message}` : message,
      timestamp: new Date().toISOString(),
      service: process.env.OTEL_SERVICE_NAME || 'nest-app',
      stack: error ? error.stack : undefined,
    };
    
    console.error(JSON.stringify(logEntry));
    
    if (process.env.LOG_FILE) {
      appendFileSync(process.env.LOG_FILE, JSON.stringify(logEntry) + '\n');
    }
    
    super.error(message, error?.stack, context);
  }
}