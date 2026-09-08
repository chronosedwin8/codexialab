// Resuelve rutas de assets locales (audio, imágenes) respetando el base del build.
// En producción la app se sirve bajo /app/, así que "/audio/x.mp3" debe pedirse a
// "/app/audio/x.mp3". Las URLs externas (http, data, blob) se dejan intactas.
export function assetUrl(path?: string | null): string {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  const base = import.meta.env.BASE_URL || '/';
  const b = base.endsWith('/') ? base : base + '/';
  return b + path.replace(/^\/+/, '');
}
