import { IsString, Matches, IsIn, IsOptional } from 'class-validator';

export class SendOtpDto {
  @IsString()
  // E.164: + ile başlar, 7-15 hane — örn. +905551234567, +12125551234
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Telefon numarası E.164 formatında olmalı (örn. +905551234567).',
  })
  phone: string;

  @IsOptional()
  @IsIn(['login', 'register'])
  mode?: 'login' | 'register';
}
