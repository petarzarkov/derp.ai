import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateSessionsTable1745221786185 implements MigrationInterface {
  name = 'UpdateSessionsTable1745221786185';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "sess"`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "userId" uuid`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "ipAddress" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "userAgent" text`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "device" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "browser" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "lastActivity" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`CREATE INDEX "IDX_57de40bc620f456c7311aa3a1e" ON "sessions" ("userId") `);
    await queryRunner.query(
      `ALTER TABLE "sessions"
            ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_57de40bc620f456c7311aa3a1e"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "lastActivity"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "browser"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "device"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "userAgent"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "ipAddress"`);
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "sessions" ADD "sess" jsonb NOT NULL`);
  }
}
