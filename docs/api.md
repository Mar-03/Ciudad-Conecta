# Contrato de comunicación

Todas las rutas usan `/api`. Los errores tienen `{ "error": "Mensaje legible" }` y códigos HTTP apropiados.

| Método y ruta | Entrada | Resultado |
| --- | --- | --- |
| GET `/health` | — | Disponibilidad y modo emulator/cloud |
| POST `/reports` | multipart: category, location, description, photo; name, email, coordinates opcionales. Cabecera Idempotency-Key UUID | 201, `{ report: { code, status, createdAt } }` |
| GET `/reports/:code/status` | Folio aleatorio | Estado público sin descripción, fotografía ni datos personales |
| POST `/auth/login` | JSON: username, password | Cookie de sesión HttpOnly |
| POST `/auth/logout` | — | Invalida sesión |
| GET `/auth/session` | Cookie | Usuario autenticado |
| GET `/admin/reports?cursor=…` | Cookie y cursor opcional | Página de 30 reportes; nextCursor |
| GET `/admin/stats` | Cookie | Conteos globales por estado |
| GET `/admin/reports/:code` | Cookie | Detalle original |
| GET `/admin/reports/:code/photo` | Cookie | JPEG procesado |
| PATCH `/admin/reports/:code` | Cookie; JSON: status, version | Reporte actualizado; 409 si otra persona lo modificó |

Categorías: alumbrado, calles, basura, agua, seguridad, otros.
Estados: pendiente, en_proceso, resuelto.
Las mutaciones del panel incluyen `X-Requested-With: CiudadConecta`; la API verifica origen y tipo de contenido.

El frontend no almacena credenciales ni reportes en localStorage. Los filtros operan sobre las páginas cargadas; los indicadores resumen toda la base.
