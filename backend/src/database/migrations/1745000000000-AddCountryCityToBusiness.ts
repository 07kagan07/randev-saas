import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryCityToBusiness1745000000000 implements MigrationInterface {
  name = 'AddCountryCityToBusiness1745000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN IF NOT EXISTS "country" VARCHAR(2),
        ADD COLUMN IF NOT EXISTS "city"    VARCHAR(100)
    `);

    // Mevcut kayıtlarda timezone Europe/Istanbul olduğu için TR varsayımı güvenli
    await queryRunner.query(`
      UPDATE "businesses"
        SET "country" = 'TR'
        WHERE "country" IS NULL AND "timezone" = 'Europe/Istanbul'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "businesses"
        DROP COLUMN IF EXISTS "country",
        DROP COLUMN IF EXISTS "city"
    `);
  }
}
