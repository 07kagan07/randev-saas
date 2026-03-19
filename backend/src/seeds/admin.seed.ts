import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User, UserRole } from '../database/entities/user.entity';

dotenv.config();

async function seedAdmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/database/entities/*.entity.ts'],
    synchronize: false,
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
}

seedAdmin().catch(console.error);
