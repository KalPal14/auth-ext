import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessTokenGuard } from '../access-token/access-token.guard';
import { AuthType } from '../../enums/auth-type.enum';
import { AUTH_TYPES_KEY } from '../../decorators/auth.decorator';
import { ApiKeyGuard } from '../api-key/api-key.guard';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly defaultAuthType: AuthType = AuthType.Bearer;
  private readonly authTypeMap: Record<AuthType, CanActivate | CanActivate[]> =
    {
      [AuthType.Bearer]: this.accessTokenGuard,
      [AuthType.ApiKey]: this.apiKeyGuard,
      [AuthType.None]: { canActivate: () => true },
    };

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authTypes = this.reflector.getAllAndOverride<AuthType[]>(
      AUTH_TYPES_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? [this.defaultAuthType];
    const guards = authTypes.map((type) => this.authTypeMap[type]).flat();
    let error = new UnauthorizedException();

    for (const guard of guards) {
      const canActivate = await Promise.resolve(
        guard.canActivate(context),
      ).catch((err) => {
        error = err;
      });

      if (canActivate) {
        return true;
      }
    }

    throw error;
  }
}
