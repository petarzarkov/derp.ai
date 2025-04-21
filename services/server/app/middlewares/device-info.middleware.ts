import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import useragent from 'express-useragent';
import { ContextLogger } from 'nestjs-context-logger';

export interface DeviceInfo {
  userAgent: string;
  device: string;
  browser: string;
  ipAddress: string | undefined;
}

@Injectable()
export class DeviceInfoMiddleware implements NestMiddleware {
  private readonly logger = new ContextLogger(DeviceInfoMiddleware.name);

  use(req: Request, _res: Response, next: NextFunction) {
    if (!req.session) {
      this.logger.warn(
        'Session object not found on request in DeviceInfoMiddleware. Ensure express-session runs first.',
      );
      return next();
    }

    try {
      if (req.headers['user-agent']) {
        const userAgent = req.headers['user-agent'];
        const agentDetails = useragent.parse(userAgent);
        const ipHeader = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ipAddress = Array.isArray(ipHeader) ? ipHeader[0] : ipHeader?.split(',')[0].trim();

        const deviceInfo: DeviceInfo = {
          userAgent,
          device: `${agentDetails.platform}, ${agentDetails.os}`,
          browser: `${agentDetails.browser}, ${agentDetails.version}`,
          ipAddress,
        };

        req.session.deviceInfo = deviceInfo;

        ContextLogger.updateContext({ deviceInfo });
      }
    } catch (error) {
      this.logger.error('Failed to parse user agent or get IP in DeviceInfoMiddleware', { error });
    }

    next();
  }
}
