<template>
  <div class="mf" :style="{ background: bgMundo }">
    <header class="mf-head">
      <div class="nav-btns">
        <button class="back" @click="salir" title="Menú de juegos">⬅️</button>
        <button class="back mapa" @click="irMapa" title="Volver al mapa">🗺️</button>
      </div>
      <h2>🧠 Memo-Flash</h2>
      <div class="hud"><span>🔁 Ronda {{ puntos }}</span><span>🏆 {{ best }}</span></div>
    </header>

    <div class="stage">
      <div v-if="estado !== 'inicio'" class="vidas-row">{{ corazones }}</div>
      <p class="estado-txt" :class="estado">{{ estadoTxt }}</p>
      <transition name="mfb"><div v-if="flash" class="mf-banner">{{ flash }}</div></transition>
      <div class="board" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <button v-for="(p, i) in nPads" :key="i" class="pad" :class="{ on: activo === i, jugable: estado === 'repitiendo' }"
          :style="{ background: activo === i ? COLORES[i] : COLORES[i] + '99' }" @pointerdown="tapPad(i)"></button>
      </div>
      <p class="mundo-txt">🌍 Mundo {{ mundo }} · {{ nPads }} colores</p>

      <!-- Inicio -->
      <div v-if="estado === 'inicio'" class="overlay">
        <div class="ov-card">
          <div class="ov-emoji">🧠✨</div>
          <h3>Memo-Flash</h3>
          <p class="ov-txt"><b>Observa</b> la secuencia que destella y <b>repítela</b> tocando los colores en el mismo orden. Cada ronda es más larga. Tienes <b>❤️ 3 vidas</b> (ganas una extra cada 5 rondas) y al fallar sigues en la misma ronda. ¡Concéntrate y memoriza!</p>
          <p class="ov-best">🏆 Tu mejor: ronda {{ best }}</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">R{{ r.puntos }}</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
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
          <div class="ov-emoji">{{ puntos >= best && puntos > 0 ? '🏆' : '💥' }}</div>
          <h3>{{ puntos >= best && puntos > 0 ? '¡Nuevo récord!' : '¡Fallaste!' }}</h3>
          <p class="ov-score">🔁 Llegaste a la ronda {{ puntos }} · 🌍 Mundo {{ mundo }}</p>
          <p v-if="enTop" class="entop">🎉 ¡Entraste al Top 5!</p>
          <p class="ov-best">🏆 Tu mejor: ronda {{ best }}</p>
          <div class="ranking">
            <p class="rk-title">🏆 MEJORES PUNTAJES</p>
            <ol class="rk-list">
              <li v-for="(r, i) in topScores" :key="i" :class="{ yo: r.nombre === miNombre }">
                <span class="rk-pos">{{ ['🥇','🥈','🥉'][i] || (i + 1) }}</span>
                <span class="rk-name">{{ r.nombre }}</span><span class="rk-pts">R{{ r.puntos }}</span><span class="rk-date">{{ fmtFecha(r.fecha) }}</span>
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
const JUEGO = 'memo-flash';

const COLORES = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#84cc16'];
const FREQS = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5, 1318.5, 1568.0];

const estado = ref<'inicio' | 'mostrando' | 'repitiendo' | 'fin'>('inicio');
const secuencia = ref<number[]>([]);
const posJugador = ref(0);
const ronda = ref(0);
const puntos = ref(0);
const best = ref(Number(localStorage.getItem('memoflash_best') || 0));
const activo = ref(-1);
const enTop = ref(false);
const topScores = ref<any[]>([]);
const VIDAS_MAX = 5;
const vidas = ref(3);
const flash = ref('');
const corazones = computed(() => '❤️'.repeat(Math.max(0, vidas.value)) + '🤍'.repeat(Math.max(0, VIDAS_MAX - vidas.value)));

const mundo = computed(() => Math.floor(Math.max(0, ronda.value - 1) / 4) + 1);
const nPads = computed(() => Math.min(9, 3 + mundo.value));
const cols = computed(() => Math.ceil(Math.sqrt(nPads.value)));
const flashMs = computed(() => Math.max(230, 560 - ronda.value * 16));
const gapMs = computed(() => Math.max(120, 260 - ronda.value * 8));
const bgMundo = computed(() => `linear-gradient(180deg, hsl(${(mundo.value * 47) % 360} 45% 18%), hsl(${(mundo.value * 47 + 40) % 360} 50% 10%))`);
const estadoTxt = computed(() => estado.value === 'mostrando' ? '👀 Observa la secuencia…' : estado.value === 'repitiendo' ? '✋ ¡Tu turno! Repite el orden' : ' ');

let ac: AudioContext | null = null;
let vivo = true;
let flashTimer: ReturnType<typeof setTimeout>;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
function banner(msg: string) { flash.value = msg; clearTimeout(flashTimer); flashTimer = setTimeout(() => { flash.value = ''; }, 1300); }

function beep(i: number, ms = 200) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine'; o.frequency.value = FREQS[i % FREQS.length];
  o.connect(g); g.connect(ac.destination);
  const t = ac.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.start(t); o.stop(t + ms / 1000 + 0.03);
}

async function mostrarSecuencia() {
  estado.value = 'mostrando'; activo.value = -1; await delay(600);
  for (const idx of secuencia.value) {
    if (!vivo) return;
    activo.value = idx; beep(idx, flashMs.value * 0.85); await delay(flashMs.value);
    activo.value = -1; await delay(gapMs.value);
  }
  if (!vivo) return;
  estado.value = 'repitiendo'; posJugador.value = 0;
}

