<template>
  <div class="mj camino">
    <p class="mj-instr">🎮 Llega a la 🏁 con las <b>flechas del teclado</b>. En las puertas ❓ responde para pasar.</p>
    <div class="tablero" :style="{ gridTemplateColumns: `repeat(${W}, 1fr)` }" tabindex="0" ref="boardRef" @keydown="onKey">
      <div v-for="(c, i) in celdas" :key="i" :class="['celda', tipoCelda(i)]">
        <span v-if="i === metaIdx">🏁</span>
        <span v-else-if="c === 1">🧱</span>
        <span v-else-if="esGate(i) && !gatesOpen.has(gateDe(i))">❓</span>
        <span v-if="i === avatarIdx" class="avatar" :style="{ background: heroColor }"></span>
      </div>
    </div>
    <p class="ayuda">Puertas abiertas: {{ gatesOpen.size }} / {{ gates.length }}</p>

    <transition name="fade">
      <div v-if="pregunta" class="overlay">
        <div class="q-card">
          <p class="q-text">{{ pregunta.enunciado }}</p>
          <div class="q-ops">
            <button v-for="(op, i) in pregunta.opciones" :key="i"
              :class="['q-op', { ok: qResp && i === pregunta.correcta, bad: qResp && qSel === i && i !== pregunta.correcta }]"
              :disabled="qResp" @click="responder(i)">{{ op }}</button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const authStore = useAuthStore();
const props = defineProps<{ data: { preguntas: { enunciado: string; opciones: string[]; correcta: number }[] } }>();
const emit = defineEmits<{ ganar: [] }>();

const heroColors: Record<string, string> = { azul: '#3B82F6', rojo: '#EF4444', verde: '#22C55E', dorado: '#EAB308', morado: '#8B5CF6', naranja: '#F97316', rosa: '#EC4899', cyan: '#06B6D4' };
const heroColor = computed(() => heroColors[authStore.user?.avatar_config?.color ?? 'azul'] ?? '#3B82F6');

const W = 12, H = 3;
const preguntas = computed(() => (props.data.preguntas ?? []).slice(0, 3));
const boardRef = ref<HTMLDivElement | null>(null);

const celdas = ref<number[]>(Array(W * H).fill(0)); // 0 paso, 1 muro
const gates = ref<{ idx: number }[]>([]);          // celdas-puerta (una por columna de muro)
const gatesOpen = ref<Set<number>>(new Set());
const avatar = ref({ x: 0, y: 1 });
const metaIdx = (1) * W + (W - 1);

const pregunta = ref<{ enunciado: string; opciones: string[]; correcta: number } | null>(null);
const qSel = ref<number | null>(null); const qResp = ref(false);
let gatePendiente = -1; let destino = { x: 0, y: 0 };

function idx(x: number, y: number) { return y * W + x; }
const avatarIdx = computed(() => idx(avatar.value.x, avatar.value.y));

function construir() {
  const cols = [3, 6, 9];
  cols.forEach((gx, g) => {
    const gap = Math.floor(Math.random() * H);
    for (let y = 0; y < H; y++) {
      if (y === gap) { gates.value.push({ idx: idx(gx, y) }); }
      else celdas.value[idx(gx, y)] = 1;
    }
  });
}
construir();

function esGate(i: number) { return gates.value.some((g) => g.idx === i); }
function gateDe(i: number) { return gates.value.findIndex((g) => g.idx === i); }
function tipoCelda(i: number) {
  if (celdas.value[i] === 1) return 'muro';
  if (esGate(i) && !gatesOpen.value.has(gateDe(i))) return 'gate';
  return 'paso';
}

function onKey(e: KeyboardEvent) {
  if (pregunta.value) return;
  const map: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const d = map[e.key]; if (!d) return; e.preventDefault();
  const nx = avatar.value.x + d[0], ny = avatar.value.y + d[1];
  if (nx < 0 || nx >= W || ny < 0 || ny >= H) return;
  const ni = idx(nx, ny);
  if (celdas.value[ni] === 1) return; // muro
  const gi = gateDe(ni);
  if (gi >= 0 && !gatesOpen.value.has(gi)) {
    // Puerta cerrada: lanzar pregunta
    gatePendiente = gi; destino = { x: nx, y: ny };
    pregunta.value = preguntas.value[gi % preguntas.value.length] ?? null;
    qSel.value = null; qResp.value = false;
    if (!pregunta.value) { gatesOpen.value.add(gi); avatar.value = { x: nx, y: ny }; }
    return;
  }
  avatar.value = { x: nx, y: ny };
  audio.sfx('sfx-salto');
  if (ni === metaIdx) { audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 400); }
}

function responder(i: number) {
  if (qResp.value) return;
  qSel.value = i; qResp.value = true;
  if (i === pregunta.value?.correcta) {
    audio.sfx('sfx-correcto');
    setTimeout(() => {
      gatesOpen.value.add(gatePendiente);
      avatar.value = { x: destino.x, y: destino.y };
      pregunta.value = null;
      boardRef.value?.focus();
      if (idx(destino.x, destino.y) === metaIdx) { audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 400); }
    }, 600);
  } else {
    audio.sfx('sfx-error');
    setTimeout(() => { qResp.value = false; qSel.value = null; }, 900);
  }
}

onMounted(() => boardRef.value?.focus());
</script>

<style scoped>
.mj { position: relative; display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.88rem; margin: 0; text-align: center; }
.tablero { display: grid; gap: 3px; background: #0F172A; padding: 6px; border-radius: 12px; outline: none; }
.tablero:focus { box-shadow: 0 0 0 2px #0EA5E9; }
.celda { position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 1.2rem; }
.celda.paso { background: #1E293B; }
.celda.muro { background: #334155; }
.celda.gate { background: rgba(252,211,77,0.18); border: 1px dashed #FCD34D; }
.avatar { position: absolute; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.4); }
.ayuda { color: #94A3B8; font-size: 0.8rem; margin: 0; }
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.7); z-index: 5; }
.q-card { background: #1E293B; border: 2px solid #FCD34D; border-radius: 16px; padding: 1.25rem; max-width: 420px; }
.q-text { color: #F1F5F9; font-weight: 700; margin: 0 0 0.8rem; }
.q-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.q-op { padding: 0.6rem; background: #0F172A; border: 2px solid #334155; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; }
.q-op:hover:not(:disabled) { border-color: #FCD34D; }
.q-op.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.q-op.bad { border-color: #DC2626; background: rgba(239,68,68,0.18); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
