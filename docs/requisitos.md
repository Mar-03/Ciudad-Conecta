# Series I y II

## Serie I

- Portal público: categoría, ubicación, descripción original, fotografía y contacto opcional.
- Validación, selección y vista previa de fotografía, envío real con fetch y confirmación con folio.
- Panel municipal: acceso protegido, lista, indicadores, filtros, descripción original y fotografía.
- Diseño adaptable a móviles y escritorio, basado en la paleta crema/café de Stitch.

## Serie II

Flujo: ciudadano → frontend → API → Firebase Firestore → API → panel.

- El backend valida todos los campos y procesa la fotografía.
- Las escrituras del reporte y la fotografía son atómicas.
- La confirmación se devuelve después de guardar ambos documentos.
- No se usan reportes precargados ni localStorage como base de datos.
- Credenciales exclusivas del servidor; panel y fotografías requieren sesión.
- Emulador de Firebase para desarrollo sin cuenta y configuración para Firestore en la nube.

Se eliminan del diseño original las promesas de IA, georreferenciación automática de fotos, plazos de atención y notificaciones por correo que no forman parte de estas series.
