<template>
  <div class="arcade">
    <!-- HUD -->
    <div class="arcade-hud">
      <div class="vidas">
        <span v-for="i in maxVidas" :key="i" class="corazon">{{ i <= vidas ? '❤️' : '🤍' }}</span>
      </div>
      <div class="hud-mid">
        <span class="combo" v-if="combo > 1">🔥 x{{ combo }}</span>
        <span class="dist">Meta {{ Math.min(100, Math.round((distancia / meta) * 100)) }}%</span>
      </div>
      <div class="monedas">🪙 {{ monedas }}</div>
    </div>
    <div class="prog"><div class="prog-fill" :style="{ width: Math.min(100, (distancia / meta) * 100) + '%' }"></div><span class="prog-flag">🏁</span></div>

    <!-- Lienzo del juego -->
    <div class="stage" ref="stageRef">
      <canvas ref="canvasRef" :width="W" :height="H" class="game-canvas" @pointerdown="saltar"></canvas>

      <!-- Cartel de dato curioso -->
      <transition name="fade"><div v-if="factMsg" class="fact-banner">💡 {{ factMsg }}</div></transition>

      <!-- Indicación inicial -->
      <transition name="fade">
        <div v-if="estado === 'listo'" class="overlay-center" @pointerdown.stop="empezar">
          <div class="start-card">
            <div class="big-emoji">🎮</div>
            <h2>¡{{ nombre }}!</h2>
            <p>Toca / barra espaciadora para <b>SALTAR</b>. Esquiva obstáculos, atrapa monedas y responde en las puertas del saber. ¡Llega a la meta!</p>
            <button class="btn-arcade" @click.stop="empezar">▶ ¡Jugar!</button>
          </div>
        </div>
      </transition>

      <!-- Puerta del saber (trivia) -->
      <transition name="fade">
        <div v-if="estado === 'trivia'" class="overlay-center">
          <div class="trivia-card">
            <div class="trivia-top">🚪 Puerta del Saber</div>
            <p class="trivia-q">{{ retoActual?.enunciado }}</p>
            <div class="trivia-ops">
              <button v-for="(op, i) in retoActual?.opciones" :key="i"
                :class="['top', { ok: trivResp && i === retoActual?.correcta, bad: trivResp && trivElegida === i && i !== retoActual?.correcta }]"
                :disabled="trivResp" @click="responderTrivia(i)">{{ op }}</button>
            </div>
            <p v-if="trivResp" class="trivia-fb" :class="trivOk ? 'g' : 'm'">
              {{ trivOk ? '¡Correcto! +escudo 🛡️' : 'Casi… ' + (retoActual?.explicacion || '') }}
            </p>
          </div>
        </div>
      </transition>

      <!-- Fin: ganaste -->
      <transition name="fade">
        <div v-if="estado === 'ganaste'" class="overlay-center">
          <div class="fin-card">
            <div class="fin-stars"><span v-for="i in 3" :key="i" :class="{ on: estrellas >= i }">★</span></div>
            <h2>¡Llegaste a la meta! 🎉</h2>
            <p>Atrapaste {{ monedas }} 🪙 y esquivaste {{ esquivados }} obstáculos. ¡Eres un crack!</p>
          </div>
        </div>
      </transition>

      <!-- Fin: perdiste -->
      <transition name="fade">
        <div v-if="estado === 'perdiste'" class="overlay-center">
          <div class="fin-card perdiste">
            <div class="big-emoji">😵</div>
            <h2>¡Oh no!</h2>
            <p>Te quedaste sin vidas, pero los campeones lo intentan de nuevo.</p>
            <button class="btn-arcade" @click="reiniciar">🔄 Reintentar</button>
          </div>
        </div>
      </transition>
    </div>

    <p class="hint-ctrl">⌨️ Espacio / ⬆️ o toca la pantalla para saltar — doble salto disponible</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useAudio } from '@/composables/useAudio';

interface Segmento {
  tipo: 'info' | 'reto';
  texto?: string; obstaculo?: string;
  enunciado?: string; opciones?: string[]; correcta?: number; explicacion?: string;
}
const props = defineProps<{ config: { nombre?: string; vidas?: number; segmentos: Segmento[]; recompensa?: { monedas?: number } } }>();
const emit = defineEmits<{ 'complete': [stars: number] }>();

