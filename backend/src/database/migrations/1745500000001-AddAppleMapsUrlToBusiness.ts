import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAppleMapsUrlToBusiness1745500000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS apple_maps_url TEXT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE businesses DROP COLUMN IF EXISTS apple_maps_url`,
    );
  }
}
