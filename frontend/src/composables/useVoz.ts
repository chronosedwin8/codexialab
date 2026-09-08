import { assetUrl } from '@/utils/asset';
// Voz para PREESCOLAR. Reproduce SIEMPRE clips MP3 de ElevenLabs (voz natural, offline),
// por un ÚNICO canal de audio. No usa la síntesis robótica del navegador (evita que se
// escuchen dos voces a la vez). Si un clip no existe, simplemente no suena.
let actual: HTMLAudioElement | null = null;
let ultimaUrl: string | null = null;

// URLs de los clips fijos de interfaz (generados con ElevenLabs: generate-voz-ui-preescolar.mjs)
export const VOZ_UI = {
  saludo: '/audio/preescolar/ui/home-saludo.mp3',
  mate: '/audio/preescolar/ui/mate-nombre.mp3',
  letras: '/audio/preescolar/ui/letras-nombre.mp3',
  prog: '/audio/preescolar/ui/prog-nombre.mp3',
  mundos: '/audio/preescolar/ui/mundos-nombre.mp3',
  mateIntro: '/audio/preescolar/ui/mate-intro.mp3',
  letrasIntro: '/audio/preescolar/ui/letras-intro.mp3',
  progIntro: '/audio/preescolar/ui/prog-intro.mp3',
  mundosIntro: '/audio/preescolar/ui/mundos-intro.mp3',
  bien: '/audio/preescolar/ui/bien.mp3',
  casi: '/audio/preescolar/ui/casi.mp3',
  ganaste: '/audio/preescolar/ui/ganaste.mp3',
  mundo: (id: number) => `/audio/preescolar/ui/mundo-${id}.mp3`,
};

function pararTodo() {
  if (actual) { actual.pause(); actual.currentTime = 0; actual = null; }
}

export function useVoz() {
  // Reproduce un clip por URL (MP3 de ElevenLabs). Detiene cualquier voz anterior.
  function decir(url?: string | null) {
    pararTodo();
    if (!url) return;
    ultimaUrl = url;
    actual = new Audio(assetUrl(url));
    actual.volume = 1;
    actual.play().catch(() => { /* autoplay bloqueado o clip ausente: silencio */ });
  }

  function repetir() { if (ultimaUrl) decir(ultimaUrl); }
  function parar() { pararTodo(); }

  return { decir, repetir, parar, VOZ_UI };
}
