import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { AuthenticationService } from './authentication.service';
import { SignInDto } from './dto/sign-in.dto';
import { Auth } from './decorators/auth.decorator';
import { AuthType } from './enums/auth-type.enum';
import { RefreshTokensDto } from './dto/refresh-tokens.dto';
import { ActiveUser } from '../decorators/active-user.decorator';
import { OtpAuthService } from './otp-auth.service';
import { Response } from 'express';
import { toFileStream } from 'qrcode';

@Auth(AuthType.None)
@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    private readonly otpAuthService: OtpAuthService,
  ) {}
  @Post('sign-up')
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authenticationService.signUp(signUpDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  signIn(@Body() signInDto: SignInDto) {
    return this.authenticationService.signIn(signInDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh-tokens')
  refreshTokens(@Body() refreshTokensDto: RefreshTokensDto) {
    return this.authenticationService.refreshTokens(refreshTokensDto);
  }

  @Auth(AuthType.Bearer)
  @HttpCode(HttpStatus.OK)
  @Post('2fa/generate')
  async generateQrcode(
    @Res() res: Response,
    @ActiveUser('email') email: string,
  ) {
    const { secret, uri } = this.otpAuthService.generateSecret(email);
    await this.otpAuthService.enableTfaForUser(email, secret);
    res.type('png');
    return toFileStream(res, uri);
  }
}
