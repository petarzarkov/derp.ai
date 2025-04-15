/* eslint-disable max-len */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndAuthProviders1744546248238 implements MigrationInterface {
  name = 'CreateUsersAndAuthProviders1744546248238';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_providers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "provider" character varying(50) NOT NULL, "providerId" text, "passwordHash" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cb277e892a115855fc95c373422" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_aa36cc4a904104f5107c4f2ac2" ON "auth_providers" ("userId", "provider") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a3e973ff73cdfde6157f0dcb0f" ON "auth_providers" ("provider", "providerId") WHERE "providerId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "displayName" character varying, "picture" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
    await queryRunner.query(
      `ALTER TABLE "auth_providers" ADD CONSTRAINT "FK_eb4fd6d0f3ad537effb4cb7505a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_providers" DROP CONSTRAINT "FK_eb4fd6d0f3ad537effb4cb7505a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a3e973ff73cdfde6157f0dcb0f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aa36cc4a904104f5107c4f2ac2"`);
    await queryRunner.query(`DROP TABLE "auth_providers"`);
  }
}
