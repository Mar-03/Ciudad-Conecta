import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
export function connectFirestore(config) {
  const app = initializeApp({ projectId: config.projectId, ...(config.emulator ? {} : { credential: applicationDefault() }) });
  const db = getFirestore(app);
  return db;
}
