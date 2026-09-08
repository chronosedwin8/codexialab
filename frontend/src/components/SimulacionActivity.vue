<template>
  <div class="sim">
    <div class="sim-card">
      <h2 class="sim-title">🔬 {{ config.nombre }}</h2>

      <!-- Simulaciones ricas (carga diferida): física 2D (Matter.js) y 3D (Three.js) -->
      <Suspense v-if="sim === 'fisica'">
        <SimFisica2D :config="config" @complete="(s) => emit('complete', s)" />
        <template #fallback><p class="sim-loading">Cargando laboratorio… ⚙️</p></template>
      </Suspense>
      <Suspense v-else-if="sim === 'escena3d'">
        <SimEscena3D :config="config" @complete="(s) => emit('complete', s)" />
        <template #fallback><p class="sim-loading">Cargando escena 3D… 🪐</p></template>
      </Suspense>
      <Suspense v-else-if="sim === 'aritmetica'">
        <SimAritmetica :config="config" @complete="(s) => emit('complete', s)" />
        <template #fallback><p class="sim-loading">Cargando… 🧮</p></template>
      </Suspense>

      <template v-else>
      <p class="sim-instru">{{ config.instruccion }}</p>

      <!-- ÁREA / PERÍMETRO de rectángulo -->
      <div v-if="sim === 'area_rect' || sim === 'perimetro_rect'" class="sim-geo">
        <svg :viewBox="`0 0 ${cols * U + 40} ${rows * U + 40}`" class="geo-svg">
          <g transform="translate(20,20)">
            <rect v-for="c in celdas" :key="c.k" :x="c.x" :y="c.y" :width="U" :height="U"
              :fill="sim === 'area_rect' ? '#FCD34D' : '#1E3A5F'" stroke="#F59E0B" stroke-width="1.5" />
            <rect v-if="sim === 'perimetro_rect'" x="0" y="0" :width="ancho * U" :height="alto * U" fill="none" stroke="#22D3EE" stroke-width="5" />
          </g>
        </svg>
        <div class="sliders">
          <label>Ancho: <strong>{{ ancho }}</strong></label>
          <input type="range" min="1" max="10" v-model.number="ancho" />
          <label>Alto: <strong>{{ alto }}</strong></label>
          <input type="range" min="1" max="8" v-model.number="alto" />
        </div>
        <p class="sim-valor">
          <span v-if="sim === 'area_rect'">Área = {{ ancho }} × {{ alto }} = <b>{{ ancho * alto }}</b> unidades²</span>
          <span v-else>Perímetro = 2 × ({{ ancho }} + {{ alto }}) = <b>{{ 2 * (ancho + alto) }}</b> unidades</span>
        </p>
      </div>

      <!-- FRACCIÓN: sombrea partes -->
      <div v-else-if="sim === 'fraccion'" class="sim-frac">
        <div class="frac-figura" :class="config.forma || 'barra'">
          <button v-for="i in den" :key="i" :class="['frac-parte', { on: sombreadas.includes(i) }]"
            :style="fracStyle(i)" @click="toggleParte(i)"></button>
        </div>
        <p class="sim-valor">Sombreadas: <b>{{ sombreadas.length }}/{{ den }}</b></p>
      </div>

      <!-- RECTA NUMÉRICA -->
      <div v-else-if="sim === 'recta'" class="sim-recta">
        <div class="recta-line">
          <button v-for="n in (max + 1)" :key="n - 1" :class="['recta-tick', { sel: marcador === n - 1 }]"
            :style="{ left: ((n - 1) / max) * 100 + '%' }" @click="marcador = n - 1">
            <span class="tick-num">{{ n - 1 }}</span>
            <span v-if="marcador === n - 1" class="tick-marker">📍</span>
          </button>
        </div>
        <p class="sim-valor">Marcador en: <b>{{ marcador }}</b></p>
      </div>

      <!-- FLOTA / SE HUNDE -->
      <div v-else-if="sim === 'flota'" class="sim-flota">
        <div class="tanque">
          <div class="agua"></div>
          <div v-for="o in objetos" :key="o.nombre" class="obj-flota"
            :class="{ enagua: o.dropped, flota: o.dropped && o.flota, hunde: o.dropped && !o.flota }"
            :style="objFlotaStyle(o)" @click="soltar(o)">{{ o.emoji }}</div>
        </div>
        <p class="sim-hint" v-if="!todosSoltados">👆 Toca cada objeto para soltarlo al agua y observa.</p>
        <div v-else class="frac-pregunta">
          <p class="reto-enunciado">{{ pregF.enunciado }}</p>
          <div class="reto-opciones">
            <button v-for="(op, i) in pregF.opciones" :key="i"
              :class="['op', { correcta: pregResp && i === pregF.correcta, mala: pregResp && pregSel === i && i !== pregF.correcta }]"
              :disabled="pregResp && pregOk" @click="responderPregunta(i)">{{ op }}</button>
          </div>
        </div>
      </div>

      <!-- Estado / completar -->
      <div class="sim-footer">
        <p v-if="logrado" class="sim-ok">🎉 ¡Excelente! Lo lograste.</p>
        <p v-else class="sim-meta">🎯 {{ metaTexto }}</p>
        <button class="btn-sim" :disabled="!logrado" @click="completar">
          {{ logrado ? '✅ ¡Completar!' : 'Sigue ajustando...' }}
        </button>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue';
