import { configDotenv } from 'dotenv';

import { validateConfig } from '../const';
import { DataSource } from 'typeorm';
import { resolve } from 'node:path';

configDotenv({
  path: [resolve(__dirname, '../../../../', '.env')],
  debug: true,
});

const { db } = validateConfig(process.env);

export default new DataSource({
  type: 'postgres',
  host: db.host,
  port: db.port,
  username: db.username,
  password: db.password,
  database: db.name,
  entities: [resolve(__dirname, './entities/**/*.entity{.ts,.js}')],
  migrations: [resolve(__dirname, './migrations/**/*{.ts,.js}')],
  migrationsRun: true,
});
