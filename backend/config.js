export function getConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const emulator = Boolean(env.FIRESTORE_EMULATOR_HOST);
  if (!env.FIREBASE_PROJECT_ID) throw new Error('Configura FIREBASE_PROJECT_ID. Ejecuta npm run setup.');
  if (!env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error('Faltan credenciales seguras. Ejecuta npm run setup.');
  if (production && emulator) throw new Error('Producción no permite el emulador.');
  const origin = env.APP_ORIGIN || 'http://127.0.0.1:3000';
  if (production && !origin.startsWith('https://')) throw new Error('Producción requiere APP_ORIGIN con HTTPS.');
  if (!emulator && env.FIREBASE_PROJECT_ID.startsWith('demo-')) throw new Error('Los proyectos demo requieren el emulador.');
  return { production, emulator, origin, projectId: env.FIREBASE_PROJECT_ID, adminUser: env.ADMIN_USER || 'municipal', passwordHash: env.ADMIN_PASSWORD_HASH, sessionSecret: env.SESSION_SECRET, host: env.HOST || '127.0.0.1', port: Number(env.PORT || 3000) };
}
