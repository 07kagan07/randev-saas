import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { WorkingHours } from '../database/entities/working-hours.entity';
import { BlockedPeriod } from '../database/entities/blocked-period.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { Business } from '../database/entities/business.entity';
import { Service } from '../database/entities/service.entity';
import { User } from '../database/entities/user.entity';
import { StaffService as StaffServiceEntity } from '../database/entities/staff-service.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkingHours, BlockedPeriod, Appointment, Business, Service, User, StaffServiceEntity,
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
