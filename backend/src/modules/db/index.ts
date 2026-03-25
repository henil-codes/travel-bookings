import postgres from 'postgres';
import * as schema from './schema/seats';
import { drizzle } from 'drizzle-orm/postgres-js';

const connectionString = process.env.DB_URL;

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