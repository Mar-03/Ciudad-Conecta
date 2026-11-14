import { api, categories, statuses, date, message, showEnvironment } from './api.js';
const $ = selector => document.querySelector(selector);
let reports = [], nextCursor = null, selected = null, loading = false, generation = 0;
showEnvironment();
function loggedOut() {
  generation++;
  $('#dashboard').hidden = true; $('#login-section').hidden = false;
  $('#detail-dialog').close(); reports = []; selected = null; nextCursor = null;
  $('#report-rows').replaceChildren(); $('#detail-content').replaceChildren();
}
function handleError(element, error) {
  if (error.status === 401) { loggedOut(); message($('#login-error'), 'Tu sesión terminó. Inicia sesión nuevamente.'); }
  else message(element, error.message);
}
async function enter() { $('#login-section').hidden = true; $('#dashboard').hidden = false; await loadReports(); }
$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
  message($('#login-error'), '');
  try {
    await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: $('#username').value.trim(), password: $('#password').value }) });
    $('#password').value = ''; await enter();
  } catch (error) { message($('#login-error'), error.message); }
  finally { button.disabled = false; }
});
$('#logout').addEventListener('click', async () => {
  try { await api('/auth/logout', { method: 'POST' }); loggedOut(); }
  catch (error) { handleError($('#dashboard-error'), error); }
});
function cell(text, small) {
  const td = document.createElement('td'); td.textContent = text;
  if (small) { const label = document.createElement('small'); label.textContent = small; td.append(label); }
  return td;
}
function render() {
  const query = $('#search').value.trim().toLocaleLowerCase('es');
  const filtered = reports.filter(r => (!$('#category-filter').value || r.category === $('#category-filter').value) && (!$('#status-filter').value || r.status === $('#status-filter').value) && (!query || `${r.code} ${r.location} ${r.description}`.toLocaleLowerCase('es').includes(query)));
  const fragment = document.createDocumentFragment();
  for (const report of filtered) {
    const row = document.createElement('tr');
    row.append(cell(categories[report.category], report.code), cell(report.location), cell(date(report.createdAt)));
    const statusCell = document.createElement('td'), badge = document.createElement('span'); badge.className = 'badge'; badge.dataset.status = report.status; badge.textContent = statuses[report.status]; statusCell.append(badge); row.append(statusCell);
    const actionCell = document.createElement('td'), action = document.createElement('button'); action.type = 'button'; action.className = 'table-action'; action.textContent = 'Ver detalle →'; action.setAttribute('aria-label', `Ver detalle de ${report.code}`); action.addEventListener('click', () => showDetail(report.code)); actionCell.append(action); row.append(actionCell); fragment.append(row);
  }
  $('#report-rows').replaceChildren(fragment); $('#empty-state').hidden = filtered.length !== 0;
  $('#list-count').textContent = `${filtered.length} visibles de ${reports.length} cargados${nextCursor ? ' · Hay más reportes disponibles' : ''}`;
  $('#load-more').hidden = !nextCursor;
}
async function loadReports(append = false) {
  if (loading) return;
  loading = true; const requestGeneration = generation;
  $('#refresh').disabled = true; $('#load-more').disabled = true; message($('#dashboard-error'), ''); message($('#list-status'), 'Consultando reportes…');
  try {
    const [result, stats] = await Promise.all([api(`/admin/reports${append && nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ''}`), api('/admin/stats')]);
    if (requestGeneration !== generation) return;
    reports = append ? [...new Map([...reports, ...result.reports].map(r => [r.code, r])).values()] : result.reports; nextCursor = result.nextCursor;
    $('#stat-total').textContent = stats.total; $('#stat-pending').textContent = stats.pendiente; $('#stat-progress').textContent = stats.en_proceso; $('#stat-resolved').textContent = stats.resuelto;
    render(); message($('#list-status'), `Actualizado: ${date(new Date())}. Los filtros se aplican a los reportes cargados.`);
  } catch (error) { message($('#list-status'), 'No se pudo actualizar.'); handleError($('#dashboard-error'), error); }
  finally { loading = false; $('#refresh').disabled = false; $('#load-more').disabled = false; }
}
$('#refresh').addEventListener('click', () => loadReports());
$('#load-more').addEventListener('click', () => loadReports(true));
$('#filters').addEventListener('submit', e => e.preventDefault());
for (const selector of ['#search', '#category-filter', '#status-filter']) $(selector).addEventListener('input', render);
$('#clear-filters').addEventListener('click', () => { $('#filters').reset(); render(); });
async function showDetail(code) {
  selected = null; $('#detail-title').textContent = 'Cargando…'; $('#detail-content').replaceChildren(); $('#status-form').hidden = true;
  message($('#detail-error'), ''); message($('#detail-success'), ''); $('#detail-dialog').showModal();
  try {
    const { report } = await api(`/admin/reports/${encodeURIComponent(code)}`);
    if (!$('#detail-dialog').open) return;
    selected = report; $('#detail-title').textContent = categories[report.category];
    const photoSection = document.createElement('div'), image = document.createElement('img');
    image.alt = 'Fotografía adjunta al reporte ciudadano'; image.src = `/api/admin/reports/${encodeURIComponent(code)}/photo`;
    image.addEventListener('error', () => message($('#detail-error'), 'No se pudo cargar la fotografía. Cierra el detalle e inténtalo de nuevo.'));
    photoSection.append(image);
    const list = document.createElement('dl');
    const details = { Folio: report.code, 'Descripción original': report.description, Ubicación: report.location, Registrado: date(report.createdAt), 'Última actualización': date(report.updatedAt), Nombre: report.name || 'No proporcionado', Correo: report.email || 'No proporcionado' };
    if (report.coordinates) details.Coordenadas = `${report.coordinates.latitude}, ${report.coordinates.longitude}`;
    for (const [label, value] of Object.entries(details)) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; list.append(dt, dd); }
    $('#detail-content').append(photoSection, list); $('#new-status').value = report.status; $('#status-form').hidden = false;
  } catch (error) { handleError($('#detail-error'), error); }
}
$('#close-detail').addEventListener('click', () => $('#detail-dialog').close());
$('#status-form').addEventListener('submit', async event => {
  event.preventDefault(); if (!selected) return;
  const button = event.currentTarget.querySelector('button'); button.disabled = true; message($('#detail-error'), ''); message($('#detail-success'), '');
  try {
    const { report } = await api(`/admin/reports/${selected.code}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: $('#new-status').value, version: selected.version }) });
    selected = report; message($('#detail-success'), 'Estado guardado correctamente.'); await loadReports();
  } catch (error) { handleError($('#detail-error'), error); }
  finally { button.disabled = false; }
});
api('/auth/session').then(enter).catch(error => { if (error.status !== 401) message($('#login-error'), error.message); });
