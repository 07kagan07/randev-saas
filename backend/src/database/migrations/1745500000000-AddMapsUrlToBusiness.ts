import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMapsUrlToBusiness1745500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS maps_url TEXT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE businesses DROP COLUMN IF EXISTS maps_url`,
    );
  }
}
