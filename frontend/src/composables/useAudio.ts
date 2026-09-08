import { ref } from 'vue';
import { assetUrl } from '@/utils/asset';

// Clips de ánimo/éxito pregrabados con voz infantil (Jessica). Se usan en lugar del TTS robótico.
const ANIMO_CLIPS = [
  '/audio/narracion/animo-1.mp3', '/audio/narracion/animo-2.mp3', '/audio/narracion/animo-3.mp3',
  '/audio/narracion/animo-4.mp3', '/audio/narracion/animo-5.mp3', '/audio/narracion/animo-6.mp3',
];
const EXITO_CLIPS = ['/audio/narracion/exito-1.mp3', '/audio/narracion/exito-2.mp3'];
const randomOf = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export function useAudio() {
  const muted = ref(false);
  let currentAudio: HTMLAudioElement | null = null;
  let sfxAudio: HTMLAudioElement | null = null;

  // Efecto de sonido del juego (no interrumpe la narración). Ej: sfx('sfx-correcto').
  function sfx(name: string): void {
    if (muted.value) return;
    sfxAudio = new Audio(assetUrl(`/audio/${name}.mp3`));
    sfxAudio.volume = 0.5;
    sfxAudio.play().catch(() => { /* autoplay */ });
  }

  function play(url: string): void {
    if (muted.value) return;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
    currentAudio = new Audio(assetUrl(url));
    currentAudio.volume = 0.7;
    currentAudio.play().catch(() => {
      // El navegador puede bloquear audio sin interacción previa del usuario
    });
  }

  function stop(): void {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  }

  function speak(texto: string, lang = 'es-CO'): void {
    if (muted.value) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;

    // Intentar usar una voz en español
    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith('es') && (v.name.includes('Google') || v.name.includes('Microsoft'))
    ) ?? voices.find((v) => v.lang.startsWith('es'));

    if (spanishVoice) utterance.voice = spanishVoice;

    window.speechSynthesis.speak(utterance);
  }

  // Reproduce un MP3; nunca usa TTS robótico. Sin fallback de voz.
  function playClip(src: string): void {
    if (muted.value) return;
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    window.speechSynthesis?.cancel();
    currentAudio = new Audio(assetUrl(src));
    currentAudio.volume = 0.85;
    currentAudio.play().catch(() => { /* el navegador puede bloquear autoplay; silencio */ });
  }

  // Narra: si hay MP3 propio lo usa; si no, un clip de ánimo con voz infantil (NUNCA voz robótica).
  function narrate(_texto: string, url?: string | null): void {
    if (muted.value) return;
    playClip(url || randomOf(ANIMO_CLIPS));
  }

  // Narración de celebración (al completar): usa un clip de éxito con voz infantil.
  function celebrate(url?: string | null): void {
    if (muted.value) return;
    playClip(url || randomOf(EXITO_CLIPS));
  }

  function toggleMute(): void {
    muted.value = !muted.value;
    if (muted.value) {
      stop();
      window.speechSynthesis?.cancel();
    }
  }

  return { muted, play, stop, speak, narrate, celebrate, sfx, toggleMute };
}
