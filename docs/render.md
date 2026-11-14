# Publicar todo en Render + Firebase

El servicio en línea contiene el portal ciudadano, el panel y la API. Firestore en la nube conserva reportes, fotografías y sesiones. La aplicación publicada funciona con la computadora apagada.

```text
Navegador → HTTPS de Render → API Express → Firebase Firestore
             portal / panel ←────────────── reportes y fotos
```

## 1. Preparar Firebase desde la consola

Proyecto: `ciudadconecta-98c5b`.

1. En [Firestore](https://console.firebase.google.com/project/ciudadconecta-98c5b/firestore), crea la base **Standard**, identificador `(default)`, en modo producción.
2. En [Cuentas de servicio](https://console.firebase.google.com/project/ciudadconecta-98c5b/settings/serviceaccounts/adminsdk), genera una clave privada. Su JSON se coloca únicamente en las variables secretas de Render, nunca en GitHub ni en el frontend.
3. En Firestore → Reglas, conserva el bloqueo de acceso directo a clientes que aparece en `firestore.rules`. El servidor usa el SDK Admin autenticado.
4. En Firestore → Índices → Campo único, agrega una exención para la colección `reportPhotos`, campo `bytes`, desactivando sus índices. Las demás exenciones están en `firestore.indexes.json` y también pueden aplicarse desde la consola. No se necesitan índices compuestos para las consultas actuales.

No se necesita registrar una app web de Firebase: el navegador se comunica con nuestra API y el servidor utiliza Firebase Admin. Tampoco se necesita Firebase Storage; las fotos comprimidas se guardan en Firestore.

## 2. Subir el código a GitHub

Publica este repositorio y sus ramas en tu cuenta. La rama **develop** contiene la aplicación completa y `render.yaml`. `main` conserva la base inicial, así que no la selecciones para este despliegue.

Los archivos `.env`, `.runtime/`, `.emulator-data/`, las claves privadas y `node_modules/` están excluidos. La configuración pública está en `render.yaml`; los valores secretos se ingresan en Render.

## 3. Crear el servicio en Render

En [Render](https://dashboard.render.com/), conecta GitHub y elige **New → Blueprint**. Selecciona el repositorio y la rama **develop**. Render leerá `render.yaml` y preparará un servicio web gratuito.

Completa los valores que solicita:

| Variable | Valor |
| --- | --- |
| `ADMIN_PASSWORD` | Una contraseña nueva de entre 12 y 200 caracteres para el panel municipal |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON de cuenta de servicio de este proyecto |

El Blueprint configura el resto: `NODE_ENV=production`, `FIREBASE_PROJECT_ID=ciudadconecta-98c5b`, `ADMIN_USER=municipal`, Node 22 y un `SESSION_SECRET` generado por Render.

**No agregues `FIRESTORE_EMULATOR_HOST` ni importes el `.env` de desarrollo.** El servidor detecta automáticamente su URL pública y su puerto en Render. Si más adelante usas un dominio propio, establece `APP_ORIGIN` con su URL HTTPS.

Si prefieres **New → Web Service**, usa estos parámetros equivalentes:

| Campo | Valor |
| --- | --- |
| Branch | `develop` |
| Root Directory | Vacío (raíz del repositorio) |
| Runtime | Node |
| Build Command | `npm ci --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` |
| Plan | Free |

Agrega todas las variables mencionadas arriba, incluyendo `SESSION_SECRET` generado con la opción de valor aleatorio del panel (mínimo 32 caracteres) y `NODE_VERSION=22`.

## 4. Comprobar el despliegue

Espera el estado **Live** y abre la URL HTTPS que Render asigne:

- `/`: portal ciudadano.
- `/admin.html`: panel municipal; usuario `municipal` y la contraseña que configuraste en Render.
- `/api/health`: debe devolver `ok: true` y `mode: cloud`; esta ruta sí comprueba Firebase.
- `/healthz`: comprueba que el servidor está vivo sin gastar lecturas de Firestore.

Registra un reporte nuevo y revisa la foto desde el panel. Confirma en Firebase Console que existen los documentos. Reiniciar Render no elimina estos datos porque están en Firestore.

Los reportes del emulador no se transfieren automáticamente a Firebase en la nube. Las credenciales locales del panel tampoco se usan en este despliegue.

## Comportamiento del plan gratuito

Render puede suspender un servicio gratuito tras 15 minutos de inactividad. La siguiente visita lo reactiva y puede tardar. Esto no depende de tu computadora y no elimina los datos guardados en Firestore. Si necesitas disponibilidad permanente sin ese arranque, puedes seleccionar un plan de pago por decisión propia.

Referencias oficiales: [Express en Render](https://render.com/docs/deploy-node-express-app), [variables y secretos](https://render.com/docs/configure-environment-variables), [Blueprint](https://render.com/docs/blueprint-spec), [plan gratuito](https://render.com/docs/free).
