import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint with admin password status
  app.get('/api/health', (_req, res) => {
    const isEnvSet = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0);
    res.json({
      status: 'ok',
      hasAdminPasswordConfigured: isEnvSet,
      fallbackPasscode: 'chessadmin123',
      timestamp: new Date().toISOString(),
    });
  });

  // Verify Admin password against ADMIN_PASSWORD or fallback passcode
  app.post('/api/admin/verify', (req, res) => {
    const { password } = req.body || {};
    const rawEnvPassword = process.env.ADMIN_PASSWORD || '';
    const configuredPassword = rawEnvPassword.trim().replace(/^["']|["']$/g, '');
    const isEnvSet = configuredPassword.length > 0;
    const defaultFallback = 'chessadmin123';

    if (!password || typeof password !== 'string') {
      console.warn('[Admin Auth Check Failed] Verification rejected: Empty or non-string password received.');
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const trimmedPassword = password.trim().replace(/^["']|["']$/g, '');

    // 1. Fallback passcode check
    const matchesFallback = trimmedPassword === defaultFallback;
    // 2. Global ENV password check
    const matchesEnv = isEnvSet && (trimmedPassword === configuredPassword || trimmedPassword.toLowerCase() === configuredPassword.toLowerCase());

    if (matchesFallback || matchesEnv) {
      console.log(`[Admin Auth Success] Admin mode unlocked. (Auth source: ${matchesFallback ? 'Fallback passcode "chessadmin123"' : 'ADMIN_PASSWORD environment variable'})`);
      return res.json({
        success: true,
        isEnvConfigured: isEnvSet,
        authMode: matchesFallback ? 'fallback' : 'env',
      });
    }

    // Detailed error logging on password mismatch so admin can see what went wrong
    console.error(
      `[Admin Auth Failed] Password check failed! ` +
      `Reason: Provided password does not match expected admin passcode. ` +
      `[Env Variable ADMIN_PASSWORD set: ${isEnvSet}] ` +
      `[Provided password length: ${trimmedPassword.length}]`
    );

    return res.status(401).json({
      success: false,
      error: 'Invalid Password',
      isEnvConfigured: isEnvSet,
      hint: isEnvSet ? 'ADMIN_PASSWORD is set in environment, or use the fallback passcode: chessadmin123' : 'Use default passcode: chessadmin123',
    });
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
