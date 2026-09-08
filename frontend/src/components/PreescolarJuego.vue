<template>
  <div class="pj">
    <!-- Barra de instrucción + voz -->
    <div class="instr-bar">
      <button class="voz-grande" @click="repetir" aria-label="Escuchar">🔊</button>
      <p class="instr">{{ ronda?.instruccion }}</p>
    </div>

    <!-- Progreso -->
    <div class="prog"><div class="prog-fill" :style="{ width: progreso + '%' }"></div></div>
    <div class="ronda-lbl">{{ idx + 1 }} / {{ rondas.length }}</div>

    <div class="escena" :class="{ shake }">
      <!-- CUENTA: ¿cuántos hay? -->
      <template v-if="ronda.tipo === 'cuenta'">
        <div class="objetos">
          <span v-for="i in ronda.n" :key="i" class="obj">{{ ronda.emoji }}</span>
        </div>
        <div class="opciones">
          <button v-for="(o, i) in ronda.opciones" :key="i" class="num-btn" :disabled="bloqueado" @click="responder(o === ronda.n)">{{ o }}</button>
        </div>
      </template>

      <!-- TAP_CUENTA: toca y cuenta -->
      <template v-else-if="ronda.tipo === 'tap_cuenta'">
        <div class="tap-count">Tocaste: <b>{{ tapCount }}</b></div>
        <div class="objetos">
          <span v-for="i in ronda.n" :key="i" class="obj tap" :class="{ on: tapped.has(i) }" @click="tap(i)">{{ ronda.emoji }}</span>
        </div>
        <button class="confirm" :disabled="tapCount !== ronda.n" @click="responder(true)">¡Conté! ✓</button>
      </template>

      <!-- SECUENCIA: ¿qué número falta? -->
      <template v-else-if="ronda.tipo === 'secuencia'">
        <div class="seq">
          <span v-for="(s, i) in ronda.seq" :key="i" :class="['seq-cell', { blank: s === '?' }]">{{ s }}</span>
        </div>
        <div class="opciones">
          <button v-for="(o, i) in ronda.opciones" :key="i" class="num-btn" :disabled="bloqueado" @click="responder(o === ronda.correcta)">{{ o }}</button>
        </div>
      </template>

      <!-- COMPARA: ¿cuál tiene más/menos? -->
      <template v-else-if="ronda.tipo === 'compara'">
        <div class="comparar">
          <button v-for="(g, i) in ronda.grupos" :key="i" class="grupo-btn" :disabled="bloqueado" @click="responder(esGanador(i))">
            <span v-for="k in g.n" :key="k" class="obj sm">{{ g.emoji }}</span>
          </button>
        </div>
      </template>

      <!-- OPERACION: suma/resta con objetos -->
      <template v-else-if="ronda.tipo === 'operacion'">
        <div class="operacion">
          <span class="op-grupo"><span v-for="i in ronda.a" :key="'a' + i" class="obj sm">{{ ronda.emoji }}</span></span>
          <span class="op-signo">{{ ronda.op }}</span>
          <span class="op-grupo"><span v-for="i in ronda.b" :key="'b' + i" class="obj sm">{{ ronda.emoji }}</span></span>
          <span class="op-signo">=</span><span class="op-q">❓</span>
        </div>
        <div class="opciones">
          <button v-for="(o, i) in ronda.opciones" :key="i" class="num-btn" :disabled="bloqueado" @click="responder(o === resultadoOp)">{{ o }}</button>
        </div>
      </template>

      <!-- MEMORIA: encuentra las parejas -->
      <template v-else-if="ronda.tipo === 'memoria'">
        <div class="memoria-grid" :style="{ gridTemplateColumns: `repeat(${memCols}, 1fr)` }">
          <button v-for="(c, i) in memCards" :key="c.id" class="mem-card" :class="{ flip: c.flipped || c.matched, matched: c.matched }" :disabled="c.matched || memLock" @click="flipCard(i)">
            {{ (c.flipped || c.matched) ? c.emoji : '❓' }}
          </button>
        </div>
      </template>

      <!-- ORDENA: toca en orden -->
      <template v-else-if="ronda.tipo === 'ordena'">
        <div class="orden-fila">
          <span v-for="(x, i) in ordenHechos" :key="i" class="orden-chip">{{ x }}</span>
        </div>
        <p class="mini">👉 Toca el: <b>{{ ordenPaso }}</b></p>
        <div class="orden-pool">
          <button v-for="(it, i) in ronda.items" :key="i" class="ord-btn" :disabled="ordenListos.has(it.orden)" @click="tocarOrden(it)">
            <span v-if="it.emoji" :style="{ fontSize: (it.size || 2.4) + 'rem' }">{{ it.emoji }}</span>
            <span v-else>{{ it.label }}</span>
          </button>
        </div>
      </template>

      <!-- ELIGE: ¿qué color/forma/cuál es? (con escena opcional arriba/abajo/dentro/fuera) -->
      <template v-else-if="ronda.tipo === 'elige'">
        <div v-if="ronda.estimulo?.escena" class="escena-pos" :class="ronda.estimulo.escena">
          <div class="ep-cielo">{{ ronda.estimulo.escena === 'abajo' ? '☁️ ☁️' : '' }}</div>
          <div v-if="ronda.estimulo.escena === 'dentro' || ronda.estimulo.escena === 'fuera'" class="ep-caja">
            📦<span v-if="ronda.estimulo.escena === 'dentro'" class="ep-obj dentro">{{ ronda.estimulo.emoji }}</span>
            <span v-else class="ep-obj fuera">{{ ronda.estimulo.emoji }}</span>
          </div>
          <template v-else>
            <div class="ep-obj-zona arriba">{{ ronda.estimulo.escena === 'arriba' ? ronda.estimulo.emoji : '' }}</div>
            <div class="ep-suelo"></div>
            <div class="ep-obj-zona abajo">{{ ronda.estimulo.escena === 'abajo' ? ronda.estimulo.emoji : '' }}</div>
          </template>
        </div>
        <div v-else class="estimulo" :style="estimuloStyle">
          <span v-if="ronda.estimulo?.emoji">{{ ronda.estimulo.emoji }}</span>
          <span v-else-if="ronda.estimulo?.forma" v-html="figura(ronda.estimulo.forma, ronda.estimulo.color || '#64748b', 96)"></span>
        </div>
        <div class="opciones">
          <button v-for="(o, i) in ronda.opciones" :key="i"
            :class="['op-btn', { color: o.color }]"
            :style="o.color ? { background: o.color } : {}"
            :disabled="bloqueado" @click="responder(!!o.correcta)">
            <span v-if="o.forma" v-html="figura(o.forma, o.colorFig || '#64748b', 52)"></span>
            <span v-if="o.emoji" class="op-emoji" :style="o.size ? { fontSize: o.size + 'rem' } : {}">{{ o.emoji }}</span>
            <span v-if="o.label && !o.color" class="op-label">{{ o.label }}</span>
          </button>
        </div>
      </template>

      <!-- MULTI: toca todos los X -->
      <template v-else-if="ronda.tipo === 'multi'">
        <div class="multi-grid">
          <button v-for="(g, i) in ronda.grid" :key="i" :class="['multi-item', { sel: multiSel.has(i) }]" @click="toggleMulti(i)">{{ g.emoji }}</button>
        </div>
        <button class="confirm" :disabled="multiSel.size === 0" @click="checkMulti">✓ ¡Listo!</button>
      </template>

      <!-- DIFERENTE: ¿cuál es diferente? -->
      <template v-else-if="ronda.tipo === 'diferente'">
        <div class="opciones grande">
          <button v-for="(e, i) in ronda.items" :key="i" class="dif-btn" :disabled="bloqueado" @click="responder(i === ronda.correcta)">{{ e }}</button>
        </div>
      </template>

      <!-- PINTA: ¿de qué color pintarlo? -->
      <template v-else-if="ronda.tipo === 'pinta'">
        <div class="pinta-figura" v-html="figura(ronda.forma, pintaColor || '#e5e7eb', 150, !pintaColor)"></div>
        <div class="opciones">
          <button v-for="(o, i) in ronda.opciones" :key="i" class="op-btn color" :style="{ background: o.color }" :class="{ chosen: pintaSel === i }" @click="elegirPinta(i, o)"></button>
        </div>
        <button class="confirm" :disabled="pintaSel === null" @click="confirmarPinta">✓ ¡Listo!</button>
      </template>
    </div>

    <!-- Feedback ✅ / ❌ -->
    <transition name="fb"><div v-if="fb" class="fb-overlay" :class="fb">{{ fb === 'ok' ? '✅' : '❌' }}</div></transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useVozBank } from '@/composables/vozBank';
