import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingService {
  hash: (data: string | Buffer) => Promise<string>;
  compare: (data: string | Buffer, encrypted: string) => Promise<boolean>;
}
