import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessesController } from './businesses.controller';
import { BusinessesService } from './businesses.service';
import { PlanLimitService } from './plan-limit.service';
import { Business } from '../database/entities/business.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { User } from '../database/entities/user.entity';
import { Service } from '../database/entities/service.entity';
import { SupportTicket } from '../database/entities/support-ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Business, Appointment, NotificationSettings, User, Service, SupportTicket]),
  ],
  controllers: [BusinessesController],
  providers: [BusinessesService, PlanLimitService],
  exports: [BusinessesService, PlanLimitService],
})
export class BusinessesModule {}
