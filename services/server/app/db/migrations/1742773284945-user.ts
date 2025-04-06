import { MigrationInterface, QueryRunner } from 'typeorm';

export class User1742773284945 implements MigrationInterface {
  name = 'User1742773284945';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user"
      (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" text NOT NULL, "passwordHash" text NOT NULL,
        "jwtToken" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"),
        CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
