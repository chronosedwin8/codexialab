<template>
  <div class="rh">
    <header class="rh-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>🕐 Lee la Hora</h2>
      <div class="hud"><span>✅ {{ score }} · 🌍{{ mundo }}</span><span>🏆 {{ best }}</span></div>
    </header>

    <div class="stage">
      <div v-if="estado === 'jugando'" class="vidas-row">{{ corazones }}</div>
      <transition name="rhb"><div v-if="flash" class="rh-banner">{{ flash }}</div></transition>

      <!-- Reloj digital -->
      <div class="digital">
        <span class="led">{{ pad(target.h) }}<span class="dots">:</span>{{ pad(target.m) }}</span>
      </div>
      <p class="instru">¿Cuál reloj marca esta hora?</p>

      <!-- 3 relojes analógicos -->
      <div class="relojes">
        <button v-for="op in opciones" :key="op.id" class="reloj"
          :class="{ ok: revelar && op.correcta, mal: revelar && elegidaId === op.id && !op.correcta }"
          @click="elegir(op)">
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="47" fill="#38bdf8" />
            <circle cx="50" cy="50" r="42" fill="#fff" />
            <line v-for="(t, i) in TICKS" :key="'t' + i" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" stroke="#1e293b" :stroke-width="t.big ? 1.6 : 0.7" />
            <text v-for="n in NUMS" :key="'n' + n.n" :x="n.x" :y="n.y" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" fill="#111">{{ n.n }}</text>
            <line :x1="50" :y1="50" :x2="hands(op).hx" :y2="hands(op).hy" stroke="#111" stroke-width="3.4" stroke-linecap="round" />
            <line :x1="50" :y1="50" :x2="hands(op).mx" :y2="hands(op).my" stroke="#111" stroke-width="2.2" stroke-linecap="round" />
            <circle cx="50" cy="50" r="2.6" fill="#111" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Inicio -->
    <div v-if="estado === 'inicio'" class="overlay">
      <div class="ov-card">
        <div class="ov-emoji">🕐⏰</div>
        <h3>Lee la Hora</h3>
        <p class="ov-txt">Mira el reloj <b>digital</b> y toca el reloj <b>analógico</b> que marca la misma hora. Cada mundo añade minutos más difíciles (y la tarde en 24h). Tienes <b>❤️ 3 vidas</b>.</p>
        <p class="ov-best">🏆 Tu mejor: {{ best }} aciertos</p>
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
          <button class="btn-jugar" @click="iniciar">▶ ¡Jugar!</button>
          <button class="btn-mapa" @click="irMapa">🗺️ Volver al mapa</button>
        </div>
      </div>
    </div>

    <!-- Game over -->
    <div v-else-if="estado === 'fin'" class="overlay">
      <div class="ov-card">
        <div class="ov-emoji">{{ score >= best && score > 0 ? '🏆' : '⏰' }}</div>
        <h3>{{ score >= best && score > 0 ? '¡Nuevo récord!' : '¡Se acabaron las vidas!' }}</h3>
        <p class="ov-score">✅ {{ score }} aciertos · 🌍 Mundo {{ mundo }}</p>
        <p v-if="enTop" class="entop">🎉 ¡Entraste al Top 5!</p>
        <p class="ov-best">🏆 Tu mejor: {{ best }} aciertos</p>
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
          <button class="btn-jugar" @click="iniciar">🔁 Otra vez</button>
          <button class="btn-mapa" @click="salir">🏠 Menú</button>
          <button class="btn-mapa" @click="irMapa">🗺️ Mapa</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAudio } from '@/composables/useAudio';
import { useAuthStore } from '@/stores/auth';
import { juegosApi } from '@/api/index';

const router = useRouter();
const audio = useAudio();
const auth = useAuthStore();
const miNombre = computed(() => auth.user?.nombre || '');
const JUEGO = 'lee-hora';

