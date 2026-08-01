import { UserRole } from '../dto';

export interface IPayload {
  sub: string;
  username: string;
  role: UserRole;
}
