import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './config/database.module';
import { RedisModule } from './config/redis.module';
import { AuthModule } from './auth/auth.module';
import { BusinessesModule } from './businesses/businesses.module';
import { StaffModule } from './staff/staff.module';
import { ServicesModule } from './services/services.module';
import { AvailabilityModule } from './availability/availability.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { HealthModule } from './health/health.module';
import { BusinessTypesModule } from './business-types/business-types.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // Ortam değişkenleri — global
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,
        limit: 100,
      },
    ]),

    DatabaseModule,
    RedisModule,
    AuthModule,
    BusinessesModule,
    StaffModule,
    ServicesModule,
    AvailabilityModule,
    AppointmentsModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    UploadModule,
    HealthModule,
    BusinessTypesModule,
    EventsModule,
  ],
})
export class AppModule {}
