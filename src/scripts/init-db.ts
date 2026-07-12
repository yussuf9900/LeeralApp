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

  console.log('Connecting to the database to initialize schema...');
  const client = new Client({
    connectionString,
    ssl: connectionString.includes('render.com') || connectionString.includes('dpg-')
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.connect();
    console.log('Connection established. Loading init.sql...');
    const sqlPath = path.join(__dirname, '../../init.sql');
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
