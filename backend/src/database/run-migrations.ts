import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { Business } from './entities/business.entity';
import { User } from './entities/user.entity';
import { Service } from './entities/service.entity';
import { StaffService } from './entities/staff-service.entity';
import { WorkingHours } from './entities/working-hours.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { Appointment } from './entities/appointment.entity';
import { AppointmentLog } from './entities/appointment-log.entity';
import { NotificationSettings } from './entities/notification-settings.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { BusinessType } from './entities/business-type.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    Business, User, Service, StaffService, WorkingHours,
    BlockedPeriod, Appointment, AppointmentLog,
    NotificationSettings, SupportTicket, PushSubscription, BusinessType,
  ],
  migrations: [__dirname + '/migrations/*.js'],
  synchronize: false,
  logging: true,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

dataSource.initialize()
  .then(() => dataSource.runMigrations({ transaction: 'all' }))
  .then((migrations) => {
    console.log(`✅ ${migrations.length} migration çalıştırıldı.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Migration hatası:', err);
    process.exit(1);
  });
