<template>
  <div class="pp">
    <!-- Instrucción hablada -->
    <div class="instr-bar">
      <button class="voz-grande" @click="repetir" aria-label="Escuchar">🔊</button>
      <p class="instr">{{ config.instruccion }}</p>
    </div>

    <div class="pp-main">
      <!-- ════ ESCENA (rejilla) ════ -->
      <div class="escena" :class="{ shake }" :style="{ background: tema.fondo }">
        <div class="grid" :style="gridStyle">
          <!-- Suelo (casillas) -->
          <template v-for="(fila, y) in tilemap" :key="'r' + y">
            <div
              v-for="(celda, x) in fila"
              :key="x + '-' + y"
              class="celda"
              :class="{ pared: celda === 1 }"
              :style="celdaStyle(x, y, celda)"
            >
              <span v-if="celda === 1" class="pared-icono">{{ tema.pared }}</span>
            </div>
          </template>

          <!-- Estrellas a recoger -->
          <div
            v-for="(it, i) in items"
            v-show="!recogidas.has(clave(it))"
            :key="'i' + i"
            class="item"
            :style="posStyle(it.x, it.y)"
          >{{ tema.item }}</div>

          <!-- Meta (gema) -->
          <div class="meta" :style="posStyle(config.meta.x, config.meta.y)">
            <span class="meta-glow"></span>{{ tema.meta }}
          </div>

          <!-- Héroe -->
          <div class="heroe" :class="{ saltando }" :style="heroeStyle">{{ tema.heroe }}</div>
        </div>
      </div>

      <!-- ════ PROGRAMA + PALETA ════ -->
      <div class="panel">
        <div class="programa" :class="{ vacioAviso }">
          <button class="iniciar" :disabled="corriendo" @click="ejecutar">
            <span class="play-tri">▶</span> Iniciar
          </button>

          <div class="bloques" ref="bloquesEl">
            <p v-if="programa.length === 0" class="hint-vacio">Toca las flechas&nbsp;👉</p>
            <button
              v-for="(b, i) in programa"
              :key="b.uid"
              class="bloque"
              :class="{ activo: pasoActual === i }"
              :style="{ background: dirInfo(b.dir).grad, boxShadow: `0 5px 0 ${dirInfo(b.dir).sombra}` }"
              :disabled="corriendo"
              @click="quitar(i)"
              :aria-label="'Quitar ' + dirInfo(b.dir).nombre"
            >
              <span class="paw">🐾</span>
              <svg class="flecha" viewBox="0 0 100 100" :style="{ transform: `rotate(${dirInfo(b.dir).deg}deg)` }">
                <path d="M50 16 L80 50 H64 V84 H36 V50 H20 Z" />
              </svg>
            </button>
          </div>

          <button class="limpiar" :disabled="corriendo || programa.length === 0" @click="limpiar" aria-label="Borrar todo">🗑️</button>
        </div>

        <!-- Paleta de flechas -->
        <div class="paleta">
          <button
            v-for="d in DIRS"
            :key="d.dir"
            class="pal-btn"
            :style="{ background: d.grad, boxShadow: `0 6px 0 ${d.sombra}` }"
            :disabled="corriendo"
            @click="agregar(d.dir)"
            :aria-label="d.nombre"
          >
            <svg class="flecha" viewBox="0 0 100 100" :style="{ transform: `rotate(${d.deg}deg)` }">
              <path d="M50 16 L80 50 H64 V84 H36 V50 H20 Z" />
            </svg>
          </button>
        </div>
      </div>
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
import { useLevelRunner } from '@/composables/useLevelRunner';

type Dir = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();

const voz = useVoz();
const audio = useAudio();
const { runCode } = useLevelRunner();

