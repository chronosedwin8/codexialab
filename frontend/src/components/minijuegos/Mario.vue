<template>
  <div class="mj mario">
    <p class="mj-instr">🍄 Muévete con ⬅️➡️ y salta con ⬆️/Espacio. Golpea los bloques ❓ y llega a la 🚩. Bloques: {{ abiertos }}/{{ totalBloques }}</p>
    <div class="stage" ref="stageRef">
      <canvas ref="canvasRef" :width="W" :height="H" class="game-canvas" tabindex="0" @keydown="onKey" @keyup="onKeyUp"></canvas>
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
      <transition name="fade"><div v-if="estado === 'ganaste'" class="overlay">
        <div class="end-card"><h3>¡Llegaste a la bandera! 🚩🎉</h3></div>
      </div></transition>
    </div>
    <p class="ayuda">🪙 {{ monedas }}</p>
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
const heroColor = computed(() => heroColors[authStore.user?.avatar_config?.color ?? 'azul'] ?? '#EF4444');

const W = 720, H = 320, GY = 280;
const preguntas = computed(() => (props.data.preguntas ?? []).slice(0, 3));
const canvasRef = ref<HTMLCanvasElement | null>(null);

const monedas = ref(0);
const estado = ref<'jugando' | 'ganaste'>('jugando');
const pregunta = ref<{ enunciado: string; opciones: string[]; correcta: number } | null>(null);
const qSel = ref<number | null>(null); const qResp = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let raf = 0; let lastT = 0; let cooldown = 0;
const hero = { x: 40, y: GY - 30, w: 26, h: 30, vx: 0, vy: 0, onGround: false };
const keys: Record<string, boolean> = {};
const plataformas = [
  { x: 0, y: GY, w: W, h: 40 },
  { x: 150, y: 220, w: 90, h: 14 },
  { x: 330, y: 180, w: 90, h: 14 },
  { x: 500, y: 220, w: 90, h: 14 },
];
const bloques = ref<{ x: number; y: number; s: number; usado: boolean; qi: number }[]>([
  { x: 180, y: 150, s: 30, usado: false, qi: 0 },
  { x: 360, y: 110, s: 30, usado: false, qi: 1 },
  { x: 540, y: 150, s: 30, usado: false, qi: 2 },
]);
const monedasObj = ref<{ x: number; y: number; got: boolean }[]>([
  { x: 165, y: 190, got: false }, { x: 345, y: 150, got: false }, { x: 525, y: 190, got: false }, { x: 650, y: 250, got: false },
]);
const flag = { x: 685, y: GY - 60, w: 10, h: 60 };
const totalBloques = computed(() => bloques.value.length);
const abiertos = computed(() => bloques.value.filter((b) => b.usado).length);
let bloquePend = -1;

function onKey(e: KeyboardEvent) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'Spacebar'].includes(e.key)) e.preventDefault();
  keys[e.key] = true;
}
function onKeyUp(e: KeyboardEvent) { keys[e.key] = false; }

function loop(t: number) {
  const dt = Math.min(2, (t - lastT) / 16.67); lastT = t;
  if (estado.value === 'jugando' && !pregunta.value) update(dt);
  draw();
  if (estado.value === 'jugando') raf = requestAnimationFrame(loop);
}

function update(dt: number) {
  const izq = keys['ArrowLeft'], der = keys['ArrowRight'], salta = keys['ArrowUp'] || keys[' '] || keys['Spacebar'];
  hero.vx = (der ? 3.2 : 0) - (izq ? 3.2 : 0);
  if (salta && hero.onGround) { hero.vy = -11; hero.onGround = false; audio.sfx('sfx-salto'); }
  hero.vy += 0.6 * dt;
  hero.x += hero.vx * dt; hero.y += hero.vy * dt;
  if (hero.x < 0) hero.x = 0; if (hero.x + hero.w > W) hero.x = W - hero.w;

  // colisión con plataformas (solo cuando cae)
  hero.onGround = false;
  for (const p of plataformas) {
    if (hero.x + hero.w > p.x && hero.x < p.x + p.w && hero.y + hero.h > p.y && hero.y + hero.h < p.y + p.h + 18 && hero.vy >= 0) {
      hero.y = p.y - hero.h; hero.vy = 0; hero.onGround = true;
    }
  }

  // bloques ?: al golpear desde abajo o tocar (cooldown evita re-disparar tras fallar)
  if (cooldown > 0) cooldown -= dt;
  for (const b of bloques.value) {
    if (b.usado || cooldown > 0) continue;
    if (hero.x + hero.w > b.x && hero.x < b.x + b.s && hero.y < b.y + b.s && hero.y + hero.h > b.y) {
      bloquePend = bloques.value.indexOf(b);
      pregunta.value = preguntas.value[b.qi % Math.max(1, preguntas.value.length)] ?? null;
      qSel.value = null; qResp.value = false;
      if (hero.vy < 0) hero.vy = 1;
      if (!pregunta.value) { b.usado = true; }
      return;
    }
  }

  // monedas
  for (const c of monedasObj.value) {
    if (!c.got && Math.abs(hero.x + hero.w / 2 - c.x) < 20 && Math.abs(hero.y + hero.h / 2 - c.y) < 22) {
      c.got = true; monedas.value++; audio.sfx('sfx-moneda');
    }
  }

  // bandera (requiere todos los bloques abiertos)
  if (hero.x + hero.w > flag.x && abiertos.value >= totalBloques.value) ganar();
}

