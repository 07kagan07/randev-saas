import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Lütfen geçerli bir telefon numarası girin.',
  })
  phone: string;
}
