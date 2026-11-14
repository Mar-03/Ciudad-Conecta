import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, delimiter } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
if (!existsSync('.env')) {
  const result = spawnSync(process.execPath, ['scripts/setup.mjs'], { stdio: 'inherit' });
  if (result.status) process.exit(result.status);
}
process.loadEnvFile('.env');
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_PROJECT_ID.startsWith('demo-')) {
  console.error('npm run dev está reservado para el emulador con proyecto demo-. Para Firebase en la nube utiliza npm start.'); process.exit(1);
}
const runtime = resolve('.runtime'); mkdirSync(runtime, { recursive: true });
const env = { ...process.env, FIREBASE_EMULATORS_PATH: resolve('.runtime/emulators') };
const javaCandidates = [process.env.JAVA_HOME, 'C:/Program Files/Java/jdk-21', 'C:/Program Files/Java/jdk-24'].filter(Boolean);
for (const directory of javaCandidates) {
  if (existsSync(resolve(directory, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))) { env.JAVA_HOME = directory; env.PATH = `${resolve(directory, 'bin')}${delimiter}${process.env.PATH}`; break; }
}
let emulator, server, stopping = false, exportTimer;
async function portOpen(port, host = '127.0.0.1') {
  return new Promise(resolvePromise => { const socket = createConnection({ port, host }); socket.setTimeout(500); socket.once('connect', () => { socket.destroy(); resolvePromise(true); }); socket.once('error', () => resolvePromise(false)); socket.once('timeout', () => { socket.destroy(); resolvePromise(false); }); });
}
const [emulatorHost, emulatorPort] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
for (const [port, host] of [[Number(emulatorPort), emulatorHost], [Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1']]) {
  if (await portOpen(port, host)) { console.error(`El puerto ${port} ya está ocupado. Detén la instancia anterior antes de iniciar otra.`); process.exit(1); }
}
// Exportación mediante la herramienta oficial. Conserva datos entre reinicios.
let exporting = false;
function exportData() {
  if (exporting || !emulator || emulator.exitCode !== null) return Promise.resolve();
  exporting = true;
  return new Promise(resolvePromise => {
    const child = spawn(process.execPath, ['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:export', '.emulator-data', '--project', env.FIREBASE_PROJECT_ID, '--force'], { env, stdio: 'ignore', windowsHide: true });
    child.on('exit', code => { exporting = false; if (code) console.error('No se pudo crear el respaldo del emulador.'); resolvePromise(); });
    child.on('error', () => { exporting = false; resolvePromise(); });
  });
}
async function stop(code = 0) {
  if (stopping) return; stopping = true; clearInterval(exportTimer);
  console.log('\nGuardando datos del emulador…');
  await exportData();
  server?.kill('SIGTERM'); emulator?.kill('SIGINT');
  setTimeout(() => process.exit(code), 1000);
}
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
const args = ['node_modules/firebase-tools/lib/bin/firebase.js', 'emulators:start', '--only', 'firestore', '--project', env.FIREBASE_PROJECT_ID];
if (existsSync('.emulator-data/firebase-export-metadata.json')) args.push('--import', '.emulator-data');
emulator = spawn(process.execPath, args, { env, stdio: 'inherit', windowsHide: true });
emulator.on('error', error => { console.error(error.message); stop(1); });
emulator.on('exit', code => { if (!stopping) { console.error('El emulador se detuvo.'); stop(code || 1); } });
let ready = false;
for (let attempt = 0; attempt < 180 && !stopping; attempt++) {
  if (await portOpen(Number(emulatorPort), emulatorHost)) { ready = true; break; }
  await delay(1000);
}
if (!ready) { console.error('No se pudo iniciar Firebase. Verifica Java 21 o superior.'); await stop(1); }
else {
  server = spawn(process.execPath, ['--env-file=.env', 'backend/server.js'], { env, stdio: 'inherit', windowsHide: true });
  server.on('exit', code => { if (!stopping) stop(code || 1); });
  server.on('error', error => { console.error(error.message); stop(1); });
  exportTimer = setInterval(exportData, 15000);
  console.log('Respaldo local cada 15 segundos y al detener con Ctrl+C. Acceso: .runtime/acceso-local.txt');
}
