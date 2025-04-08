try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { config } = require('dotenv');

  config({
    path: [resolve(__dirname, '../../../', '.env')],
    debug: true,
  });
} catch (error) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error importing dotenv', { error: error as Error });
  }
}

import { validateConfig } from '../const';
import { DataSource } from 'typeorm';
import { resolve } from 'node:path';

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
