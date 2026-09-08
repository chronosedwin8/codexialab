<template>
  <div class="pre-act">
    <!-- Instrucción + botón de voz -->
    <div class="instr-bar">
      <button class="voz-grande" @click="repetir" :class="{ hablando: false }">🔊</button>
      <p class="instr">{{ config.instruccion }}</p>
    </div>

    <div class="escena" :class="{ shake }">
      <!-- CONTAR -->
      <template v-if="sub === 'contar'">
        <div class="objetos">
          <span v-for="i in config.cantidad" :key="i" class="obj">{{ config.objeto }}</span>
        </div>
        <div class="opciones-num">
          <button v-for="(n, i) in config.opciones" :key="i" class="num-btn" :disabled="estado === 'bien'" @click="responder(n === config.cantidad)">{{ n }}</button>
        </div>
      </template>

      <!-- ELEGIR -->
      <template v-else-if="sub === 'elegir'">
        <div class="opciones-img">
          <button v-for="(op, i) in config.opciones" :key="i" class="img-btn" :disabled="estado === 'bien'" @click="responder(!!op.correcta)">{{ op.icono }}</button>
        </div>
      </template>

      <!-- OPERACIÓN -->
      <template v-else-if="sub === 'operacion'">
        <div class="operacion">
          <span class="grupo"><span v-for="i in config.a" :key="'a'+i" class="obj sm">{{ config.objeto }}</span></span>
          <span class="signo">{{ config.op }}</span>
          <span class="grupo"><span v-for="i in config.b" :key="'b'+i" class="obj sm">{{ config.objeto }}</span></span>
          <span class="signo">=</span>
          <span class="incog">❓</span>
        </div>
        <div class="opciones-num">
          <button v-for="(n, i) in config.opciones" :key="i" class="num-btn" :disabled="estado === 'bien'" @click="responder(n === resultado)">{{ n }}</button>
        </div>
      </template>

      <!-- ORDENAR -->
      <template v-else-if="sub === 'ordenar'">
        <p class="mini-ayuda">Toca en orden: {{ siguiente }} de {{ items.length }}</p>
        <div class="orden-items">
          <button v-for="(it, i) in items" :key="i" class="orden-btn" :class="{ listo: it.hecho }" :disabled="it.hecho || estado === 'bien'" @click="tocarOrden(it)">
            <span class="o-icono">{{ it.icono }}</span>
            <span v-if="it.hecho" class="o-num">{{ it.orden }}</span>
          </button>
        </div>
      </template>

      <!-- TRAZO -->
      <template v-else-if="sub === 'trazo'">
        <div class="trazo-wrap">
          <canvas ref="lienzo" width="320" height="320" class="lienzo"
            @pointerdown="trazoStart" @pointermove="trazoMove" @pointerup="trazoEnd" @pointerleave="trazoEnd"></canvas>
        </div>
        <div class="trazo-btns">
          <button class="t-btn borrar" @click="borrar">🧽 Borrar</button>
          <button class="t-btn listo" :disabled="largo < 150" @click="comprobarTrazo">✅ ¡Listo!</button>
        </div>
      </template>
    </div>

    <!-- Reacción positiva -->
    <transition name="pop">
      <div v-if="estado === 'bien'" class="bravo">
        <div class="bravo-emoji">🎉</div>
        <p>¡Muy bien!</p>
        <div class="bravo-stars"><span v-for="s in 3" :key="s" :class="{ on: estrellas >= s }">⭐</span></div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useVoz, VOZ_UI } from '@/composables/useVoz';
import { useAudio } from '@/composables/useAudio';

const voz = useVoz();
const audio = useAudio();
const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();

const sub = computed(() => props.config.sub);
const audioUrl = computed(() => props.config.audio || props.config.narracion?.url_audio_intro || null);
const resultado = computed(() => props.config.op === '+' ? props.config.a + props.config.b : props.config.a - props.config.b);

const estado = ref<'jugando' | 'bien'>('jugando');
const fallos = ref(0);
const shake = ref(false);
const estrellas = computed(() => (fallos.value === 0 ? 3 : fallos.value === 1 ? 2 : 1));

