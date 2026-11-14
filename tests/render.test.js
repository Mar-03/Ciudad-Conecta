import test from 'node:test';
import assert from 'node:assert/strict';
import { getConfig } from '../backend/config.js';
import { readServiceAccount } from '../backend/firebase.js';
import { verifyPassword } from '../backend/auth.js';
import { createApp } from '../backend/app.js';

const environment = {
  RENDER: 'true',
  RENDER_EXTERNAL_URL: 'https://ciudadconecta-test.onrender.com',
  PORT: '10000',
  FIREBASE_PROJECT_ID: 'ciudadconecta-98c5b',
  SESSION_SECRET: 'a'.repeat(64),
  ADMIN_PASSWORD: 'Password-de-prueba-123'
};

test('Render usa origen HTTPS y puerto asignados sin .env ni emulador', async () => {
  const config = getConfig(environment);
  assert.equal(config.origin, environment.RENDER_EXTERNAL_URL);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.port, 10000);
  assert.equal(config.production, true);
  assert.equal(config.emulator, false);
  assert.equal(config.trustProxy, 1);
  assert.equal(await verifyPassword(environment.ADMIN_PASSWORD, config.passwordHash), true);
  assert.equal(config.password, undefined);
});

test('Render rechaza emulador y configuración insegura', () => {
  assert.throws(() => getConfig({ ...environment, FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }), /no permite el emulador/);
  assert.throws(() => getConfig({ ...environment, ADMIN_PASSWORD: 'corta' }), /12 y 200/);
  assert.throws(() => getConfig({ ...environment, APP_ORIGIN: 'http://localhost:3000' }), /HTTPS/);
  assert.throws(() => getConfig({ ...environment, APP_ORIGIN: 'https://ejemplo.com/otra-ruta' }), /sin rutas/);
  assert.throws(() => getConfig({ ...environment, PORT: 'no-es-puerto' }), /puerto válido/);
  assert.equal(getConfig({ ...environment, APP_ORIGIN: 'https://municipio.example/' }).origin, 'https://municipio.example');
});

test('credencial de Firebase valida proyecto y no expone secretos en errores', () => {
  const account = { type: 'service_account', project_id: environment.FIREBASE_PROJECT_ID, client_email: 'test@example.com', private_key: '-----BEGIN PRIVATE KEY-----\nfixture\n-----END PRIVATE KEY-----' };
  assert.deepEqual(readServiceAccount(JSON.stringify(account), environment.FIREBASE_PROJECT_ID), account);
  assert.throws(() => readServiceAccount(JSON.stringify(account), 'otro-proyecto'), /otro proyecto/);
  assert.throws(() => readServiceAccount('secreto-invalido', environment.FIREBASE_PROJECT_ID), error => !error.message.includes('secreto-invalido'));
  assert.throws(() => readServiceAccount('null', environment.FIREBASE_PROJECT_ID), /incompleta/);
});

test('health de Render y frontend se sirven sin lecturas de la base de datos', async () => {
  let reads = 0;
  const db = { collection() { return { limit() { reads++; throw new Error('Lectura inesperada'); } }; } };
  const app = createApp(db, getConfig(environment));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });
    const portal = await fetch(base);
    assert.equal(portal.status, 200);
    assert.match(await portal.text(), /Nuevo reporte ciudadano/);
    assert.ok(portal.headers.get('strict-transport-security'));
    assert.equal(reads, 0);
    assert.equal(app.get('trust proxy'), 1);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
