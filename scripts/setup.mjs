import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
if (existsSync('.env')) { console.log('.env ya existe; no se modificó.'); process.exit(0); }
const password = randomBytes(15).toString('base64url');
const salt = randomBytes(16).toString('hex');
const hash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
const env = `NODE_ENV=development\nHOST=127.0.0.1\nPORT=3000\nAPP_ORIGIN=http://127.0.0.1:3000\nFIREBASE_PROJECT_ID=demo-ciudad-conecta\nFIRESTORE_EMULATOR_HOST=127.0.0.1:8080\nADMIN_USER=municipal\nADMIN_PASSWORD_HASH=${hash}\nSESSION_SECRET=${randomBytes(48).toString('hex')}\n`;
writeFileSync('.env', env, { mode: 0o600 });
mkdirSync('.runtime', { recursive: true });
writeFileSync('.runtime/acceso-local.txt', `Acceso al panel LOCAL de desarrollo\nURL: http://127.0.0.1:3000/admin.html\nUsuario: municipal\nContraseña: ${password}\n\nArchivo privado excluido de Git. No usar esta contraseña en producción.\n`, { mode: 0o600 });
console.log('Configuración creada. El usuario y la contraseña local están en .runtime/acceso-local.txt (excluido de Git).');
