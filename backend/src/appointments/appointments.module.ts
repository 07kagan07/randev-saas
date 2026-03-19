import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { Appointment } from '../database/entities/appointment.entity';
import { AppointmentLog } from '../database/entities/appointment-log.entity';
import { Business } from '../database/entities/business.entity';
import { Service } from '../database/entities/service.entity';
import { User } from '../database/entities/user.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { BusinessesModule } from '../businesses/businesses.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment, AppointmentLog, Business, Service, User, NotificationSettings,
    ]),
    BusinessesModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