// Cara del reloj (estática)
const rad = (d: number) => (d * Math.PI) / 180;
const NUMS = Array.from({ length: 12 }, (_, i) => { const n = i + 1; const a = rad(n * 30); return { n, x: 50 + 33 * Math.sin(a), y: 50 - 33 * Math.cos(a) }; });
const TICKS = Array.from({ length: 60 }, (_, i) => { const a = rad(i * 6); const big = i % 5 === 0; const r1 = big ? 39 : 41.5; return { big, x1: 50 + r1 * Math.sin(a), y1: 50 - r1 * Math.cos(a), x2: 50 + 44 * Math.sin(a), y2: 50 - 44 * Math.cos(a) }; });
function hands(op: { h: number; m: number }) {
  const ha = rad((op.h % 12) * 30 + op.m * 0.5), ma = rad(op.m * 6);
  return { hx: 50 + 22 * Math.sin(ha), hy: 50 - 22 * Math.cos(ha), mx: 50 + 33 * Math.sin(ma), my: 50 - 33 * Math.cos(ma) };
}

const estado = ref<'inicio' | 'jugando' | 'fin'>('inicio');
const score = ref(0);
const best = ref(Number(localStorage.getItem('leehora_best') || 0));
const VIDAS_MAX = 5;
const vidas = ref(3);
const target = ref({ h: 3, m: 0 });
const opciones = ref<Array<{ id: number; h: number; m: number; correcta: boolean }>>([]);
const bloqueo = ref(false);
const revelar = ref(false);
const elegidaId = ref(-1);
const enTop = ref(false);
const topScores = ref<any[]>([]);
const flash = ref('');
let flashTimer: ReturnType<typeof setTimeout>;
const mundo = computed(() => Math.min(6, Math.floor(score.value / 5) + 1));
const corazones = computed(() => '❤️'.repeat(Math.max(0, vidas.value)) + '🤍'.repeat(Math.max(0, VIDAS_MAX - vidas.value)));
const pad = (n: number) => String(n).padStart(2, '0');
function banner(t: string) { flash.value = t; clearTimeout(flashTimer); flashTimer = setTimeout(() => (flash.value = ''), 1200); }

function granularidad(w: number) { return w <= 1 ? 60 : w === 2 ? 30 : w === 3 ? 15 : w === 4 ? 5 : 1; }
function genTiempo(w: number) {
  const g = granularidad(w);
  const minH = w >= 3 ? 0 : 1, maxH = w >= 3 ? 23 : 12;
  const h = minH + Math.floor(Math.random() * (maxH - minH + 1));
  const m = g >= 60 ? 0 : Math.floor(Math.random() * (60 / g)) * g;
  return { h, m };
}
function nuevaRonda() {
  const w = mundo.value, g = granularidad(w);
  const correcto = genTiempo(w);
  const usados = new Set<string>([`${correcto.h % 12},${correcto.m}`]);   // equivalencia analógica = h%12
  const distintos: Array<{ h: number; m: number }> = [];
  let intentos = 0;
  while (distintos.length < 2 && intentos++ < 200) {
    let cand: { h: number; m: number };
    const r = Math.random();
    if (r < 0.4) cand = { h: correcto.h, m: otroMinuto(correcto.m, g) };           // misma hora, otro minuto
    else if (r < 0.7) cand = { h: vecinoHora(correcto.h, w), m: correcto.m };       // hora cercana, mismo minuto
    else cand = genTiempo(w);
    const k = `${cand.h % 12},${cand.m}`;
    if (!usados.has(k)) { usados.add(k); distintos.push(cand); }
  }
  while (distintos.length < 2) { const c = genTiempo(w); const k = `${c.h % 12},${c.m}`; if (!usados.has(k)) { usados.add(k); distintos.push(c); } }
  target.value = correcto;
  const arr = [{ ...correcto, correcta: true }, { ...distintos[0], correcta: false }, { ...distintos[1], correcta: false }]
    .sort(() => Math.random() - 0.5).map((o, i) => ({ ...o, id: i }));
  opciones.value = arr;
  revelar.value = false; elegidaId.value = -1; bloqueo.value = false;
}
function otroMinuto(m: number, g: number) { if (g >= 60) return m; const opts = []; for (let v = 0; v < 60; v += g) if (v !== m) opts.push(v); return opts[Math.floor(Math.random() * opts.length)] ?? (m + g) % 60; }
function vecinoHora(h: number, w: number) { const minH = w >= 3 ? 0 : 1, maxH = w >= 3 ? 23 : 12; let nh = h; let g = 0; while ((nh % 12 === h % 12) && g++ < 20) { nh = minH + Math.floor(Math.random() * (maxH - minH + 1)); } return nh; }

