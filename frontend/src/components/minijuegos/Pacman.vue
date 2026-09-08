<template>
  <div class="mj pacman">
    <p class="mj-instr">🟡 Come todos los puntos con las <b>flechas</b>. ¡Evita al fantasma! En ❓ responde para congelarlo. ❤️ {{ vidas }}</p>
    <div class="tablero" :style="{ gridTemplateColumns: `repeat(${W}, 1fr)` }" tabindex="0" ref="boardRef" @keydown="onKey">
      <div v-for="(c, i) in vista" :key="i" :class="['cell', c.t]">
        <span v-if="c.t === 'wall'"></span>
        <span v-else-if="c.dot" class="dot"></span>
        <span v-else-if="c.power" class="power">❓</span>
        <span v-if="i === pacIdx" class="pac" :style="{ background: heroColor }">
          <span class="boca"></span>
        </span>
        <span v-else-if="ghosts.some(g => g === i)" class="ghost" :class="{ frozen }">👻</span>
      </div>
    </div>
    <p class="ayuda">Puntos: {{ dotsLeft }}</p>

    <transition name="fade"><div v-if="estado !== 'jugando'" class="overlay">
      <div class="end-card" :class="{ lose: estado === 'perdiste' }">
        <h3>{{ estado === 'ganaste' ? '¡Te los comiste todos! 🎉' : '¡Te atrapó el fantasma! 😵' }}</h3>
        <button v-if="estado === 'perdiste'" class="btn" @click="reset">🔄 Reintentar</button>
      </div>
    </div></transition>

    <transition name="fade"><div v-if="pregunta" class="overlay">
      <div class="q-card">
        <p class="q-text">{{ pregunta.enunciado }}</p>
        <div class="q-ops">
          <button v-for="(op, i) in pregunta.opciones" :key="i"
            :class="['q-op', { ok: qResp && i === pregunta.correcta, bad: qResp && qSel === i && i !== pregunta.correcta }]"
            :disabled="qResp" @click="responder(i)">{{ op }}</button>
        </div>
      </div>
    </div></transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const authStore = useAuthStore();
const props = defineProps<{ data: { preguntas: { enunciado: string; opciones: string[]; correcta: number }[] } }>();
const emit = defineEmits<{ ganar: [] }>();

const heroColors: Record<string, string> = { azul: '#3B82F6', rojo: '#EF4444', verde: '#22C55E', dorado: '#EAB308', morado: '#8B5CF6', naranja: '#F97316', rosa: '#EC4899', cyan: '#06B6D4' };
const heroColor = computed(() => heroColors[authStore.user?.avatar_config?.color ?? 'azul'] ?? '#FCD34D');

const MAP = [
  '#########',
  '#P..?..G#',
  '#.##.##.#',
  '#...#...#',
  '#.##.##.#',
  '#?.....?#',
  '#########',
];
const W = MAP[0].length, Hh = MAP.length;
const preguntas = computed(() => (props.data.preguntas ?? []).slice(0, 3));
const boardRef = ref<HTMLDivElement | null>(null);

const walls = ref<boolean[]>([]);
const dots = ref<boolean[]>([]);
const powers = ref<boolean[]>([]);
const pac = ref(0);
const ghosts = ref<number[]>([]);
let ghostStart: number[] = []; let pacStart = 0;
const vidas = ref(3);
const dotsLeft = ref(0);
const estado = ref<'jugando' | 'ganaste' | 'perdiste'>('jugando');
const frozen = ref(false);
let frozenT = 0; let timer = 0; let qPowerIdx = -1;

const pregunta = ref<{ enunciado: string; opciones: string[]; correcta: number } | null>(null);
const qSel = ref<number | null>(null); const qResp = ref(false);
let pq = 0;

const pacIdx = computed(() => pac.value);
const vista = computed(() => walls.value.map((w, i) => ({ t: w ? 'wall' : 'floor', dot: dots.value[i], power: powers.value[i] })));

function parse() {
  walls.value = Array(W * Hh).fill(false);
  dots.value = Array(W * Hh).fill(false);
  powers.value = Array(W * Hh).fill(false);
  ghostStart = [];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const ch = MAP[y][x]; const i = y * W + x;
    if (ch === '#') walls.value[i] = true;
    else if (ch === '.') dots.value[i] = true;
    else if (ch === '?') powers.value[i] = true;
    else if (ch === 'P') pacStart = i;
    else if (ch === 'G') ghostStart.push(i);
  }
  dotsLeft.value = dots.value.filter(Boolean).length;
}
function reset() {
  parse(); pac.value = pacStart; ghosts.value = [...ghostStart]; vidas.value = 3;
  estado.value = 'jugando'; frozen.value = false; frozenT = 0;
  boardRef.value?.focus();
}
parse(); pac.value = pacStart; ghosts.value = [...ghostStart]; dotsLeft.value = dots.value.filter(Boolean).length;

