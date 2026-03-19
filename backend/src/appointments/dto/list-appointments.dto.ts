import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '../../database/entities/appointment.entity';

export class ListAppointmentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  per_page?: number = 20;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsOptional()
  @IsString()
  date?: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  from?: string; // YYYY-MM-DD range start

  @IsOptional()
  @IsString()
  to?: string; // YYYY-MM-DD range end

  @IsOptional()
  @IsString()
  businessId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
