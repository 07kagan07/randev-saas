import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Appointment } from '../database/entities/appointment.entity';
import { User } from '../database/entities/user.entity';
import { Service } from '../database/entities/service.entity';
import { Business } from '../database/entities/business.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, User, Service, Business])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
