<template>
  <div class="rbu" :style="{ background: tema.bg2 }">
    <header class="rbu-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>🟠 Roll-Ball-Up</h2>
      <div class="hud"><span>🌍 Mundo {{ mundo }}</span><span>⛰️ {{ puntos }} m</span></div>
    </header>

    <div class="stage">
      <canvas ref="lienzo" :width="W" :height="H" class="lienzo"
        @pointerdown="onDown" @pointerup="onUp" @pointerleave="onUp" @pointermove="onMove"></canvas>

      <!-- Banner de cambio de mundo -->
      <transition name="banner"><div v-if="bannerMundo" class="mundo-banner">🌍 ¡Mundo {{ mundo }}! {{ tema.nombre }}</div></transition>

      <!-- Inicio -->
      <div v-if="estado === 'inicio'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">🟠⬆️</div>
          <h3>Roll-Ball-Up</h3>
          <p class="ov-txt">Sube saltando de plataforma en plataforma. La bola rebota sola: <b>toca o mantén</b> el lado <b>izquierdo</b> o <b>derecho</b> para dirigirla. ¡No caigas!</p>
          <p class="ov-best">🏆 Tu mejor: {{ best }} m</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span>
                <span class="rk-pts">{{ r.puntos }}m</span>
                <span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
              </li>
              <li v-if="!topScores.length" class="rk-empty">¡Sé el primero del ranking!</li>
            </ol>
          </div>
          <button class="btn-jugar" @click="iniciar">▶ ¡Jugar!</button>
          <p class="ov-tip">También puedes usar ← → del teclado</p>
        </div>
      </div>

      <!-- Game over -->
      <div v-else-if="estado === 'fin'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">{{ puntos >= best && puntos > 0 ? '🏆' : '💥' }}</div>
          <h3>{{ puntos >= best && puntos > 0 ? '¡Nuevo récord!' : '¡Caíste!' }}</h3>
          <p class="ov-score">⛰️ {{ puntos }} m · 🌍 Mundo {{ mundo }}</p>
          <p v-if="enTop" class="entop">🎉 ¡Entraste al Top 5!</p>
          <p class="ov-best">🏆 Tu mejor: {{ best }} m</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span>
                <span class="rk-pts">{{ r.puntos }}m</span>
                <span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
              </li>
              <li v-if="!topScores.length" class="rk-empty">¡Sé el primero del ranking!</li>
            </ol>
          </div>
          <div v-if="misRecords.length" class="mis-records">
            <p class="rk-title">📅 Tus últimos records</p>
            <div class="mr-row" v-for="(r, i) in misRecords.slice(0, 4)" :key="i"><span>{{ r.puntos }} m</span><span class="mr-date">{{ fmtFecha(r.fecha) }}</span></div>
          </div>
          <div class="ov-btns">
            <button class="btn-jugar" @click="iniciar">🔁 Otra vez</button>
            <button class="btn-salir" @click="salir">🏠 Salir</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Botones táctiles grandes -->
    <div v-if="estado === 'jugando'" class="tap-zones">
      <button class="tz left" @pointerdown.prevent="dir = -1" @pointerup="dir = 0" @pointerleave="dir = 0">◀</button>
      <button class="tz right" @pointerdown.prevent="dir = 1" @pointerup="dir = 0" @pointerleave="dir = 0">▶</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAudio } from '@/composables/useAudio';
import { juegosApi } from '@/api/index';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const audio = useAudio();
const auth = useAuthStore();
const miNombre = computed(() => auth.user?.nombre || '');
const JUEGO = 'roll-ball-up';
const topScores = ref<any[]>([]);
const misRecords = ref<any[]>([]);
const enTop = ref(false);
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); misRecords.value = d.records || []; if ((d.mejor ?? 0) > best.value) best.value = d.mejor; } catch { /* sin sesión */ } }
function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
const W = 360, H = 640;
const lienzo = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0, last = 0, acc = 0;

// Constantes físicas (px / s)
const GRAV = 2100, BOUNCE = 1080, MOVE = 420, R = 18, PLATH = 14;

const THEMES = [
  { nombre: 'La Cueva', bg: ['#241a33', '#3a0f1e'], bg2: '#1a1326', plat: '#8b5cf6', edge: '#c4b5fd', deco: '#f59e0b' },
  { nombre: 'El Bosque', bg: ['#14532d', '#166534'], bg2: '#0f3d22', plat: '#92400e', edge: '#b45309', deco: '#4ade80' },
  { nombre: 'La Mazmorra', bg: ['#0b1020', '#1e293b'], bg2: '#0b1020', plat: '#16a34a', edge: '#4ade80', deco: '#ef4444' },
  { nombre: 'El Cielo', bg: ['#38bdf8', '#7dd3fc'], bg2: '#7dd3fc', plat: '#f8fafc', edge: '#cbd5e1', deco: '#a78bfa' },
  { nombre: 'El Atardecer', bg: ['#f59e0b', '#ef4444'], bg2: '#ef4444', plat: '#fff7ed', edge: '#fdba74', deco: '#7c3aed' },
  { nombre: 'La Noche', bg: ['#0b1030', '#241b4d'], bg2: '#0b1030', plat: '#64748b', edge: '#cbd5e1', deco: '#fde047' },
];

