<template>
  <div class="ms" :style="{ background: tema.page }">
    <header class="ms-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>🐍 Mind-Snake</h2>
      <div class="hud"><span>🍎 {{ score }} · 🌍{{ world }}<span v-if="atravesar"> · 🌀</span></span><span>🏆 {{ best }}</span></div>
    </header>

    <div class="stage">
      <transition name="banner"><div v-if="bannerMundo" class="mundo-banner">🌍 ¡Mundo {{ world }}!</div></transition>
      <canvas ref="lienzo" :width="W" :height="H" class="lienzo"
        @pointerdown="onDown" @pointerup="onUp"></canvas>

      <!-- Inicio -->
      <div v-if="estado === 'inicio'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">🐍🍎</div>
          <h3>Mind-Snake</h3>
          <p class="ov-txt">Guía la serpiente para <b>comer manzanas</b> y crecer. Planea tu ruta: <b>no choques</b> con los muros 🧱 ni contigo. Empieza lento y cada mundo va más rápido. ¡Pura estrategia!</p>
          <button class="wrap-toggle" :class="{ on: atravesar }" @click="toggleWrap">
            <span>🌀 Atravesar bordes <small>(más fácil)</small></span>
            <span class="sw">{{ atravesar ? 'SÍ' : 'NO' }}</span>
          </button>
          <p class="wrap-hint">{{ atravesar ? 'La serpiente sale por un lado y entra por el otro.' : 'Chocar con el borde termina la partida.' }}</p>
          <p class="ov-best">🏆 Tu mejor: {{ best }} 🍎</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">{{ r.puntos }}🍎</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
              </li>
              <li v-if="!topScores.length" class="rk-empty">¡Sé el primero del ranking!</li>
            </ol>
          </div>
          <div class="ov-acciones">
            <button class="btn-jugar" @click="iniciar">▶ ¡Jugar!</button>
            <button class="btn-mapa" @click="irMapa">🗺️ Volver al mapa</button>
          </div>
        </div>
      </div>

      <!-- Game over -->
      <div v-else-if="estado === 'fin'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">{{ score >= best && score > 0 ? '🏆' : '💥' }}</div>
          <h3>{{ score >= best && score > 0 ? '¡Nuevo récord!' : '¡Chocaste!' }}</h3>
          <p class="ov-score">🍎 {{ score }} manzanas · 🌍 Mundo {{ world }}</p>
          <p v-if="enTop" class="entop">🎉 ¡Entraste al Top 5!</p>
          <p class="ov-best">🏆 Tu mejor: {{ best }} 🍎</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">{{ r.puntos }}🍎</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
              </li>
              <li v-if="!topScores.length" class="rk-empty">¡Sé el primero del ranking!</li>
            </ol>
          </div>
          <div class="ov-acciones">
            <button class="btn-jugar" @click="iniciar">🔁 Otra vez</button>
            <button class="btn-mapa" @click="salir">🏠 Menú</button>
            <button class="btn-mapa" @click="irMapa">🗺️ Mapa</button>
          </div>
        </div>
      </div>
    </div>

    <!-- D-pad -->
    <div v-if="estado === 'jugando'" class="dpad">
      <button class="dbtn up" @pointerdown.prevent="setDir(0, -1)">▲</button>
      <div class="dmid">
        <button class="dbtn left" @pointerdown.prevent="setDir(-1, 0)">◀</button>
        <button class="dbtn right" @pointerdown.prevent="setDir(1, 0)">▶</button>
      </div>
      <button class="dbtn down" @pointerdown.prevent="setDir(0, 1)">▼</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAudio } from '@/composables/useAudio';
import { useAuthStore } from '@/stores/auth';
import { juegosApi } from '@/api/index';

const router = useRouter();
const audio = useAudio();
const auth = useAuthStore();
const miNombre = computed(() => auth.user?.nombre || '');
const JUEGO = 'mind-snake';

const GW = 15, GH = 15, CS = 22;
const W = GW * CS, H = GH * CS;
const lienzo = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0, last = 0, acc = 0;