import { useVoz, VOZ_UI } from '@/composables/useVoz';
import { useAudio } from '@/composables/useAudio';

const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();

const vozBank = useVozBank();
const voz = useVoz();
const audio = useAudio();

const rondas = computed<any[]>(() => props.config.rondas ?? []);
const idx = ref(0);
const ronda = computed(() => rondas.value[idx.value] ?? {});
const progreso = computed(() => Math.round((idx.value / Math.max(1, rondas.value.length)) * 100));

const aciertos = ref(0);
const fallos = ref(0);
const bloqueado = ref(false);
const shake = ref(false);
const fb = ref<'ok' | 'err' | null>(null);

// Estados por ronda
const tapped = ref(new Set<number>());
const tapCount = computed(() => tapped.value.size);
const ordenPaso = ref(1);
const ordenHechos = ref<string[]>([]);
const ordenListos = ref(new Set<number>());
const multiSel = ref(new Set<number>());
const pintaSel = ref<number | null>(null);
const pintaColor = ref<string | null>(null);
// memoria
const memCards = ref<Array<{ id: string; emoji: string; flipped: boolean; matched: boolean }>>([]);
const memLock = ref(false);
const memCols = ref(4);
let memFirst: number | null = null;

const resultadoOp = computed(() => (ronda.value.op === '-' ? ronda.value.a - ronda.value.b : ronda.value.a + ronda.value.b));

