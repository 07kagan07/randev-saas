import { Controller, Get, Query } from '@nestjs/common';
import { IsString, IsOptional, Matches } from 'class-validator';
import { AvailabilityService } from './availability.service';

class AvailabilityQueryDto {
  @IsString()
  business_id: string;

  @IsString()
  service_id: string;

  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Tarih YYYY-MM-DD formatında olmalıdır.' })
  date: string;
}

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Public endpoint — randevu alma akışı için
  @Get()
  getSlots(@Query() query: AvailabilityQueryDto) {
    return this.availabilityService.getSlots(query);
  }
}
