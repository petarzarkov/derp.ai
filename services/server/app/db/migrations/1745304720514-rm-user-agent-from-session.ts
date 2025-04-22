import { MigrationInterface, QueryRunner } from 'typeorm';

export class RmUserAgentFromSession1745304720514 implements MigrationInterface {
  name = 'RmUserAgentFromSession1745304720514';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" DROP COLUMN "userAgent"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sessions" ADD "userAgent" text`);
  }
}
