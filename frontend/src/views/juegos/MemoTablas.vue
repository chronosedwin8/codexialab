<template>
  <div class="mt" :style="{ background: tema }">
    <header class="mt-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>✖️ Memo-Tablas</h2>
      <div class="hud"><span>🧩 {{ score }} · 🔁{{ ronda }} · 🌍{{ mundo }}</span><span>🏆 {{ best }}</span></div>
    </header>

    <div class="stage">
      <!-- barra de tiempo + tabla -->
      <div v-if="estado === 'jugando'" class="info-row">
        <span class="tabla-chip">{{ tabla > 0 ? tabla + '×' : '🎲 Mezcla' }}</span>
        <div class="time-bar"><div class="time-fill" :class="{ low: tiempo < 6 }" :style="{ width: (tiempo / tMax * 100) + '%' }"></div></div>
        <span class="time-num">{{ Math.ceil(tiempo) }}s</span>
      </div>

      <transition name="banner"><div v-if="bannerTxt" class="mt-banner">{{ bannerTxt }}</div></transition>

      <div v-if="estado === 'jugando'" class="board" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <button v-for="(c, i) in cards" :key="c.id" class="carta" :class="{ flip: c.flipped || c.matched, matched: c.matched }" @click="voltear(i)">
          <span class="cara back">?</span>
          <span class="cara front" :class="c.tipo">{{ c.txt }}<span v-if="c.matched" class="check">✓</span></span>
        </button>
      </div>

      <!-- Inicio -->
      <div v-if="estado === 'inicio'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">✖️🧠</div>
          <h3>Memo-Tablas</h3>
          <p class="ov-txt">Empareja cada <b>multiplicación</b> con su <b>resultado</b> (ej. 9×7 con 63). Elige una tabla o juega en <b>🎲 Mezcla</b>. ¡Cada ronda tiene más cartas y menos tiempo!</p>
          <p class="ov-best">🏆 Tu mejor: {{ best }} parejas</p>
          <div class="tablas-pick">
            <button v-for="t in tablas" :key="t" class="t-chip" :class="{ sel: tabla === t }" @click="tabla = t">{{ t === 0 ? '🎲' : t + '×' }}</button>
          </div>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">{{ r.puntos }}</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
              </li>
              <li v-if="!topScores.length" class="rk-empty">¡Sé el primero del ranking!</li>
            </ol>
          </div>
          <div class="ov-acciones">
            <button class="btn-jugar" @click="iniciar">▶ ¡Jugar {{ tabla > 0 ? 'tabla del ' + tabla : 'en Mezcla' }}!</button>
            <button class="btn-mapa" @click="irMapa">🗺️ Volver al mapa</button>
          </div>
        </div>
      </div>

      <!-- Game over -->
      <div v-else-if="estado === 'fin'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">{{ score >= best && score > 0 ? '🏆' : '⏰' }}</div>
          <h3>{{ score >= best && score > 0 ? '¡Nuevo récord!' : '¡Se acabó el tiempo!' }}</h3>
          <p class="ov-score">🧩 {{ score }} parejas · 🌍 Ronda {{ ronda }}</p>
          <p v-if="enTop" class="entop">🎉 ¡Entraste al Top 5!</p>
          <p class="ov-best">🏆 Tu mejor: {{ best }} parejas</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">{{ r.puntos }}</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
              </li>
              <li v-if="!topScores.length" class="rk-empty">¡Sé el primero del ranking!</li>
            </ol>
          </div>
          <div class="ov-acciones">
            <button class="btn-jugar" @click="estado = 'inicio'">🔁 Otra vez</button>
            <button class="btn-mapa" @click="salir">🏠 Menú</button>
            <button class="btn-mapa" @click="irMapa">🗺️ Mapa</button>
          </div>
        </div>
      </div>
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
const JUEGO = 'memo-tablas';
const tablas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const THEMES = [
  'linear-gradient(180deg,#06b6d4,#0e7490)',
  'linear-gradient(180deg,#8b5cf6,#6d28d9)',
  'linear-gradient(180deg,#f59e0b,#b45309)',
  'linear-gradient(180deg,#10b981,#047857)',
  'linear-gradient(180deg,#ec4899,#be185d)',
  'linear-gradient(180deg,#3b82f6,#1d4ed8)',
];

