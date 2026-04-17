import { IsString, Length, Matches } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  @Length(2, 255)
  full_name: string;

  @IsString()
  @Matches(/^\+90\d{10}$/, { message: 'Telefon +90 ile başlamalı ve 10 haneli olmalıdır.' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalıdır.' })
  otp: string;
}
