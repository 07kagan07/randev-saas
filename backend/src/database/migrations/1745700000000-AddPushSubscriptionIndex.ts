import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptionIndex1745700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_push_subscriptions_user_id" ON "push_subscriptions" ("user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_push_subscriptions_user_id"`);
  }
}