interface Carta { id: number; tipo: 'op' | 'res'; prod: number; txt: string; flipped: boolean; matched: boolean; }

const estado = ref<'inicio' | 'jugando' | 'fin'>('inicio');
const tabla = ref(0);
const ronda = ref(1);
const score = ref(0);
const best = ref(Number(localStorage.getItem('memotablas_best') || 0));
const cards = ref<Carta[]>([]);
const lock = ref(false);
const tiempo = ref(30);
const tMax = ref(30);
const bannerTxt = ref('');
const enTop = ref(false);
const topScores = ref<any[]>([]);
let flippedIdx: number[] = [];
const cols = computed(() => (cards.value.length <= 8 ? 4 : cards.value.length <= 12 ? 4 : 4));
const mundo = computed(() => Math.floor((ronda.value - 1) / 3) + 1);     // un mundo nuevo cada 3 rondas
const tema = computed(() => THEMES[(mundo.value - 1) % THEMES.length]);

let ac: AudioContext | null = null;
let timerInt: ReturnType<typeof setInterval> | null = null;
let transicion = false;
let bannerTimer: ReturnType<typeof setTimeout>;

function beep(freq: number, ms = 90, type: OscillatorType = 'sine', vol = 0.16) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.start(t); o.stop(t + ms / 1000 + 0.03);
}
function banner(msg: string) { bannerTxt.value = msg; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (bannerTxt.value = ''), 1200); }

// Barajado sin repetir disposición: Fisher-Yates + historial por tabla (las últimas 15 disposiciones
// quedan vetadas) → nunca coincide el lugar de las cartas con partidas/rondas anteriores.
function fisher(a: Carta[]) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
function firma(a: Carta[]) { return a.map((c) => c.txt).join('|'); }
function histKey() { return `memotablas_hist_${tabla.value}`; }
function leerHist(): string[] { try { return JSON.parse(localStorage.getItem(histKey()) || '[]'); } catch { return []; } }
function pushHist(f: string) { const h = leerHist(); h.push(f); while (h.length > 15) h.shift(); localStorage.setItem(histKey(), JSON.stringify(h)); }

// Tiempo generoso que disminuye POR MUNDO (no por ronda) hasta un mínimo prudente
// según la cantidad de cálculos: ~5 s por pareja. Más cartas → más tiempo base.
function tiempoMaxRonda() {
  const pares = Math.min(8, 2 + ronda.value * 2);
  const piso = pares * 5;                                   // mínimo prudente
  return Math.max(piso, 40 + pares * 5 - (mundo.value - 1) * 6);
}

function generarRonda() {
  const pares = Math.min(8, 2 + ronda.value * 2);   // 4, 6, 8 cartas-pareja
  const usados = new Set<number>();
  const ops: Array<{ a: number; b: number }> = [];
  let guard = 0;
  while (ops.length < pares && guard++ < 600) {
    const a = tabla.value > 0 ? tabla.value : Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const p = a * b;
    if (usados.has(p)) continue;        // productos únicos → emparejado inequívoco
    usados.add(p); ops.push({ a, b });
  }
  const cs: Carta[] = []; let id = 0;
  for (const { a, b } of ops) {
    cs.push({ id: id++, tipo: 'op', prod: a * b, txt: `${a}×${b}`, flipped: false, matched: false });
    cs.push({ id: id++, tipo: 'res', prod: a * b, txt: `${a * b}`, flipped: false, matched: false });
  }
  const hist = leerHist();
  let f = '';
  for (let intento = 0; intento < 50; intento++) { fisher(cs); f = firma(cs); if (!hist.includes(f)) break; }
  pushHist(f);
  cards.value = cs;
  flippedIdx = []; lock.value = false;
  tMax.value = tiempoMaxRonda(); tiempo.value = tMax.value;
}

