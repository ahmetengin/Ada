/**
 * Logger utility for Ada ecosystem
 * Provides structured logging with log levels
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  timestamp: Date;
}

export class Logger {
  private context: string;
  private static logLevel: LogLevel = LogLevel.INFO;
  private static enableConsole: boolean = true;

  constructor(context: string) {
    this.context = context;
  }

  /**
   * Set global log level
   */
  static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
  }

  /**
   * Enable/disable console output
   */
  static setConsoleOutput(enabled: boolean): void {
    Logger.enableConsole = enabled;
  }

  /**
   * Check if level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(Logger.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log entry for output
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    return `[${timestamp}] [${entry.level}] [${entry.context}] ${entry.message}${dataStr}`;
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      context: this.context,
      data,
      timestamp: new Date(),
    };

    if (Logger.enableConsole) {
      const formatted = this.formatLogEntry(entry);
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
          console.error(formatted);
          break;
      }
    }

    // In production, also send to logging service (e.g., Sentry, DataDog, CloudWatch)
    // this.sendToLoggingService(entry);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

// Export default logger factory
export function createLogger(context: string): Logger {
  return new Logger(context);
}
