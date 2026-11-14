import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
export function readServiceAccount(value, projectId) {
  let account;
  try { account = JSON.parse(value); }
  catch { throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON debe contener el JSON completo de la cuenta de servicio.'); }
  if (!account || account.type !== 'service_account' || account.project_id !== projectId || typeof account.client_email !== 'string' || !account.client_email || typeof account.private_key !== 'string' || !account.private_key.includes('BEGIN PRIVATE KEY')) {
    throw new Error('La credencial Firebase está incompleta o pertenece a otro proyecto.');
  }
  return account;
}
export function connectFirestore(config) {
  let credential;
  if (!config.emulator) {
    credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? cert(readServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON, config.projectId))
      : applicationDefault();
  }
  const app = initializeApp({ projectId: config.projectId, ...(credential ? { credential } : {}) });
  const db = getFirestore(app);
  return db;
}
