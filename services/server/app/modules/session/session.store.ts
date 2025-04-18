// src/modules/session/typeorm-session.store.ts
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Session } from '../../db/entities/sessions/session.entity';
import expressSession, { SessionData } from 'express-session';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';
import { ContextLogger } from 'nestjs-context-logger';

const ONE_DAY_IN_SECONDS = 86400;

type SimpleErrorCallback = (err?: Error) => void;

@Injectable()
export class SessionStore extends expressSession.Store implements OnApplicationShutdown {
  private readonly logger = new ContextLogger(this.constructor.name);
  private readonly ttl: number;
  private readonly pruneInterval: number | false;
  private pruneTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    private readonly configService: ConfigService<ValidatedConfig, true>,
  ) {
    super();

    const sessionConfig = this.configService.get('auth.session', { infer: true });
    this.ttl = sessionConfig.cookie.maxAge ? Math.floor(sessionConfig.cookie.maxAge / 1000) : ONE_DAY_IN_SECONDS;

    if (sessionConfig.pruneInterval === 0) {
      this.pruneInterval = false;
    } else {
      this.pruneInterval = sessionConfig.pruneInterval;
      this.initPruneTimer();
    }
    this.logger.info(
      `Initialized with TTL: ${this.ttl}s, Prune Interval: ${this.pruneInterval ? `${this.pruneInterval}ms` : 'Disabled'}`,
    );
  }

  /**
   * Fetch session by the given sid.
   */
  get = (sid: string, callback: (err?: Error | null, session?: SessionData | null) => void): void => {
    this.logger.debug(`GET ${sid}`);
    this.sessionRepository
      .findOne({ where: { sid } })
      .then((session) => {
        if (!session) {
          this.logger.debug(`GET ${sid}: Not found`);
          return callback(null, null);
        }
        if (session.expire < new Date()) {
          this.logger.debug(`GET ${sid}: Expired, destroying`);
          // Session expired, destroy it and return null
          this.destroy(sid, (err) => callback(err, null));
        } else {
          this.logger.debug(`GET ${sid}: Found, returning session data`);
          // Session found and valid, return the data
          callback(null, session.sess);
        }
      })
      .catch((err) => {
        this.logger.error(`GET ${sid}: Error - ${err.message}`, err.stack);
        callback(err);
      });
  };

  /**
   * Commit the given session object associated with the given sid.
   */
  set = (sid: string, session: SessionData, callback?: SimpleErrorCallback): void => {
    this.logger.debug(`SET ${sid}`);
    const expire = this.getExpireTime(session);
    const sessionEntity = this.sessionRepository.create({
      sid,
      sess: session, // TypeORM handles transformation if configured
      expire,
    });

    // Use upsert for efficient insert or update
    this.sessionRepository
      .upsert(sessionEntity, ['sid']) // Specify conflict target column(s)
      .then(() => {
        this.logger.debug(`SET ${sid}: Success`);
        callback?.();
      })
      .catch((err) => {
        this.logger.error(`SET ${sid}: Error - ${err.message}`, err.stack);
        callback?.(err);
      });
  };

  /**
   * Destroy the session associated with the given sid.
   */
  destroy = (sid: string, callback?: SimpleErrorCallback): void => {
    this.logger.debug(`DESTROY ${sid}`);
    this.sessionRepository
      .delete({ sid })
      .then((result) => {
        this.logger.debug(`DESTROY ${sid}: Success, affected = ${result.affected}`);
        callback?.();
      })
      .catch((err) => {
        this.logger.error(`DESTROY ${sid}: Error - ${err.message}`, err.stack);
        callback?.(err);
      });
  };

  /**
   * Touch the given session object associated with the given session ID.
   * Updates the expiration time.
   */
  touch = (sid: string, session: SessionData, callback?: () => void): void => {
    // Check if touch is implicitly disabled by having no maxAge/expires
    // Or add an explicit config option if needed
    if (!session?.cookie?.maxAge && !session?.cookie?.expires) {
      this.logger.debug(`TOUCH ${sid}: Skipped (no maxAge/expires)`);
      callback?.();
      return;
    }

    this.logger.debug(`TOUCH ${sid}`);
    const expire = this.getExpireTime(session);

    this.sessionRepository
      .update({ sid }, { expire })
      .then((result) => {
        if (result.affected && result.affected > 0) {
          this.logger.debug(`TOUCH ${sid}: Success, new expiry ${expire.toISOString()}`);
        } else {
          this.logger.debug(`TOUCH ${sid}: Session not found or no update needed.`);
        }
        callback?.();
      })
      .catch((err) => {
        this.logger.error(`TOUCH ${sid}: Error - ${err.message}`, err.stack);
        // Should we invoke callback with error? Original store doesn't seem to.
        callback?.();
      });
  };

  /**
   * Get the number of sessions.
   */
  length = (callback: (err: Error | null, length?: number) => void): void => {
    this.logger.debug(`LENGTH`);
    this.sessionRepository
      .count()
      .then((count) => {
        this.logger.debug(`LENGTH: Found ${count} sessions`);
        callback(null, count);
      })
      .catch((err) => {
        this.logger.error(`LENGTH: Error - ${err.message}`, err.stack);
        callback(err);
      });
  };

  /**
   * Clear all sessions.
   */
  clear = (callback?: SimpleErrorCallback): void => {
    this.logger.debug(`CLEAR`);
    this.sessionRepository
      .clear()
      .then(() => {
        this.logger.info(`CLEAR: Success`);
        callback?.();
      })
      .catch((err) => {
        this.logger.error(`CLEAR: Error - ${err.message}`, err.stack);
        callback?.(err);
      });
  };

  private initPruneTimer(): void {
    if (this.pruneInterval) {
      this.logger.info(`Scheduling session pruning every ${this.pruneInterval}ms`);
      const delay = this.getRandomizedInterval(this.pruneInterval);
      this.pruneTimer = setTimeout(() => this.pruneSessions(), delay);
      this.pruneTimer.unref(); // Allow Node.js to exit if this is the only timer
    }
  }

  private clearPruneTimer(): void {
    if (this.pruneTimer) {
      clearTimeout(this.pruneTimer);
      this.pruneTimer = undefined;
      this.logger.info('Pruning timer cleared.');
    }
  }

  private getRandomizedInterval(interval: number): number {
    // At least 50% of the specified interval and at most 150%
    const randomized = Math.ceil(interval / 2 + interval * Math.random());
    this.logger.debug(`Next prune check in ${randomized}ms (base interval ${interval}ms)`);
    return randomized;
  }

  /**
   * Prune expired sessions from the database.
   */
  pruneSessions = (): void => {
    this.logger.info('Pruning expired sessions...');
    this.sessionRepository
      .delete({ expire: LessThan(new Date()) }) // Delete where expire < NOW()
      .then((result) => {
        if (result.affected && result.affected > 0) {
          this.logger.info(`Pruned ${result.affected} expired sessions.`);
        } else {
          this.logger.info('No expired sessions found to prune.');
        }
      })
      .catch((err) => {
        this.logger.error(`Failed to prune sessions: ${err.message}`, err.stack);
      })
      .finally(() => {
        // Reschedule the next prune cycle
        this.clearPruneTimer();
        this.initPruneTimer();
      });
  };

  /**
   * Calculate session expiration date.
   */
  private getExpireTime(sess: SessionData): Date {
    let expire: number | Date | undefined;

    if (sess?.cookie?.expires) {
      expire = sess.cookie.expires;
    } else if (sess?.cookie?.maxAge) {
      expire = Date.now() + sess.cookie.maxAge;
    } else {
      expire = Date.now() + this.ttl * 1000;
    }

    return typeof expire === 'number' ? new Date(expire) : expire;
  }

  /**
   * Clean up the prune timer when the application shuts down.
   */
  onApplicationShutdown(signal?: string): void {
    this.logger.info(`Application shutting down (${signal || 'unknown signal'}). Clearing prune timer.`);
    this.clearPruneTimer();
  }
}
