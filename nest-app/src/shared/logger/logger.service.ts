import { Injectable, Logger } from '@nestjs/common';
import { appendFileSync } from 'fs';

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  service: string;
  stack?: string;
  traceId?: string;
  [key: string]: any; // Pour permettre des propriétés supplémentaires
}

@Injectable()
export class CustomLoggerService extends Logger {
  
  private createLogEntry(level: string, message: string, extra?: any, error?: Error): LogEntry {
    const logEntry: LogEntry = {
      level,
      message: error ? `${message}: ${error.message}` : message,
      timestamp: new Date().toISOString(),
      service: process.env.OTEL_SERVICE_NAME || 'nest-app',
      stack: error ? error.stack : undefined,
      // TODO: Ajouter le traceId depuis le contexte OpenTelemetry si disponible
    };

    // Ajouter des données supplémentaires
    if (extra && typeof extra === 'object') {
      Object.assign(logEntry, extra);
    }

    return logEntry;
  }

  private outputLog(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry);
    
    // Toujours envoyer vers stdout/stderr (pour Kubernetes)
    if (logEntry.level === 'error') {
      console.error(logString);
    } else {
      console.log(logString);
    }
    
    // Optionnellement vers fichier (pour développement local)
    if (process.env.LOG_FILE) {
      try {
        appendFileSync(process.env.LOG_FILE, logString + '\n');
      } catch (fileError) {
        // Si erreur d'écriture fichier, on continue sans bloquer
        console.error('Failed to write to log file:', fileError.message);
      }
    }
  }

  // Signatures flexibles pour compatibilité
  info(message: string, context?: string): void;
  info(message: string, extra?: any, context?: string): void;
  info(message: string, contextOrExtra?: string | any, context?: string): void {
    let extra: any;
    let finalContext: string | undefined;

    if (typeof contextOrExtra === 'string') {
      // Ancien format: info(message, context)
      finalContext = contextOrExtra;
    } else {
      // Nouveau format: info(message, extra, context)
      extra = contextOrExtra;
      finalContext = context;
    }

    const logEntry = this.createLogEntry('info', message, extra);
    this.outputLog(logEntry);
    super.log(message, finalContext);
  }

  warn(message: string, context?: string): void;
  warn(message: string, extra?: any, context?: string): void;
  warn(message: string, contextOrExtra?: string | any, context?: string): void {
    let extra: any;
    let finalContext: string | undefined;

    if (typeof contextOrExtra === 'string') {
      finalContext = contextOrExtra;
    } else {
      extra = contextOrExtra;
      finalContext = context;
    }

    const logEntry = this.createLogEntry('warn', message, extra);
    this.outputLog(logEntry);
    super.warn(message, finalContext);
  }

  // @ts-ignore
  error(message: string, error?: Error, context?: string): void;
  // @ts-ignore
  error(message: string, error?: Error, extra?: any, context?: string): void;
  // @ts-ignore
  error(message: string, error?: Error, extraOrContext?: any | string, context?: string): void {
    let extra: any;
    let finalContext: string | undefined;

    if (typeof extraOrContext === 'string') {
      // Format: error(message, error, context)
      finalContext = extraOrContext;
    } else {
      // Format: error(message, error, extra, context)
      extra = extraOrContext;
      finalContext = context;
    }

    const logEntry = this.createLogEntry('error', message, extra, error);
    this.outputLog(logEntry);
    super.error(message, error?.stack, finalContext);
  }

  debug(message: string, context?: string): void;
  debug(message: string, extra?: any, context?: string): void;
  debug(message: string, contextOrExtra?: string | any, context?: string): void {
    let extra: any;
    let finalContext: string | undefined;

    if (typeof contextOrExtra === 'string') {
      finalContext = contextOrExtra;
    } else {
      extra = contextOrExtra;
      finalContext = context;
    }

    const logEntry = this.createLogEntry('debug', message, extra);
    this.outputLog(logEntry);
    super.debug(message, finalContext);
  }
}