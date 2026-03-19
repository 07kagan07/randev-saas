import {
  IsString, IsOptional, IsArray, IsUUID, Length, Matches,
} from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @Length(2, 255)
  full_name: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Geçerli bir telefon numarası girin.' })
  phone: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  service_ids?: string[];
}
