<template>
  <div class="b3">
    <header class="b3-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>🧊 Puzzle de Bloque</h2>
      <div class="hud"><span>🎯 Nivel {{ nivelIdx + 1 }}/{{ TOTAL }}</span><span>🏆 {{ best }}</span></div>
    </header>

    <div class="stage" ref="stageEl">
      <canvas ref="lienzo" class="b3-canvas"></canvas>
      <button class="b3-audio zoomp" @click="zoomIn" title="Acercar">➕</button>
      <button class="b3-audio zoomm" @click="zoomOut" title="Alejar">➖</button>
      <transition name="fade"><div v-if="mensaje" class="b3-msg" :class="estadoMsg">{{ mensaje }}</div></transition>

      <!-- D-pad -->
      <div v-if="estado === 'jugando'" class="dpad">
        <button class="db up" @pointerdown.prevent="rodar('U')">▲</button>
        <div class="dmid">
          <button class="db" @pointerdown.prevent="rodar('L')">◀</button>
          <button class="db reset" @pointerdown.prevent="reiniciarNivel(true)">↺</button>
          <button class="db" @pointerdown.prevent="rodar('R')">▶</button>
        </div>
        <button class="db down" @pointerdown.prevent="rodar('D')">▼</button>
      </div>

      <!-- Inicio -->
      <div v-if="estado === 'inicio'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">🧊🕳️</div>
          <h3>Puzzle de Bloque 3D</h3>
          <p class="ov-txt">Haz <b>rodar</b> el bloque por la plataforma hasta dejarlo <b>parado justo en el agujero rojo</b>. ¡No te caigas de los bordes! Las baldosas <span style="color:#ea580c">naranjas</span> se rompen si te paras encima.</p>
          <p class="ov-best">🏆 Tu mejor: nivel {{ best }} · empiezas en el {{ nivelIdx + 1 }}</p>
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

      <!-- Victoria final -->
      <div v-else-if="estado === 'fin'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">🏆</div>
          <h3>¡Completaste todos los niveles!</h3>
          <p class="ov-score">🎯 {{ TOTAL }} niveles superados</p>
          <div class="ov-acciones">
            <button class="btn-jugar" @click="() => { nivelIdx = 0; empezar(); }">🔁 Otra vez</button>
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
import { createThreeScene, webglDisponible, type ThreeScene } from '@/composables/useThreeScene';

const router = useRouter();
const audio = useAudio();
const auth = useAuthStore();
const miNombre = computed(() => auth.user?.nombre || '');
const JUEGO = 'bloque3d';

// Niveles (verificados solucionables por BFS). #=suelo S=inicio G=agujero .=vacío O=frágil
const LEVELS: string[][] = [
  ['####', 'S##G', '####'],
  ['######', 'G#####', '#S####', '######'],
  ['.#####.', '#G#####', '##S####', '#######', '.#####.'],
  ['..####', '.#####', '#S####', '#####.', 'G###..'],
  ['######G', '##OOO##', '#S#####', '##OOO##', '#######'],
  ['######G#', '#S######', '###OO###', '########', '########'],
  ['#####', '#GS##', '#####'],
  ['####....', '#####...', '##S#####', '...#####', '....###G'],
  ['####...####', '####...#G##', '#S#########', '####...####', '####...####'],
];
const TOTAL = LEVELS.length;

type St = { o: 'st' | 'x' | 'y'; x: number; y: number };
function cells(s: St): number[][] { return s.o === 'st' ? [[s.x, s.y]] : s.o === 'x' ? [[s.x, s.y], [s.x + 1, s.y]] : [[s.x, s.y], [s.x, s.y + 1]]; }
function mover(s: St, d: string): St {
  const { o, x, y } = s;
  if (o === 'st') return d === 'L' ? { o: 'x', x: x - 2, y } : d === 'R' ? { o: 'x', x: x + 1, y } : d === 'U' ? { o: 'y', x, y: y - 2 } : { o: 'y', x, y: y + 1 };
  if (o === 'x') return d === 'L' ? { o: 'st', x: x - 1, y } : d === 'R' ? { o: 'st', x: x + 2, y } : d === 'U' ? { o: 'x', x, y: y - 1 } : { o: 'x', x, y: y + 1 };
  return d === 'U' ? { o: 'st', x, y: y - 1 } : d === 'D' ? { o: 'st', x, y: y + 2 } : d === 'L' ? { o: 'y', x: x - 1, y } : { o: 'y', x: x + 1, y };
}

