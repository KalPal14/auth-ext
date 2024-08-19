import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { authenticator } from 'otplib';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OtpAuthService {
  constructor(
    private readonly configServise: ConfigService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  generateSecret(email: string) {
    const secret = authenticator.generateSecret();
    const appName = this.configServise.getOrThrow('TFA_APP_NAME');
    const uri = authenticator.keyuri(email, appName, secret);
    return {
      secret,
      uri,
    };
  }

  verifyCode(code: string, secret: string) {
    return authenticator.verify({ token: code, secret });
  }

  async enableTfaForUser(email: string, secret: string) {
    const { id } = await this.userRepository.findOneByOrFail({ email });
    await this.userRepository.update(
      { id },
      {
        // TIP: Ideally, we would want to encrypt the "secret" instead of
        // storing it in a plaintext. Note we couldn't use hashing here as
        // the original secret is required to verify the user's provided code.
        otpSecret: secret,
        otpEnabled: true,
      },
    );
  }
}