const THEMES = [
  { page: 'linear-gradient(180deg,#0f172a,#1e293b)', board: '#0b1220', grid: '#1e293b', snake: '#22c55e', snake2: '#16a34a', food: '#ef4444', wall: '#475569' },
  { page: 'linear-gradient(180deg,#1e1b4b,#312e81)', board: '#161335', grid: '#2e2a5e', snake: '#38bdf8', snake2: '#0ea5e9', food: '#fbbf24', wall: '#6366f1' },
  { page: 'linear-gradient(180deg,#3b0764,#581c87)', board: '#2a0a45', grid: '#4c1d70', snake: '#f0abfc', snake2: '#d946ef', food: '#fde047', wall: '#a855f7' },
  { page: 'linear-gradient(180deg,#0c4a3e,#065f46)', board: '#06382e', grid: '#0f5d4c', snake: '#fde047', snake2: '#eab308', food: '#fb7185', wall: '#10b981' },
];

const estado = ref<'inicio' | 'jugando' | 'fin'>('inicio');
const score = ref(0);
const world = ref(1);
const best = ref(Number(localStorage.getItem('mindsnake_best') || 0));
const enTop = ref(false);
const topScores = ref<any[]>([]);
const bannerMundo = ref(false);
const tema = computed(() => THEMES[(world.value - 1) % THEMES.length]);

interface Cel { x: number; y: number; }
let snake: Cel[] = [];
let dir: Cel = { x: 1, y: 0 };
let nextDirs: Cel[] = [];
let food: Cel = { x: 0, y: 0 };
let obstacles: Cel[] = [];

// Velocidad LENTA al inicio y sube por MUNDO (no por cada manzana)
const speed = computed(() => Math.min(12, 4 + (world.value - 1) * 1)); // celdas/seg
const atravesar = ref(localStorage.getItem('mindsnake_wrap') === '1');
function toggleWrap() { atravesar.value = !atravesar.value; localStorage.setItem('mindsnake_wrap', atravesar.value ? '1' : '0'); }
let bannerTimer: ReturnType<typeof setTimeout>;
let ac: AudioContext | null = null;
function tono(freq: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.2) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
  const t = ac.currentTime + t0;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.03);
}
function sonComer() { tono(660, 0, 0.09, 'square', 0.16); tono(990, 0.08, 0.1, 'square', 0.16); }
function sonChoque() { tono(200, 0, 0.18, 'sawtooth', 0.22); tono(110, 0.12, 0.24, 'sawtooth', 0.22); }

function libre(x: number, y: number): boolean {
  return !snake.some((s) => s.x === x && s.y === y) && !obstacles.some((o) => o.x === x && o.y === y) && !(food.x === x && food.y === y);
}
function spawnFood() {
  let x = 0, y = 0, intentos = 0;
  do { x = Math.floor(Math.random() * GW); y = Math.floor(Math.random() * GH); intentos++; }
  while (!(!snake.some((s) => s.x === x && s.y === y) && !obstacles.some((o) => o.x === x && o.y === y)) && intentos < 400);
  food = { x, y };
}
function addObstaculo() {
  if (obstacles.length >= 14) return;
  const head = snake[0];
  for (let t = 0; t < 60; t++) {
    const x = Math.floor(Math.random() * GW), y = Math.floor(Math.random() * GH);
    if (libre(x, y) && (Math.abs(x - head.x) + Math.abs(y - head.y) > 3)) { obstacles.push({ x, y }); return; }
  }
}

function setDir(x: number, y: number) {
  if (estado.value !== 'jugando') return;
  const ult = nextDirs.length ? nextDirs[nextDirs.length - 1] : dir;
  if (x === -ult.x && y === -ult.y) return;       // no reversa directa
  if (x === ult.x && y === ult.y) return;
  if (nextDirs.length < 2) nextDirs.push({ x, y });
}

function step() {
  if (nextDirs.length) { const nd = nextDirs.shift()!; if (!(nd.x === -dir.x && nd.y === -dir.y)) dir = nd; }
  const head = snake[0];
  let nx = head.x + dir.x, ny = head.y + dir.y;
  if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) {
    if (atravesar.value) { nx = (nx + GW) % GW; ny = (ny + GH) % GH; }   // sale por un lado y entra por el otro
    else return perder();
  }
  if (obstacles.some((o) => o.x === nx && o.y === ny)) return perder();
  const willEat = (nx === food.x && ny === food.y);
  const cuerpo = willEat ? snake : snake.slice(0, snake.length - 1);
  if (cuerpo.some((s) => s.x === nx && s.y === ny)) return perder();
  snake.unshift({ x: nx, y: ny });
  if (willEat) {
    score.value++; audio.sfx('sfx-correcto'); sonComer(); spawnFood();
    const nw = Math.floor(score.value / 6) + 1;
    if (nw > world.value) { world.value = nw; addObstaculo(); addObstaculo(); bannerMundo.value = true; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (bannerMundo.value = false), 1400); }
  } else {
    snake.pop();
  }
}