function libre(i: number) { return i >= 0 && i < W * Hh && !walls.value[i]; }
function vecinos(i: number) {
  const x = i % W, y = Math.floor(i / W); const v: number[] = [];
  if (x > 0) v.push(i - 1); if (x < W - 1) v.push(i + 1); if (y > 0) v.push(i - W); if (y < Hh - 1) v.push(i + W);
  return v.filter(libre);
}

function onKey(e: KeyboardEvent) {
  if (estado.value !== 'jugando' || pregunta.value) return;
  const map: Record<string, number> = { ArrowUp: -W, ArrowDown: W, ArrowLeft: -1, ArrowRight: 1 };
  const d = map[e.key]; if (d === undefined) return; e.preventDefault();
  const ni = pac.value + d;
  // evitar wrap horizontal
  if ((d === -1 && pac.value % W === 0) || (d === 1 && pac.value % W === W - 1)) return;
  if (!libre(ni)) return;
  pac.value = ni;
  if (dots.value[ni]) { dots.value[ni] = false; dotsLeft.value--; audio.sfx('sfx-moneda'); }
  if (powers.value[ni]) { powers.value[ni] = false; abrirPregunta(); }
  if (dotsLeft.value <= 0) { ganar(); return; }
  if (ghosts.value.includes(pac.value)) chocar();
}

function abrirPregunta() {
  pregunta.value = preguntas.value[pq % Math.max(1, preguntas.value.length)] ?? null; pq++;
  qSel.value = null; qResp.value = false;
  if (!pregunta.value) congelar();
}
function responder(i: number) {
  if (qResp.value) return;
  qSel.value = i; qResp.value = true;
  const ok = i === pregunta.value?.correcta;
  audio.sfx(ok ? 'sfx-correcto' : 'sfx-error');
  setTimeout(() => {
    pregunta.value = null; boardRef.value?.focus();
    if (ok) congelar();
  }, ok ? 600 : 900);
}
function congelar() { frozen.value = true; frozenT = 10; }

function tick() {
  if (estado.value !== 'jugando' || pregunta.value) return;
  if (frozenT > 0) { frozenT--; if (frozenT === 0) frozen.value = false; return; }
  ghosts.value = ghosts.value.map((g) => {
    const opts = vecinos(g);
    // sesgo hacia el pac
    opts.sort((a, b) => dist(a, pac.value) - dist(b, pac.value));
    const elegir = Math.random() < 0.6 ? opts[0] : opts[Math.floor(Math.random() * opts.length)];
    return elegir ?? g;
  });
  if (ghosts.value.includes(pac.value)) chocar();
}
function dist(a: number, b: number) { return Math.abs(a % W - b % W) + Math.abs(Math.floor(a / W) - Math.floor(b / W)); }
function chocar() {
  vidas.value--; audio.sfx('sfx-error');
  if (vidas.value <= 0) { estado.value = 'perdiste'; return; }
  pac.value = pacStart; ghosts.value = [...ghostStart];
}
function ganar() { estado.value = 'ganaste'; audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 900); }

onMounted(() => { boardRef.value?.focus(); timer = window.setInterval(tick, 520); });
onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.mj { position: relative; display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.85rem; margin: 0; text-align: center; }
.tablero { position: relative; display: grid; gap: 2px; background: #0F172A; padding: 6px; border-radius: 12px; outline: none; }
.tablero:focus { box-shadow: 0 0 0 2px #FCD34D; }
.cell { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
.cell.floor { background: #0B1220; }
.cell.wall { background: #1D4ED8; border-radius: 6px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: #FCD34D; }
.power { font-size: 1rem; }
.pac { position: absolute; width: 28px; height: 28px; border-radius: 50%; }
.ghost { position: absolute; font-size: 1.4rem; }
.ghost.frozen { filter: grayscale(1) brightness(1.5); opacity: 0.7; }
.ayuda { color: #94A3B8; font-size: 0.8rem; margin: 0; }
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.72); z-index: 5; border-radius: 12px; }
.end-card { background: #1E293B; border: 2px solid #16A34A; border-radius: 16px; padding: 1.25rem; text-align: center; color: #E2E8F0; }
.end-card.lose { border-color: #DC2626; }
.q-card { background: #1E293B; border: 2px solid #FCD34D; border-radius: 16px; padding: 1.25rem; max-width: 420px; }
.q-text { color: #F1F5F9; font-weight: 700; margin: 0 0 0.8rem; }
.q-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.q-op { padding: 0.6rem; background: #0F172A; border: 2px solid #334155; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; }
.q-op.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.q-op.bad { border-color: #DC2626; background: rgba(239,68,68,0.18); }
.btn { background: #7C3AED; color: #fff; border: none; padding: 0.5rem 1.1rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: 0.5rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