const estado = ref<'inicio' | 'jugando' | 'fin'>('inicio');
const puntos = ref(0);
const mundo = ref(1);
const best = ref(Number(localStorage.getItem('rollballup_best') || 0));
const bannerMundo = ref(false);
const tema = ref(THEMES[0]);

let dir = 0;            // -1 izq, 0, +1 der (control horizontal)
const teclas: Record<string, boolean> = {};

// Estado del juego
let ball = { x: W / 2, y: 0, vy: 0, rot: 0 };
let cameraTop = 0;
let plats: Array<{ x: number; y: number; w: number; tipo: string; mundo: number; rota?: boolean; dir?: number; spd?: number; baseX?: number; rango?: number }> = [];
let genY = 0, genIdx = 0, maxClimb = 0, startY = 0;

function dif(w: number) {
  return {
    gap: Math.min(195, 112 + w * 9),
    ancho: Math.max(46, 96 - w * 7),
    reach: Math.max(95, 150 - w * 6),
    pMov: w >= 2 ? Math.min(0.45, (w - 1) * 0.13) : 0,
    pRota: w >= 3 ? Math.min(0.30, (w - 2) * 0.1) : 0,
    movSpd: 55 + w * 12,
  };
}

function nuevaPlataforma(prevX: number) {
  const w = Math.floor(genIdx / 12);
  const d = dif(w);
  genY -= d.gap;
  let cx = prevX + (Math.random() * 2 - 1) * d.reach;
  cx = Math.max(d.ancho / 2 + 6, Math.min(W - d.ancho / 2 - 6, cx));
  const p: any = { x: cx - d.ancho / 2, y: genY, w: d.ancho, tipo: 'static', mundo: w, index: genIdx };
  const r = Math.random();
  if (r < d.pRota) p.tipo = 'rota';
  else if (r < d.pRota + d.pMov) { p.tipo = 'mov'; p.baseX = p.x; p.rango = 40 + w * 6; p.dir = Math.random() < 0.5 ? 1 : -1; p.spd = d.movSpd; }
  genIdx++;
  plats.push(p);
  return cx;
}

function reset() {
  plats = []; genIdx = 0; genY = H - 70;
  // plataforma inicial grande
  const base: any = { x: W / 2 - 55, y: H - 70, w: 110, tipo: 'static', mundo: 0, index: 0 };
  plats.push(base); genIdx = 1; genY = H - 70;
  let px = W / 2;
  for (let i = 0; i < 9; i++) px = nuevaPlataforma(px);
  ball = { x: W / 2, y: H - 70 - R - PLATH / 2, vy: -BOUNCE, rot: 0 };
  cameraTop = 0; startY = ball.y; maxClimb = 0; puntos.value = 0; mundo.value = 1; tema.value = THEMES[0];
  dir = 0;
}

function iniciar() { reset(); estado.value = 'jugando'; }

function paso(dt: number) {
  const dh = (teclas['ArrowLeft'] || teclas['a'] ? -1 : 0) + (teclas['ArrowRight'] || teclas['d'] ? 1 : 0);
  const mover = dir || dh;
  ball.x += mover * MOVE * dt;
  ball.rot += mover * dt * 7;
  // wrap horizontal
  if (ball.x < 0) ball.x += W; if (ball.x > W) ball.x -= W;
  // gravedad
  ball.vy += GRAV * dt;
  ball.y += ball.vy * dt;

  // plataformas móviles
  for (const p of plats) {
    if (p.tipo === 'mov') { p.x += (p.dir || 1) * (p.spd || 60) * dt; if (p.x < (p.baseX! - p.rango!) || p.x > (p.baseX! + p.rango!)) p.dir = -(p.dir || 1); }
  }

  // colisión (solo cayendo)
  if (ball.vy > 0) {
    const bottom = ball.y + R;
    for (const p of plats) {
      if (p.rota === true) continue;
      if (bottom >= p.y && bottom <= p.y + PLATH + 12 && ball.x + R * 0.6 > p.x && ball.x - R * 0.6 < p.x + p.w) {
        ball.y = p.y - R; ball.vy = -BOUNCE; audio.sfx('sfx-salto');
        if (p.tipo === 'rota') p.rota = true; // se rompe tras pisarla
        // puntaje / mundo
        const w = (p as any).mundo + 1;
        if (w > mundo.value) { mundo.value = w; tema.value = THEMES[(w - 1) % THEMES.length]; flashBanner(); }
        break;
      }
    }
  }

  // cámara sube
  const objetivo = ball.y - H * 0.42;
  if (objetivo < cameraTop) cameraTop = objetivo;
  // generar arriba
  let topY = Math.min(...plats.map((p) => p.y));
  let lastX = plats[plats.length - 1].x + plats[plats.length - 1].w / 2;
  while (topY > cameraTop - 80) { lastX = nuevaPlataforma(lastX); topY = genY; }
  // limpiar abajo
  plats = plats.filter((p) => p.y < cameraTop + H + 60);

  // altura / puntaje
  const climb = startY - ball.y; if (climb > maxClimb) { maxClimb = climb; puntos.value = Math.floor(maxClimb / 22); }

  // perder
  if (ball.y - cameraTop > H + R) { perder(); }
}

