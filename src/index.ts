import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import apiRouter from './routes';
import { testConnection, initializeDatabaseSchema, default as pool } from './config/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for reverse proxies (Render, Nginx, Cloudflare)
app.set('trust proxy', 1);

// HTTP Security Headers (Helmet) with modern CSP policy
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'https:', 'http:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Secure CORS configuration with dynamic origin verification
const isOriginAllowed = (origin: string | undefined, reqHost?: string): boolean => {
  if (!origin) return true;
  if (process.env.NODE_ENV !== 'production') return true;

  try {
    const originUrl = new URL(origin);

    // Allow same host (e.g. monolith serving frontend & API)
    if (reqHost) {
      const hostWithoutPort = reqHost.split(':')[0];
      if (originUrl.hostname === hostWithoutPort) return true;
    }

    // Allow localhost & local network for local testing/dev
    if (originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') return true;

    // Allow Render deployments (*.onrender.com)
    if (originUrl.hostname.endsWith('.onrender.com')) return true;

    // Allow official production and staging domains
    if (originUrl.hostname === 'leeral.sn' || originUrl.hostname.endsWith('.leeral.sn')) return true;
  } catch {
    // If URL parsing fails, continue to explicit allowed check
  }

  const configuredOrigins = [
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : []),
    process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, ''),
    process.env.SERVER_URL?.replace(/\/$/, ''),
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean) as string[];

  return configuredOrigins.some((allowed) => {
    try {
      return new URL(allowed).origin === new URL(origin).origin;
    } catch {
      return allowed === origin;
    }
  });
};

app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    const host = req.get('host');
    const allowed = isOriginAllowed(origin, host);
    callback(null, {
      origin: allowed ? (origin || true) : false,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    });
  })
);

app.use(express.json());

// Rate limiting on Auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 requêtes par fenêtre
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Trop de requêtes d\'authentification. Veuillez patienter 15 minutes.' },
});

app.use('/api/v1/auth', authLimiter);

// Health check endpoint (pings Postgres/Supabase to prevent auto-pause)
app.get('/health', async (req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - start;
  } catch (err: any) {
    dbStatus = 'unhealthy';
    console.error('[HealthCheck] DB query failed:', err.message);
  }

  const isHealthy = dbStatus === 'healthy';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DEGRADED',
    database: {
      status: dbStatus,
      latency_ms: dbLatencyMs,
    },
    service: 'Sama Facture - Leeral',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
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
