import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from '../database/entities/service.entity';
import { StaffService as StaffServiceEntity } from '../database/entities/staff-service.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, StaffServiceEntity, Appointment]),
    BusinessesModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
