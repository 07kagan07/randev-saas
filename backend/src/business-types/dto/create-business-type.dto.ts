import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class BookingFormFieldDto {
  @IsString() key: string;
  @IsString() label: string;
  @IsIn(['text', 'tel', 'number', 'select', 'textarea']) type: string;
  @IsBoolean() required: boolean;
  @IsOptional() @IsString() placeholder?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
}

export class TemplateServiceDto {
  @IsString() name: string;
  @IsNumber() duration_minutes: number;
  @IsNumber() price: number;
  @IsOptional() @IsString() category?: string;
}

export class CreateBusinessTypeDto {
  @IsString() name: string;
  @IsOptional() @IsString() icon?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateServiceDto) template_services?: TemplateServiceDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BookingFormFieldDto) booking_form_fields?: BookingFormFieldDto[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsNumber() sort_order?: number;
}
