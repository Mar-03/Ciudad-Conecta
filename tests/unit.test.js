import test from 'node:test';
import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import sharp from 'sharp';
import { validateReport, validateStatus } from '../backend/validation.js';
import { verifyPassword } from '../backend/auth.js';
import { processPhoto } from '../backend/photos.js';
import { getConfig } from '../backend/config.js';
const valid = { category: 'calles', description: 'Un bache grande frente al parque municipal.', location: 'Frente al parque central' };
test('validación de campos y coordenadas sin confiar en el navegador', () => {
  assert.equal(validateReport(valid).category, 'calles');
  for (const patch of [{ category: 'inventada' }, { description: 'corta' }, { location: [] }, { email: 'incorrecto' }, { coordinates: '{' }, { coordinates: '{"latitude":91,"longitude":0}' }, { coordinates: '{"latitude":"14","longitude":0}' }]) assert.throws(() => validateReport({ ...valid, ...patch }), { status: 400 });
  assert.deepEqual(validateReport({ ...valid, coordinates: '{"latitude":14.8,"longitude":-90}' }).coordinates, { latitude: 14.8, longitude: -90 });
});
test('estado y versión controlan concurrencia', () => {
  assert.deepEqual(validateStatus({ status: 'resuelto', version: 1 }), { status: 'resuelto', version: 1 });
  assert.throws(() => validateStatus({ status: 'resuelto', version: '1' }), { status: 400 });
  assert.throws(() => validateStatus({ status: 'inventado', version: 1 }), { status: 400 });
});
test('contraseñas se verifican contra scrypt y no texto plano', async () => {
  const salt = 'salt-for-unit-test'; const hash = `${salt}:${scryptSync('test-password', salt, 64).toString('hex')}`;
  assert.equal(await verifyPassword('test-password', hash), true);
  assert.equal(await verifyPassword('incorrecta', hash), false);
  assert.equal(await verifyPassword({}, hash), false);
});
test('foto se decodifica y normaliza; archivos falsos son rechazados', async () => {
  const input = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#abcd12' } }).png().toBuffer();
  const photo = await processPhoto({ buffer: input, mimetype: 'image/png' });
  const metadata = await sharp(photo.bytes).metadata();
  assert.equal(metadata.format, 'jpeg'); assert.equal(metadata.width, 1280); assert.ok(photo.size <= 409600); assert.equal(metadata.exif, undefined);
  await assert.rejects(() => processPhoto({ buffer: Buffer.from('<script>alert(1)</script>'), mimetype: 'image/jpeg' }), { status: 400 });
  await assert.rejects(() => processPhoto(null), { status: 400 });
});
test('producción rechaza emulador y claves ausentes', () => {
  assert.throws(() => getConfig({}));
  assert.throws(() => getConfig({ FIREBASE_PROJECT_ID: 'demo-test', ADMIN_PASSWORD_HASH: 'x', SESSION_SECRET: 'a'.repeat(32), NODE_ENV: 'production', FIRESTORE_EMULATOR_HOST: 'localhost:8080' }));
});
