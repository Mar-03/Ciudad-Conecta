import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_PROJECT_ID?.startsWith('demo-')) throw new Error('Solo se permite esta comprobación en el emulador.');
const app = initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
const db = getFirestore(app);
const ref = db.collection('_verification').doc('restart-check');
try {
  if (process.argv[2] === 'save') {
    const token = randomUUID(); await ref.set({ token });
    writeFileSync('.runtime/persistence-token.json', JSON.stringify({ token }));
    console.log('Marca de prueba guardada. Espera el respaldo, reinicia y ejecuta verify.');
  } else if (process.argv[2] === 'verify') {
    const expected = JSON.parse(readFileSync('.runtime/persistence-token.json', 'utf8'));
    assert.equal((await ref.get()).data()?.token, expected.token, 'La marca debe sobrevivir al reinicio del emulador');
    await ref.delete(); unlinkSync('.runtime/persistence-token.json');
    console.log('Persistencia verificada después de reiniciar el emulador. Marca de prueba eliminada.');
  } else throw new Error('Usa save o verify.');
} finally { await db.terminate(); await deleteApp(app); }
