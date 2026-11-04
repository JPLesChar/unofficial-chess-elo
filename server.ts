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

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    const isEnvSet = Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.trim().length > 0);
    res.json({
      status: 'ok',
      hasAdminPasswordConfigured: isEnvSet,
      fallbackPasscode: 'chessadmin123',
      timestamp: new Date().toISOString(),
    });
  });

  // Verify Admin password against ADMIN_PASSWORD, club-specific passcode, or fallback
  app.post('/api/admin/verify', (req, res) => {
    const { password, clubPasscode, clubName } = req.body || {};
    const rawEnvPassword = process.env.ADMIN_PASSWORD || '';
    const configuredPassword = rawEnvPassword.trim().replace(/^["']|["']$/g, '');
    const isEnvSet = configuredPassword.length > 0;
    const defaultFallback = 'chessadmin123';

    if (!password || typeof password !== 'string') {
      console.warn('[Admin Auth Check Failed] Verification rejected: Empty or non-string password received.');
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    const trimmedPassword = password.trim().replace(/^["']|["']$/g, '');

    // 1. Master Fallback check
    const matchesFallback = trimmedPassword === defaultFallback;
    // 2. Global ENV password check
    const matchesEnv = isEnvSet && (trimmedPassword === configuredPassword || trimmedPassword.toLowerCase() === configuredPassword.toLowerCase());
    // 3. Club-specific admin passcode check
    const cleanClubPasscode = typeof clubPasscode === 'string' ? clubPasscode.trim().replace(/^["']|["']$/g, '') : '';
    const matchesClub = cleanClubPasscode.length > 0 && (trimmedPassword === cleanClubPasscode || trimmedPassword.toLowerCase() === cleanClubPasscode.toLowerCase());

    if (matchesFallback || matchesEnv || matchesClub) {
      console.log(`[Admin Auth Success] Admin unlocked successfully. (Auth mode: ${matchesClub ? `Club-specific passcode for ${clubName || 'Club'}` : matchesFallback ? 'Master fallback "chessadmin123"' : 'ADMIN_PASSWORD env variable'})`);
      return res.json({
        success: true,
        isEnvConfigured: isEnvSet,
        authMode: matchesClub ? 'club' : matchesFallback ? 'fallback' : 'env',
      });
    }

    // Detailed error logging on password mismatch so admin can see what went wrong in logs
    console.error(
      `[Admin Auth Failed] Password check failed! ` +
      `Reason: Provided password does not match club admin passcode or master fallback. ` +
      `[Club: ${clubName || 'None'}] ` +
      `[Env Variable ADMIN_PASSWORD set: ${isEnvSet}] ` +
      `[Provided password length: ${trimmedPassword.length}]`
    );

    return res.status(401).json({
      success: false,
      error: 'Invalid Password',
      isEnvConfigured: isEnvSet,
      hint: cleanClubPasscode ? 'Enter this club’s admin passcode or master key: chessadmin123' : 'You can always use the default admin passcode: chessadmin123',
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
