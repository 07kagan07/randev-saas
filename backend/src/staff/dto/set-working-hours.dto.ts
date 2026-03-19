import { IsBoolean, IsObject, IsOptional, IsString, Matches } from 'class-validator';

class DayScheduleDto {
  @IsBoolean()
  is_open: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Saat HH:MM formatında olmalıdır.' })
  start_time?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Saat HH:MM formatında olmalıdır.' })
  end_time?: string;
}

export class SetWorkingHoursDto {
  // key: 0-6 (0=Pazartesi, 6=Pazar)
  @IsObject()
  schedule: Record<string, DayScheduleDto>;
}