function nuevaRonda() {
  if (!vivo) return;
  ronda.value++;
  secuencia.value.push(Math.floor(Math.random() * nPads.value));
  mostrarSecuencia();
}

function tapPad(i: number) {
  if (estado.value !== 'repitiendo') return;
  activo.value = i; beep(i, 180);
  setTimeout(() => { if (activo.value === i) activo.value = -1; }, 170);
  if (i === secuencia.value[posJugador.value]) {
    posJugador.value++;
    if (posJugador.value === secuencia.value.length) {
      puntos.value = secuencia.value.length; audio.sfx('sfx-correcto');
      // Gana una vida extra cada 5 rondas (hasta el máximo)
      if (secuencia.value.length % 5 === 0 && vidas.value < VIDAS_MAX) { vidas.value++; banner('❤️ ¡Vida extra!'); }
      estado.value = 'mostrando'; setTimeout(nuevaRonda, 720);
    }
  } else {
    // Falló: pierde una vida pero se queda en la MISMA ronda
    vidas.value--; audio.sfx('sfx-error');
    if (vidas.value <= 0) { perder(); return; }
    banner('💔 ¡Vida perdida! Observa otra vez');
    estado.value = 'mostrando';
    setTimeout(() => { if (vivo) { posJugador.value = 0; mostrarSecuencia(); } }, 1200);
  }
}

async function perder() {
  estado.value = 'fin'; activo.value = -1; audio.sfx('sfx-error'); enTop.value = false;
  if (puntos.value > best.value) { best.value = puntos.value; localStorage.setItem('memoflash_best', String(best.value)); }
  try { const r = await juegosApi.guardar(JUEGO, puntos.value, mundo.value); enTop.value = !!r.enTop; if ((r.mejor ?? 0) > best.value) best.value = r.mejor; await loadTop(); } catch { /* sin sesión */ }
}

function iniciar() {
  if (!ac) { try { ac = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { /* noop */ } }
  ac?.resume?.();
  vivo = true; secuencia.value = []; ronda.value = 0; puntos.value = 0; posJugador.value = 0; activo.value = -1;
  vidas.value = 3; flash.value = '';
  nuevaRonda();
}

function fmtFecha(f: string) { const d = new Date(f); return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
async function loadTop() { try { topScores.value = (await juegosApi.top(JUEGO, 5)).top; } catch { /* noop */ } }
async function loadMine() { try { const d = await juegosApi.misRecords(JUEGO); if ((d.mejor ?? 0) > best.value) best.value = d.mejor; } catch { /* sin sesión */ } }
function salir() { router.push('/juegos'); }
function irMapa() { router.push('/mapa'); }

onMounted(() => { loadTop(); loadMine(); });
onUnmounted(() => { vivo = false; ac?.close?.(); });
</script>

<style scoped>
.mf { min-height: 100vh; display: flex; flex-direction: column; align-items: center; font-family: 'Fredoka One', 'Baloo 2', sans-serif; transition: background 0.6s; }
.mf-head { width: 100%; max-width: 420px; display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.8rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
.mf-head h2 { flex: 1; margin: 0; font-size: 1.15rem; }
.nav-btns { display: flex; gap: 0.35rem; }
.back { background: rgba(255,255,255,0.85); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.1rem; cursor: pointer; }
.back.mapa { background: #fde68a; }
.hud { display: flex; flex-direction: column; align-items: flex-end; font-size: 0.85rem; gap: 2px; }
.stage { position: relative; width: 100%; max-width: 420px; flex: 1; display: flex; flex-direction: column; align-items: center; padding: 0.5rem; }
.vidas-row { font-size: 1.05rem; letter-spacing: 2px; margin-top: 0.2rem; }
.estado-txt { color: #fff; font-size: 1.05rem; min-height: 1.4em; margin: 0.4rem 0; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.mf-banner { position: absolute; top: 36%; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; font-weight: 800; padding: 0.6rem 1.1rem; border-radius: 14px; z-index: 5; box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
.mfb-enter-active, .mfb-leave-active { transition: opacity 0.25s, transform 0.25s; }
.mfb-enter-from, .mfb-leave-to { opacity: 0; transform: translateX(-50%) scale(0.8); }
.estado-txt.repitiendo { color: #fde047; }
.board { display: grid; gap: 12px; width: min(92vw, 340px); aspect-ratio: 1; margin: 0.3rem 0; }
.pad { border: none; border-radius: 18px; cursor: pointer; box-shadow: inset 0 -6px 0 rgba(0,0,0,0.25); transition: transform 0.08s, filter 0.08s; }
.pad.on { filter: brightness(1.5) saturate(1.4); transform: scale(1.04); box-shadow: 0 0 26px rgba(255,255,255,0.6), inset 0 -6px 0 rgba(0,0,0,0.25); }
.pad.jugable:active { transform: scale(0.96); }
.mundo-txt { color: rgba(255,255,255,0.85); font-size: 0.85rem; margin-top: 0.3rem; text-shadow: 0 1px 2px rgba(0,0,0,0.5); }

.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border-radius: 14px; }
.ov-card { background: #fff; border-radius: 24px; padding: 1.4rem 1.2rem; text-align: center; max-width: 320px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 14px 40px rgba(0,0,0,0.3); }
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