function dibujar() {
  if (!ctx) return;
  const t = tema.value;
  ctx.fillStyle = t.board; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = t.grid; ctx.lineWidth = 1;
  for (let i = 1; i < GW; i++) { ctx.beginPath(); ctx.moveTo(i * CS, 0); ctx.lineTo(i * CS, H); ctx.stroke(); }
  for (let i = 1; i < GH; i++) { ctx.beginPath(); ctx.moveTo(0, i * CS); ctx.lineTo(W, i * CS); ctx.stroke(); }
  // obstáculos
  for (const o of obstacles) { ctx.fillStyle = t.wall; rrect(o.x * CS + 2, o.y * CS + 2, CS - 4, CS - 4, 5); ctx.fill(); }
  // comida
  ctx.fillStyle = t.food; ctx.beginPath(); ctx.arc(food.x * CS + CS / 2, food.y * CS + CS / 2, CS * 0.34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(food.x * CS + CS * 0.4, food.y * CS + CS * 0.38, CS * 0.09, 0, Math.PI * 2); ctx.fill();
  // serpiente
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    ctx.fillStyle = i === 0 ? t.snake : t.snake2;
    rrect(s.x * CS + 1.5, s.y * CS + 1.5, CS - 3, CS - 3, 7); ctx.fill();
  }
  // ojos en la cabeza (mirando hacia la dirección)
  const hd = snake[0];
  if (hd) {
    const cx = hd.x * CS + CS / 2 + dir.x * 3, cy = hd.y * CS + CS / 2 + dir.y * 3;
    const px = -dir.y, py = dir.x;   // perpendicular a la dirección
    for (const s of [1, -1]) {
      const ox = cx + px * 4 * s, oy = cy + py * 4 * s;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ox + dir.x, oy + dir.y, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  }
}
function rrect(x: number, y: number, w: number, h: number, r: number) {
  if (!ctx) return;
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function loop(ts: number) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.1, (ts - last) / 1000); last = ts;
  if (estado.value === 'jugando') {
    acc += dt;
    const intervalo = 1 / speed.value;
    while (acc >= intervalo && estado.value === 'jugando') { step(); acc -= intervalo; }
  }
  dibujar();
}

function iniciar() {
  if (!ac) { try { ac = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* noop */ } }
  ac?.resume?.();
  snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
  dir = { x: 1, y: 0 }; nextDirs = []; obstacles = [];
  score.value = 0; world.value = 1; acc = 0; enTop.value = false;
  spawnFood(); estado.value = 'jugando';
}

async function perder() {
  estado.value = 'fin'; audio.sfx('sfx-error'); sonChoque(); enTop.value = false;
  if (score.value > best.value) { best.value = score.value; localStorage.setItem('mindsnake_best', String(best.value)); }
  try { const r = await juegosApi.guardar(JUEGO, score.value, world.value); enTop.value = !!r.enTop; if ((r.mejor ?? 0) > best.value) best.value = r.mejor; await loadTop(); } catch { /* sin sesión */ }
}

// swipe
let downX = 0, downY = 0;
function onDown(e: PointerEvent) { downX = e.clientX; downY = e.clientY; }
function onUp(e: PointerEvent) {
  const dx = e.clientX - downX, dy = e.clientY - downY;
  if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
  if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
}
function kd(e: KeyboardEvent) {
  const k = e.key.toLowerCase();
  if (k === 'arrowup' || k === 'w') setDir(0, -1);
  else if (k === 'arrowdown' || k === 's') setDir(0, 1);
  else if (k === 'arrowleft' || k === 'a') setDir(-1, 0);
  else if (k === 'arrowright' || k === 'd') setDir(1, 0);
}

function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); if ((d.mejor ?? 0) > best.value) best.value = d.mejor; } catch { /* sin sesión */ } }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }

