import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShowPricesToBusiness1745600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS show_prices boolean NOT NULL DEFAULT false`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE businesses DROP COLUMN IF EXISTS show_prices`,
    );
  }
}