const estrellas = computed(() => (fallos.value === 0 ? 3 : fallos.value <= 2 ? 2 : 1));

const estimuloStyle = computed(() => {
  const c = ronda.value?.estimulo?.bg;
  return c ? { background: c + '22', border: `4px solid ${c}` } : {};
});

// Dibuja una figura geométrica simple (para "elige forma" y "pinta").
function figura(forma: string, color: string, size: number, outline = false): string {
  const borde = outline ? `border:6px dashed #b0bec5;` : '';
  const bg = outline ? '#eceff1' : color;
  if (forma === 'circulo') return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};${borde}"></div>`;
  if (forma === 'cuadrado') return `<div style="width:${size}px;height:${size}px;border-radius:10px;background:${bg};${borde}"></div>`;
  if (forma === 'rectangulo') return `<div style="width:${Math.round(size * 1.5)}px;height:${Math.round(size * 0.66)}px;border-radius:10px;background:${bg};${borde}"></div>`;
  if (forma === 'triangulo') {
    const c = outline ? '#cfd8dc' : color;
    return `<div style="width:0;height:0;border-left:${size / 2}px solid transparent;border-right:${size / 2}px solid transparent;border-bottom:${Math.round(size * 0.87)}px solid ${c}"></div>`;
  }
  if (forma === 'estrella') return `<div style="font-size:${size}px;line-height:1">⭐</div>`;
  if (forma === 'corazon') return `<div style="font-size:${size}px;line-height:1">❤️</div>`;
  if (forma === 'rombo') return `<div style="width:${size * 0.8}px;height:${size * 0.8}px;background:${bg};${borde};transform:rotate(45deg);border-radius:8px"></div>`;
  return '';
}

function esGanador(i: number): boolean {
  const ns = ronda.value.grupos.map((g: any) => g.n);
  const objetivo = ronda.value.objetivo === 'menos' ? Math.min(...ns) : Math.max(...ns);
  return ns[i] === objetivo;
}

