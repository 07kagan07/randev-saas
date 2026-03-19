import { IsString, Length } from 'class-validator';

export class RejectAppointmentDto {
  @IsString()
  @Length(3, 500, { message: 'Red sebebi en az 3 karakter olmalıdır.' })
  reason: string;
}