const nivelIdx = ref(0);
const best = ref(0);
const estado = ref<'inicio' | 'jugando' | 'fin'>('inicio');
const mensaje = ref('');
const estadoMsg = ref('');
const topScores = ref<any[]>([]);
const stageEl = ref<HTMLDivElement | null>(null);
const lienzo = ref<HTMLCanvasElement | null>(null);

let ts: ThreeScene | null = null;
let grid: number[][] = [], R = 0, C = 0, offX = 0, offZ = 0;
let start: St = { o: 'st', x: 0, y: 0 };
let bs: St = { o: 'st', x: 0, y: 0 };
let nivelGroup: any = null, block: any = null, pivote: any = null;
let anim: any = null, animando = false, cayendo = false;
let camTarget: any = null, camOff: any = null, camDist = 12, camBaseDist = 12;

const tile = (x: number, y: number) => (x < 0 || y < 0 || y >= R || x >= C) ? 0 : grid[y][x];
const valido = (s: St) => { for (const [x, y] of cells(s)) if (tile(x, y) === 0) return false; if (s.o === 'st' && tile(s.x, s.y) === 3) return false; return true; };
const ganado = (s: St) => s.o === 'st' && tile(s.x, s.y) === 2;
const wx = (cx: number) => cx - offX, wz = (cy: number) => cy - offZ;
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function canonPos(s: St) { const T = ts!.THREE; const c = cells(s); const mx = c.reduce((a, p) => a + wx(p[0]), 0) / c.length, mz = c.reduce((a, p) => a + wz(p[1]), 0) / c.length; return new T.Vector3(mx, s.o === 'st' ? 1 : 0.5, mz); }
function canonRot(s: St) { return s.o === 'st' ? [0, 0, 0] : s.o === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]; }
function colocarBloque(s: St) { const p = canonPos(s); block.position.copy(p); const r = canonRot(s); block.rotation.set(r[0], r[1], r[2]); }

function parse(rows: string[]) {
  grid = rows.map((r) => [...r].map((c) => (c === '.' ? 0 : c === 'O' ? 3 : c === 'G' ? 2 : 1)));
  R = grid.length; C = grid[0].length; offX = (C - 1) / 2; offZ = (R - 1) / 2;
  rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === 'S') start = { o: 'st', x, y }; }));
}

function disposeGroup(g: any) { if (!g || !ts) return; g.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: any) => m.dispose()); }); ts.scene.remove(g); }

function construirNivel() {
  if (!ts) return;
  const T = ts.THREE;
  disposeGroup(nivelGroup); if (block) { disposeGroup(block); block = null; }
  nivelGroup = new T.Group();
  const matFloor = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const matFragil = new T.MeshStandardMaterial({ color: 0xfb923c, roughness: 0.85 });
  const matMeta = new T.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 });
  const lineMat = new T.LineBasicMaterial({ color: 0x334155 });
  for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
    const t = grid[y][x]; if (!t) continue;
    const geo = new T.BoxGeometry(0.98, 0.12, 0.98);
    const m = new T.Mesh(geo, t === 3 ? matFragil : t === 2 ? matMeta : matFloor);
    m.position.set(wx(x), -0.06, wz(y)); nivelGroup.add(m);
    m.add(new T.LineSegments(new T.EdgesGeometry(geo), lineMat));
  }
  ts.scene.add(nivelGroup);

  // Bloque 1x2x1
  block = new T.Group();
  const bgeo = new T.BoxGeometry(0.9, 1.9, 0.9);
  const bmesh = new T.Mesh(bgeo, new T.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45, metalness: 0.05 }));
  block.add(bmesh);
  bmesh.add(new T.LineSegments(new T.EdgesGeometry(bgeo), new T.LineBasicMaterial({ color: 0x7f1d1d })));
  ts.scene.add(block);
  bs = { ...start }; colocarBloque(bs);

  // Cámara
  const span = Math.max(C, R);
  camOff = new T.Vector3(0.1, 0.92, 0.95).normalize();
  camBaseDist = span * 1.5 + 5;
  camDist = camBaseDist; camTarget = canonPos(bs).clone();
  posicionarCamara();
}
function posicionarCamara() { if (!ts || !camTarget) return; ts.camera.position.copy(camTarget).addScaledVector(camOff, camDist); ts.camera.lookAt(camTarget); }
function zoomIn() { camDist = Math.max(4, camDist * 0.82); posicionarCamara(); }
function zoomOut() { camDist = Math.min(camBaseDist * 1.8, camDist * 1.22); posicionarCamara(); }