function responder(i: number) {
  if (qResp.value) return;
  qSel.value = i; qResp.value = true;
  const ok = i === pregunta.value?.correcta;
  audio.sfx(ok ? 'sfx-correcto' : 'sfx-error');
  setTimeout(() => {
    if (ok && bloquePend >= 0) { bloques.value[bloquePend].usado = true; monedas.value += 2; }
    else { hero.y += 6; hero.vy = 2; cooldown = 40; } // empuja al héroe fuera del bloque tras fallar
    pregunta.value = null; canvasRef.value?.focus();
    lastT = performance.now();
  }, ok ? 600 : 900);
}

function ganar() { if (estado.value === 'ganaste') return; estado.value = 'ganaste'; audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 900); }

function draw() {
  if (!ctx) return;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#60A5FA'); g.addColorStop(1, '#BFDBFE');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.font = '30px serif'; ctx.fillText('☁️', 90, 60); ctx.fillText('☁️', 420, 90);
  // plataformas
  for (const p of plataformas) { ctx.fillStyle = p.y >= GY ? '#22C55E' : '#A16207'; ctx.fillRect(p.x, p.y, p.w, p.h); if (p.y >= GY) { ctx.fillStyle = '#15803D'; ctx.fillRect(p.x, p.y, p.w, 8); } }
  // bloques
  ctx.font = '22px serif'; ctx.textAlign = 'center';
  for (const b of bloques.value) { ctx.fillStyle = b.usado ? '#9CA3AF' : '#F59E0B'; ctx.fillRect(b.x, b.y, b.s, b.s); ctx.strokeStyle = '#92400E'; ctx.strokeRect(b.x, b.y, b.s, b.s); ctx.fillStyle = '#fff'; ctx.fillText(b.usado ? '✔' : '?', b.x + b.s / 2, b.y + b.s - 8); }
  // monedas
  for (const c of monedasObj.value) if (!c.got) ctx.fillText('🪙', c.x, c.y);
  // bandera
  ctx.fillStyle = abiertos.value >= totalBloques.value ? '#16A34A' : '#64748B'; ctx.fillRect(flag.x, flag.y, 4, flag.h);
  ctx.fillText('🚩', flag.x + 8, flag.y + 14);
  // héroe
  ctx.fillStyle = heroColor.value; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.fillRect(hero.x, hero.y, hero.w, hero.h); ctx.strokeRect(hero.x, hero.y, hero.w, hero.h);
  ctx.fillStyle = '#fff'; ctx.fillRect(hero.x + 16, hero.y + 7, 5, 5);
  ctx.textAlign = 'left';
}

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null;
  canvasRef.value?.focus();
  lastT = performance.now();
  raf = requestAnimationFrame(loop);
});
onUnmounted(() => cancelAnimationFrame(raf));
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.85rem; margin: 0; text-align: center; }
.stage { position: relative; width: 100%; max-width: 720px; border-radius: 14px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.4); }
.game-canvas { width: 100%; height: auto; display: block; outline: none; cursor: pointer; }
.ayuda { color: #FCD34D; font-weight: 700; margin: 0; }
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.72); }
.q-card { background: #1E293B; border: 2px solid #FCD34D; border-radius: 16px; padding: 1.25rem; max-width: 420px; }
.q-text { color: #F1F5F9; font-weight: 700; margin: 0 0 0.8rem; }
.q-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.q-op { padding: 0.6rem; background: #0F172A; border: 2px solid #334155; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; }
.q-op.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.q-op.bad { border-color: #DC2626; background: rgba(239,68,68,0.18); }
.end-card { background: #1E293B; border: 2px solid #16A34A; border-radius: 16px; padding: 1.25rem; color: #E2E8F0; text-align: center; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