const audio = useAudio();
const authStore = useAuthStore();

// ── Dimensiones lógicas del lienzo ─────────────────────────────────────────
const W = 900, H = 340;
const GROUND = 270;
const canvasRef = ref<HTMLCanvasElement | null>(null);
const stageRef = ref<HTMLDivElement | null>(null);

const heroColors: Record<string, string> = { azul: '#3B82F6', rojo: '#EF4444', verde: '#22C55E', dorado: '#EAB308', morado: '#8B5CF6', naranja: '#F97316', rosa: '#EC4899', cyan: '#06B6D4' };
const heroColor = computed(() => heroColors[authStore.user?.avatar_config?.color ?? 'azul'] ?? '#3B82F6');

const nombre = computed(() => (props.config.nombre ?? 'Arcade').replace(/^🎮\s*/, ''));
const segmentos = computed(() => props.config.segmentos ?? []);
const retos = computed(() => segmentos.value.filter((s) => s.tipo === 'reto' && s.opciones?.length));
const facts = computed(() => segmentos.value.filter((s) => s.tipo === 'info' && s.texto).map((s) => s.texto as string));

const maxVidas = computed(() => props.config.vidas ?? 3);

// ── Estado reactivo (HUD) ──────────────────────────────────────────────────
const estado = ref<'listo' | 'jugando' | 'trivia' | 'ganaste' | 'perdiste'>('listo');
const vidas = ref(maxVidas.value);
const monedas = ref(0);
const combo = ref(0);
const distancia = ref(0);
const esquivados = ref(0);
const factMsg = ref('');
const retoActual = ref<Segmento | null>(null);
const trivResp = ref(false);
const trivOk = ref(false);
const trivElegida = ref<number | null>(null);

// Distancia objetivo: depende de cuántas puertas del saber haya
const GATE_GAP = 1400;
const meta = computed(() => (Math.max(1, retos.value.length) + 1) * GATE_GAP);

const estrellas = computed(() => {
  const r = vidas.value / maxVidas.value;
  if (r >= 0.999) return 3; if (r >= 0.5) return 2; return 1;
});

// ── Estado interno del juego (no reactivo, por rendimiento) ─────────────────
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0;
let lastT = 0;
const hero = { y: GROUND, vy: 0, jumps: 0 };
let speed = 5;
let invuln = 0;       // frames de invulnerabilidad tras un golpe
let shield = 0;       // escudo ganado por trivia (absorbe 1 golpe)
let shake = 0;
let obstaculos: { x: number; w: number; h: number; icon: string; pasado?: boolean }[] = [];
let coins: { x: number; y: number; got?: boolean }[] = [];
let particles: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = [];
let nubes: { x: number; y: number; s: number }[] = [];
let spawnT = 0, coinT = 0;
let gatesDisparadas = 0;
let factsMostradas = 0;
let completado = false;

const OBST_ICON: Record<string, string> = { muro: '🧱', pozo: '🕳️', enemigo: '👾', fuego: '🔥', roca: '🪨', cono: '🚧' };

function reset() {
  vidas.value = maxVidas.value; monedas.value = 0; combo.value = 0; distancia.value = 0; esquivados.value = 0;
  factMsg.value = ''; completado = false;
  hero.y = GROUND; hero.vy = 0; hero.jumps = 0;
  speed = 5; invuln = 0; shield = 0; shake = 0;
  obstaculos = []; coins = []; particles = [];
  spawnT = 40; coinT = 90; gatesDisparadas = 0; factsMostradas = 0;
  nubes = [{ x: 200, y: 60, s: 1 }, { x: 600, y: 100, s: 0.7 }, { x: 850, y: 50, s: 1.2 }];
}

function empezar() {
  if (estado.value !== 'listo') return;
  reset();
  estado.value = 'jugando';
  lastT = performance.now();
  raf = requestAnimationFrame(loop);
}

function reiniciar() {
  cancelAnimationFrame(raf);
  reset();
  estado.value = 'jugando';
  lastT = performance.now();
  raf = requestAnimationFrame(loop);
}

