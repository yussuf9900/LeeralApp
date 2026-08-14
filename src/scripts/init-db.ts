import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const initDb = async () => {
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

  console.log('Connecting to the database to initialize schema...');
  const client = new Client({
    connectionString,
    ssl: isRemoteDb
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    console.log('Connection established. Loading init.sql...');
    const candidatePaths = [
      path.join(__dirname, '../../init.sql'),
      path.join(__dirname, '../init.sql'),
      path.join(process.cwd(), 'init.sql'),
    ];
    const sqlPath = candidatePaths.find(p => fs.existsSync(p));
    if (!sqlPath) {
      throw new Error('Schema file init.sql not found in expected locations.');
    }
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    console.log('Executing init.sql...');
    await client.query(sql);
    console.log('Database initialized and seeded successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
};

initDb();
