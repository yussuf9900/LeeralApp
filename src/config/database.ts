import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('dpg-')
    ? { rejectUnauthorized: false }
    : undefined,
});

// Simple helper to test connection on startup
export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    console.error('Database connection test failed:', err);
    return false;
  }
};

// Automatically initialize database schema and seed data on startup
export const initializeDatabaseSchema = async (): Promise<boolean> => {
  let client;
  try {
    client = await pool.connect();
    console.log('Database connected. Starting schema initialization/migration...');
    
    const sqlPath = path.join(__dirname, '../../init.sql');
    if (!fs.existsSync(sqlPath)) {
      console.warn(`Schema file not found at: ${sqlPath}. Skipping auto-migration.`);
      return false;
    }
    
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await client.query(sql);
    console.log('Database schema successfully initialized/migrated.');
    return true;
  } catch (err) {
    console.error('Error during database schema initialization:', err);
    return false;
  } finally {
    if (client) client.release();
  }
};

export default pool;
