// Banco de voz para PREESCOLAR (juegos reimplementados del "Sitio Miguel").
import { assetUrl } from '@/utils/asset';
// Reproduce SIEMPRE clips MP3 naturales (ElevenLabs, offline) — NUNCA el TTS robótico
// del navegador. Cada frase se sirve en /audio/preescolar/bank/<slug(frase)>.mp3.
// El mismo `slugFrase` se usa en el script generador (Node) para que los nombres coincidan.

// Normaliza una frase a un nombre de archivo estable (sin acentos, minúsculas, guiones).
// DEBE producir EXACTAMENTE lo mismo que el generador en backend/scripts/generate-audio-pre-juegos.mjs
export function slugFrase(texto: string): string {
  return (texto || '')
    .toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'x';
}

let actual: HTMLAudioElement | null = null;

export function useVozBank() {
  function decir(texto?: string | null) {
    if (actual) { actual.pause(); actual.currentTime = 0; actual = null; }
    if (!texto) return;
    actual = new Audio(assetUrl(`/audio/preescolar/bank/${slugFrase(texto)}.mp3`));
    actual.volume = 1;
    actual.play().catch(() => { /* clip ausente o autoplay bloqueado: silencio, nunca TTS */ });
  }
  function parar() { if (actual) { actual.pause(); actual.currentTime = 0; actual = null; } }
  return { decir, parar };
}
