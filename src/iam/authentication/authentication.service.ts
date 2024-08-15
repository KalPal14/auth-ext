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

@Injectable()
export class AuthenticationService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly hashingService: HashingService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
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
      const { sub } = await this.jwtService.verifyAsync(
        refreshToken,
        this.jwtConfiguration,
      );
      const user = await this.userRepository.findOneByOrFail({ id: sub });
      return this.generateTokens(user);
    } catch {
      new UnauthorizedException();
    }
  }

  async generateTokens(user: User) {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user.id, this.jwtConfiguration.accessTtl, {
        email: user.email,
      }),
      this.signToken(user.id, this.jwtConfiguration.refreshTtl),
    ]);
    return { accessToken, refreshToken };
  }

  private signToken(
    userId: number,
    expiresIn: string,
    payload?: Omit<ActiveUserData, 'sub'>,
  ): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, ...payload },
      {
        secret: this.jwtConfiguration.secret,
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        expiresIn,
      },
    );
  }
}
