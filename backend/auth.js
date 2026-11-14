import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from './errors.js';
const derive = promisify(scrypt);
const COOKIE = 'cc_session';
export async function verifyPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  if (!salt || !/^[a-f0-9]{128}$/.test(expected || '') || typeof password !== 'string' || password.length > 200) return false;
  const actual = await derive(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex'));
}
export function createAuth(db, config) {
  const sessions = db.collection('sessions');
  const options = { httpOnly: true, sameSite: 'strict', secure: config.production, path: '/' };
  const token = req => (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  const reference = value => sessions.doc(createHmac('sha256', config.sessionSecret).update(value).digest('hex'));
  return {
    async login(req, res) {
      const { username, password } = req.body || {};
      const valid = await verifyPassword(password, config.passwordHash);
      if (!valid || username !== config.adminUser) throw new HttpError(401, 'Usuario o contraseña incorrectos.');
      const old = token(req);
      if (old && /^[A-Za-z0-9_-]{43}$/.test(old)) await reference(old).delete();
      const value = randomBytes(32).toString('base64url');
      const maxAge = 8 * 60 * 60 * 1000;
      await reference(value).set({ username: config.adminUser, expiresAt: Date.now() + maxAge });
      res.cookie(COOKIE, value, { ...options, maxAge });
      res.json({ username: config.adminUser });
    },
    async require(req, _res, next) {
      const value = token(req);
      if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) throw new HttpError(401, 'Inicia sesión para acceder al panel municipal.');
      const document = await reference(value).get();
      if (!document.exists) throw new HttpError(401, 'La sesión no es válida.');
      if (document.data().expiresAt <= Date.now()) {
        await document.ref.delete();
        throw new HttpError(401, 'La sesión expiró. Inicia sesión de nuevo.');
      }
      req.user = document.data().username;
      next();
    },
    async logout(req, res) {
      const value = token(req);
      if (value && /^[A-Za-z0-9_-]{43}$/.test(value)) await reference(value).delete();
      res.clearCookie(COOKIE, options);
      res.json({ ok: true });
    }
  };
}