function saltar() {
  if (estado.value === 'listo') { empezar(); return; }
  if (estado.value !== 'jugando') return;
  if (hero.jumps < 2) {
    hero.vy = hero.jumps === 0 ? -15 : -12.5;
    hero.jumps++;
    audio.sfx('sfx-salto');
  }
}

function onKey(e: KeyboardEvent) {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); saltar(); }
}

// ── Bucle principal ─────────────────────────────────────────────────────────
function loop(t: number) {
  const dt = Math.min(2, (t - lastT) / 16.67); // normaliza a ~60fps
  lastT = t;
  if (estado.value !== 'jugando') return;
  update(dt);
  // update() pudo cambiar el estado (trivia / fin): solo seguimos si seguimos jugando
  if (estado.value !== 'jugando') return;
  draw();
  raf = requestAnimationFrame(loop);
}

function spawnObstaculo() {
  const tipos = Object.keys(OBST_ICON);
  const icon = OBST_ICON[tipos[Math.floor(Math.random() * tipos.length)]];
  const h = 34 + Math.floor(Math.random() * 22);
  obstaculos.push({ x: W + 30, w: 34, h, icon });
}
function spawnCoins() {
  const n = 3 + Math.floor(Math.random() * 3);
  const baseY = GROUND - 40 - Math.floor(Math.random() * 90);
  for (let i = 0; i < n; i++) coins.push({ x: W + 30 + i * 34, y: baseY - Math.sin(i / n * Math.PI) * 24 });
}

function update(dt: number) {
  // Velocidad creciente
  speed = Math.min(11, speed + 0.0016 * dt);
  distancia.value += speed * dt;
  if (invuln > 0) invuln -= dt;
  if (shake > 0) shake -= dt;

  // Física del héroe
  hero.vy += 0.9 * dt;
  hero.y += hero.vy * dt;
  if (hero.y >= GROUND) { hero.y = GROUND; hero.vy = 0; hero.jumps = 0; }

  // Nubes parallax
  for (const n of nubes) { n.x -= speed * 0.2 * n.s * dt; if (n.x < -60) { n.x = W + 40; n.y = 40 + Math.random() * 80; } }

  // Spawns
  spawnT -= dt; coinT -= dt;
  if (spawnT <= 0) { spawnObstaculo(); spawnT = 70 + Math.random() * 60 - speed * 3; }
  if (coinT <= 0) { spawnCoins(); coinT = 130 + Math.random() * 80; }

  // Mover obstáculos + colisión
  const hx = 130, hr = 22;
  for (const o of obstaculos) {
    o.x -= speed * dt;
    if (!o.pasado && o.x + o.w < hx - hr) { o.pasado = true; esquivados.value++; combo.value++; }
    // colisión AABB círculo-rect (aprox)
    if (invuln <= 0 && o.x < hx + hr && o.x + o.w > hx - hr && hero.y > GROUND - o.h - hr * 0.5) {
      golpe(o);
    }
  }
  obstaculos = obstaculos.filter((o) => o.x > -50);

  // Mover monedas + recoger
  for (const c of coins) {
    c.x -= speed * dt;
    if (!c.got && Math.abs(c.x - hx) < 24 && Math.abs(c.y - hero.y) < 30) {
      c.got = true; monedas.value++; audio.sfx('sfx-moneda');
      for (let k = 0; k < 6; k++) particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4 - 1, life: 30, color: '#FCD34D' });
    }
  }
  coins = coins.filter((c) => c.x > -30 && !c.got);

  // Partículas
  for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.2 * dt; p.life -= dt; }
  particles = particles.filter((p) => p.life > 0);

  // Datos curiosos intercalados
  const factGap = meta.value / (facts.value.length + 1);
  if (facts.value.length && factsMostradas < facts.value.length && distancia.value > (factsMostradas + 1) * factGap - GATE_GAP / 2) {
    mostrarFact(facts.value[factsMostradas]); factsMostradas++;
  }

  // Puertas del saber (trivia)
  if (gatesDisparadas < retos.value.length && distancia.value >= (gatesDisparadas + 1) * GATE_GAP) {
    abrirTrivia(retos.value[gatesDisparadas]); gatesDisparadas++;
    return;
  }

  // ¿Meta?
  if (distancia.value >= meta.value) ganar();
}

