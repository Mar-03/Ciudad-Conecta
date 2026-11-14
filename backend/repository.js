import { createHash, createHmac } from 'node:crypto';
import { FieldPath } from 'firebase-admin/firestore';
import { HttpError } from './errors.js';
export function createRepository(db, secret) {
  const reports = db.collection('reports');
  const photos = db.collection('reportPhotos');
  const visible = data => { const { requestHash, ...report } = data; return report; };
  return {
    async health() { await reports.limit(1).get(); },
    async create(data, photo, key) {
      if (!/^[a-f0-9-]{36}$/i.test(key || '')) throw new HttpError(400, 'Falta una clave de envío válida. Recarga la página.');
      const code = `CC-${createHmac('sha256', secret).update(key).digest('hex').slice(0, 24).toUpperCase()}`;
      const requestHash = createHash('sha256').update(JSON.stringify(data)).update(photo.bytes).digest('hex');
      const ref = reports.doc(code);
      return db.runTransaction(async tx => {
        const existing = await tx.get(ref);
        if (existing.exists) {
          if (existing.data().requestHash !== requestHash) throw new HttpError(409, 'Este envío ya fue registrado con otros datos. Recarga la página para registrar otro reporte.');
          return { report: visible(existing.data()), duplicate: true };
        }
        const now = new Date().toISOString();
        const report = { ...data, code, status: 'pendiente', createdAt: now, updatedAt: now, version: 1, photoSize: photo.size, requestHash };
        tx.create(ref, report);
        tx.create(photos.doc(code), photo);
        return { report: visible(report), duplicate: false };
      });
    },
    async get(code) {
      const document = await reports.doc(code).get();
      if (!document.exists) throw new HttpError(404, 'No se encontró el reporte. Verifica el folio.');
      return visible(document.data());
    },
    async photo(code) {
      const document = await photos.doc(code).get();
      if (!document.exists) throw new HttpError(404, 'La fotografía no está disponible.');
      return document.data();
    },
    async list(cursor) {
      let query = reports.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
      if (cursor) {
        try {
          if (typeof cursor !== 'string' || cursor.length > 300) throw new Error();
          const [createdAt, code] = JSON.parse(Buffer.from(cursor, 'base64url').toString());
          if (typeof createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(createdAt) || !/^CC-[A-F0-9]{24}$/.test(code)) throw new Error();
          query = query.startAfter(createdAt, code);
        } catch { throw new HttpError(400, 'El cursor de paginación no es válido.'); }
      }
      const snapshot = await query.limit(31).get();
      const result = snapshot.docs.slice(0, 30).map(doc => visible(doc.data()));
      const last = result.at(-1);
      return { reports: result, nextCursor: snapshot.size > 30 ? Buffer.from(JSON.stringify([last.createdAt, last.code])).toString('base64url') : null };
    },
    async stats() {
      const counts = await Promise.all(['pendiente', 'en_proceso', 'resuelto'].map(async status => (await reports.where('status', '==', status).count().get()).data().count));
      return { total: counts.reduce((sum, value) => sum + value, 0), pendiente: counts[0], en_proceso: counts[1], resuelto: counts[2] };
    },
    async update(code, { status, version }) {
      const ref = reports.doc(code);
      return db.runTransaction(async tx => {
        const document = await tx.get(ref);
        if (!document.exists) throw new HttpError(404, 'El reporte no existe.');
        const report = document.data();
        if (report.version !== version) throw new HttpError(409, 'Otra persona actualizó este reporte. Cierra el detalle y ábrelo de nuevo.');
        const changes = { status, version: version + 1, updatedAt: new Date().toISOString() };
        tx.update(ref, changes);
        return visible({ ...report, ...changes });
      });
    }
  };
}
