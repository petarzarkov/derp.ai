import 'express-session';
import { DeviceInfo } from '../app/middlewares/device-info.middleware';

declare module 'express-session' {
  interface SessionData {
    passport?: {
      user?: string;
    };
    deviceInfo?: DeviceInfo;
  }
}