import { useAudio } from '@/composables/useAudio';

// Carga DIFERIDA: Matter.js/Three.js solo se descargan al abrir un nivel que los use.
const SimFisica2D = defineAsyncComponent(() => import('@/components/sim/SimFisica2D.vue'));
const SimEscena3D = defineAsyncComponent(() => import('@/components/sim/SimEscena3D.vue'));
const SimAritmetica = defineAsyncComponent(() => import('@/components/sim/SimAritmetica.vue'));

const audio = useAudio();
const props = defineProps<{ config: any }>();
const emit = defineEmits<{ 'complete': [stars: number] }>();
const sim = computed(() => props.config.sim);
const U = 30;

// --- Geometría ---
const ancho = ref(3);
const alto = ref(2);
const cols = computed(() => (sim.value === 'area_rect' || sim.value === 'perimetro_rect' ? 10 : 1));
const rows = computed(() => 8);
const celdas = computed(() => {
  const arr = [];
  for (let y = 0; y < alto.value; y++) for (let x = 0; x < ancho.value; x++) arr.push({ k: `${x}-${y}`, x: x * U, y: y * U });
  return arr;
});

// --- Fracción ---
const den = computed(() => props.config.denominador || 4);
const sombreadas = ref<number[]>([]);
function toggleParte(i: number) { const k = sombreadas.value.indexOf(i); if (k >= 0) sombreadas.value.splice(k, 1); else sombreadas.value.push(i); }
function fracStyle(i: number) {
  if ((props.config.forma || 'barra') === 'pizza') {
    const ang = 360 / den.value; return { transform: `rotate(${(i - 1) * ang}deg)`, 'clip-path': `polygon(50% 50%, 50% 0, ${50 + 50 * Math.tan((ang / 2) * Math.PI / 180)}% 0)` } as any;
  }
  return { width: `${100 / den.value}%` };
}

// --- Recta ---
const max = computed(() => props.config.max || 10);
const marcador = ref(0);

// --- Flota ---
const objetos = ref<any[]>((props.config.objetos || []).map((o: any) => ({ ...o, dropped: false })));
const todosSoltados = computed(() => objetos.value.length > 0 && objetos.value.every((o) => o.dropped));
function soltar(o: any) { o.dropped = true; }
function objFlotaStyle(o: any) { return { left: `${o.x ?? 20}%` }; }
const pregSel = ref<number | null>(null);
const pregResp = ref(false);
const pregOk = ref(false);
function barajarP(q: any) { if (!q || !q.opciones) return q; const ok = q.opciones[q.correcta]; const ops = [...q.opciones]; for (let i = ops.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[ops[i], ops[j]] = [ops[j], ops[i]]; } return { ...q, opciones: ops, correcta: ops.indexOf(ok) }; }
const pregF = barajarP(props.config.pregunta) || { opciones: [], correcta: 0, enunciado: '' };
function responderPregunta(i: number) { if (pregResp.value && pregOk.value) return; pregSel.value = i; pregResp.value = true; pregOk.value = i === pregF.correcta; }

// --- Meta / logrado ---
const logrado = computed(() => {
  if (sim.value === 'area_rect') return ancho.value * alto.value === props.config.objetivo;
  if (sim.value === 'perimetro_rect') return 2 * (ancho.value + alto.value) === props.config.objetivo;
  if (sim.value === 'fraccion') return sombreadas.value.length === props.config.numerador;
  if (sim.value === 'recta') return marcador.value === props.config.objetivo;
  if (sim.value === 'flota') return pregResp.value && pregOk.value;
  return false;
});
const metaTexto = computed(() => {
  if (sim.value === 'area_rect') return `Construye un rectángulo con área = ${props.config.objetivo}`;
  if (sim.value === 'perimetro_rect') return `Construye un rectángulo con perímetro = ${props.config.objetivo}`;
  if (sim.value === 'fraccion') return `Sombrea ${props.config.numerador}/${den.value} de la figura`;
  if (sim.value === 'recta') return `Coloca el marcador en el número ${props.config.objetivo}`;
  if (sim.value === 'flota') return 'Suelta todos los objetos y responde la pregunta';
  return '';
});

