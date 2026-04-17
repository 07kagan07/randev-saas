import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlotInterval1710000000002 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS slot_interval_minutes INTEGER NOT NULL DEFAULT 30
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE businesses DROP COLUMN IF EXISTS slot_interval_minutes`);
  }
}
