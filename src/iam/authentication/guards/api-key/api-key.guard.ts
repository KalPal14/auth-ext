import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../../api-key.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiKey } from 'src/users/entities/api-key.entity';
import { Repository } from 'typeorm';
import { REQUEST_USER_KEY } from 'src/iam/iam.constants';
import { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException();
    }

    try {
      const apiKeyEntityId = this.apiKeyService.getIdFromApiKey(apiKey);
      const { key, user } = await this.apiKeyRepository.findOneOrFail({
        where: { uuid: apiKeyEntityId },
        relations: { user: true },
      });

      const isValid = await this.apiKeyService.validate(apiKey, key);
      if (!isValid) throw new UnauthorizedException();

      request[REQUEST_USER_KEY] = {
        sub: user.id,
        email: user.email,
        role: user.role,
      } as ActiveUserData;
      return true;
    } catch (err) {
      throw new UnauthorizedException();
    }
  }

  private extractApiKey(request: Request): string {
    const [type, key] = request.headers.authorization.split(' ');
    return type === 'ApiKey' ? key : undefined;
  }
}
