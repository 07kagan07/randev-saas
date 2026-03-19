import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, IsBoolean, IsInt, IsArray, IsNumber } from 'class-validator';
import { CreateBusinessDto } from './create-business.dto';

export class UpdateBusinessDto extends PartialType(CreateBusinessDto) {
  @IsOptional()
  @IsString()
  logo_url?: string;

  @IsOptional()
  @IsString()
  cover_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;

  @IsOptional()
  @IsInt()
  onboarding_step?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  onboarding_skipped_steps?: number[];
}