function mostrarFact(txt: string) {
  factMsg.value = txt;
  setTimeout(() => { if (factMsg.value === txt) factMsg.value = ''; }, 3200);
}

function golpe(o: { icon: string }) {
  if (shield > 0) { shield--; invuln = 50; flashParticles('#38BDF8'); return; }
  vidas.value--; combo.value = 0; invuln = 60; shake = 16; audio.sfx('sfx-error');
  flashParticles('#EF4444');
  if (vidas.value <= 0) { setTimeout(perder, 350); }
}

function flashParticles(color: string) {
  for (let k = 0; k < 10; k++) particles.push({ x: 130, y: hero.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 28, color });
}

// ── Trivia (puerta del saber) ───────────────────────────────────────────────
function abrirTrivia(r: Segmento) {
  cancelAnimationFrame(raf);
  retoActual.value = r; trivResp.value = false; trivOk.value = false; trivElegida.value = null;
  estado.value = 'trivia';
}
function responderTrivia(i: number) {
  if (trivResp.value) return;
  trivElegida.value = i; trivResp.value = true;
  trivOk.value = i === retoActual.value?.correcta;
  if (trivOk.value) { shield++; monedas.value += 3; audio.sfx('sfx-moneda'); }
  else { vidas.value--; audio.sfx('sfx-error'); }
  setTimeout(() => {
    if (vidas.value <= 0) { perder(); return; }
    estado.value = 'jugando';
    lastT = performance.now();
    raf = requestAnimationFrame(loop);
  }, trivOk.value ? 700 : 1600);
}

function ganar() {
  if (completado) return;
  completado = true;
  cancelAnimationFrame(raf);
  estado.value = 'ganaste';
  audio.sfx('sfx-ganar');
  setTimeout(() => emit('complete', estrellas.value), 900);
}
function perder() {
  cancelAnimationFrame(raf);
  estado.value = 'perdiste';
}

// ── Dibujo ───────────────────────────────────────────────────────────────────
function draw() {
  if (!ctx) return;
  const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  const sy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
  ctx.setTransform(1, 0, 0, 1, sx, sy);

  // Cielo
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7DD3FC'); g.addColorStop(0.62, '#BAE6FD'); g.addColorStop(0.62, '#86EFAC'); g.addColorStop(1, '#4ADE80');
  ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);

  // Sol
  ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(W - 80, 60, 34, 0, Math.PI * 2); ctx.fill();

  // Nubes
  ctx.font = '40px serif'; ctx.textAlign = 'center';
  for (const n of nubes) ctx.fillText('☁️', n.x, n.y);

  // Suelo (líneas en movimiento)
  ctx.fillStyle = '#16A34A'; ctx.fillRect(-20, GROUND + 22, W + 40, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
  const off = (distancia.value % 60);
  for (let x = -off; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, GROUND + 30); ctx.lineTo(x + 30, GROUND + 30); ctx.stroke(); }

  // Monedas
  ctx.font = '26px serif';
  for (const c of coins) ctx.fillText('🪙', c.x, c.y);

  // Obstáculos
  ctx.font = '34px serif';
  for (const o of obstaculos) ctx.fillText(o.icon, o.x + o.w / 2, GROUND + 24);

  // Héroe (parpadea si invulnerable)
  if (!(invuln > 0 && Math.floor(invuln / 6) % 2 === 0)) dibujarHeroe();

  // Escudo
  if (shield > 0) {
    ctx.strokeStyle = '#38BDF8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(130, hero.y - 8, 30, 0, Math.PI * 2); ctx.stroke();
  }

  // Partículas
  for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / 30); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 5, 5); }
  ctx.globalAlpha = 1;
}

