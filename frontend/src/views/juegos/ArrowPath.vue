<template>
  <div class="ap">
    <header class="ap-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>🧭 Arrow Path</h2>
      <div class="hud"><span>🧩 Nivel {{ nivel }}</span><span>🏆 {{ best }}</span></div>
    </header>

    <div class="board-wrap" :class="{ shake }">
      <div class="board" :style="{ width: cell * N + 'px', height: cell * N + 'px' }">
        <div v-for="(c, i) in cells" :key="i"
          class="cell" :class="{ wall: c.wall, goal: c.goal, start: c.start, slot: c.slot && !c.placed, fixed: c.fixed, sel: selSlot === i }"
          :style="{ left: c.c * cell + 'px', top: c.r * cell + 'px', width: cell - 4 + 'px', height: cell - 4 + 'px' }"
          @click="clickCell(i)">
          <span v-if="c.goal" class="dot"></span>
          <svg v-else-if="arrowDe(c)" class="ar" :viewBox="'0 0 24 24'" :style="{ transform: 'rotate(' + DEG[arrowDe(c)!] + 'deg)' }"><path d="M12 3 L19 12 H15 V21 H9 V12 H5 Z" /></svg>
          <span v-else-if="c.slot" class="hueco">＋</span>
          <span v-if="c.start" class="ini">🚩</span>
        </div>
        <!-- bola -->
        <div v-if="ballVisible" class="ball" :style="{ left: (ball.c + 0.5) * cell + 'px', top: (ball.r + 0.5) * cell + 'px' }"></div>
      </div>
    </div>

    <p class="msg" :class="msgTipo">{{ mensaje || 'Coloca las flechas para que la bola llegue al punto rojo 🔴' }}</p>

    <!-- Bandeja de flechas -->
    <div class="tray">
      <button v-for="t in tray" :key="t.id" class="tile" :class="{ sel: selTile === t.id }" @click="pickTile(t.id)">
        <svg class="ar" viewBox="0 0 24 24" :style="{ transform: 'rotate(' + DEG[t.dir] + 'deg)' }"><path d="M12 3 L19 12 H15 V21 H9 V12 H5 Z" /></svg>
      </button>
      <span v-if="!tray.length" class="tray-vacia">¡Todas colocadas! Pulsa Probar ▶</span>
    </div>

    <div class="ctrls">
      <button class="btn-prob" :disabled="estado !== 'jugando'" @click="ejecutar">▶ Probar</button>
      <button class="btn-reset" @click="cargar(nivel)">↺ Reiniciar</button>
    </div>

    <!-- Inicio / ranking -->
    <div v-if="estado === 'inicio'" class="overlay">
      <div class="ov-card">
        <div class="ov-emoji">🧭➡️</div>
        <h3>Arrow Path</h3>
        <p class="ov-txt">Arma el <b>camino de flechas</b> desde el inicio ▶ hasta el punto rojo 🔴. Toca una flecha de la bandeja y luego una casilla. ¡Concéntrate y planifica!</p>
        <p class="ov-best">🏆 Tu mejor nivel: {{ best }} · empiezas en el {{ nivel }}</p>
        <div class="ranking">
          <p class="rk-title">🏆 MEJORES (nivel alcanzado)</p>
          <ol class="rk-list">
            <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
              <span>{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span><span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">Niv {{ r.puntos }}</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
            </li>
            <li v-if="!topScores.length" class="rk-empty">¡Sé el primero!</li>
          </ol>
        </div>
        <div class="ov-acciones">
          <button class="btn-jugar" @click="empezar">▶ ¡Jugar!</button>
          <button class="btn-mapa" @click="irMapa">🗺️ Volver al mapa</button>
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
const JUEGO = 'arrow-path';

type Dir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const DIRS: Record<Dir, [number, number]> = { N: [-1, 0], NE: [-1, 1], E: [0, 1], SE: [1, 1], S: [1, 0], SW: [1, -1], W: [0, -1], NW: [-1, -1] };
const DEG: Record<Dir, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function mulberry32(a: number) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function dirName(a: number[], b: number[]): Dir { const dr = Math.sign(b[0] - a[0]), dc = Math.sign(b[1] - a[1]); for (const d in DIRS) { const [r, c] = DIRS[d as Dir]; if (r === dr && c === dc) return d as Dir; } return 'E'; }

interface Celda { r: number; c: number; wall: boolean; fixed: Dir | null; slot: boolean; placed: Dir | null; start: boolean; goal: boolean; }

const nivel = ref(1);
const best = ref(0);
const N = ref(3);
const cells = ref<Celda[]>([]);
const tray = ref<Array<{ id: number; dir: Dir }>>([]);
let start: number[] = [0, 0], goal: number[] = [0, 0];
const selTile = ref<number | null>(null);
const selSlot = ref<number | null>(null);
const estado = ref<'inicio' | 'jugando' | 'animando'>('inicio');
const ball = ref({ r: 0, c: 0 });
const ballVisible = ref(false);
const mensaje = ref('');
const msgTipo = ref('');
const shake = ref(false);
const topScores = ref<any[]>([]);
const cell = computed(() => Math.floor(330 / N.value));
const arrowDe = (c: Celda): Dir | null => c.fixed ?? c.placed ?? null;

let worker: Worker | null = null;

function generar(level: number) {
  const rng = mulberry32((level * 2654435761) >>> 0);
  const n = clamp(3 + Math.floor((level - 1) / 12), 3, 8);
  const allowed: Dir[] = level >= 6 ? ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] : ['N', 'E', 'S', 'W'];
  let best: number[][] = [];
  for (let a = 0; a < 50 && best.length < 3; a++) {
    const sr = Math.floor(rng() * n), sc = Math.floor(rng() * n);
    const path = [[sr, sc]]; const vis = new Set([sr + ',' + sc]);
    const target = clamp(3 + Math.floor(level / 3), 3, n * n - Math.max(0, n - 2));
    while (path.length < target) {
      const [r, c] = path[path.length - 1];
      const opts = allowed.map((d) => [d, r + DIRS[d][0], c + DIRS[d][1]] as [Dir, number, number]).filter(([, nr, nc]) => nr >= 0 && nc >= 0 && nr < n && nc < n && !vis.has(nr + ',' + nc));
      if (!opts.length) break;
      const [, nr, nc] = opts[Math.floor(rng() * opts.length)];
      path.push([nr, nc]); vis.add(nr + ',' + nc);
    }
    if (path.length > best.length) best = path;
  }
  const path = best;
  const cs: Celda[] = []; for (let i = 0; i < n * n; i++) cs.push({ r: Math.floor(i / n), c: i % n, wall: true, fixed: null, slot: false, placed: null, start: false, goal: false });
  const idx = (r: number, c: number) => r * n + c;
  for (const [r, c] of path) cs[idx(r, c)].wall = false;
  cs[idx(path[0][0], path[0][1])].start = true;
  cs[idx(path[path.length - 1][0], path[path.length - 1][1])].goal = true;
  const conArrow = path.slice(0, path.length - 1).map((p, i) => ({ i, p, dir: dirName(p, path[i + 1]) }));
  const emptyCount = clamp(1 + Math.floor(level / 7), 1, Math.max(1, conArrow.length));
  const shuffled = [...conArrow].sort(() => rng() - 0.5);
  const slots = new Set(shuffled.slice(0, emptyCount).map((x) => x.i));
  const t: Array<{ id: number; dir: Dir }> = [];
  conArrow.forEach(({ i, p, dir }) => { const cell = cs[idx(p[0], p[1])]; if (slots.has(i)) { cell.slot = true; t.push({ id: 0, dir }); } else cell.fixed = dir; });
  const dist = level >= 15 ? Math.min(3, Math.floor(level / 15)) : 0;
  for (let k = 0; k < dist; k++) t.push({ id: 0, dir: allowed[Math.floor(rng() * allowed.length)] });
  t.sort(() => rng() - 0.5); t.forEach((x, i) => (x.id = i));
  return { n, cells: cs, tray: t, start: path[0], goal: path[path.length - 1] };
}

