import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const isRemoteDb = process.env.DATABASE_SSL !== undefined
  ? process.env.DATABASE_SSL === 'true'
  : Boolean(
      process.env.DATABASE_URL &&
        !process.env.DATABASE_URL.includes('localhost') &&
        !process.env.DATABASE_URL.includes('127.0.0.1') &&
        !process.env.DATABASE_URL.includes('postgres:5432') &&
        !process.env.DATABASE_URL.includes('@db:') &&
        !process.env.DATABASE_URL.includes('@postgres:') &&
        !process.env.DATABASE_URL.includes('db:5432')
    );

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: isRemoteDb
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
    
    const candidatePaths = [
      path.join(__dirname, '../../init.sql'),
      path.join(__dirname, '../init.sql'),
      path.join(process.cwd(), 'init.sql'),
    ];
    const sqlPath = candidatePaths.find(p => fs.existsSync(p));
    if (!sqlPath) {
      console.warn('Schema file init.sql not found in expected locations. Skipping auto-migration.');
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
