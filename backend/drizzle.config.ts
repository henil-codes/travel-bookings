import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DB_URL;

if (!connectionString) {
  throw new Error(
    'Database connection string is not defined in environment variables'
  );
}

export default defineConfig({
  schema: './src/modules/booking-engine/db/schema',
  out: './src/modules/booking-engine/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: connectionString,
  },
  verbose: true,
  strict: true,
});