// ── Flechas: colores como la referencia (azul/rosa/cian/naranja) ──
const DIRS = [
  { dir: 'arriba' as Dir, nombre: 'Arriba', deg: 0, grad: 'linear-gradient(160deg,#60A5FA,#2563EB)', sombra: '#1D4ED8' },
  { dir: 'abajo' as Dir, nombre: 'Abajo', deg: 180, grad: 'linear-gradient(160deg,#F472B6,#DB2777)', sombra: '#9D174D' },
  { dir: 'izquierda' as Dir, nombre: 'Izquierda', deg: 270, grad: 'linear-gradient(160deg,#22D3EE,#0891B2)', sombra: '#0E7490' },
  { dir: 'derecha' as Dir, nombre: 'Derecha', deg: 90, grad: 'linear-gradient(160deg,#FBBF24,#F59E0B)', sombra: '#B45309' },
];
const dirInfo = (d: Dir) => DIRS.find((x) => x.dir === d)!;
const CMD: Record<Dir, string> = {
  arriba: 'moverArriba', abajo: 'moverAbajo', izquierda: 'moverIzquierda', derecha: 'moverDerecha',
};
const DELTA: Record<string, { dx: number; dy: number }> = {
  moverArriba: { dx: 0, dy: -1 }, moverAbajo: { dx: 0, dy: 1 },
  moverIzquierda: { dx: -1, dy: 0 }, moverDerecha: { dx: 1, dy: 0 },
};

// ── Datos del nivel ──
const tilemap = computed<number[][]>(() => props.config.tilemap ?? [[0]]);
const items = computed<Array<{ x: number; y: number }>>(() => props.config.items ?? []);
const tema = computed(() => props.config.tema ?? {
  fondo: 'linear-gradient(180deg,#7DD3FC,#BAE6FD)', suelo1: '#FDE68A', suelo2: '#FCD34D',
  borde: '#F59E0B', heroe: '🐺', meta: '💎', pared: '🌴', item: '⭐',
});
const audioUrl = computed(() => props.config.audio || props.config.narracion?.url_audio_intro || null);

const rows = computed(() => tilemap.value.length);
const cols = computed(() => tilemap.value[0]?.length ?? 1);
// Casillas grandes que caben en cualquier mapa
const tile = computed(() => Math.max(46, Math.min(78, Math.floor(440 / Math.max(rows.value, cols.value)))));
const gridStyle = computed(() => ({
  width: cols.value * tile.value + 'px',
  height: rows.value * tile.value + 'px',
  border: `5px solid ${tema.value.borde}`,
}));

function celdaStyle(x: number, y: number, celda: number) {
  const base = (x + y) % 2 === 0 ? tema.value.suelo1 : tema.value.suelo2;
  return {
    left: x * tile.value + 'px', top: y * tile.value + 'px',
    width: tile.value + 'px', height: tile.value + 'px',
    background: celda === 1 ? 'transparent' : base,
    fontSize: tile.value * 0.55 + 'px',
  };
}
function posStyle(x: number, y: number) {
  return {
    left: x * tile.value + 'px', top: y * tile.value + 'px',
    width: tile.value + 'px', height: tile.value + 'px',
    fontSize: tile.value * 0.62 + 'px',
  };
}

// ── Estado del juego ──
let uidSeq = 0;
const programa = ref<Array<{ dir: Dir; uid: number }>>([]);
const corriendo = ref(false);
const estado = ref<'jugando' | 'bien'>('jugando');
const fallos = ref(0);
const shake = ref(false);
const vacioAviso = ref(false);
const saltando = ref(false);
const pasoActual = ref(-1);
const bloquesEl = ref<HTMLElement | null>(null);

const heroX = ref(props.config.spawn?.x ?? 0);
const heroY = ref(props.config.spawn?.y ?? 0);
const mirando = ref<1 | -1>(1); // 1 mira derecha, -1 izquierda
const recogidas = ref(new Set<string>());

const estrellas = computed(() => (fallos.value === 0 ? 3 : fallos.value <= 2 ? 2 : 1));
const heroeStyle = computed(() => ({
  left: heroX.value * tile.value + 'px', top: heroY.value * tile.value + 'px',
  width: tile.value + 'px', height: tile.value + 'px',
  fontSize: tile.value * 0.66 + 'px',
  transform: `scaleX(${mirando.value})`,
}));

const clave = (p: { x: number; y: number }) => `${p.x},${p.y}`;

function agregar(dir: Dir) {
  if (corriendo.value || estado.value === 'bien') return;
  if (programa.value.length >= 24) return;
  programa.value.push({ dir, uid: uidSeq++ });
  audio.sfx('sfx-moneda');
  setTimeout(() => { if (bloquesEl.value) bloquesEl.value.scrollTop = bloquesEl.value.scrollHeight; }, 30);
}
function quitar(i: number) {
  if (corriendo.value || estado.value === 'bien') return;
  programa.value.splice(i, 1);
}
function limpiar() {
  if (corriendo.value) return;
  programa.value = [];
}

