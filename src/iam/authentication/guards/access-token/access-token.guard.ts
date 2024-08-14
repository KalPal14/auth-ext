import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from 'config/jwt.config';
import { Request } from 'express';
import { REQUEST_USER_KEY } from 'src/iam/iam.constants';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest<Request>();
      const accessToken = this.getAccessToken(request);

      const payload = await this.jwtService.verifyAsync(
        accessToken,
        this.jwtConfiguration,
      );
      request[REQUEST_USER_KEY] = payload;

      return true;
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  private getAccessToken(request: Request): string {
    return request.headers.authorization.split(' ')[1];
  }
}
