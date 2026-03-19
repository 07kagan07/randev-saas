import { IsOptional, IsString, IsBoolean, IsArray, IsUUID, Length } from 'class-validator';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @Length(2, 255)
  full_name?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  service_ids?: string[];
}
