import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const patchDb = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in the environment.');
    process.exit(1);
  }

  const isRemoteDb = process.env.DATABASE_SSL !== undefined
    ? process.env.DATABASE_SSL === 'true'
    : Boolean(
        connectionString &&
          !connectionString.includes('localhost') &&
          !connectionString.includes('127.0.0.1') &&
          !connectionString.includes('postgres:5432') &&
          !connectionString.includes('@db:') &&
          !connectionString.includes('@postgres:') &&
          !connectionString.includes('db:5432')
      );

  console.log('Connecting to the database to apply patch...');
  const client = new Client({
    connectionString,
    ssl: isRemoteDb
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    console.log('Connection established. Applying patch to add budget_mensuel column...');
    
    const query = 'ALTER TABLE utilisateurs ADD COLUMN IF NOT EXISTS budget_mensuel NUMERIC(15,2) NOT NULL DEFAULT 0.00;';
    await client.query(query);
    
    console.log('Database patched successfully!');
  } catch (error) {
    console.error('Error during database patching:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

patchDb();
