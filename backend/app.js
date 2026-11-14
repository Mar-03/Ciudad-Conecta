import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { createAuth } from './auth.js';
import { createRepository } from './repository.js';
import { HttpError } from './errors.js';
import { validateReport, validateStatus, CODE_PATTERN } from './validation.js';
import { processPhoto } from './photos.js';
export function createApp(db, config) {
  const app = express(), repository = createRepository(db, config.sessionSecret), auth = createAuth(db, config);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'blob:'], connectSrc: ["'self'"], formAction: ["'self'"], upgradeInsecureRequests: config.production ? [] : null } }, crossOriginEmbedderPolicy: false, strictTransportSecurity: config.production ? undefined : false }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiadas solicitudes. Espera unos minutos.' } }));
  app.use('/api', (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (req.get('X-Requested-With') !== 'CiudadConecta' || (req.get('Origin') && req.get('Origin') !== config.origin)) throw new HttpError(403, 'El origen de la solicitud no está autorizado.');
      if (req.path !== '/reports' && req.method !== 'OPTIONS' && req.get('Content-Length') !== '0' && !req.is('application/json') && req.path !== '/auth/logout') throw new HttpError(415, 'Se requiere contenido JSON.');
    }
    next();
  });
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', async (_req, res) => { await repository.health(); res.json({ ok: true, mode: config.emulator ? 'emulator' : 'cloud' }); });
  app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Demasiados intentos de acceso. Intenta en 15 minutos.' } }), auth.login);
  app.post('/api/auth/logout', auth.logout);
  app.get('/api/auth/session', auth.require, (req, res) => res.json({ username: req.user }));
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1, fields: 7, fieldSize: 10000, parts: 9 } });
  app.post('/api/reports', rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Límite de reportes alcanzado. Intenta más tarde.' } }), upload.single('photo'), async (req, res) => {
    const data = validateReport(req.body || {});
    const photo = await processPhoto(req.file);
    const { report, duplicate } = await repository.create(data, photo, req.get('Idempotency-Key'));
    res.status(duplicate ? 200 : 201).json({ report: { code: report.code, status: report.status, createdAt: report.createdAt } });
  });
  app.param('code', (req, _res, next, code) => {
    if (!CODE_PATTERN.test(code)) throw new HttpError(400, 'El folio no tiene el formato correcto.');
    next();
  });
  app.get('/api/reports/:code/status', async (req, res) => {
    const report = await repository.get(req.params.code);
    const { code, status, category, createdAt, updatedAt } = report;
    res.json({ report: { code, status, category, createdAt, updatedAt } });
  });
  app.use('/api/admin', auth.require);
  app.get('/api/admin/stats', async (_req, res) => res.json(await repository.stats()));
  app.get('/api/admin/reports', async (req, res) => res.json(await repository.list(req.query.cursor)));
  app.get('/api/admin/reports/:code', async (req, res) => res.json({ report: await repository.get(req.params.code) }));
  app.get('/api/admin/reports/:code/photo', async (req, res) => {
    const photo = await repository.photo(req.params.code);
    res.type('image/jpeg').set('Content-Disposition', 'inline; filename="evidencia.jpg"').send(Buffer.from(photo.bytes));
  });
  app.patch('/api/admin/reports/:code', async (req, res) => res.json({ report: await repository.update(req.params.code, validateStatus(req.body || {})) }));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'La ruta solicitada no existe.')));
  app.use(express.static(fileURLToPath(new URL('../frontend', import.meta.url)), { dotfiles: 'deny', index: 'index.html' }));
  app.use((_req, res) => res.status(404).type('text').send('Página no encontrada.'));
  app.use((error, _req, res, _next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    if (error instanceof multer.MulterError) return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'La fotografía supera el límite de 20 MB.' : 'Adjunta una sola fotografía y revisa los campos del formulario.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo JSON no es válido.' });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
    // Sin textos del usuario, contraseñas ni detalles del SDK en la respuesta pública.
    console.error('Error de servicio:', error.code || error.name || 'UNKNOWN');
    return res.status(503).json({ error: 'No se pudo completar la operación con Firebase. Intenta nuevamente en unos momentos.' });
  });
  return app;
}
