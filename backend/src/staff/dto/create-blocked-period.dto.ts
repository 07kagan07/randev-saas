import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBlockedPeriodDto {
  @IsISO8601()
  start_at: string;

  @IsISO8601()
  end_at: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
