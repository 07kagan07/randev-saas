import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Business } from '../database/entities/business.entity';
import { User } from '../database/entities/user.entity';
import { Service } from '../database/entities/service.entity';
import { StaffService } from '../database/entities/staff-service.entity';
import { WorkingHours } from '../database/entities/working-hours.entity';
import { BlockedPeriod } from '../database/entities/blocked-period.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { AppointmentLog } from '../database/entities/appointment-log.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { SupportTicket } from '../database/entities/support-ticket.entity';
import { PushSubscription } from '../database/entities/push-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [
          Business,
          User,
          Service,
          StaffService,
          WorkingHours,
          BlockedPeriod,
          Appointment,
          AppointmentLog,
          NotificationSettings,
          SupportTicket,
          PushSubscription,
        ],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
        ssl: config.get('NODE_ENV') === 'production'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
