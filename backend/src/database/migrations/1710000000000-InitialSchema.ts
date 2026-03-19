import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1710000000000 implements MigrationInterface {
  name = 'InitialSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── BUSINESSES ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "name"                 VARCHAR(255)  NOT NULL,
        "slug"                 VARCHAR(100)  UNIQUE NOT NULL,
        "description"          TEXT,
        "phone"                VARCHAR(20),
        "address"              TEXT,
        "category"             VARCHAR(50),
        "logo_url"             TEXT,
        "cover_url"            TEXT,
        "is_active"            BOOLEAN       NOT NULL DEFAULT true,
        "subscription_plan"    VARCHAR(20)   NOT NULL DEFAULT 'free',
        "subscription_ends_at" TIMESTAMPTZ,
        "timezone"             VARCHAR(60)   NOT NULL DEFAULT 'Europe/Istanbul',
        "approval_mode"        VARCHAR(20)   NOT NULL DEFAULT 'auto_approve',
        "created_at"           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    // ─── USERS ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" UUID REFERENCES businesses(id) ON DELETE CASCADE,
        "full_name"   VARCHAR(255),
        "phone"       VARCHAR(20) UNIQUE NOT NULL,
        "role"        VARCHAR(20) NOT NULL,
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        "avatar_url"  TEXT,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── SERVICES ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "services" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        "name"             VARCHAR(255) NOT NULL,
        "category"         VARCHAR(100),
        "duration_minutes" INTEGER NOT NULL,
        "price"            DECIMAL(10,2),
        "currency"         VARCHAR(3) NOT NULL DEFAULT 'TRY',
        "show_price"       BOOLEAN NOT NULL DEFAULT true,
        "is_active"        BOOLEAN NOT NULL DEFAULT true,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── STAFF_SERVICES (M2M) ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "staff_services" (
        "staff_id"   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "service_id" UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        PRIMARY KEY ("staff_id", "service_id")
      )
    `);

    // ─── WORKING_HOURS ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "working_hours" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "staff_id"    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "day_of_week" SMALLINT NOT NULL,
        "is_open"     BOOLEAN NOT NULL DEFAULT true,
        "start_time"  TIME,
        "end_time"    TIME,
        UNIQUE ("staff_id", "day_of_week")
      )
    `);

    // ─── BLOCKED_PERIODS ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "blocked_periods" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "staff_id"    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "business_id" UUID NOT NULL REFERENCES businesses(id),
        "start_at"    TIMESTAMPTZ NOT NULL,
        "end_at"      TIMESTAMPTZ NOT NULL,
        "reason"      TEXT,
        "created_by"  UUID REFERENCES users(id),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── APPOINTMENTS ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "appointments" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"             UUID NOT NULL REFERENCES businesses(id),
        "staff_id"                UUID NOT NULL REFERENCES users(id),
        "service_id"              UUID NOT NULL REFERENCES services(id),
        "customer_name"           VARCHAR(255) NOT NULL,
        "customer_phone"          VARCHAR(20) NOT NULL,
        "start_at"                TIMESTAMPTZ NOT NULL,
        "end_at"                  TIMESTAMPTZ NOT NULL,
        "status"                  VARCHAR(20) NOT NULL DEFAULT 'pending',
        "rejection_reason"        TEXT,
        "action_token"            UUID UNIQUE,
        "action_token_used"       BOOLEAN NOT NULL DEFAULT false,
        "action_token_expires_at" TIMESTAMPTZ,
        "notes"                   TEXT,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── APPOINTMENT_LOGS ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "appointment_logs" (
        "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "appointment_id" UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        "changed_by"     UUID REFERENCES users(id),
        "from_status"    VARCHAR(20),
        "to_status"      VARCHAR(20) NOT NULL,
        "note"           TEXT,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── NOTIFICATION_SETTINGS ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "notification_settings" (
        "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"      UUID UNIQUE NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        "reminder_minutes" INTEGER NOT NULL DEFAULT 60,
        "sms_enabled"      BOOLEAN NOT NULL DEFAULT true,
        "whatsapp_enabled" BOOLEAN NOT NULL DEFAULT true,
        "push_enabled"     BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // ─── SUPPORT_TICKETS ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "support_tickets" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id" UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        "subject"     VARCHAR(255),
        "message"     TEXT,
        "status"      VARCHAR(20) NOT NULL DEFAULT 'open',
        "admin_note"  TEXT,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── PUSH_SUBSCRIPTIONS ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "push_subscriptions" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id"     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "endpoint"    TEXT NOT NULL,
        "keys_auth"   TEXT NOT NULL,
        "keys_p256dh" TEXT NOT NULL,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── INDEXLER ─────────────────────────────────────────────────────────────

    // Randevu sorguları
    await queryRunner.query(`CREATE INDEX idx_appointments_business_status ON appointments(business_id, status)`);
    await queryRunner.query(`CREATE INDEX idx_appointments_staff_start     ON appointments(staff_id, start_at)`);
    await queryRunner.query(`CREATE INDEX idx_appointments_business_start  ON appointments(business_id, start_at)`);
    await queryRunner.query(`CREATE INDEX idx_appointments_action_token    ON appointments(action_token) WHERE action_token IS NOT NULL`);
    await queryRunner.query(`CREATE INDEX idx_appointments_customer_phone  ON appointments(customer_phone)`);

    // Concurrency — aktif randevular için unique constraint
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_appointments_staff_start_unique
        ON appointments(staff_id, start_at)
        WHERE status NOT IN ('cancelled', 'rejected')
    `);

    // Takvim & müsaitlik
    await queryRunner.query(`CREATE INDEX idx_blocked_periods_staff_range ON blocked_periods(staff_id, start_at, end_at)`);
    await queryRunner.query(`CREATE INDEX idx_working_hours_staff         ON working_hours(staff_id)`);

    // İşletme ve kullanıcı
    await queryRunner.query(`CREATE INDEX idx_businesses_slug         ON businesses(slug)`);
    await queryRunner.query(`CREATE INDEX idx_businesses_category     ON businesses(category)`);
    await queryRunner.query(`CREATE INDEX idx_users_business_role     ON users(business_id, role)`);

    // Log
    await queryRunner.query(`CREATE INDEX idx_appointment_logs_appointment ON appointment_logs(appointment_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointment_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "blocked_periods"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "working_hours"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "businesses"`);
  }
}