function cargar(level: number) {
  const g = generar(level);
  N.value = g.n; cells.value = g.cells; tray.value = g.tray; start = g.start; goal = g.goal;
  ball.value = { r: start[0], c: start[1] }; ballVisible.value = false;
  selTile.value = null; selSlot.value = null; mensaje.value = ''; msgTipo.value = '';
  if (estado.value !== 'inicio') estado.value = 'jugando';
}

function pickTile(id: number) { if (estado.value !== 'jugando') return; selTile.value = selTile.value === id ? null : id; }
function clickCell(i: number) {
  if (estado.value !== 'jugando') return;
  const c = cells.value[i];
  if (c.wall || c.goal || c.fixed) return;
  if (!c.slot) return;
  if (c.placed) { tray.value.push({ id: Math.max(0, ...tray.value.map((x) => x.id)) + 1, dir: c.placed }); c.placed = null; return; }
  if (selTile.value !== null) {
    const t = tray.value.find((x) => x.id === selTile.value); if (!t) return;
    c.placed = t.dir; tray.value = tray.value.filter((x) => x.id !== selTile.value); selTile.value = null;
  }
}

function ejecutar() {
  if (estado.value !== 'jugando') return;
  estado.value = 'animando'; mensaje.value = ''; ballVisible.value = true; ball.value = { r: start[0], c: start[1] };
  const arrows = cells.value.map((c) => (c.wall ? null : (c.fixed ?? c.placed ?? null)));
  const walls = cells.value.map((c) => c.wall);
  worker!.postMessage({ rows: N.value, cols: N.value, arrows, walls, start, goal });
}

