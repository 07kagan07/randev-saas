import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// TypeORM CLI için kullanılan DataSource (migration:generate, migration:run)
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/database/entities/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
