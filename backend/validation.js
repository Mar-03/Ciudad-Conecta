import { HttpError } from './errors.js';
export const CATEGORIES = ['alumbrado', 'calles', 'basura', 'agua', 'seguridad', 'otros'];
export const STATUSES = ['pendiente', 'en_proceso', 'resuelto'];
export const CODE_PATTERN = /^CC-[A-F0-9]{24}$/;
export function validateReport(body) {
  const text = (key, min, max, optional = false) => {
    const value = body[key] ?? '';
    if (typeof value !== 'string' || value.length > max || (!optional && value.trim().length < min)) throw new HttpError(400, `El campo ${key} debe tener entre ${min} y ${max} caracteres.`);
    return value.trim();
  };
  if (!CATEGORIES.includes(body.category)) throw new HttpError(400, 'Selecciona una categoría válida.');
  const result = { category: body.category, location: text('location', 5, 200), description: text('description', 20, 2000), name: text('name', 0, 100, true), email: text('email', 0, 254, true), coordinates: null };
  if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new HttpError(400, 'El correo electrónico no es válido.');
  if (body.coordinates) {
    try {
      const value = JSON.parse(body.coordinates);
      if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number' || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) throw new Error();
      result.coordinates = { latitude: value.latitude, longitude: value.longitude };
    } catch { throw new HttpError(400, 'Las coordenadas no son válidas.'); }
  }
  return result;
}
export function validateStatus(body) {
  if (!STATUSES.includes(body.status) || !Number.isInteger(body.version) || body.version < 1) throw new HttpError(400, 'El estado o la versión del reporte no es válido.');
  return { status: body.status, version: body.version };
}
