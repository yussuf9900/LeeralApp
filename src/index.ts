import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes';
import { testConnection, initializeDatabaseSchema } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Inline CORS configuration
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'UP', 
    service: 'Sama Facture - Leeral',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime())
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// Serve static frontend files if compiled
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get(/.*/, (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
  console.log(`Serving frontend static files from ${frontendDistPath}`);
} else {
  console.log('Frontend static files not found, API only mode active.');
}

// Start server and test connection
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  const dbConnected = await testConnection();
  if (dbConnected) {
    console.log('Database connected successfully.');
    await initializeDatabaseSchema();
  } else {
    console.error('Database connection failed.');
  }

  // Self-Ping / Keep-Alive Mechanism for Render Free Tier (every 14 minutes)
  const serverUrl = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL;
  if (serverUrl) {
    const pingIntervalMs = 14 * 60 * 1000;
    setInterval(async () => {
      try {
        const healthUrl = `${serverUrl.replace(/\/$/, '')}/health`;
        console.log(`[Keep-Alive] Sending ping to ${healthUrl}...`);
        await fetch(healthUrl);
      } catch (err: any) {
        console.warn(`[Keep-Alive] Ping warning: ${err.message}`);
      }
    }, pingIntervalMs);
    console.log(`[Keep-Alive] Self-ping active for ${serverUrl} (Interval: 14 min)`);
  }
});