function elegir(op: { id: number; correcta: boolean }) {
  if (bloqueo.value || estado.value !== 'jugando') return;
  bloqueo.value = true; elegidaId.value = op.id; revelar.value = true;
  if (op.correcta) {
    audio.sfx('sfx-correcto'); score.value++;
    if (score.value % 6 === 0 && vidas.value < VIDAS_MAX) { vidas.value++; banner('❤️ ¡Vida extra!'); }
    if (score.value > best.value) { best.value = score.value; localStorage.setItem('leehora_best', String(best.value)); }
    setTimeout(() => nuevaRonda(), 650);
  } else {
    audio.sfx('sfx-error'); vidas.value--;
    setTimeout(() => { if (vidas.value <= 0) perder(); else nuevaRonda(); }, 1300);
  }
}

async function iniciar() { score.value = 0; vidas.value = 3; enTop.value = false; estado.value = 'jugando'; nuevaRonda(); }
async function perder() {
  estado.value = 'fin'; audio.sfx('sfx-error'); enTop.value = false;
  if (score.value > best.value) { best.value = score.value; localStorage.setItem('leehora_best', String(best.value)); }
  try { const r = await juegosApi.guardar(JUEGO, score.value, mundo.value); enTop.value = !!r.enTop; if ((r.mejor ?? 0) > best.value) best.value = r.mejor; await loadTop(); } catch { /* sin sesión */ }
}
function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); if ((d.mejor ?? 0) > best.value) best.value = d.mejor; } catch { /* sin sesión */ } }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }
onMounted(() => { loadTop(); loadMine(); });
</script>

<style scoped>
.rh { min-height: 100vh; background: linear-gradient(180deg, #fef9c3, #fde68a); display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.rh-head { width: 100%; max-width: 560px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #7c2d12; }
.rh-head h2 { flex: 1; margin: 0; font-size: 1.15rem; }
.nav-btns { display: flex; gap: 0.35rem; }
.back { background: rgba(255,255,255,0.92); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.15); }
.back.mapa { background: #fbcfe8; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.85rem; gap: 2px; color: #92400e; font-weight: 700; }
.stage { position: relative; width: 100%; max-width: 560px; flex: 1; display: flex; flex-direction: column; align-items: center; padding: 0.5rem; }
.vidas-row { font-size: 1.05rem; letter-spacing: 2px; }
.rh-banner { position: absolute; top: 20%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fde047; font-weight: 800; padding: 0.5rem 1rem; border-radius: 14px; z-index: 6; }
.rhb-enter-active, .rhb-leave-active { transition: opacity 0.25s; } .rhb-enter-from, .rhb-leave-to { opacity: 0; }

.digital { background: #1a1a1a; border: 4px solid #3f3f46; border-radius: 14px; padding: 0.5rem 1.4rem; margin: 0.6rem 0 0.2rem; box-shadow: inset 0 0 18px rgba(255,0,0,0.15); }
.led { font-family: 'Courier New', monospace; font-weight: 800; font-size: 2.8rem; color: #ff2d2d; letter-spacing: 4px; text-shadow: 0 0 10px rgba(255,45,45,0.8); }
.dots { animation: blink 1s steps(1) infinite; } @keyframes blink { 50% { opacity: 0.25; } }
.instru { color: #92400e; font-weight: 700; margin: 0.3rem 0 0.7rem; }

.relojes { display: flex; gap: 0.7rem; justify-content: center; flex-wrap: wrap; width: 100%; }
.reloj { border: 4px solid transparent; border-radius: 18px; background: transparent; padding: 0; cursor: pointer; width: min(30vw, 165px); transition: transform 0.12s; }
.reloj svg { width: 100%; display: block; }
.reloj:active { transform: scale(0.96); }
.reloj.ok { border-color: #16a34a; box-shadow: 0 0 0 4px rgba(22,163,74,0.3); }
.reloj.mal { border-color: #dc2626; box-shadow: 0 0 0 4px rgba(220,38,38,0.3); }

.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); z-index: 30; }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 330px; width: 90%; max-height: 92vh; overflow-y: auto; box-shadow: 0 14px 40px rgba(0,0,0,0.3); }
.ov-emoji { font-size: 2.6rem; } .ov-card h3 { margin: 0.3rem 0; color: #1E293B; }
.ov-txt { color: #475569; font-size: 0.88rem; line-height: 1.4; }
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
