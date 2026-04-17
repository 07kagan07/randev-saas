import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessTypes1710000000001 implements MigrationInterface {
  name = 'BusinessTypes1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── BUSINESS_TYPES ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "business_types" (
        "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"                VARCHAR(100) NOT NULL,
        "icon"                VARCHAR(10),
        "template_services"   TEXT NOT NULL DEFAULT '[]',
        "booking_form_fields" TEXT NOT NULL DEFAULT '[]',
        "is_active"           BOOLEAN NOT NULL DEFAULT true,
        "sort_order"          INTEGER NOT NULL DEFAULT 0,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // İşletmelere business_type_id FK ekle
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN IF NOT EXISTS "business_type_id" UUID REFERENCES business_types(id) ON DELETE SET NULL
    `);

    // Randevulara extra_fields ekle (dinamik form verileri)
    await queryRunner.query(`
      ALTER TABLE "appointments"
        ADD COLUMN IF NOT EXISTS "extra_fields" TEXT NOT NULL DEFAULT '{}'
    `);

    // businesses tablosuna category_order eksikse ekle (önceki migration'da eksik kalabilir)
    await queryRunner.query(`
      ALTER TABLE "businesses"
        ADD COLUMN IF NOT EXISTS "category_order" TEXT NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN IF EXISTS "extra_fields"`);
    await queryRunner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "business_type_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "business_types"`);
  }
}
