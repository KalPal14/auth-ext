import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { HashingService } from '../hashing/hashing.service';
import jwtConfig from 'src/iam/config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { RefreshTokensDto } from './dto/refresh-tokens.dto';
import { randomUUID } from 'crypto';
import { RefreshTokenPayload } from '../interfaces/refresh-token-payload.interface';
import { RefreshTokenIdsStorage } from './refresh-token-ids.storage';

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly refreshTokenIdsStorage: RefreshTokenIdsStorage,
  ) {}

  async signUp({ email, password }: SignUpDto): Promise<User> {
    try {
      const user = new User();
      user.email = email;
      user.password = await this.hashingService.hash(password);

      return await this.userRepository.save(user);
    } catch (err) {
      if (err.code === '23505') {
        throw new ConflictException('User with this e-mail already exists');
      }
    }
  }

  async signIn({
    email,
    password,
  }: SignInDto): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundException('No user with this e-mail was found');
    }

    const isPasswordValid = await this.hashingService.compare(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect password');
    }

    return this.generateTokens(user);
  }

  async refreshTokens({ refreshToken }: RefreshTokensDto) {
    try {
      const { sub, tokenId } =
        await this.jwtService.verifyAsync<RefreshTokenPayload>(
          refreshToken,
          this.jwtConfiguration,
        );

      const isTokenValid = await this.refreshTokenIdsStorage.validate(
        sub,
        tokenId,
      );
      if (!isTokenValid) {
        console.log(1);
        throw new UnauthorizedException();
      }

      console.log(2);
      await this.refreshTokenIdsStorage.invalidate(sub);
      const user = await this.userRepository.findOneByOrFail({ id: sub });
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  async generateTokens(user: User) {
    const refreshTokenId = randomUUID();
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(
        { sub: user.id, email: user.email },
        this.jwtConfiguration.accessTtl,
      ),
      this.signToken(
        { sub: user.id, tokenId: refreshTokenId },
        this.jwtConfiguration.refreshTtl,
      ),
    ]);
    await this.refreshTokenIdsStorage.insert(user.id, refreshTokenId);
    return { accessToken, refreshToken };
  }

  private signToken(
    payload: ActiveUserData | RefreshTokenPayload,
    expiresIn: string,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { ...payload },
      {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        expiresIn,
      },
    );
  }
}
