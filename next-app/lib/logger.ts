import fs from 'fs';
import path from 'path';
import { trace } from '@opentelemetry/api';

interface LogEntry {
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  timestamp: string;
  service: string;
  traceId?: string;
  spanId?: string;
  stack?: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string;
  private logFile?: string;

  constructor() {
    this.serviceName = process.env.OTEL_SERVICE_NAME || 'next-app';
    this.logFile = process.env.LOG_FILE;
    
    // Créer le répertoire de logs si nécessaire
    if (this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  private createLogEntry(level: LogEntry['level'], message: string, extra?: any, error?: Error): LogEntry {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.serviceName,
    };

    // Ajouter les informations de trace OpenTelemetry si disponibles
    const activeSpan = trace.getActiveSpan();
    if (activeSpan) {
      const spanContext = activeSpan.spanContext();
      logEntry.traceId = spanContext.traceId;
      logEntry.spanId = spanContext.spanId;
    }

    // Ajouter des données supplémentaires
    if (extra) {
      Object.assign(logEntry, extra);
    }

    // Ajouter la stack trace pour les erreurs
    if (error) {
      logEntry.stack = error.stack;
      logEntry.message = error.message ? `${message}: ${error.message}` : message;
    }

    return logEntry;
  }

  private writeLog(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry);
    
    // Log vers la console
    if (logEntry.level === 'error') {
      console.error(logString);
    } else {
      console.log(logString);
    }

    // Créer le répertoire de logs si nécessaire
    if (this.logFile) {
      const logDir = path.dirname(this.logFile);
      if (!fs.existsSync(logDir)) {
        try {
          fs.mkdirSync(logDir, { recursive: true });
          console.log(`Created log directory: ${logDir}`);
        } catch (error) {
          console.error(`Failed to create log directory: ${logDir}`, error);
          this.logFile = undefined; // Désactiver les logs fichier si échec
        }
      }
    }

    // Log vers le fichier si configuré
    if (this.logFile) {
      try {
        fs.appendFileSync(this.logFile, logString + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  info(message: string, extra?: any): void {
    const logEntry = this.createLogEntry('info', message, extra);
    this.writeLog(logEntry);
  }

  error(message: string, error?: Error, extra?: any): void {
    const logEntry = this.createLogEntry('error', message, extra, error);
    this.writeLog(logEntry);
  }

  warn(message: string, extra?: any): void {
    const logEntry = this.createLogEntry('warn', message, extra);
    this.writeLog(logEntry);
  }

  debug(message: string, extra?: any): void {
    const logEntry = this.createLogEntry('debug', message, extra);
    this.writeLog(logEntry);
  }
}

export const logger = new Logger();