function enterRonda() {
  tapped.value = new Set();
  ordenPaso.value = 1; ordenHechos.value = []; ordenListos.value = new Set();
  multiSel.value = new Set();
  pintaSel.value = null; pintaColor.value = null;
  bloqueado.value = false;
  if (ronda.value?.tipo === 'memoria') buildMemoria();
  setTimeout(() => vozBank.decir(ronda.value?.instruccion), 250);
}

// ── memoria ──
function buildMemoria() {
  const pares: string[] = ronda.value.pares || [];
  const cards = pares.flatMap((e, k) => [
    { id: k + 'a', emoji: e, flipped: false, matched: false },
    { id: k + 'b', emoji: e, flipped: false, matched: false },
  ]);
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]]; }
  memCards.value = cards; memFirst = null; memLock.value = false;
  memCols.value = cards.length <= 6 ? 3 : 4;
}
function flipCard(i: number) {
  if (memLock.value) return;
  const c = memCards.value[i];
  if (c.flipped || c.matched) return;
  c.flipped = true; memCards.value = [...memCards.value];
  if (memFirst === null) { memFirst = i; return; }
  const a = memCards.value[memFirst];
  if (a.emoji === c.emoji) {
    a.matched = c.matched = true; audio.sfx('sfx-correcto'); memFirst = null; memCards.value = [...memCards.value];
    if (memCards.value.every((x) => x.matched)) setTimeout(() => responder(true), 350);
  } else {
    memLock.value = true; audio.sfx('sfx-error');
    setTimeout(() => { a.flipped = false; c.flipped = false; memFirst = null; memLock.value = false; memCards.value = [...memCards.value]; }, 750);
  }
}

function repetir() { vozBank.decir(ronda.value?.instruccion); }

function mostrarFB(ok: boolean, cb?: () => void) {
  fb.value = ok ? 'ok' : 'err';
  setTimeout(() => { fb.value = null; if (cb) cb(); }, 650);
}

function responder(ok: boolean) {
  if (bloqueado.value) return;
  if (ok) {
    bloqueado.value = true;
    aciertos.value++;
    audio.sfx('sfx-correcto');
    mostrarFB(true, avanzar);
  } else {
    fallos.value++;
    audio.sfx('sfx-error');
    voz.decir(VOZ_UI.casi);
    shake.value = true;
    setTimeout(() => (shake.value = false), 450);
    mostrarFB(false);
  }
}

function avanzar() {
  if (idx.value + 1 >= rondas.value.length) { terminar(); return; }
  idx.value++;
  enterRonda();
}

function terminar() {
  audio.sfx('sfx-ganar');
  voz.parar();
  setTimeout(() => emit('complete', estrellas.value), 900);
}

// ── tap_cuenta ──
function tap(i: number) { if (!tapped.value.has(i)) { tapped.value.add(i); tapped.value = new Set(tapped.value); audio.sfx('sfx-moneda'); } }

// ── ordena ──
function tocarOrden(it: { label?: string; emoji?: string; orden: number }) {
  if (it.orden === ordenPaso.value) {
    ordenListos.value.add(it.orden); ordenListos.value = new Set(ordenListos.value);
    ordenHechos.value.push(it.emoji || it.label || '');
    ordenPaso.value++;
    audio.sfx('sfx-correcto');
    if (ordenPaso.value > ronda.value.items.length) responder(true);
  } else {
    fallos.value++; audio.sfx('sfx-error'); shake.value = true;
    setTimeout(() => (shake.value = false), 450);
    ordenPaso.value = 1; ordenHechos.value = []; ordenListos.value = new Set();
  }
}

// ── multi ──
function toggleMulti(i: number) {
  if (multiSel.value.has(i)) multiSel.value.delete(i); else multiSel.value.add(i);
  multiSel.value = new Set(multiSel.value);
}
function checkMulti() {
  const need = ronda.value.grid.map((g: any, i: number) => (g.correcta ? i : -1)).filter((i: number) => i >= 0);
  const ok = need.length === multiSel.value.size && need.every((i: number) => multiSel.value.has(i));
  responder(ok);
}

