import { IsString, Length, Matches } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  @Length(2, 255)
  full_name: string;

  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Telefon numarası E.164 formatında olmalı (örn. +905551234567).' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
  otp: string;
}