function voltear(i: number) {
  if (estado.value !== 'jugando' || lock.value || transicion) return;
  const c = cards.value[i];
  if (c.flipped || c.matched) return;
  c.flipped = true; beep(c.tipo === 'op' ? 520 : 680, 80);
  flippedIdx.push(i);
  if (flippedIdx.length === 2) {
    lock.value = true;
    const [a, b] = flippedIdx.map((k) => cards.value[k]);
    if (a.tipo !== b.tipo && a.prod === b.prod) {
      setTimeout(() => {
        a.matched = b.matched = true; flippedIdx = []; lock.value = false;
        score.value++; audio.sfx('sfx-correcto'); beep(900, 130, 'square', 0.14);
        if (cards.value.every((x) => x.matched)) rondaCompleta();
      }, 360);
    } else {
      beep(180, 130, 'sawtooth', 0.12);
      setTimeout(() => { a.flipped = b.flipped = false; flippedIdx = []; lock.value = false; }, 850);
    }
  }
}

function rondaCompleta() {
  transicion = true;
  const sig = ronda.value + 1;
  const subeMundo = Math.floor((sig - 1) / 3) + 1 > mundo.value;
  banner(subeMundo ? `🌍 ¡Mundo ${Math.floor((sig - 1) / 3) + 1}!` : `✅ ¡Ronda ${ronda.value} completa!`);
  beep(1200, 200, 'square', 0.16);
  setTimeout(() => { ronda.value = sig; generarRonda(); transicion = false; }, 1100);
}

function startTimer() {
  stopTimer();
  timerInt = setInterval(() => {
    if (estado.value === 'jugando' && !transicion) {
      tiempo.value -= 0.1;
      if (tiempo.value <= 0) { tiempo.value = 0; perder(); }
    }
  }, 100);
}
function stopTimer() { if (timerInt) { clearInterval(timerInt); timerInt = null; } }

function iniciar() {
  if (!ac) { try { ac = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* noop */ } }
  ac?.resume?.();
  ronda.value = 1; score.value = 0; transicion = false; enTop.value = false;
  estado.value = 'jugando'; generarRonda(); startTimer();
}

async function perder() {
  stopTimer(); estado.value = 'fin'; audio.sfx('sfx-error'); beep(150, 320, 'sawtooth', 0.2);
  if (score.value > best.value) { best.value = score.value; localStorage.setItem('memotablas_best', String(best.value)); }
  try { const r = await juegosApi.guardar(JUEGO, score.value, mundo.value); enTop.value = !!r.enTop; if ((r.mejor ?? 0) > best.value) best.value = r.mejor; await loadTop(); } catch { /* sin sesión */ }
}

function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); if ((d.mejor ?? 0) > best.value) best.value = d.mejor; } catch { /* sin sesión */ } }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }

onMounted(() => { loadTop(); loadMine(); });
onUnmounted(() => { stopTimer(); ac?.close?.(); });
</script>