function reset() {
  heroX.value = props.config.spawn?.x ?? 0;
  heroY.value = props.config.spawn?.y ?? 0;
  mirando.value = 1;
  recogidas.value = new Set();
  pasoActual.value = -1;
}

function aplicar(cmd: string) {
  const d = DELTA[cmd];
  if (!d) return;
  heroX.value += d.dx;
  heroY.value += d.dy;
  if (d.dx > 0) mirando.value = 1;
  if (d.dx < 0) mirando.value = -1;
}
function recoger() {
  const k = clave({ x: heroX.value, y: heroY.value });
  if (items.value.some((it) => clave(it) === k) && !recogidas.value.has(k)) {
    recogidas.value.add(k);
    audio.sfx('sfx-moneda');
  }
}

async function ejecutar() {
  if (corriendo.value || estado.value === 'bien') return;
  if (programa.value.length === 0) {
    vacioAviso.value = true;
    voz.decir(VOZ_UI.casi);
    setTimeout(() => (vacioAviso.value = false), 700);
    return;
  }
  corriendo.value = true;
  voz.parar();
  reset();
  await delay(280);

  // Las flechas se convierten en CÓDIGO REAL y se ejecutan en el MISMO sandbox
  // (Web Worker) que usan los niños mayores. El worker valida choques con paredes.
  const codigo = programa.value.map((b) => `heroe.${CMD[b.dir]}();`).join('\n');
  const cfgWorker: any = {
    comandos_permitidos: props.config.comandos_permitidos ??
      ['moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha'],
    tope_ejecucion: props.config.tope_ejecucion ?? 500,
    tilemap: tilemap.value,
    spawn: { x: props.config.spawn?.x ?? 0, y: props.config.spawn?.y ?? 0, dir: props.config.spawn?.dir ?? 'derecha' },
  };
  const resp = await runCode(codigo, 'javascript', cfgWorker);
  const acciones = resp.ok ? (resp.acciones ?? []) : (resp.accionesParciales ?? []);

  for (let i = 0; i < acciones.length; i++) {
    pasoActual.value = i;
    aplicar(acciones[i].cmd as string);
    saltando.value = true;
    audio.sfx('sfx-salto');
    await delay(430);
    saltando.value = false;
    recoger();
  }
  pasoActual.value = -1;

  const enMeta = heroX.value === props.config.meta.x && heroY.value === props.config.meta.y;
  const todasRecogidas = items.value.every((it) => recogidas.value.has(clave(it)));

  if (resp.ok && enMeta && todasRecogidas) {
    celebrar();
  } else {
    fallar(!resp.ok);
  }
  corriendo.value = false;
}

function fallar(_choco: boolean) {
  fallos.value++;
  shake.value = true;
  audio.sfx('sfx-error');
  voz.decir(VOZ_UI.casi);
  setTimeout(() => { shake.value = false; reset(); }, 600);
}
function celebrar() {
  estado.value = 'bien';
  audio.sfx('sfx-ganar');
  voz.parar(); // la voz de celebración la dice la vista
  setTimeout(() => emit('complete', estrellas.value), 1500);
}

function repetir() { voz.decir(audioUrl.value); }
function delay(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

onMounted(() => {
  reset();
  setTimeout(() => voz.decir(audioUrl.value), 350);
});
onUnmounted(() => voz.parar());
</script>

<style scoped>
.pp { display: flex; flex-direction: column; align-items: center; gap: 1rem; font-family: 'Fredoka One', 'Baloo 2', sans-serif; width: 100%; }

.instr-bar { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 4px solid #FDE68A; border-radius: 22px; padding: 0.7rem 1rem; max-width: 720px; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
.voz-grande { background: #F59E0B; border: none; border-radius: 50%; width: 56px; height: 56px; font-size: 1.7rem; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 0 #B45309; }
.voz-grande:active { transform: translateY(3px); box-shadow: 0 1px 0 #B45309; }
.instr { color: #334155; font-size: 1.15rem; margin: 0; line-height: 1.3; }

.pp-main { display: flex; gap: 1.5rem; align-items: flex-start; flex-wrap: wrap; justify-content: center; }

/* ── Escena ── */
.escena { border-radius: 28px; padding: 18px; box-shadow: 0 10px 24px rgba(0,0,0,0.25); }
.escena.shake { animation: sh 0.5s; }
@keyframes sh { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-10px); } 60% { transform: translateX(10px); } }
.grid { position: relative; border-radius: 18px; overflow: hidden; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.35); }
.celda { position: absolute; box-sizing: border-box; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18); }
.celda.pared { box-shadow: none; }
.pared-icono { filter: drop-shadow(0 2px 1px rgba(0,0,0,0.3)); }

.item { position: absolute; display: flex; align-items: center; justify-content: center; pointer-events: none; animation: bob 1.4s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(255,255,150,0.9)); }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

