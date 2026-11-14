import { existsSync } from 'node:fs';

// Render inyecta las variables; nunca carga configuraciones locales en producción.
if (process.env.NODE_ENV !== 'production' && process.env.RENDER !== 'true' && existsSync('.env')) {
  process.loadEnvFile('.env');
}
await import('../backend/server.js');
