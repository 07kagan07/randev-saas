import { IsString, IsOptional, Length, Matches } from 'class-validator';

export class RegisterBusinessDto {
  @IsString()
  @Length(2, 255)
  business_name: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug yalnızca küçük harf, rakam ve tire içerebilir.' })
  slug?: string;

  @IsString()
  @Matches(/^\+90\d{10}$/, { message: 'Telefon +90 ile başlamalı ve 10 haneli olmalıdır.' })
  owner_phone: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  owner_name?: string;
}
