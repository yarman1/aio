import { Role } from './roles.enum';

export type JwtPayload = {
  sub: number;
  role: Role;
};
