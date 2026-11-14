import { getConfig } from './config.js';
import { connectFirestore } from './firebase.js';
import { createApp } from './app.js';
const config = getConfig();
const db = connectFirestore(config);
const server = createApp(db, config).listen(config.port, config.host, () => {
  console.log(`CiudadConecta: ${config.origin}`);
  console.log(`Persistencia: Firebase Firestore (${config.emulator ? 'emulador local' : 'nube'}).`);
});
server.requestTimeout = 60000;
async function stop() { server.close(); await db.terminate(); process.exit(0); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