// Suena al alcanzar la meta de la simulación
watch(logrado, (v, old) => { if (v && !old) audio.sfx('sfx-correcto'); });

let done = false;
function completar() { if (logrado.value && !done) { done = true; audio.sfx('sfx-ganar'); emit('complete', 3); } }
</script>

<style scoped>
.sim { flex: 1; display: flex; justify-content: center; padding: 1.25rem; background: #0F172A; overflow-y: auto; }
.sim-card { width: 100%; max-width: 640px; background: #1E293B; border: 1px solid #334155; border-radius: 18px; padding: 1.5rem; }
.sim-title { color: #5EEAD4; margin: 0 0 0.25rem; }
.sim-loading { color: #94A3B8; text-align: center; padding: 2rem; }
.sim-instru { color: #CBD5E1; margin: 0 0 1.1rem; line-height: 1.5; }
.sim-valor { color: #E2E8F0; text-align: center; font-size: 1.05rem; margin: 0.8rem 0; }
.sim-valor b { color: #FCD34D; font-size: 1.2rem; }

.sim-geo { text-align: center; }
.geo-svg { width: 100%; max-height: 260px; background: #0F172A; border-radius: 12px; }
.sliders { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 0.8rem; align-items: center; margin-top: 0.8rem; }
.sliders label { color: #CBD5E1; font-size: 0.9rem; } .sliders input { accent-color: #F59E0B; }

.sim-frac { text-align: center; }
.frac-figura.barra { display: flex; height: 70px; border: 3px solid #fff; border-radius: 10px; overflow: hidden; }
.frac-figura.pizza { position: relative; width: 180px; height: 180px; margin: 0 auto; border-radius: 50%; border: 3px solid #fff; overflow: hidden; background: #0F172A; }
.frac-parte { border: 1px solid #475569; background: #0F172A; cursor: pointer; transition: background 0.15s; }
.frac-figura.barra .frac-parte { height: 100%; }
.frac-figura.pizza .frac-parte { position: absolute; top: 0; left: 0; width: 100%; height: 100%; transform-origin: 50% 50%; }
.frac-parte.on { background: #F472B6; }

.sim-recta { padding: 1.5rem 0; }
.recta-line { position: relative; height: 4px; background: #475569; margin: 2.5rem 1rem; border-radius: 2px; }
.recta-tick { position: absolute; top: -10px; transform: translateX(-50%); background: none; border: none; cursor: pointer; }
.tick-num { display: block; width: 24px; height: 24px; line-height: 24px; border-radius: 50%; background: #334155; color: #E2E8F0; font-size: 0.8rem; }
.recta-tick.sel .tick-num { background: #0EA5E9; color: #fff; }
.tick-marker { position: absolute; top: -28px; left: 50%; transform: translateX(-50%); font-size: 1.3rem; }

.sim-flota { text-align: center; }
.tanque { position: relative; height: 220px; background: linear-gradient(#E0F2FE 35%, #38BDF8 35%); border: 3px solid #0EA5E9; border-radius: 0 0 14px 14px; overflow: hidden; }
.agua { position: absolute; bottom: 0; left: 0; right: 0; height: 65%; background: rgba(56,189,248,0.35); }
.obj-flota { position: absolute; top: 6px; font-size: 2.2rem; cursor: pointer; transition: top 1s ease; }
.obj-flota.flota { top: 32%; } .obj-flota.hunde { top: 82%; }
.sim-hint { color: #94A3B8; font-size: 0.85rem; margin-top: 0.6rem; }
.frac-pregunta { margin-top: 0.8rem; }
.reto-enunciado { color: #F1F5F9; font-weight: 600; }
.reto-opciones { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.op { padding: 0.6rem; background: #0F172A; border: 2px solid #334155; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; }
.op.correcta { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.op.mala { border-color: #DC2626; background: rgba(239,68,68,0.18); }

.sim-footer { margin-top: 1.2rem; text-align: center; }
.sim-ok { color: #4ADE80; font-weight: 700; } .sim-meta { color: #94A3B8; }
.btn-sim { background: #14B8A6; color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: inherit; margin-top: 0.4rem; }
.btn-sim:disabled { opacity: 0.5; cursor: not-allowed; } .btn-sim:not(:disabled):hover { background: #0D9488; }
</style>
