import { Injectable } from '@nestjs/common';
import { HashingService } from '../hashing/hashing.service';
import { randomUUID } from 'crypto';

export interface GeneratedApiKeys {
  apiKey: string;
  hashKey: string;
}

@Injectable()
export class ApiKeyService {
  constructor(private readonly hashingService: HashingService) {}

  async generateAndHash(id: string): Promise<GeneratedApiKeys> {
    const apiKey = this.generateApiKey(id);
    const hashKey = await this.hashingService.hash(apiKey);
    return { apiKey, hashKey };
  }

  async validate(apiKey: string, hashKey: string): Promise<boolean> {
    return await this.hashingService.compare(apiKey, hashKey);
  }

  getIdFromApiKey(apiKey: string): string {
    const [id] = Buffer.from(apiKey, 'base64').toString('ascii').split(' ');
    return id;
  }

  private generateApiKey(id: string): string {
    const apiKey = `${id} ${randomUUID()}`;
    return Buffer.from(apiKey).toString('base64');
  }
}
