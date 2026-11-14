import { randomBytes, scryptSync } from 'node:crypto';

export function getConfig(env = process.env) {
  const render = env.RENDER === 'true';
  const production = env.NODE_ENV === 'production' || render;
  const emulator = Boolean(env.FIRESTORE_EMULATOR_HOST);
  if (!env.FIREBASE_PROJECT_ID) throw new Error('Configura FIREBASE_PROJECT_ID. Ejecuta npm run setup.');
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('Configura SESSION_SECRET con al menos 32 caracteres.');
  let passwordHash = env.ADMIN_PASSWORD_HASH;
  if (!passwordHash && env.ADMIN_PASSWORD) {
    if (env.ADMIN_PASSWORD.length < 12 || env.ADMIN_PASSWORD.length > 200) throw new Error('ADMIN_PASSWORD debe tener entre 12 y 200 caracteres.');
    const salt = randomBytes(16).toString('hex');
    passwordHash = `${salt}:${scryptSync(env.ADMIN_PASSWORD, salt, 64).toString('hex')}`;
  }
  if (!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash || '')) throw new Error('Configura ADMIN_PASSWORD o un ADMIN_PASSWORD_HASH válido.');
  if (production && emulator) throw new Error('Producción no permite el emulador.');
  const configuredOrigin = env.APP_ORIGIN || env.RENDER_EXTERNAL_URL || (production ? '' : 'http://127.0.0.1:3000');
  let origin;
  try {
    const url = new URL(configuredOrigin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    origin = url.origin;
  } catch { throw new Error('Configura APP_ORIGIN con la URL pública del sitio, sin rutas. En Render se detecta automáticamente.'); }
  if (production && !origin.startsWith('https://')) throw new Error('Producción requiere APP_ORIGIN con HTTPS.');
  if (!emulator && env.FIREBASE_PROJECT_ID.startsWith('demo-')) throw new Error('Los proyectos demo requieren el emulador.');
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un puerto válido.');
  return { production, emulator, origin, projectId: env.FIREBASE_PROJECT_ID, adminUser: env.ADMIN_USER || 'municipal', passwordHash, sessionSecret: env.SESSION_SECRET, host: env.HOST || (production ? '0.0.0.0' : '127.0.0.1'), port, trustProxy: render ? 1 : false };
}
