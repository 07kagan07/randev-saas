import { IsString, IsUUID, IsISO8601, Length, Matches, IsOptional, IsObject } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  business_id: string;

  @IsOptional()
  @IsUUID()
  staff_id?: string;

  @IsUUID()
  service_id: string;

  @IsString()
  @Length(2, 255, { message: 'Ad soyad en az 2 karakter olmalıdır.' })
  customer_name: string;

  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Lütfen geçerli bir telefon numarası girin.' })
  customer_phone: string;

  @IsISO8601()
  start_at: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  extra_fields?: Record<string, string>;
}
