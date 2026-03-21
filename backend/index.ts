import { buildApp } from './src/app';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './src/modules/booking-engine/db/schema/seats';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DB_URL;

const startServer = async () => {
  const app = buildApp();

  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await app.listen({ port });
    console.log(`Server is running on port ${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

startServer();

if (!connectionString) {
  throw new Error(
    `Database connection string is not defined in environment variables: ${connectionString}`
  );
}

const queryClient = postgres(connectionString, {
  max: 20, // Set the maximum number of connections in the pool
  idle_timeout: 30000, // Set the idle timeout for connections (in milliseconds)
  connect_timeout: 10000, // Set the connection timeout (in milliseconds)
});

export const db = drizzle(queryClient, { schema });

console.log('Database connection established successfully');
