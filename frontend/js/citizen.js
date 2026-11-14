import { api, categories, statuses, date, message, showEnvironment } from './api.js';
const $ = selector => document.querySelector(selector);
const form = $('#report-form');
let photoUrl;
let coordinates = null;
let idempotencyKey = crypto.randomUUID();
let savedCode = '';
showEnvironment();
$('#description').addEventListener('input', event => { $('#description-count').textContent = `${event.target.value.length} / 2000`; });
function previewPhoto() {
  message($('#photo-error'), '');
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  $('#photo-preview').hidden = true;
  const file = $('#photo').files[0];
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024 || file.size === 0) {
    $('#photo').value = '';
    message($('#photo-error'), 'Selecciona una imagen JPG, PNG o WebP válida de hasta 20 MB.');
    return;
  }
  photoUrl = URL.createObjectURL(file);
  $('#preview-image').src = photoUrl;
  $('#photo-name').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  $('#photo-preview').hidden = false;
}
$('#photo').addEventListener('change', previewPhoto);
$('#remove-photo').addEventListener('click', () => { $('#photo').value = ''; previewPhoto(); });
for (const event of ['dragenter', 'dragover']) $('#dropzone').addEventListener(event, e => { e.preventDefault(); $('#dropzone').classList.add('dragging'); });
for (const event of ['dragleave', 'drop']) $('#dropzone').addEventListener(event, e => { e.preventDefault(); $('#dropzone').classList.remove('dragging'); });
$('#dropzone').addEventListener('drop', e => {
  if (e.dataTransfer.files.length !== 1) { message($('#photo-error'), 'Adjunta una sola fotografía.'); return; }
  $('#photo').files = e.dataTransfer.files;
  previewPhoto();
});
$('#geolocate').addEventListener('click', () => {
  if (!navigator.geolocation) { message($('#geo-status'), 'Tu navegador no admite ubicación.'); return; }
  $('#geolocate').disabled = true;
  message($('#geo-status'), 'Obteniendo ubicación…');
  navigator.geolocation.getCurrentPosition(position => {
    coordinates = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    message($('#geo-status'), 'Coordenadas adjuntas ✓');
    if (!$('#location').value.trim()) $('#location').value = `Coordenadas: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
    $('#geolocate').disabled = false;
  }, () => { message($('#geo-status'), 'No disponible. Escribe la dirección.'); $('#geolocate').disabled = false; }, { timeout: 10000, maximumAge: 60000 });
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  message($('#form-error'), '');
  const button = $('#submit-report');
  button.disabled = true; button.textContent = 'Guardando reporte…';
  const data = new FormData(form);
  if (coordinates) data.set('coordinates', JSON.stringify(coordinates));
  try {
    const result = await api('/reports', { method: 'POST', body: data, headers: { 'Idempotency-Key': idempotencyKey } });
    savedCode = result.report.code;
    $('#ticket-code').textContent = savedCode;
    $('#tracking-code').value = savedCode;
    form.reset(); previewPhoto(); coordinates = null;
    $('#description-count').textContent = '0 / 2000'; message($('#geo-status'), '');
    idempotencyKey = crypto.randomUUID();
    $('#success-dialog').showModal();
  } catch (error) { message($('#form-error'), error.message); }
  finally { button.disabled = false; button.textContent = 'Enviar reporte ciudadano ↗'; }
});
$('#copy-code').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(savedCode); message($('#copy-status'), 'Folio copiado.'); }
  catch { message($('#copy-status'), 'No se pudo copiar automáticamente. Selecciona el folio y cópialo.'); }
});
$('#new-report').addEventListener('click', () => { $('#success-dialog').close(); message($('#copy-status'), ''); form.querySelector('input').focus(); });
$('#track-report').addEventListener('click', () => { $('#success-dialog').close(); $('#seguimiento').scrollIntoView({ behavior: 'smooth' }); $('#tracking-form').requestSubmit(); });
$('#tracking-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  const result = $('#tracking-result'); message(result, 'Consultando…');
  try {
    const { report } = await api(`/reports/${encodeURIComponent($('#tracking-code').value.trim().toUpperCase())}/status`);
    result.replaceChildren();
    const badge = document.createElement('span'); badge.className = 'badge'; badge.dataset.status = report.status; badge.textContent = statuses[report.status];
    const detail = document.createElement('p'); detail.textContent = `${categories[report.category]} · Registrado: ${date(report.createdAt)}. Última actualización: ${date(report.updatedAt)}.`;
    result.append(badge, detail);
  } catch (error) { message(result, error.message); }
  finally { button.disabled = false; }
});