async function animar(trace: number[][], res: string) {
  for (let k = 1; k < trace.length; k++) { ball.value = { r: trace[k][0], c: trace[k][1] }; audio.sfx('sfx-salto'); await delay(190); }
  await delay(120);
  if (res === 'gano') {
    audio.sfx('sfx-ganar'); mensaje.value = '🎉 ¡Camino correcto!'; msgTipo.value = 'ok';
    if (nivel.value >= best.value) { best.value = nivel.value; juegosApi.guardar(JUEGO, nivel.value, nivel.value).then(loadTop).catch(() => {}); }
    setTimeout(() => { nivel.value++; cargar(nivel.value); }, 900);
  } else {
    audio.sfx('sfx-error'); ballVisible.value = false;
    mensaje.value = { incompleto: 'Falta completar el camino 🧩', fuera: 'La bola se salió 😅', choque: 'Chocó con una pared 🧱', bucle: 'El camino da vueltas 🔁' }[res] || 'Inténtalo otra vez';
    msgTipo.value = 'err'; shake.value = true; setTimeout(() => (shake.value = false), 450); estado.value = 'jugando';
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); if ((d.mejor ?? 0) > best.value) best.value = d.mejor; nivel.value = (d.mejor ?? 0) + 1; cargar(nivel.value); } catch { /* sin sesión */ } }
function empezar() { estado.value = 'jugando'; cargar(nivel.value); }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }

