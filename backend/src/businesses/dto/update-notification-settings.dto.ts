import { IsOptional, IsBoolean, IsIn } from 'class-validator';

const VALID_REMINDER_MINUTES = [60, 120, 180, 1440, 2880];

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsIn(VALID_REMINDER_MINUTES, {
    message: `Hatırlatma süresi şunlardan biri olmalıdır: ${VALID_REMINDER_MINUTES.join(', ')} dakika`,
  })
  reminder_minutes?: number;

  @IsOptional()
  @IsBoolean()
  sms_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsapp_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;
}
