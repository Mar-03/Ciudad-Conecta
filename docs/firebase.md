# Conectar Firebase sin cambiar el frontend

## Desarrollo local

Ejecuta `npm run setup` y `npm run dev`. La conexión local usa:

```dotenv
FIREBASE_PROJECT_ID=demo-ciudad-conecta
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

El SDK Admin se conecta al emulador oficial; no hay una base de datos simulada en el código. Las reglas deniegan acceso directo desde clientes. Solo el backend administra registros.

El emulador exporta sus datos a `.emulator-data/`, excluida de Git. Un reinicio limpio importa esa copia. Usa Ctrl+C y espera el cierre, especialmente después de registrar un reporte.

## Crear un proyecto de nube

1. Abre [Firebase Console](https://console.firebase.google.com/) y crea un proyecto. Puedes omitir Analytics.
2. En Firestore Database crea la base **Standard**, identificador `(default)`, en modo producción. Mantén el plan Spark si quieres trabajar sin facturación.
3. En Configuración del proyecto → Cuentas de servicio genera una clave del SDK Admin. Guarda el JSON en una ubicación privada **fuera del repositorio**. No lo pegues en el HTML, mensajes ni commits.
4. En `.env` cambia `FIREBASE_PROJECT_ID` por el ID real, elimina la línea `FIRESTORE_EMULATOR_HOST` y agrega `GOOGLE_APPLICATION_CREDENTIALS=C:/ruta/privada/service-account.json`.
5. Mantén `APP_ORIGIN=http://127.0.0.1:3000` si pruebas desde esta computadora. Detén el emulador y ejecuta `npm start`.
6. Publica las reglas e índices del repositorio usando la CLI oficial autenticada:

```powershell
npx firebase login
npx firebase deploy --only firestore --project TU_ID_REAL
```

7. Registra un reporte nuevo desde el portal. Comprueba que aparece en las colecciones `reports` y `reportPhotos` de Firebase Console y en el panel municipal.

Los registros del emulador no se copian automáticamente a la nube. Crea un reporte nuevo para demostrar la conexión real.

## Modelo

| Colección | Documento | Contenido |
| --- | --- | --- |
| reports | Folio CC-… | categoría, ubicación, descripción original, contacto opcional, coordenadas, estado, fechas, versión e identificador del envío |
| reportPhotos | Mismo folio | bytes JPEG normalizados, tipo y tamaño |
| sessions | Hash del token | usuario y expiración de sesión |

El backend convierte JPG/PNG/WebP a JPEG, elimina metadatos y reduce la imagen a un máximo de 1280 px y 400 KB. Se preserva la descripción original; la foto conserva el contenido visual con compresión. El campo binario está excluido de índices. Las dos escrituras ocurren en una transacción; si falla, no se muestra confirmación.

Se eligió Firestore para fotos pequeñas porque [Cloud Storage for Firebase requiere Blaze](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024). Firestore mantiene [cuotas gratuitas](https://firebase.google.com/docs/firestore/quotas): 1 GiB almacenado, 50 000 lecturas y 20 000 escrituras diarias para la base elegible. Cada registro consume dos escrituras y cada consulta/sesión consume operaciones. No es una arquitectura destinada a fotografías masivas o de resolución original.

## Seguridad y operación

- Las credenciales Admin permanecen en el servidor. El SDK Admin no está sujeto a las reglas de cliente; la API es responsable de autenticar y validar.
- Cambia las credenciales locales antes de publicar. Genera un nuevo hash y secreto ejecutando el configurador en una copia limpia del despliegue o mediante tu gestor de secretos. No publiques `.runtime/acceso-local.txt`.
- Para despliegue usa HTTPS, `NODE_ENV=production`, `APP_ORIGIN=https://tu-dominio` y variables de entorno del proveedor. El servidor rechaza producción con emulador o sin HTTPS. Si no usas archivo `.env`, ejecuta `node backend/server.js`.
- `HOST=0.0.0.0` permite escuchar en una plataforma de hosting; el valor local predeterminado es `127.0.0.1`.
- El portal y la API se sirven desde el mismo origen. No se habilita CORS abierto.
- No se configura TTL facturable. Las sesiones se eliminan al cerrar sesión y cuando se intenta usar una sesión expirada. En uso prolongado, limpia periódicamente las sesiones expiradas mediante una tarea administrativa.
- El proyecto admite un usuario municipal configurado por entorno. Un sistema municipal de producción necesitaría gestión de usuarios, roles, auditoría y políticas de retención.

Referencias oficiales: [SDK Admin](https://firebase.google.com/docs/admin/setup), [emuladores e importación/exportación](https://firebase.google.com/docs/emulator-suite/install_and_configure).
