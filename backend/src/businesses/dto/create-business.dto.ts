import {
  IsString, IsOptional, IsEnum, IsBoolean,
  Length, Matches,
} from 'class-validator';
import { BusinessCategory, ApprovalMode } from '../../database/entities/business.entity';

export class CreateBusinessDto {
  @IsString()
  @Length(2, 255)
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug yalnızca küçük harf, rakam ve tire içerebilir.' })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(BusinessCategory)
  category?: BusinessCategory;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'ISO 3166-1 alpha-2 ülke kodu gerekli (örn. TR, US).' })
  country?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @IsOptional()
  @IsEnum(ApprovalMode)
  approval_mode?: ApprovalMode;
}