function dibujarHeroe() {
  if (!ctx) return;
  const x = 130, y = hero.y - 8, r = 22;
  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(x, GROUND + 18, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  // cuerpo
  ctx.fillStyle = heroColor.value; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // ojos
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x - 7, y - 4, 5, 0, Math.PI * 2); ctx.arc(x + 7, y - 4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath(); ctx.arc(x - 6, y - 3, 2.3, 0, Math.PI * 2); ctx.arc(x + 8, y - 3, 2.3, 0, Math.PI * 2); ctx.fill();
  // boca (feliz si salta)
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath();
  if (hero.vy < 0) ctx.arc(x, y + 5, 6, 0, Math.PI);
  else { ctx.moveTo(x - 5, y + 8); ctx.lineTo(x + 5, y + 8); }
  ctx.stroke();
}

onMounted(() => {
  ctx = canvasRef.value?.getContext('2d') ?? null;
  window.addEventListener('keydown', onKey);
  reset();
  // Pintar un primer fotograma de fondo bajo el overlay "listo"
  if (ctx) draw();
});
onUnmounted(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); });
</script>

<style scoped>
.arcade { flex: 1; display: flex; flex-direction: column; background: #0F172A; padding: 0.75rem; gap: 0.5rem; overflow-y: auto; }
.arcade-hud { display: flex; justify-content: space-between; align-items: center; color: #E2E8F0; font-weight: 700; }
.corazon { font-size: 1.2rem; }
.hud-mid { display: flex; gap: 0.75rem; align-items: center; }
.combo { color: #FB923C; }
.dist { color: #94A3B8; font-size: 0.85rem; }
.monedas { color: #FCD34D; }

.prog { position: relative; height: 8px; background: #1E293B; border-radius: 5px; }
.prog-fill { height: 100%; background: linear-gradient(90deg, #0EA5E9, #22D3EE); border-radius: 5px; transition: width 0.1s linear; }
.prog-flag { position: absolute; right: -2px; top: -10px; font-size: 0.9rem; }

.stage { position: relative; width: 100%; max-width: 900px; margin: 0 auto; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 20px rgba(0,0,0,0.4); }
.game-canvas { width: 100%; height: auto; display: block; touch-action: manipulation; cursor: pointer; }

.fact-banner { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); background: rgba(15,23,42,0.85); color: #FDE68A; font-weight: 700; font-size: 0.85rem; padding: 6px 14px; border-radius: 20px; max-width: 80%; text-align: center; }

.overlay-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(15,23,42,0.55); backdrop-filter: blur(2px); }
.start-card, .trivia-card, .fin-card { background: #1E293B; border: 2px solid #7C3AED; border-radius: 18px; padding: 1.5rem; max-width: 440px; text-align: center; color: #E2E8F0; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
.big-emoji { font-size: 3rem; }
.start-card h2, .fin-card h2 { color: #F1F5F9; margin: 0.3rem 0; }
.start-card p { color: #CBD5E1; line-height: 1.5; margin: 0.5rem 0 1rem; font-size: 0.92rem; }

.trivia-card { border-color: #FCD34D; }
.trivia-top { color: #FCD34D; font-weight: 800; margin-bottom: 0.6rem; }
.trivia-q { color: #F1F5F9; font-size: 1.05rem; font-weight: 600; margin: 0 0 0.9rem; }
.trivia-ops { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.top { padding: 0.65rem; background: #0F172A; border: 2px solid #334155; border-radius: 12px; color: #E2E8F0; cursor: pointer; font-family: inherit; font-size: 0.92rem; transition: all 0.15s; }
.top:hover:not(:disabled) { border-color: #FCD34D; transform: translateY(-2px); }
.top.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.top.bad { border-color: #DC2626; background: rgba(239,68,68,0.18); }
.trivia-fb { font-size: 0.86rem; margin: 0.8rem 0 0; }
.trivia-fb.g { color: #4ADE80; } .trivia-fb.m { color: #FCA5A5; }

.fin-card.perdiste { border-color: #DC2626; }
.fin-stars { font-size: 2.2rem; } .fin-stars span { color: #475569; } .fin-stars span.on { color: #FCD34D; }
.fin-card p { color: #CBD5E1; margin: 0.5rem 0 1rem; }

.btn-arcade { background: #7C3AED; color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; font-family: inherit; margin-top: 0.3rem; }
.btn-arcade:hover { background: #6D28D9; }

.hint-ctrl { text-align: center; color: #64748B; font-size: 0.75rem; margin: 0.1rem 0 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
