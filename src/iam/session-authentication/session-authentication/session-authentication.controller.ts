import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SignInDto } from 'src/iam/authentication/dto/sign-in.dto';
import { SessionAuthenticationService } from './session-authentication.service';
import { promisify } from 'util';
import { Request } from 'express';
import { SessionGuard } from '../guards/session/session.guard';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';
import { ActiveUserData } from 'src/iam/interfaces/active-user-data.interface';
import { Auth } from 'src/iam/authentication/decorators/auth.decorator';
import { AuthType } from 'src/iam/authentication/enums/auth-type.enum';

@Auth(AuthType.None)
@Controller('session-authentication')
export class SessionAuthenticationController {
  constructor(
    private readonly sessionAuthenticationService: SessionAuthenticationService,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  async signIn(@Body() signInDto: SignInDto, @Req() req: Request) {
    const user = await this.sessionAuthenticationService.signIn(signInDto);
    return promisify(req.logIn).call(req, user);
  }

  @UseGuards(SessionGuard)
  @Get()
  async seyHello(@ActiveUser() user: ActiveUserData) {
    return `Hello ${user.email}`;
  }
}
