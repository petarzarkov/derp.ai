import { Logger, LogLevel } from '@slack/bolt';
import { ConsoleLogger, LogLevel as NestLogLevel } from '@nestjs/common';

export class SlackLogger implements Logger {
  #ctxLogger: ConsoleLogger;

  constructor(
    moduleName: string,
    public level: LogLevel,
  ) {
    this.#ctxLogger = new ConsoleLogger(moduleName, {
      json: true,
    });
  }

  #log = (level: NestLogLevel, ...data: unknown[]) => {
    if (data.length === 0) {
      return;
    }

    const [arg_1, ...rest] = data;
    const message = typeof arg_1 === 'string' ? arg_1 : 'slack debug message';
    if (rest.length === 0) {
      this.#ctxLogger[level](message);
      return;
    }

    this.#ctxLogger[level](message, { data: rest });
  };

  debug = (...data: unknown[]) => {
    if (this.level === 'debug') {
      this.#log('debug', ...data);
    }
  };

  info = (...data: unknown[]) => {
    this.#log('log', ...data);
  };
  warn = (...data: unknown[]) => {
    this.#log('warn', ...data);
  };

  error = (...data: unknown[]) => {
    this.#log('error', ...data);
  };

  setLevel() {
    return null;
  }

  getLevel() {
    return this.level;
  }

  setName(name: string) {
    this.#ctxLogger = new ConsoleLogger(name);
  }
}
