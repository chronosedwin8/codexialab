<template>
  <Transition name="cine-fade" appear>
    <div v-if="visible" class="cine" :style="{ '--cine-color': color }" role="dialog" aria-label="Historia del mundo">
      <FondoEscena :color="color" :color-rayo="colorRayo" :girar="true" :destellos="8" />

      <button class="cine-skip" @click="saltar">Saltar historia ✕</button>

      <div class="cine-centro">
        <FuzzAvatar :color="colorFuzz" :tamano="180" :expresion="beat?.expresion ?? 'normal'" :mirar="true" />
        <Transition name="cine-texto" mode="out-in">
          <p class="cine-frase" :key="indice">{{ beat?.texto }}</p>
        </Transition>
      </div>

      <div class="cine-controles">
        <div class="cine-puntos">
          <span v-for="(_, i) in beats" :key="i" class="cine-punto" :class="{ on: i <= indice }"></span>
        </div>
        <button class="cine-next" :disabled="!puedeAvanzar" @click="avanzar">
          {{ esUltimo ? '¡Empezar! ▶' : 'Siguiente →' }}
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import FondoEscena from './FondoEscena.vue';
import FuzzAvatar from './FuzzAvatar.vue';
import { useAudio } from '@/composables/useAudio';
import { marcarVista } from '@/composables/cinematicas';
import type { BeatHistoria } from '@/data/historias';

const props = withDefaults(
  defineProps<{
    beats: readonly BeatHistoria[];
    color?: string;
    colorFuzz?: string;
    recordarComo?: string | null;
  }>(),
  { color: '#7C3AED', colorFuzz: '#22D3EE', recordarComo: null },
);
const emit = defineEmits<{ terminada: [] }>();

const audio = useAudio();
const indice = ref(0);
const visible = ref(true);
const puedeAvanzar = ref(false);

const beat = computed(() => props.beats[indice.value]);
const esUltimo = computed(() => indice.value >= props.beats.length - 1);
const colorRayo = computed(() => aclarar(props.color, 1.18));

let temporizador: ReturnType<typeof setTimeout> | null = null;
let desbloqueo: ReturnType<typeof setTimeout> | null = null;

function aclarar(hex: string, f: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const c = (v: number) => Math.min(255, Math.round(v * f));
  return `rgb(${c((n >> 16) & 255)} ${c((n >> 8) & 255)} ${c(n & 255)})`;
}

// Narra un beat: usa su audio si lo trae; si no, la voz del navegador (historia).
function reproducirBeat(): void {
  const b = beat.value;
  if (!b) return;
  puedeAvanzar.value = false;
  if (desbloqueo) clearTimeout(desbloqueo);
  desbloqueo = setTimeout(() => (puedeAvanzar.value = true), 600);

  // Narra con audio real si el beat lo trae; si no, la historia se LEE (texto en
  // pantalla). No se usa TTS del navegador (suena robótico; el proyecto lo eliminó).
  if (b.audio) audio.narrate('', b.audio);

  if (temporizador) clearTimeout(temporizador);
  temporizador = setTimeout(avanzar, b.duracion);
}

function avanzar(): void {
  if (!puedeAvanzar.value && !esUltimo.value) return;
  if (temporizador) clearTimeout(temporizador);
  if (esUltimo.value) { terminar(); return; }
  indice.value += 1;
}

function saltar(): void { terminar(); }

function terminar(): void {
  if (temporizador) clearTimeout(temporizador);
  if (desbloqueo) clearTimeout(desbloqueo);
  audio.stop();
  try { window.speechSynthesis?.cancel(); } catch { /* noop */ }
  visible.value = false;
  if (props.recordarComo) marcarVista(props.recordarComo);
  setTimeout(() => emit('terminada'), 260);
}

watch(indice, reproducirBeat, { immediate: true });
onBeforeUnmount(() => { if (temporizador) clearTimeout(temporizador); if (desbloqueo) clearTimeout(desbloqueo); });
</script>

<style scoped>
.cine {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--cine-color);
}
.cine-skip {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 3;
  background: rgba(0, 0, 0, 0.35);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  cursor: pointer;
}
.cine-skip:hover { background: rgba(0, 0, 0, 0.5); }
.cine-centro {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.4rem;
  padding: 1.5rem;
  max-width: 680px;
  text-align: center;
}
.cine-frase {
  color: #fff;
  font-size: clamp(1.1rem, 2.6vw, 1.7rem);
  font-weight: 700;
  line-height: 1.4;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 18px;
  padding: 1rem 1.4rem;
  margin: 0;
}
.cine-controles {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.6rem;
}
.cine-puntos { display: flex; gap: 0.4rem; }
.cine-punto { width: 10px; height: 10px; border-radius: 50%; background: rgba(255, 255, 255, 0.35); transition: background 0.3s; }
.cine-punto.on { background: #fff; }
.cine-next {
  background: #fff;
  color: var(--cine-color);
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.8rem;
  font-size: 1.05rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s;
}
.cine-next:disabled { opacity: 0.55; cursor: default; }
.cine-next:not(:disabled):hover { transform: translateY(-2px) scale(1.03); }

.cine-fade-enter-active, .cine-fade-leave-active { transition: opacity 0.35s ease; }
.cine-fade-enter-from, .cine-fade-leave-to { opacity: 0; }
.cine-texto-enter-active, .cine-texto-leave-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.cine-texto-enter-from { opacity: 0; transform: translateY(8px); }
.cine-texto-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