<style scoped>
.mt { min-height: 100vh; background: linear-gradient(180deg, #06b6d4, #0e7490); display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.mt-head { width: 100%; max-width: 460px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
.mt-head h2 { flex: 1; margin: 0; font-size: 1.15rem; }
.nav-btns { display: flex; gap: 0.35rem; }
.back { background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; }
.back.mapa { background: #fde68a; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.85rem; gap: 2px; }
.stage { position: relative; width: 100%; max-width: 460px; flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0.5rem 0.5rem 2rem; }
.info-row { display: flex; align-items: center; gap: 0.6rem; width: 100%; max-width: 380px; margin-bottom: 0.5rem; }
.tabla-chip { background: #fff; color: #0e7490; font-weight: 800; padding: 0.25rem 0.7rem; border-radius: 999px; font-size: 0.85rem; }
.time-bar { flex: 1; height: 12px; background: rgba(255,255,255,0.3); border-radius: 999px; overflow: hidden; }
.time-fill { height: 100%; background: #fde047; border-radius: 999px; transition: width 0.1s linear; }
.time-fill.low { background: #ef4444; }
.time-num { color: #fff; font-weight: 700; font-size: 0.85rem; min-width: 32px; text-align: right; }

.board { display: grid; gap: 12px; width: min(96vw, 470px); }
.carta { position: relative; aspect-ratio: 3 / 4; border: none; background: transparent; cursor: pointer; transform-style: preserve-3d; transition: transform 0.4s; padding: 0; }
.carta.flip { transform: rotateY(180deg); }
.carta.matched { transform: rotateY(180deg); cursor: default; }
.cara { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; backface-visibility: hidden; font-weight: 800; box-shadow: 0 4px 10px rgba(0,0,0,0.28); }
.back { background: repeating-linear-gradient(45deg, #111 0 11px, #fff 11px 22px); color: #ec4899; font-size: 2.1rem; -webkit-text-stroke: 1.5px #fff; box-shadow: inset 0 0 0 4px #fff, 0 4px 10px rgba(0,0,0,0.28); }
.front { transform: rotateY(180deg); font-size: 1.55rem; }
.front.op { background: #ec4899; color: #fff; }
.front.res { background: #facc15; color: #7c2d12; }
/* Cartas acertadas: quedan VISIBLES, en verde con ✓ y ya no se pueden tocar */
.carta.matched .front { background: #16a34a !important; color: #fff !important; box-shadow: 0 0 0 4px #22c55e, 0 4px 10px rgba(0,0,0,0.3); }
.check { position: absolute; top: 5px; right: 7px; background: #fff; color: #16a34a; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; }
.mt-banner { position: absolute; top: 30%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fde047; font-weight: 800; padding: 0.6rem 1.1rem; border-radius: 14px; z-index: 6; }
.banner-enter-active, .banner-leave-active { transition: opacity 0.3s, transform 0.3s; }
.banner-enter-from, .banner-leave-to { opacity: 0; transform: translate(-50%, -10px); }

.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border-radius: 14px; }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 340px; width: 92%; max-height: 92vh; overflow-y: auto; box-shadow: 0 14px 40px rgba(0,0,0,0.3); }
.ov-emoji { font-size: 2.6rem; } .ov-card h3 { margin: 0.3rem 0; color: #1E293B; }
.ov-txt { color: #475569; font-size: 0.88rem; line-height: 1.4; }
.ov-best { color: #B45309; font-weight: 700; font-size: 0.9rem; margin: 0.4rem 0; }
.ov-score { color: #334155; font-weight: 700; margin: 0.3rem 0; }
.entop { color: #16A34A; font-weight: 800; margin: 0.2rem 0; }
.tablas-pick { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.3rem; margin: 0.5rem 0; }
.t-chip { border: 2px solid #cbd5e1; background: #f1f5f9; color: #334155; border-radius: 10px; padding: 0.4rem 0; font-weight: 800; font-family: inherit; cursor: pointer; font-size: 0.82rem; }
.t-chip.sel { border-color: #06b6d4; background: #cffafe; color: #0e7490; }
.ranking { background: #0b1020; border: 2px solid #334155; border-radius: 14px; padding: 0.6rem 0.7rem; margin: 0.6rem 0; }
.rk-title { color: #fde047; font-weight: 800; letter-spacing: 1px; font-size: 0.82rem; margin: 0 0 0.4rem; }
.rk-list { list-style: none; margin: 0; padding: 0; }
.rk-list li { display: grid; grid-template-columns: 22px 1fr auto auto; gap: 6px; align-items: center; color: #e2e8f0; font-size: 0.78rem; padding: 3px 0; border-bottom: 1px solid #1e293b; }
.rk-list li.yo { color: #fde047; font-weight: 800; }
.rk-pos { text-align: center; } .rk-name { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pts { color: #4ade80; font-weight: 700; } .rk-date { color: #64748b; font-size: 0.68rem; }
.rk-empty { color: #94a3b8; font-style: italic; grid-template-columns: 1fr !important; }
.ov-acciones { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.btn-jugar { background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; border: none; padding: 0.8rem 1.6rem; border-radius: 16px; font-size: 1.05rem; font-weight: 800; font-family: inherit; cursor: pointer; box-shadow: 0 5px 0 #15803D; }
.btn-jugar:active { transform: translateY(3px); box-shadow: 0 2px 0 #15803D; }
.btn-mapa { background: #e2e8f0; color: #334155; border: none; padding: 0.55rem 1.1rem; border-radius: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
</style>