function pivotFor(s: St, d: string) {
  const T = ts!.THREE;
  const c = cells(s).map((p) => [wx(p[0]), wz(p[1])]);
  const xs = c.map((p) => p[0]), zs = c.map((p) => p[1]);
  const minX = Math.min(...xs) - 0.5, maxX = Math.max(...xs) + 0.5, minZ = Math.min(...zs) - 0.5, maxZ = Math.max(...zs) + 0.5;
  const midX = (minX + maxX) / 2, midZ = (minZ + maxZ) / 2;
  if (d === 'R') return { point: new T.Vector3(maxX, 0, midZ), axis: 'z', angle: -Math.PI / 2 };
  if (d === 'L') return { point: new T.Vector3(minX, 0, midZ), axis: 'z', angle: Math.PI / 2 };
  if (d === 'D') return { point: new T.Vector3(midX, 0, maxZ), axis: 'x', angle: Math.PI / 2 };
  return { point: new T.Vector3(midX, 0, minZ), axis: 'x', angle: -Math.PI / 2 };
}

function rodar(d: string) {
  if (animando || cayendo || estado.value !== 'jugando') return;
  const from = bs; const to = mover(from, d);
  const piv = pivotFor(from, d);
  pivote.position.copy(piv.point); pivote.rotation.set(0, 0, 0);
  ts!.scene.add(pivote); pivote.add(block);
  block.position.copy(canonPos(from)).sub(piv.point); const r = canonRot(from); block.rotation.set(r[0], r[1], r[2]);
  anim = { piv, t: 0, dur: 0.16, to }; animando = true;
  audio.sfx('sfx-salto');
}

function finRodar() {
  const to = anim.to;
  // desacoplar el bloque del pivote conservando posición lógica
  ts!.scene.attach(block); ts!.scene.remove(pivote); pivote.clear();
  animando = false; anim = null;
  if (!valido(to)) { bs = to; caer(); return; }
  bs = to; colocarBloque(bs);
  if (ganado(bs)) ganarNivel();
}

function caer() {
  cayendo = true; audio.sfx('sfx-error'); mensaje.value = '¡Te caíste! Reintenta'; estadoMsg.value = 'fallo';
  let t = 0;
  const id = setInterval(() => {
    t += 0.05; block.position.y -= 0.5; block.rotation.z += 0.3;
    if (t >= 0.5) { clearInterval(id); cayendo = false; reiniciarNivel(false); }
  }, 50);
}
function reiniciarNivel(porUsuario: boolean) {
  if (animando) return;
  bs = { ...start }; colocarBloque(bs); camTarget = canonPos(bs).clone(); posicionarCamara();
  if (porUsuario) { mensaje.value = ''; }
}

async function ganarNivel() {
  audio.sfx('sfx-ganar'); mensaje.value = '✅ ¡Bloque en el agujero!'; estadoMsg.value = 'gano';
  const nivelNum = nivelIdx.value + 1;
  if (nivelNum > best.value) { best.value = nivelNum; juegosApi.guardar(JUEGO, nivelNum, nivelNum).then(loadTop).catch(() => {}); }
  setTimeout(() => {
    mensaje.value = '';
    if (nivelIdx.value + 1 < TOTAL) { nivelIdx.value++; parse(LEVELS[nivelIdx.value]); construirNivel(); }
    else estado.value = 'fin';
  }, 1100);
}

function loop(dt: number) {
  if (anim) {
    anim.t += dt / anim.dur; const k = Math.min(1, anim.t);
    pivote.rotation[anim.piv.axis as 'x' | 'z'] = anim.piv.angle * ease(k);
    if (k >= 1) finRodar();
  }
  if (camTarget && block && !cayendo) { camTarget.lerp(canonPos(bs), Math.min(1, dt * 4)); posicionarCamara(); }
}

function empezar() {
  nivelIdx.value = Math.min(best.value, TOTAL - 1);
  parse(LEVELS[nivelIdx.value]); construirNivel();
  estado.value = 'jugando'; mensaje.value = '';
}
function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); if ((d.mejor ?? 0) > best.value) best.value = d.mejor; nivelIdx.value = Math.min(best.value, TOTAL - 1); } catch { /* sin sesión */ } }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }
function kd(e: KeyboardEvent) {
  const k = e.key;
  if (k === 'ArrowRight') rodar('R'); else if (k === 'ArrowLeft') rodar('L'); else if (k === 'ArrowUp') { e.preventDefault(); rodar('U'); } else if (k === 'ArrowDown') { e.preventDefault(); rodar('D'); }
}