.meta { position: absolute; display: flex; align-items: center; justify-content: center; pointer-events: none; animation: bob 1.8s ease-in-out infinite; }
.meta-glow { position: absolute; width: 70%; height: 70%; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.85), transparent 70%); animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0%,100% { transform: scale(0.8); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 1; } }

.heroe { position: absolute; display: flex; align-items: center; justify-content: center; z-index: 3; transition: left 0.4s cubic-bezier(.34,1.56,.64,1), top 0.4s cubic-bezier(.34,1.56,.64,1); filter: drop-shadow(0 4px 3px rgba(0,0,0,0.35)); }
.heroe.saltando { animation: hop 0.42s ease; }
@keyframes hop { 0%,100% { margin-top: 0; } 45% { margin-top: -10px; } }

/* ── Panel de programa ── */
.panel { display: flex; gap: 1rem; align-items: stretch; }
.programa { background: #FFF7ED; border: 5px solid #FBBF24; border-radius: 22px; padding: 12px; display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 150px; max-height: 480px; }
.programa.vacioAviso { animation: sh 0.5s; }
.iniciar { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; border: none; border-radius: 16px; background: linear-gradient(160deg,#22C55E,#16A34A); color: #fff; font-family: inherit; font-size: 1.25rem; padding: 0.6rem 0.8rem; cursor: pointer; box-shadow: 0 6px 0 #15803D; }
.iniciar:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #15803D; }
.iniciar:disabled { opacity: 0.6; cursor: default; }
.play-tri { font-size: 1.1rem; }

.bloques { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding: 6px; min-height: 90px; width: 86px; }
.hint-vacio { color: #92400E; font-size: 0.85rem; text-align: center; margin: 1rem 0; line-height: 1.3; }
.bloque { position: relative; width: 74px; height: 60px; border: none; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.bloque:active:not(:disabled) { transform: translateY(3px); }
.bloque.activo { outline: 4px solid #FDE047; transform: scale(1.06); }
.bloque .paw { position: absolute; left: 5px; top: 4px; font-size: 0.7rem; opacity: 0.85; }

.limpiar { margin-top: auto; background: #94A3B8; border: none; border-radius: 14px; width: 100%; padding: 0.45rem; font-size: 1.3rem; cursor: pointer; box-shadow: 0 4px 0 #64748B; }
.limpiar:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #64748B; }
.limpiar:disabled { opacity: 0.5; }

/* ── Paleta ── */
.paleta { display: flex; flex-direction: column; gap: 12px; justify-content: center; }
.pal-btn { width: 76px; height: 76px; border: none; border-radius: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.pal-btn:hover:not(:disabled) { transform: translateY(-3px); }
.pal-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 currentColor; }
.pal-btn:disabled { opacity: 0.55; }

.flecha { width: 60%; height: 60%; }
.flecha path { fill: #fff; stroke: rgba(0,0,0,0.12); stroke-width: 2; filter: drop-shadow(0 2px 1px rgba(0,0,0,0.25)); }
.bloque .flecha { width: 54%; height: 54%; }

/* ── Bravo ── */
.bravo { position: fixed; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; background: rgba(255,255,255,0.85); z-index: 50; }
.bravo-emoji { font-size: 6rem; animation: popi 0.5s; }
.bravo p { font-size: 2.4rem; color: #16A34A; margin: 0; }
.bravo-stars span { font-size: 2.6rem; filter: grayscale(1); opacity: 0.4; }
.bravo-stars span.on { filter: none; opacity: 1; animation: popi 0.4s; }
@keyframes popi { from { transform: scale(0); } to { transform: scale(1); } }
.pop-enter-active { animation: fadein 0.3s; } @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

@media (max-width: 680px) {
  .panel { flex-direction: column-reverse; align-items: center; }
  .paleta { flex-direction: row; }
  .programa { max-height: none; min-width: 0; width: 90%; }
  .bloques { flex-direction: row; flex-wrap: wrap; width: 100%; }
}
</style>