// ── ORDENAR ──
const items = ref<{ icono: string; orden: number; hecho: boolean }[]>([]);
const siguiente = ref(1);
function barajarOrden() {
  const arr = (props.config.items ?? []).map((it: any) => ({ icono: it.icono, orden: it.orden, hecho: false }));
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  items.value = arr; siguiente.value = 1;
}
function tocarOrden(it: { icono: string; orden: number; hecho: boolean }) {
  if (it.orden === siguiente.value) {
    it.hecho = true; siguiente.value++; audio.sfx('sfx-correcto');
    if (siguiente.value > items.value.length) celebrar();
  } else {
    fallar();
    items.value.forEach((x) => (x.hecho = false)); siguiente.value = 1;
  }
}

// ── TRAZO ──
// Dibuja una guía visible de la figura y VALIDA que el trazo del niño cubra esa figura
// (no acepta cualquier garabato: si dibujan otra letra, no la da por correcta).
const lienzo = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let dibujando = false; let px = 0; let py = 0;
const largo = ref(0);
const GRID = 26;
const objetivo = new Set<number>();   // celdas que forman la figura guía
const cubiertas = new Set<number>();  // celdas de la figura que el niño ya pintó
let dibTotal = 0, dibObj = 0;         // celdas pintadas en total / sobre la figura

function celdaDe(x: number, y: number) {
  const c = 320 / GRID;
  const gx = Math.min(GRID - 1, Math.max(0, Math.floor(x / c)));
  const gy = Math.min(GRID - 1, Math.max(0, Math.floor(y / c)));
  return gy * GRID + gx;
}
function dibujarGuia() {
  if (!ctx) return;
  ctx.clearRect(0, 0, 320, 320);
  ctx.fillStyle = 'rgba(124,58,237,0.16)';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 230px Arial';
  ctx.fillText(String(props.config.figura ?? ''), 160, 168);
}
function construirObjetivo() {
  if (!ctx) return;
  const data = ctx.getImageData(0, 0, 320, 320).data;
  objetivo.clear();
  const c = 320 / GRID;
  for (let gy = 0; gy < GRID; gy++) for (let gx = 0; gx < GRID; gx++) {
    const x = Math.floor((gx + 0.5) * c), y = Math.floor((gy + 0.5) * c);
    if (data[(y * 320 + x) * 4 + 3] > 22) objetivo.add(gy * GRID + gx);
  }
}
function trazoStart(e: PointerEvent) {
  dibujando = true; const r = lienzo.value!.getBoundingClientRect();
  px = (e.clientX - r.left) * (320 / r.width); py = (e.clientY - r.top) * (320 / r.height);
}
function trazoMove(e: PointerEvent) {
  if (!dibujando || !ctx) return;
  const r = lienzo.value!.getBoundingClientRect();
  const x = (e.clientX - r.left) * (320 / r.width), y = (e.clientY - r.top) * (320 / r.height);
  ctx.strokeStyle = '#7C3AED'; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
  largo.value += Math.hypot(x - px, y - py);
  const cel = celdaDe(x, y); dibTotal++;
  if (objetivo.has(cel)) { dibObj++; cubiertas.add(cel); }
  px = x; py = y;
}
function trazoEnd() { dibujando = false; }
function borrar() {
  dibujarGuia(); largo.value = 0; cubiertas.clear(); dibTotal = 0; dibObj = 0;
}
function comprobarTrazo() {
  if (objetivo.size === 0) { celebrar(); return; } // sin máscara (símbolo raro): acepta el intento
  const cobertura = cubiertas.size / objetivo.size;       // ¿cuánto de la figura cubrió?
  const precision = dibTotal ? dibObj / dibTotal : 0;     // ¿cuánto dibujó FUERA de la figura?
  if (cobertura >= 0.45 && precision >= 0.4) celebrar();
  else fallar();
}

// ── Resultado común ──
function fallar() {
  fallos.value++; shake.value = true; audio.sfx('sfx-error');
  voz.decir(VOZ_UI.casi);
  setTimeout(() => { shake.value = false; }, 450);
}
function celebrar() {
  estado.value = 'bien';
  audio.sfx('sfx-ganar');
  // La voz de celebración la dice la vista (PreescolarActivityView) para no solapar dos voces.
  voz.parar();
  setTimeout(() => emit('complete', estrellas.value), 1500);
}
function responder(ok: boolean) {
  if (estado.value === 'bien') return;
  if (ok) celebrar(); else fallar();
}