onMounted(() => {
  if (!webglDisponible()) { mensaje.value = 'Tu dispositivo no soporta 3D'; return; }
  const w = stageEl.value?.clientWidth || 360, h = stageEl.value?.clientHeight || 360;
  ts = createThreeScene(lienzo.value!, w, h);
  ts.scene.add(new ts.THREE.AmbientLight(0xffffff, 0.7));
  const dl = new ts.THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(5, 12, 6); ts.scene.add(dl);
  ts.scene.add(new ts.THREE.HemisphereLight(0xcfe8ff, 0x334155, 0.4));
  pivote = new ts.THREE.Object3D();
  ts.start(loop);
  window.addEventListener('keydown', kd);
  loadTop(); loadMine();
});
function onResize() { if (!ts || !stageEl.value) return; const w = stageEl.value.clientWidth, h = stageEl.value.clientHeight; ts.renderer.setSize(w, h, false); ts.camera.aspect = w / h; ts.camera.updateProjectionMatrix(); }
onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => { window.removeEventListener('keydown', kd); window.removeEventListener('resize', onResize); if (ts) { ts.dispose(); ts = null; } });
</script>

<style scoped>
.b3 { min-height: 100vh; background: linear-gradient(180deg, #475569, #1e293b); display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.b3-head { width: 100%; max-width: 560px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #fff; }
.b3-head h2 { flex: 1; margin: 0; font-size: 1.1rem; }
.nav-btns { display: flex; gap: 0.35rem; }
.back { background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; }
.back.mapa { background: #fde68a; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.82rem; gap: 2px; }
.stage { position: relative; width: 100%; max-width: 620px; flex: 1; min-height: 60vh; }
.b3-canvas { width: 100%; height: 100%; display: block; }
.b3-audio { position: absolute; right: 10px; width: 40px; height: 40px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 1.1rem; font-weight: 800; cursor: pointer; }
.zoomp { bottom: 150px; } .zoomm { bottom: 104px; }
.b3-msg { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.75); color: #fff; padding: 0.5rem 1rem; border-radius: 14px; font-weight: 700; }
.b3-msg.gano { background: #16a34a; } .b3-msg.fallo { background: #b91c1c; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; } .fade-enter-from, .fade-leave-to { opacity: 0; }

.dpad { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 5px; }
.dmid { display: flex; gap: 5px; }
.db { width: 52px; height: 46px; border: none; border-radius: 12px; background: rgba(255,255,255,0.18); color: #fff; font-size: 1.2rem; cursor: pointer; box-shadow: 0 3px 0 rgba(0,0,0,0.35); }
.db:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.35); }
.db.reset { background: rgba(168,85,247,0.5); }

.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.55); }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 330px; width: 90%; max-height: 92vh; overflow-y: auto; box-shadow: 0 14px 40px rgba(0,0,0,0.3); }
.ov-emoji { font-size: 2.6rem; } .ov-card h3 { margin: 0.3rem 0; color: #1E293B; }
.ov-txt { color: #475569; font-size: 0.88rem; line-height: 1.4; }
.ov-best { color: #B45309; font-weight: 700; font-size: 0.85rem; margin: 0.4rem 0; }
.ov-score { color: #334155; font-weight: 700; margin: 0.3rem 0; }
.ranking { background: #0b1020; border: 2px solid #334155; border-radius: 14px; padding: 0.6rem; margin: 0.6rem 0; }
.rk-title { color: #fde047; font-weight: 800; font-size: 0.78rem; margin: 0 0 0.4rem; letter-spacing: 1px; }
.rk-list { list-style: none; margin: 0; padding: 0; }
.rk-list li { display: grid; grid-template-columns: 20px 1fr auto auto; gap: 5px; align-items: center; color: #e2e8f0; font-size: 0.76rem; padding: 3px 0; border-bottom: 1px solid #1e293b; }
.rk-list li.yo { color: #fde047; font-weight: 800; }
.rk-name { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pts { color: #4ade80; font-weight: 700; } .rk-date { color: #64748b; font-size: 0.66rem; }
.rk-empty { color: #94a3b8; grid-template-columns: 1fr !important; }
.ov-acciones { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.btn-jugar { background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; border: none; padding: 0.8rem 2rem; border-radius: 16px; font-size: 1.15rem; font-weight: 800; font-family: inherit; cursor: pointer; box-shadow: 0 5px 0 #15803D; }
.btn-jugar:active { transform: translateY(3px); box-shadow: 0 2px 0 #15803D; }
.btn-mapa { background: #e2e8f0; color: #334155; border: none; padding: 0.55rem 1.1rem; border-radius: 14px; font-weight: 700; font-family: inherit; cursor: pointer; }
</style>
