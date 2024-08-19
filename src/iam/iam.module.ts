import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypt.service';
import { AuthenticationService } from './authentication/authentication.service';
import { AuthenticationController } from './authentication/authentication.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from 'src/iam/config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AccessTokenGuard } from './authentication/guards/access-token/access-token.guard';
import { AuthenticationGuard } from './authentication/guards/authentication/authentication.guard';
import { RefreshTokenIdsStorage } from './authentication/refresh-token-ids.storage';
import { RoleGuard } from './authorization/guards/role/role.guard';
import { ApiKeyService } from './authentication/api-key.service';
import { ApiKeyGuard } from './authentication/guards/api-key/api-key.guard';
import { ApiKey } from 'src/users/entities/api-key.entity';
import { OtpAuthService } from './authentication/otp-auth.service';
import { SessionAuthenticationService } from './session-authentication/session-authentication/session-authentication.service';
import { SessionAuthenticationController } from './session-authentication/session-authentication/session-authentication.controller';
import * as passport from 'passport';
import * as session from 'express-session';
import { UserSerializer } from './session-authentication/serializers/user.serializer';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ApiKey]),
    JwtModule.registerAsync({ useFactory: jwtConfig }),
    ConfigModule.forFeature(jwtConfig),
  ],
  providers: [
    { provide: HashingService, useClass: BcryptService },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: RoleGuard },
    AccessTokenGuard,
    ApiKeyGuard,
    BcryptService,
    RefreshTokenIdsStorage,
    AuthenticationService,
    ApiKeyService,
    OtpAuthService,
    SessionAuthenticationService,
    UserSerializer,
  ],
  controllers: [AuthenticationController, SessionAuthenticationController],
})
export class IamModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        session({
          store: new RedisStore({ client: new Redis(6379, 'localhost') }),
          secret: process.env.SESSION_SECRET,
          resave: false,
          saveUninitialized: false,
          cookie: { sameSite: true, httpOnly: true },
        }),
        passport.initialize(),
        passport.session(),
      )
      .forRoutes('*');
  }
}
