import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1744787058547 implements MigrationInterface {
  name = 'CreateSessionsTable1744787058547';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "sessions"
            (
                "sid" character varying(255) NOT NULL,
                "sess" jsonb NOT NULL,
                "expire" TIMESTAMP WITH TIME ZONE NOT NULL,
                CONSTRAINT "PK_e2d6172ca19b8ebef797c362b05" PRIMARY KEY ("sid")
            )`);
    await queryRunner.query(`CREATE INDEX "IDX_e5d612f5400fecdea71f98ad6c" ON "sessions" ("expire") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_e5d612f5400fecdea71f98ad6c"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
