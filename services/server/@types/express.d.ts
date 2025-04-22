import { SanitizedUser } from '../app/db/entities/users/user.entity';

declare global {
  namespace Express {
    interface User extends SanitizedUser {}
  }
}
