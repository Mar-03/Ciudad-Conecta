import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import sharp from 'sharp';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createApp } from '../backend/app.js';

// Base aislada: estas pruebas jamás tocan un proyecto real ni los reportes de demostración.
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Se requiere el emulador. Ejecuta npm run dev en otra terminal.');
const firebase = initializeApp({ projectId: 'demo-ciudad-tests' }, `test-${randomUUID()}`);
const db = getFirestore(firebase);
const salt = randomBytes(16).toString('hex'), password = randomBytes(12).toString('hex');
const config = { emulator: true, production: false, origin: 'http://localhost', adminUser: 'test-admin', passwordHash: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`, sessionSecret: randomBytes(32).toString('hex') };
const server = createApp(db, config).listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
const headers = { 'X-Requested-With': 'CiudadConecta' };
const image = await sharp({ create: { width: 120, height: 100, channels: 3, background: '#c3926d' } }).png().toBuffer();
function form(overrides = {}, photo = image) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ category: 'calles', location: 'Parque central de pruebas', description: 'Bache frente al parque, necesita reparación.', name: 'Prueba', email: 'prueba@example.com', ...overrides })) data.set(key, value);
  if (photo) data.set('photo', new Blob([photo], { type: 'image/png' }), 'prueba.png');
  return data;
}
test('flujo real API → Firestore → panel, seguridad y persistencia', async t => {
  let code, cookie;
  const idempotency = randomUUID();
  const tracked = [];
  t.after(async () => {
    for (const item of tracked) { await db.collection('reports').doc(item).delete(); await db.collection('reportPhotos').doc(item).delete(); }
    const sessions = await db.collection('sessions').get(); await Promise.all(sessions.docs.map(doc => doc.ref.delete()));
    await new Promise(resolve => server.close(resolve)); await deleteApp(firebase);
  });
  await t.test('el panel y fotos requieren autenticación', async () => {
    assert.equal((await fetch(`${base}/admin/reports`)).status, 401);
    assert.equal((await fetch(`${base}/admin/reports/CC-${'A'.repeat(24)}/photo`)).status, 401);
  });
  await t.test('entradas inválidas no se registran', async () => {
    for (const body of [form({ description: 'corta' }), form({}, null), form({}, Buffer.from('archivo falso'))]) {
      const response = await fetch(`${base}/reports`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': randomUUID() }, body }); assert.equal(response.status, 400);
    }
  });
  await t.test('crear guarda reporte y fotografía; reintentar no duplica', async () => {
    const request = () => fetch(`${base}/reports`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': idempotency }, body: form() });
    const response = await request(); assert.equal(response.status, 201); const payload = await response.json(); code = payload.report.code; tracked.push(code);
    assert.equal((await db.collection('reports').doc(code).get()).exists, true);
    assert.ok((await db.collection('reportPhotos').doc(code).get()).data().bytes.length > 0);
    const duplicate = await request(); assert.equal(duplicate.status, 200); assert.equal((await duplicate.json()).report.code, code);
    const conflict = await fetch(`${base}/reports`, { method: 'POST', headers: { ...headers, 'Idempotency-Key': idempotency }, body: form({ location: 'Otra ubicación de prueba' }) }); assert.equal(conflict.status, 409);
  });
  await t.test('seguimiento público no expone datos personales', async () => {
    const response = await fetch(`${base}/reports/${code}/status`); const { report } = await response.json();
    assert.equal(report.status, 'pendiente'); assert.equal(report.email, undefined); assert.equal(report.description, undefined); assert.equal(report.name, undefined);
  });
  await t.test('login, listado, detalle y foto consultan registros reales', async () => {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test-admin', password }) });
    assert.equal(response.status, 200); cookie = response.headers.get('set-cookie').split(';')[0]; assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
    const list = await (await fetch(`${base}/admin/reports`, { headers: { Cookie: cookie } })).json(); assert.ok(list.reports.some(r => r.code === code));
    const detail = await (await fetch(`${base}/admin/reports/${code}`, { headers: { Cookie: cookie } })).json(); assert.equal(detail.report.description, 'Bache frente al parque, necesita reparación.');
    const photo = await fetch(`${base}/admin/reports/${code}/photo`, { headers: { Cookie: cookie } }); assert.equal(photo.headers.get('content-type'), 'image/jpeg'); assert.ok((await photo.arrayBuffer()).byteLength > 0);
  });
  await t.test('actualización persistida, concurrencia y origen protegido', async () => {
    const update = (status, version, origin) => fetch(`${base}/admin/reports/${code}`, { method: 'PATCH', headers: { ...headers, Cookie: cookie, 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) }, body: JSON.stringify({ status, version }) });
    assert.equal((await update('resuelto', 1, 'https://otro-sitio.example')).status, 403);
    assert.equal((await update('resuelto', 1)).status, 200);
    assert.equal((await update('en_proceso', 1)).status, 409);
    assert.equal((await db.collection('reports').doc(code).get()).data().status, 'resuelto');
    const stats = await (await fetch(`${base}/admin/stats`, { headers: { Cookie: cookie } })).json(); assert.ok(stats.resuelto >= 1);
  });
  await t.test('otra instancia de API recupera datos desde Firebase', async () => {
    const second = createApp(db, config).listen(0, '127.0.0.1'); await new Promise(resolve => second.once('listening', resolve));
    try { const response = await fetch(`http://127.0.0.1:${second.address().port}/api/reports/${code}/status`); assert.equal((await response.json()).report.status, 'resuelto'); }
    finally { await new Promise(resolve => second.close(resolve)); }
  });
  await t.test('cerrar sesión revoca la cookie en el servidor', async () => {
    assert.equal((await fetch(`${base}/auth/logout`, { method: 'POST', headers: { ...headers, Cookie: cookie } })).status, 200);
    assert.equal((await fetch(`${base}/admin/reports`, { headers: { Cookie: cookie } })).status, 401);
  });
});
