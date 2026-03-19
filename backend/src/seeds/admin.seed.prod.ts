import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User, UserRole } from '../database/entities/user.entity';
import { Business } from '../database/entities/business.entity';
import { Service } from '../database/entities/service.entity';
import { StaffService } from '../database/entities/staff-service.entity';
import { WorkingHours } from '../database/entities/working-hours.entity';
import { BlockedPeriod } from '../database/entities/blocked-period.entity';
import { Appointment } from '../database/entities/appointment.entity';
import { AppointmentLog } from '../database/entities/appointment-log.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { SupportTicket } from '../database/entities/support-ticket.entity';
import { PushSubscription } from '../database/entities/push-subscription.entity';

dotenv.config();

async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      Business, User, Service, StaffService, WorkingHours,
      BlockedPeriod, Appointment, AppointmentLog,
      NotificationSettings, SupportTicket, PushSubscription,
    ],
    synchronize: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  await dataSource.initialize();
  const userRepo = dataSource.getRepository(User);

  const phone = process.env.SUPER_ADMIN_PHONE || '+905550000000';
  const existing = await userRepo.findOne({ where: { phone } });

  if (existing) {
    console.log(`Super admin zaten mevcut: ${phone}`);
  } else {
    const admin = userRepo.create({
      phone,
      full_name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      is_active: true,
      business_id: null,
    });
    await userRepo.save(admin);
    console.log(`✅ Super admin oluşturuldu: ${phone}`);
  }

  await dataSource.destroy();
  process.exit(0);
}

seedAdmin().catch((err) => { console.error('❌ Seed hatası:', err); process.exit(1); });