let bannerT: any = null;
function flashBanner() { bannerMundo.value = true; clearTimeout(bannerT); bannerT = setTimeout(() => (bannerMundo.value = false), 1400); }

async function perder() {
  estado.value = 'fin'; audio.sfx('sfx-error'); enTop.value = false;
  if (puntos.value > best.value) { best.value = puntos.value; localStorage.setItem('rollballup_best', String(best.value)); }
  try { const r = await juegosApi.guardar(JUEGO, puntos.value, mundo.value); enTop.value = !!r.enTop; if ((r.mejor ?? 0) > best.value) best.value = r.mejor; await loadTop(); await loadMine(); } catch { /* sin sesión: no se guarda */ }
}

function dibujar() {
  if (!ctx) return;
  const t = tema.value;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, t.bg[0]); g.addColorStop(1, t.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // estrellas/deco de fondo (parallax simple por cameraTop)
  ctx.fillStyle = t.deco + '55';
  for (let i = 0; i < 18; i++) { const sx = (i * 53 % W); const sy = ((i * 97 - cameraTop * 0.3) % H + H) % H; ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill(); }

  // plataformas
  for (const p of plats) {
    const y = p.y - cameraTop; if (y < -30 || y > H + 30) continue;
    if (p.rota) continue;
    ctx.fillStyle = p.tipo === 'mov' ? t.edge : t.plat;
    roundRect(p.x, y, p.w, PLATH, 6); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; roundRect(p.x, y, p.w, 4, 4); ctx.fill();
    if (p.tipo === 'mov') { ctx.fillStyle = t.bg2; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('↔', p.x + p.w / 2, y + 11); }
  }

  // bola
  const by = ball.y - cameraTop;
  ctx.save(); ctx.translate(ball.x, by); ctx.rotate(ball.rot);
  const rg = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R);
  rg.addColorStop(0, '#fed7aa'); rg.addColorStop(0.4, '#fb923c'); rg.addColorStop(1, '#ea580c');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,40,0,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.stroke();
  ctx.restore();
  // ojos (sin rotar)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x - 5, by - 3, 4, 0, Math.PI * 2); ctx.arc(ball.x + 5, by - 3, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ball.x - 4 + (dir * 1.5), by - 3, 2, 0, Math.PI * 2); ctx.arc(ball.x + 6 + (dir * 1.5), by - 3, 2, 0, Math.PI * 2); ctx.fill();
}
function roundRect(x: number, y: number, w: number, h: number, r: number) { ctx!.beginPath(); ctx!.moveTo(x + r, y); ctx!.arcTo(x + w, y, x + w, y + h, r); ctx!.arcTo(x + w, y + h, x, y + h, r); ctx!.arcTo(x, y + h, x, y, r); ctx!.arcTo(x, y, x + w, y, r); ctx!.closePath(); }

function loop(ts: number) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (estado.value === 'jugando') { acc += dt; while (acc >= 1 / 120) { paso(1 / 120); acc -= 1 / 120; } }
  dibujar();
}

// controles
function onDown(e: PointerEvent) { if (estado.value !== 'jugando') return; const r = lienzo.value!.getBoundingClientRect(); dir = (e.clientX - r.left) / r.width < 0.5 ? -1 : 1; }
function onMove(e: PointerEvent) { if (!dir || estado.value !== 'jugando') return; const r = lienzo.value!.getBoundingClientRect(); dir = (e.clientX - r.left) / r.width < 0.5 ? -1 : 1; }
function onUp() { dir = 0; }
function kd(e: KeyboardEvent) { teclas[e.key] = true; if (estado.value !== 'jugando' && (e.key === ' ' || e.key === 'Enter')) iniciar(); }
function ku(e: KeyboardEvent) { teclas[e.key] = false; }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }

