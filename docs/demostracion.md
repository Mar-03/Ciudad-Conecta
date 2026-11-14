# Guion de demostración

1. Ejecutar `npm run dev`. Abrir el portal y explicar si la conexión es al emulador o a Firebase en la nube.
2. Enviar el formulario vacío: el navegador debe señalar los campos requeridos.
3. Elegir una categoría, escribir ubicación y descripción de al menos 20 caracteres, adjuntar una fotografía real. Mostrar la vista previa y la opción de eliminarla.
4. Registrar el reporte. La confirmación aparece solo después de que la API guarda el reporte y su foto. Copiar el folio.
5. Recargar el portal y consultar el folio. Debe conservarse su estado pendiente.
6. Abrir el panel municipal e iniciar sesión usando el acceso local privado.
7. Mostrar los indicadores, buscar el folio, abrir el detalle y verificar descripción original, ubicación y fotografía.
8. Cambiar el estado a «En proceso», guardar y consultar nuevamente el folio en el portal público.
9. Cerrar sesión y demostrar que la API `/api/admin/reports` ya no permite acceder a los datos.
10. Detener con Ctrl+C, esperar a que se guarden los datos y volver a iniciar. El reporte debe seguir disponible.

Para demostrar específicamente **Firebase en su capa gratuita**, usar un proyecto real de Firestore siguiendo `firebase.md` y mostrar el documento persistido en Firebase Console. Las pruebas locales no sustituyen esta conexión de nube.

## Qué explicar del código

- Frontend: HTML/CSS adaptado de Stitch, manipulación DOM y solicitudes `fetch`.
- Backend: rutas REST Express, procesamiento multipart y validación independiente.
- Firebase: transacción para reporte/foto; lectura posterior desde el panel.
- Seguridad: sesión HttpOnly, scrypt, claves exclusivas del backend, límites de solicitudes y fotografías.
- Manejo de errores: mensajes de validación y conexión; no se borra el formulario si falla el envío.