onMounted(() => {
  worker = new Worker(new URL('../../workers/arrowRunner.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (e: MessageEvent) => animar(e.data.trace, e.data.res);
  cargar(1); estado.value = 'inicio';
  loadTop(); loadMine();
});
onUnmounted(() => { worker?.terminate(); });
</script>

<style scoped>
.ap { min-height: 100vh; background: linear-gradient(180deg, #0f172a, #1e1b4b); display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; padding-bottom: 1rem; }
.ap-head { width: 100%; max-width: 420px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #fff; }
.ap-head h2 { flex: 1; margin: 0; font-size: 1.2rem; }
.back { background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.85rem; gap: 2px; }
.board-wrap { padding: 12px; }
.board-wrap.shake { animation: sh 0.4s; }
@keyframes sh { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-9px); } 75% { transform: translateX(9px); } }
.board { position: relative; }
.cell { position: absolute; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: #fde68a; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.12); }
.cell.wall { background: #334155; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.3); }
.cell.goal { background: #38bdf8; }
.cell.start { background: #fcd34d; box-shadow: inset 0 0 0 3px #16a34a; }
.cell.fixed { background: #fbbf24; }
.cell.slot { background: #e0e7ff; box-shadow: inset 0 0 0 2px #818cf8; cursor: pointer; }
.cell.slot:hover { background: #c7d2fe; }
.cell.sel { outline: 3px solid #f59e0b; }
.dot { width: 42%; height: 42%; border-radius: 50%; background: #ef4444; box-shadow: 0 0 10px #ef4444; }
.cell { overflow: visible; }
.ini { position: absolute; top: -8px; left: -6px; font-size: 0.85rem; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.4)); }
.hueco { color: #818cf8; font-size: 1.3rem; }
.ar { width: 62%; height: 62%; }
.ar path { fill: #1e293b; }
.cell.fixed .ar path { fill: #78350f; }
.ball { position: absolute; width: 20px; height: 20px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #fff, #ef4444); transform: translate(-50%, -50%); transition: left 0.18s linear, top 0.18s linear; box-shadow: 0 0 10px rgba(239,68,68,0.7); z-index: 5; }

.msg { color: #cbd5e1; font-size: 0.9rem; min-height: 1.3em; margin: 0.3rem 0; text-align: center; max-width: 360px; }
.msg.ok { color: #4ade80; font-weight: 700; } .msg.err { color: #fca5a5; font-weight: 700; }
.tray { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; max-width: 360px; min-height: 56px; background: rgba(255,255,255,0.06); border: 2px dashed #475569; border-radius: 14px; padding: 0.5rem; }
.tile { width: 48px; height: 48px; border: none; border-radius: 10px; background: linear-gradient(160deg,#fff,#e2e8f0); cursor: pointer; box-shadow: 0 4px 0 #94a3b8; }
.tile.sel { box-shadow: 0 0 0 3px #f59e0b, 0 4px 0 #94a3b8; transform: translateY(-2px); }
.tile:active { transform: translateY(2px); box-shadow: 0 2px 0 #94a3b8; }
.tile .ar { width: 60%; height: 60%; }
.tray-vacia { color: #94a3b8; font-size: 0.85rem; align-self: center; }
.ctrls { display: flex; gap: 0.6rem; margin-top: 0.6rem; }
.btn-prob { background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; border: none; padding: 0.7rem 1.6rem; border-radius: 14px; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 5px 0 #15803D; font-family: inherit; }
.btn-prob:disabled { opacity: 0.5; }
.btn-prob:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 #15803D; }
.btn-reset { background: #334155; color: #e2e8f0; border: none; padding: 0.7rem 1rem; border-radius: 14px; font-weight: 700; cursor: pointer; font-family: inherit; }

.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.55); z-index: 30; }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 330px; width: 90%; max-height: 92vh; overflow-y: auto; }
.ov-emoji { font-size: 2.6rem; } .ov-card h3 { margin: 0.3rem 0; color: #1E293B; }
.ov-txt { color: #475569; font-size: 0.88rem; line-height: 1.4; }
.ov-best { color: #B45309; font-weight: 700; font-size: 0.85rem; margin: 0.4rem 0; }
.ranking { background: #0b1020; border: 2px solid #334155; border-radius: 14px; padding: 0.6rem; margin: 0.6rem 0; }
.rk-title { color: #fde047; font-weight: 800; font-size: 0.78rem; margin: 0 0 0.4rem; letter-spacing: 1px; }
.rk-list { list-style: none; margin: 0; padding: 0; }
.rk-list li { display: grid; grid-template-columns: 20px 1fr auto auto; gap: 5px; align-items: center; color: #e2e8f0; font-size: 0.76rem; padding: 3px 0; border-bottom: 1px solid #1e293b; }
.rk-list li.yo { color: #fde047; font-weight: 800; }
.rk-name { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pts { color: #4ade80; font-weight: 700; } .rk-date { color: #64748b; font-size: 0.66rem; }
.rk-empty { color: #94a3b8; grid-template-columns: 1fr !important; }
.btn-jugar { background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; border: none; padding: 0.8rem 2rem; border-radius: 16px; font-size: 1.2rem; font-weight: 800; font-family: inherit; cursor: pointer; box-shadow: 0 5px 0 #15803D; margin-top: 0.4rem; }
.btn-jugar:active { transform: translateY(3px); box-shadow: 0 2px 0 #15803D; }
.nav-btns { display: flex; gap: 0.35rem; }
.back.mapa { background: #fde68a; }
.ov-acciones { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.btn-mapa { background: #e2e8f0; color: #334155; border: none; padding: 0.55rem 1.1rem; border-radius: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
</style>
