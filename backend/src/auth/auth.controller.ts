import {
  Controller, Post, Body, Res, Req,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { IsString, Length } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

class SetupBusinessDto {
  @IsString()
  @Length(2, 255)
  name: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp(dto.phone, dto.otp, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.refreshToken(refreshToken);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @Post('setup-business')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  setupBusiness(
    @Body() dto: SetupBusinessDto,
    @CurrentUser() user: User,
  ) {
    return this.authService.setupBusiness(user.id, dto.name);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.logout(refreshToken, res);
  }
}
