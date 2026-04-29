// E2E Global Setup â€” Load .env before Prisma / NestJS bootstrap
// Note: globalSetup runs in a separate process; variables set here are not
// available in test workers. Use the --env-file flag in the npm script instead.
// This file is kept as a safety net and documentation marker.
const path = require('path');
const fs = require('fs');

module.exports = async function () {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    const vars = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      vars[key] = val;
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }

    // For Prisma binary engine: use DIRECT_URL (PostgreSQL direct connection)
    // instead of the connection pooler (port 6543) which is incompatible with
    // Prisma binary engine in test processes.
    // if (vars['DIRECT_URL'] && !process.env['DATABASE_URL']?.includes('direct')) {
    //   process.env['DATABASE_URL'] = vars['DIRECT_URL'];
    //   console.log('[E2E Setup] Using DIRECT_URL for Prisma (bypasses connection pooler)');
    // }

    console.log('[E2E Setup] .env loaded from', envPath);
  } else {
    console.warn('[E2E Setup] No .env file found at', envPath);
  }
};
