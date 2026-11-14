export const categories = { alumbrado: 'Alumbrado', calles: 'Calles dañadas', basura: 'Basura', agua: 'Agua potable', seguridad: 'Seguridad', otros: 'Otros servicios' };
export const statuses = { pendiente: 'Pendiente', en_proceso: 'En proceso', resuelto: 'Resuelto' };
export const date = value => new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
export async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', signal: controller.signal, headers: { 'X-Requested-With': 'CiudadConecta', ...options.headers } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      const error = new Error(payload?.error || 'El servicio no está disponible. Intenta nuevamente en unos momentos.');
      error.status = response.status;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('El servidor tardó demasiado. Conserva el formulario e intenta nuevamente.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export function message(element, text) { element.textContent = text; element.hidden = !text; }
export async function showEnvironment() {
  try {
    const health = await api('/health');
    if (health.mode === 'emulator') message(document.querySelector('#environment-notice'), 'Entorno de desarrollo · Los reportes se guardan en el emulador local de Firebase.');
  } catch { /* Los formularios muestran errores accionables al usar el servicio. */ }
}
