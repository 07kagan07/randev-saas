import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

enum AppointmentAction {
  CANCEL = 'cancel',
  RESCHEDULE = 'reschedule',
}

export class AppointmentActionDto {
  @IsString()
  token: string;

  @IsEnum(AppointmentAction)
  action: AppointmentAction;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  reschedule_date?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  reschedule_time?: string;
}