// ── pinta ──
function elegirPinta(i: number, o: any) { pintaSel.value = i; pintaColor.value = o.color; }
function confirmarPinta() {
  if (pintaSel.value === null) return;
  responder(!!ronda.value.opciones[pintaSel.value]?.correcta);
}

onMounted(enterRonda);
onUnmounted(() => { vozBank.parar(); voz.parar(); });
</script>

<style scoped>
.pj { display: flex; flex-direction: column; align-items: center; gap: 0.8rem; font-family: 'Fredoka One', 'Baloo 2', sans-serif; width: 100%; }
.instr-bar { display: flex; align-items: center; gap: 0.75rem; background: #fff; border: 4px solid #FDE68A; border-radius: 22px; padding: 0.7rem 1rem; max-width: 720px; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
.voz-grande { background: #F59E0B; border: none; border-radius: 50%; width: 56px; height: 56px; font-size: 1.7rem; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 0 #B45309; }
.voz-grande:active { transform: translateY(3px); box-shadow: 0 1px 0 #B45309; }
.instr { color: #334155; font-size: 1.2rem; margin: 0; line-height: 1.3; text-align: center; }

.prog { width: min(560px, 92%); height: 12px; background: #E2E8F0; border-radius: 10px; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, #22C55E, #4ADE80); border-radius: 10px; transition: width .4s; }
.ronda-lbl { color: #64748B; font-size: 0.85rem; font-weight: 700; }

.escena { display: flex; flex-direction: column; align-items: center; gap: 1.1rem; background: rgba(255,255,255,0.6); border-radius: 28px; padding: 1.4rem; min-width: 320px; max-width: 700px; width: 100%; }
.escena.shake { animation: sh 0.4s; }
@keyframes sh { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }

.objetos { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
.obj { font-size: 3rem; animation: bob 1.6s ease-in-out infinite; }
.obj.sm { font-size: 1.9rem; animation: none; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.obj.tap { cursor: pointer; border: 3px solid transparent; border-radius: 14px; transition: transform .15s; }
.obj.tap.on { transform: scale(1.15); border-color: #43A047; background: #E8F5E9; }

.opciones { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
.opciones.grande .dif-btn { font-size: 3.4rem; }
.num-btn { width: 84px; height: 84px; border-radius: 22px; border: none; background: linear-gradient(160deg,#38BDF8,#0EA5E9); color: #fff; font-size: 2.4rem; font-family: inherit; cursor: pointer; box-shadow: 0 6px 0 #0369A1; }
.num-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #0369A1; }
.num-btn:disabled { opacity: 0.55; }

.tap-count { font-size: 1.4rem; color: #2E7D32; }
.confirm { background: linear-gradient(135deg,#2E7D32,#66BB6A); color: #fff; border: none; font-family: inherit; font-weight: 700; font-size: 1.2rem; padding: 0.7rem 2rem; border-radius: 30px; cursor: pointer; box-shadow: 0 5px 0 #1B5E20; }
.confirm:disabled { opacity: 0.4; cursor: default; }
.confirm:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 #1B5E20; }

.seq { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.seq-cell { font-size: 2.6rem; font-weight: 700; color: #2E7D32; background: #fff; border-radius: 16px; padding: 0.4rem 1rem; box-shadow: 0 4px 10px rgba(0,0,0,.07); }
.seq-cell.blank { color: #90A4AE; border: 4px dashed #A5D6A7; }

.comparar { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; }
.grupo-btn { background: #fff; border: 4px solid #E2E8F0; border-radius: 22px; padding: 1rem; cursor: pointer; display: flex; flex-wrap: wrap; gap: 4px; max-width: 240px; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,.08); }
.grupo-btn:hover:not(:disabled) { border-color: #38BDF8; transform: translateY(-3px); }

.orden-fila { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; min-height: 56px; }
.orden-chip { background: #2E7D32; color: #fff; border-radius: 14px; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; }
.mini { color: #475569; margin: 0; font-size: 1.1rem; }
.orden-pool { display: flex; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.ord-btn { width: 70px; height: 70px; border-radius: 18px; border: 4px solid #A5D6A7; background: #fff; color: #2E7D32; font-size: 1.9rem; font-family: inherit; font-weight: 700; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,.07); }
.ord-btn:disabled { opacity: 0.3; }

.estimulo { min-width: 150px; width: auto; max-width: 100%; height: 150px; padding: 0 1.2rem; border-radius: 28px; display: flex; align-items: center; justify-content: center; font-size: clamp(2.2rem, 7vw, 5rem); white-space: nowrap; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.1); }
.op-btn { min-width: 96px; min-height: 96px; border-radius: 22px; border: 4px solid #fff; background: #fff; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; padding: 0.5rem; box-shadow: 0 6px 16px rgba(0,0,0,.1); font-family: inherit; }
.op-btn:hover:not(:disabled) { transform: translateY(-3px); }
.op-btn.color { width: 84px; height: 84px; border-radius: 50%; border: 5px solid #fff; }
.op-btn.color.chosen { transform: scale(1.15); box-shadow: 0 0 0 4px #fff, 0 0 0 8px #546E7A; }
.op-emoji { font-size: 3rem; }
.op-label { font-size: 1.1rem; color: #546E7A; font-weight: 700; }

.multi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 440px; }
.multi-item { aspect-ratio: 1; border-radius: 16px; border: 4px solid transparent; background: #fff; font-size: 2.4rem; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.06); }
.multi-item.sel { outline: 5px solid #43A047; outline-offset: 2px; }

.pinta-figura { display: flex; align-items: center; justify-content: center; min-height: 160px; }

.operacion { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: center; }
.op-grupo { background: #fff; border-radius: 16px; padding: 0.5rem 0.7rem; display: flex; gap: 3px; flex-wrap: wrap; max-width: 200px; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,.07); }
.op-signo { font-size: 2.4rem; color: #1E293B; font-weight: 700; }
.op-q { font-size: 2.6rem; }

.memoria-grid { display: grid; gap: 10px; }
.mem-card { width: 72px; height: 72px; border-radius: 16px; border: none; background: linear-gradient(160deg,#A78BFA,#7C3AED); color: #fff; font-size: 2.4rem; cursor: pointer; box-shadow: 0 5px 0 #5B21B6; transition: transform .15s; }
.mem-card.flip { background: #fff; box-shadow: 0 5px 0 #E2E8F0; }
.mem-card.matched { background: #DCFCE7; box-shadow: 0 5px 0 #86EFAC; }
.mem-card:active:not(:disabled) { transform: translateY(3px); }

/* Escena de posición (arriba/abajo/dentro/fuera) */
.escena-pos { width: 260px; height: 200px; background: linear-gradient(180deg,#BFEffc 0%,#E0F2FE 55%,#DCFCE7 55%,#BBF7D0 100%); border-radius: 20px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: space-between; overflow: hidden; box-shadow: inset 0 0 0 3px rgba(255,255,255,.5); }
.ep-cielo { font-size: 1.4rem; opacity: .6; margin-top: 6px; }
.ep-obj-zona { font-size: 3.6rem; height: 70px; display: flex; align-items: center; justify-content: center; }
.ep-suelo { width: 100%; height: 4px; background: rgba(0,0,0,.12); }
.ep-caja { position: relative; font-size: 6rem; display: flex; align-items: center; justify-content: center; height: 100%; }
.ep-obj { position: absolute; font-size: 3rem; }
.ep-obj.dentro { left: 50%; top: 52%; transform: translate(-50%,-50%); }
.ep-obj.fuera { right: 12px; top: 18px; }

.fb-overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 9rem; z-index: 60; pointer-events: none; }
.fb-overlay.ok { background: rgba(76,175,80,.55); }
.fb-overlay.err { background: rgba(244,67,54,.5); }
.fb-enter-active, .fb-leave-active { transition: opacity .2s; } .fb-enter-from, .fb-leave-to { opacity: 0; }
</style>
