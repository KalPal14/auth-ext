import { SetMetadata } from '@nestjs/common';
import { AuthType } from '../enums/auth-type.enum';

export const AUTH_TYPES_KEY = 'authTypes';

export const Auth = (...authTypes: AuthType[]) =>
  SetMetadata(AUTH_TYPES_KEY, authTypes);