onMounted(() => { ctx = lienzo.value?.getContext('2d') ?? null; reset(); estado.value = 'inicio'; last = performance.now(); raf = requestAnimationFrame(loop); window.addEventListener('keydown', kd); window.addEventListener('keyup', ku); loadTop(); loadMine(); });
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
</script>

<style scoped>
.rbu { min-height: 100vh; display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; transition: background 0.6s; }
.rbu-head { width: 100%; max-width: 420px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.rbu-head h2 { flex: 1; margin: 0; font-size: 1.15rem; }
.nav-btns { display: flex; gap: 0.35rem; }
.back { background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; }
.back.mapa { background: #fde68a; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.78rem; gap: 2px; }
.stage { position: relative; width: 100%; max-width: 420px; flex: 1; display: flex; justify-content: center; align-items: flex-start; }
.lienzo { width: 100%; max-width: 360px; height: auto; max-height: calc(100vh - 150px); border-radius: 14px; touch-action: none; background: #000; box-shadow: 0 8px 30px rgba(0,0,0,0.4); }

.mundo-banner { position: absolute; top: 18%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.78); color: #fde047; padding: 0.6rem 1.2rem; border-radius: 999px; font-size: 1.1rem; white-space: nowrap; }
.banner-enter-active, .banner-leave-active { transition: all 0.3s; } .banner-enter-from, .banner-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }

.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.45); border-radius: 14px; }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 320px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 14px 40px rgba(0,0,0,0.3); }
.entop { color: #16A34A; font-weight: 800; margin: 0.2rem 0; }
.ranking { background: #0b1020; border: 2px solid #334155; border-radius: 14px; padding: 0.6rem 0.7rem; margin: 0.7rem 0; }
.rk-title { color: #fde047; font-weight: 800; letter-spacing: 1px; font-size: 0.82rem; margin: 0 0 0.4rem; }
.rk-list { list-style: none; margin: 0; padding: 0; }
.rk-list li { display: grid; grid-template-columns: 22px 1fr auto auto; gap: 6px; align-items: center; color: #e2e8f0; font-size: 0.78rem; padding: 3px 0; border-bottom: 1px solid #1e293b; }
.rk-list li.yo { color: #fde047; font-weight: 800; }
.rk-pos { text-align: center; } .rk-name { text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rk-pts { color: #4ade80; font-weight: 700; } .rk-date { color: #64748b; font-size: 0.68rem; }
.rk-empty { color: #94a3b8; font-style: italic; grid-template-columns: 1fr !important; }
.mis-records { background: #f1f5f9; border-radius: 12px; padding: 0.5rem 0.7rem; margin-bottom: 0.6rem; }
.mr-row { display: flex; justify-content: space-between; font-size: 0.78rem; color: #334155; padding: 2px 0; }
.mr-date { color: #94a3b8; }
.ov-emoji { font-size: 3rem; }
.ov-card h3 { margin: 0.3rem 0; color: #1E293B; font-size: 1.5rem; }
.ov-txt { color: #475569; font-size: 0.9rem; line-height: 1.4; margin: 0.5rem 0; }
.ov-score { font-size: 1.3rem; color: #16A34A; margin: 0.4rem 0; }
.ov-best { color: #B45309; font-weight: 700; margin: 0.2rem 0; }
.ov-tip { color: #94A3B8; font-size: 0.75rem; margin: 0.6rem 0 0; }
.btn-jugar { background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; border: none; padding: 0.8rem 2rem; border-radius: 16px; font-size: 1.2rem; font-weight: 800; font-family: inherit; cursor: pointer; box-shadow: 0 5px 0 #15803D; margin-top: 0.5rem; }
.btn-jugar:active { transform: translateY(3px); box-shadow: 0 2px 0 #15803D; }
.ov-btns { display: flex; gap: 0.6rem; justify-content: center; }
.btn-salir { background: #E2E8F0; color: #334155; border: none; padding: 0.8rem 1.2rem; border-radius: 16px; font-weight: 700; font-family: inherit; cursor: pointer; margin-top: 0.5rem; }

.tap-zones { width: 100%; max-width: 360px; display: flex; gap: 0.5rem; padding: 0.5rem; }
.tz { flex: 1; height: 60px; border: none; border-radius: 14px; font-size: 1.6rem; color: #fff; background: rgba(255,255,255,0.18); cursor: pointer; user-select: none; }
.tz:active { background: rgba(255,255,255,0.4); }
</style>
