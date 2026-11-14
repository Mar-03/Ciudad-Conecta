# Verificación realizada

- Comprobación de sintaxis JavaScript: correcta.
- Pruebas unitarias: 5 aprobadas (campos, coordenadas, estados, contraseñas, fotografías y configuración).
- Prueba de integración contra el emulador oficial: 8 escenarios aprobados dentro de una suite (9 resultados en el ejecutor de Node).
- Navegador Edge automatizado: registro con fotografía, confirmación real, seguimiento tras recarga, inicio de sesión, lectura del detalle, visualización de foto, cambio de estado y cierre de sesión.
- Diseño inspeccionado en escritorio de 1440 px y móvil de 390 px. Se corrigió el desbordamiento horizontal del panel; la tabla mantiene desplazamiento dentro de su contenedor.
- Texto potencialmente peligroso se representa como texto, sin ejecutar HTML.
- Error de red en el envío: conserva el formulario y no muestra confirmación.
- `npm audit --omit=dev`: cero vulnerabilidades reportadas en las dependencias de producción al verificar esta versión.

Las capturas de las pruebas se generan en `test-results/`, excluida de Git. Los registros de prueba se eliminan después de verificar el flujo. No hay reportes precargados en la aplicación.

## Reproducir la comprobación de reinicio

Con el emulador activo:

```powershell
node --env-file=.env tests/persistence.mjs save
```

Espera a que el emulador indique que terminó un respaldo, detén `npm run dev`, vuelve a iniciarlo y ejecuta:

```powershell
node --env-file=.env tests/persistence.mjs verify
```

Se utiliza una marca temporal en una colección separada; al verificarla se elimina. El script rechaza proyectos que no sean de emulación.

## Límite de verificación

Se verificó la conexión local al emulador. No se verificó Firebase en la nube porque todavía no existe un proyecto ni credenciales proporcionados por el usuario. La guía `firebase.md` documenta la configuración pendiente.
