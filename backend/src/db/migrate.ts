import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import 'dotenv/config';

const connectionString = process.env.DB_URL;

const runMigrations = async () => {
  if (!connectionString) {
    throw new Error(
      'Database connection string is not defined in environment variables'
    );
  }

  console.log('Starting database migrations...');

  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await migrate(db, {
      migrationsFolder: './src/modules/booking-engine/db/migrations',
    });
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Error running database migrations:', error);
  } finally {
    await migrationClient.end();
  }
};

runMigrations();
