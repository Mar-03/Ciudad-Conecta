# CiudadConecta

Proyecto de Desarrollo y Diseño Web. Series I y II: portal ciudadano, API y panel municipal con persistencia en Firebase Firestore.

## Organización

- `frontend/`: HTML, CSS y JavaScript; diseño adaptado del HTML de Stitch proporcionado.
- `backend/`: API, validaciones y acceso a Firebase (se incorpora después del frontend).
- `docs/`: requisitos, contrato API y guía de configuración.

## Ramas

`main` conserva la base inicial; `develop` integra el trabajo. `frontend` y `backend` registran avances pequeños en ese orden. La versión integrada se encuentra en `develop`.

## Alcance

## Publicar completamente en línea

El proyecto incluye `render.yaml` para ejecutar **frontend y backend juntos en Render**, conectados a **Firebase Firestore en la nube**. La aplicación publicada no requiere que tu computadora esté encendida. Sigue [la guía de Render](docs/render.md); utiliza la rama `develop`.

En Render, `npm start` usa las variables del servicio y detecta automáticamente la URL HTTPS y el puerto. Las credenciales Firebase se configuran como secreto `FIREBASE_SERVICE_ACCOUNT_JSON`. No se utiliza el emulador ni un archivo `.env` local en producción.

## Ejecutar en tu computadora

Requisitos: Node.js 22 o 24 LTS, Java 21 o superior e internet para la primera instalación y descarga del emulador.

```powershell
npm install
npm run setup
npm run dev
```

Abre **http://127.0.0.1:3000** y el panel **http://127.0.0.1:3000/admin.html**. Usa exactamente ese host para que la validación de origen coincida.

`npm run setup` genera una contraseña aleatoria y un secreto de sesión. Consulta **`.runtime/acceso-local.txt`** para ver el usuario y contraseña del panel local. Este archivo y `.env` están excluidos de Git. El usuario predeterminado es `municipal`.

`npm run dev` inicia el emulador oficial de Firestore y el backend, que sirve el frontend. Los datos se exportan a `.emulator-data/` cada 15 segundos y al detener con **Ctrl+C**, y se importan al siguiente inicio. Un cierre forzado puede perder los últimos segundos de cambios. El emulador solo escucha en `127.0.0.1`; no requiere una cuenta de Firebase ni una tarjeta.

Si Java no se detecta, configura `JAVA_HOME` apuntando a tu JDK 21 o superior. En esta computadora el script reconoce `C:/Program Files/Java/jdk-21`.

## Comprobar el proyecto

```powershell
npm run check
npm test
# Con npm run dev activo en otra terminal:
npm run test:integration
npm run test:ui
```

Las pruebas de integración utilizan el proyecto aislado `demo-ciudad-tests` dentro del emulador. La prueba de navegador crea y elimina su propio reporte. Usa Edge/Chrome instalado en Windows; en otro entorno instala Chromium con `npx playwright install chromium` o configura `BROWSER_PATH`.

## Firebase en la nube

La aplicación está preparada para Firestore, pero **el emulador local no equivale a un proyecto desplegado en Firebase**. Para presentar la persistencia en la nube hay que crear un proyecto y configurar credenciales privadas. Sigue [docs/firebase.md](docs/firebase.md). No hace falta modificar el frontend.

## Estructura y decisiones

```text
frontend/            Portal ciudadano y panel municipal (HTML/CSS/JS)
backend/             API Express, sesiones, validaciones y Firebase Admin
scripts/             Configuración, arranque y comprobación de sintaxis
tests/               Pruebas unitarias, integración y navegador
docs/referencia/      HTML original de Stitch conservado como referencia
firestore.rules      Bloquea acceso directo desde clientes
firestore.indexes.json  Excluye fotografía y textos privados de índices
```

- Los reportes y sus fotos se guardan atómicamente en `reports` y `reportPhotos`.
- Fotos JPEG de hasta 400 KB en documentos separados: solución acotada para este parcial con la cuota gratuita de Firestore. No se usa Firebase Storage ni se necesita activar facturación para probar el proyecto.
- Sesión de ocho horas, cookie HttpOnly/SameSite, contraseñas scrypt y sesiones revocables en Firestore.
- El folio público tiene 96 bits de aleatoriedad derivada; solo permite consultar categoría, estado y fechas. Conserva el folio en privado.
- El panel muestra los últimos 30 reportes y permite cargar más. Los filtros actúan sobre los registros cargados; los indicadores cuentan toda la base.
- No se envían correos ni se ejecuta IA. La ubicación GPS es opcional y requiere permiso del navegador.
- [Requisitos](docs/requisitos.md), [contrato API](docs/api.md), [guía Firebase](docs/firebase.md) y [guion de demostración](docs/demostracion.md).

