import sharp from 'sharp';
import { HttpError } from './errors.js';
export async function processPhoto(file) {
  if (!file?.buffer?.length) throw new HttpError(400, 'Adjunta una fotografía del problema.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new HttpError(400, 'La fotografía debe ser JPG, PNG o WebP.');
  try {
    const metadata = await sharp(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' }).metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages || 1) > 1) throw new Error();
    // Se decodifica realmente; JPEG normalizado sin metadatos EXIF ni contenido activo.
    for (const size of [1280, 960, 640]) {
      const bytes = await sharp(file.buffer, { limitInputPixels: 25000000, failOn: 'warning' }).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).flatten({ background: '#ffffff' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      if (bytes.length <= 400 * 1024) return { bytes, contentType: 'image/jpeg', size: bytes.length };
    }
    throw new Error();
  } catch { throw new HttpError(400, 'No se pudo procesar la imagen. Usa una fotografía válida de hasta 25 megapíxeles.'); }
}