function repetir() { voz.decir(audioUrl.value); }

onMounted(() => {
  if (sub.value === 'ordenar') barajarOrden();
  if (sub.value === 'trazo') {
    ctx = lienzo.value?.getContext('2d', { willReadFrequently: true }) ?? null;
    dibujarGuia();
    construirObjetivo();
  }
  setTimeout(() => voz.decir(audioUrl.value), 300);
});
onUnmounted(() => voz.parar());
</script>

<style scoped>
.pre-act { display: flex; flex-direction: column; align-items: center; gap: 1rem; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.instr-bar { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 4px solid #FDE68A; border-radius: 22px; padding: 0.75rem 1rem; max-width: 620px; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
.voz-grande { background: #F59E0B; border: none; border-radius: 50%; width: 60px; height: 60px; font-size: 1.8rem; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 0 #B45309; }
.voz-grande:active { transform: translateY(3px); box-shadow: 0 1px 0 #B45309; }
.instr { color: #334155; font-size: 1.2rem; margin: 0; line-height: 1.3; }

.escena { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; background: rgba(255,255,255,0.55); border-radius: 28px; padding: 1.5rem; min-width: 320px; }
.escena.shake { animation: sh 0.4s; }
@keyframes sh { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }

.objetos { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; max-width: 460px; }
.obj { font-size: 3rem; animation: bob 1.6s ease-in-out infinite; }
.obj.sm { font-size: 2rem; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

.opciones-num { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.num-btn { width: 90px; height: 90px; border-radius: 24px; border: none; background: linear-gradient(160deg,#38BDF8,#0EA5E9); color: #fff; font-size: 2.6rem; font-family: inherit; cursor: pointer; box-shadow: 0 6px 0 #0369A1; }
.num-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #0369A1; }

.opciones-img { display: flex; gap: 1.25rem; flex-wrap: wrap; justify-content: center; }
.img-btn { min-width: 110px; min-height: 110px; padding: 0 0.5rem; border-radius: 26px; border: 5px solid #fff; background: #fff; font-size: 3.4rem; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,0.12); }
.img-btn:hover { border-color: #FCD34D; }
.img-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 rgba(0,0,0,0.12); }

.operacion { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; justify-content: center; }
.grupo { background: #fff; border-radius: 16px; padding: 0.5rem; display: flex; gap: 2px; }
.signo { font-size: 2.4rem; color: #1E293B; }
.incog { font-size: 2.6rem; }

.mini-ayuda { color: #475569; margin: 0; font-size: 1rem; }
.orden-items { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.orden-btn { position: relative; width: 100px; height: 100px; border-radius: 24px; border: 5px solid #fff; background: #fff; font-size: 3rem; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,0.12); }
.orden-btn.listo { border-color: #4ADE80; background: #DCFCE7; }
.o-num { position: absolute; top: -10px; right: -10px; width: 32px; height: 32px; background: #16A34A; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; }

.trazo-wrap { position: relative; width: 320px; height: 320px; }
.guia { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14rem; color: rgba(0,0,0,0.12); pointer-events: none; user-select: none; }
.lienzo { position: relative; width: 320px; height: 320px; background: #fff; border-radius: 20px; border: 4px dashed #C4B5FD; touch-action: none; cursor: crosshair; }
.trazo-btns { display: flex; gap: 1rem; }
.t-btn { border: none; border-radius: 18px; padding: 0.7rem 1.3rem; font-size: 1.1rem; font-family: inherit; cursor: pointer; color: #fff; }
.t-btn.borrar { background: #94A3B8; box-shadow: 0 4px 0 #64748B; }
.t-btn.listo { background: #16A34A; box-shadow: 0 4px 0 #15803D; }
.t-btn:disabled { opacity: 0.4; }

.bravo { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; background: rgba(255,255,255,0.85); z-index: 50; }
.bravo-emoji { font-size: 6rem; animation: pop 0.5s; }
.bravo p { font-size: 2.4rem; color: #16A34A; margin: 0; }
.bravo-stars span { font-size: 2.6rem; filter: grayscale(1); opacity: 0.4; }
.bravo-stars span.on { filter: none; opacity: 1; animation: pop 0.4s; }
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
.pop-enter-active { animation: fade 0.3s; } @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
</style>