onMounted(() => {
  ctx = lienzo.value?.getContext('2d') ?? null;
  last = performance.now(); raf = requestAnimationFrame(loop);
  window.addEventListener('keydown', kd);
  loadTop(); loadMine(); dibujar();
});
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); ac?.close?.(); });
</script>

<style scoped>
.ms { min-height: 100vh; display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; transition: background 0.6s; }
.ms-head { width: 100%; max-width: 420px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.ms-head h2 { flex: 1; margin: 0; font-size: 1.15rem; }
.nav-btns { display: flex; gap: 0.35rem; }
.back { background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; }
.back.mapa { background: #fde68a; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.85rem; gap: 2px; }
.stage { position: relative; width: 100%; max-width: 420px; flex: 1; display: flex; justify-content: center; align-items: flex-start; }
.lienzo { border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,0.4); touch-action: none; max-width: 96vw; }
.mundo-banner { position: absolute; top: 30%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.78); color: #fde047; font-weight: 800; padding: 0.6rem 1.2rem; border-radius: 16px; z-index: 6; }
.banner-enter-active, .banner-leave-active { transition: opacity 0.3s, transform 0.3s; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.dpad { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; padding: 0.8rem 0 1.2rem; }
.dmid { display: flex; gap: 3.2rem; }
.dbtn { width: 62px; height: 62px; border: none; border-radius: 16px; background: rgba(255,255,255,0.16); color: #fff; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.3); }
.dbtn:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,0.3); }

.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border-radius: 14px; }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 320px; width: 90%; max-height: 92vh; overflow-y: auto; box-shadow: 0 14px 40px rgba(0,0,0,0.3); }
.ov-emoji { font-size: 2.6rem; } .ov-card h3 { margin: 0.3rem 0; color: #1E293B; }
.ov-txt { color: #475569; font-size: 0.88rem; line-height: 1.4; }
.wrap-toggle { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; width: 100%; margin: 0.6rem 0 0.2rem; padding: 0.55rem 0.8rem; border: 2px solid #cbd5e1; border-radius: 14px; background: #f1f5f9; color: #334155; font-weight: 700; font-family: inherit; cursor: pointer; font-size: 0.9rem; }
.wrap-toggle small { color: #64748b; font-weight: 400; }
.wrap-toggle.on { border-color: #22c55e; background: #dcfce7; }
.wrap-toggle .sw { background: #94a3b8; color: #fff; padding: 0.1rem 0.6rem; border-radius: 999px; font-size: 0.78rem; }
.wrap-toggle.on .sw { background: #16a34a; }
.wrap-hint { color: #64748b; font-size: 0.72rem; margin: 0 0 0.3rem; }
.ov-best { color: #B45309; font-weight: 700; font-size: 0.9rem; margin: 0.4rem 0; }
.ov-score { color: #334155; font-weight: 700; margin: 0.3rem 0; }
.entop { color: #16A34A; font-weight: 800; margin: 0.2rem 0; }
.ranking { background: #0b1020; border: 2px solid #334155; border-radius: 14px; padding: 0.6rem 0.7rem; margin: 0.7rem 0; }
.rk-title { color: #fde047; font-weight: 800; letter-spacing: 1px; font-size: 0.82rem; margin: 0 0 0.4rem; }
.rk-list { list-style: none; margin: 0; padding: 0; }
.rk-list li { display: grid; grid-template-columns: 22px 1fr auto auto; gap: 6px; align-items: center; color: #e2e8f0; font-size: 0.78rem; padding: 3px 0; border-bottom: 1px solid #1e293b; }
.rk-list li.yo { color: #fde047; font-weight: 800; }
.rk-pos { text-align: center; } .rk-name { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pts { color: #4ade80; font-weight: 700; } .rk-date { color: #64748b; font-size: 0.68rem; }
.rk-empty { color: #94a3b8; font-style: italic; grid-template-columns: 1fr !important; }
.ov-acciones { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.btn-jugar { background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; border: none; padding: 0.8rem 2rem; border-radius: 16px; font-size: 1.2rem; font-weight: 800; font-family: inherit; cursor: pointer; box-shadow: 0 5px 0 #15803D; }
.btn-jugar:active { transform: translateY(3px); box-shadow: 0 2px 0 #15803D; }
.btn-mapa { background: #e2e8f0; color: #334155; border: none; padding: 0.55rem 1.1rem; border-radius: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
</style>
