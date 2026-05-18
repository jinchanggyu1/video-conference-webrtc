// ====================================
// Logger Utility
// ====================================

import { LogLevel, LogEntry } from "./types";
import { LOG_LEVELS } from "./constants";

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLevel: LogLevel = "debug";

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  debug(message: string, data?: any, source?: string) {
    this.log("debug", message, data, source);
  }

  info(message: string, data?: any, source?: string) {
    this.log("info", message, data, source);
  }

  warn(message: string, data?: any, source?: string) {
    this.log("warn", message, data, source);
  }

  error(message: string, data?: any, source?: string) {
    this.log("error", message, data, source);
  }

  private log(
    level: LogLevel,
    message: string,
    data?: any,
    source?: string
  ) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      source,
    };

    this.addLog(entry);

    const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
    const logMessage = `${prefix} ${message}`;

    if (data) {
      console[level === "error" ? "error" : level](logMessage, data);
    } else {
      console[level === "error" ? "error" : level](logMessage);
    }
  }

  getLogs(filter?: { level?: LogLevel; source?: string }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter((log) => log.level === filter.level);
    }

    if (filter?.source) {
      filtered = filtered.filter((log) => log.source === filter.source);
    }

    return filtered;
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
