import {
  IsString, IsOptional, IsNumber, IsBoolean,
  IsArray, IsUUID, Min, Length,
} from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @Length(2, 255)
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(5)
  duration_minutes: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  show_price?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  staff_ids?: string[];
}
