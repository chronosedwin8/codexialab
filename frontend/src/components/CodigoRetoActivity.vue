<template>
  <div class="reto-layout">
    <!-- Enunciado + editor -->
    <div class="reto-editor">
      <div class="reto-enunciado">
        <h3>{{ esPython ? '🐍' : '💻' }} {{ config.nombre }}</h3>
        <p class="reto-texto">{{ config.enunciado }}</p>
        <p class="reto-firma">
          Escribe la función <code>{{ config.funcion }}(...)</code> en <b>{{ esPython ? 'Python' : 'JavaScript' }}</b> y presiona <b>Ejecutar pruebas</b>.
          <span class="reto-estrellas">⭐ Resuelve sin pistas para lograr 3★.</span>
        </p>
      </div>

      <EditorTexto
        :lenguaje="esPython ? 'python' : 'javascript'"
        :codigo_inicial="codigoInicial"
        :readonly="corriendo"
        :comandos_hint="[]"
        @code-changed="(c: string) => (codigo = c)"
      />

      <div class="reto-acciones">
        <button class="btn-run" :disabled="corriendo || !codigo.trim()" @click="ejecutar">
          <span v-if="cargandoPython">🐍 Cargando Python (solo la 1ª vez)…</span>
          <span v-else-if="corriendo">⏳ Ejecutando…</span>
          <span v-else>▶ Ejecutar pruebas</span>
        </button>
        <button class="btn-hint" :disabled="corriendo || pistaIdx >= (config.pistas || []).length" @click="mostrarPista">
          💡 Pista {{ pistaIdx > 0 ? `(${pistaIdx}/${(config.pistas || []).length})` : '' }}
        </button>
      </div>
      <p v-if="pistaActual" class="reto-pista">{{ pistaActual }} <span class="pista-costo">(máximo posible ahora: {{ estrellasPosibles }}★)</span></p>
      <p v-if="errorGlobal" class="reto-error">⚠️ {{ errorGlobal }}</p>
    </div>

    <!-- Panel de casos de prueba -->
    <div class="reto-tests">
      <div class="tests-head">
        <h4>🧪 Casos de prueba</h4>
        <span class="tests-cont" :class="{ ok: pasados === total && intentado }">{{ pasados }}/{{ total }}</span>
      </div>
      <div class="tests-list">
        <div v-for="(r, i) in resultados" :key="i" class="test-item" :class="{ ok: r.paso, fail: r.paso === false }">
          <span class="test-ico">{{ r.paso ? '✅' : '❌' }}</span>
          <div class="test-body">
            <code class="test-in">{{ config.funcion }}({{ fmtArgs(r.args) }})</code>
            <div v-if="r.paso === false" class="test-diff">
              esperado: <code>{{ fmt(r.esperado) }}</code> · obtuviste: <code>{{ r.error ? '⚠️ ' + r.error : fmt(r.obtenido) }}</code>
            </div>
          </div>
        </div>
        <p v-if="!resultados.length" class="tests-vacio">Aún no ejecutas las pruebas. ¡Escribe tu solución y dale a Ejecutar!</p>
      </div>
      <p class="tests-nota">Debes pasar <b>todas</b> las pruebas (incluye casos límite). Estrellas: 3★ sin pistas · 2★ una pista · 1★ dos o más.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import EditorTexto from './EditorTexto.vue';

const props = defineProps<{ config: any }>();
const emit = defineEmits<{ 'complete': [stars: number] }>();

const esPython = computed(() => (props.config.lenguaje ?? 'javascript') === 'python');
const codigoInicial: string = (esPython.value ? props.config.codigo_inicial?.python : props.config.codigo_inicial?.javascript)
  ?? props.config.firma ?? `${props.config.funcion}()`;
const codigo = ref(codigoInicial);
const corriendo = ref(false);
const cargandoPython = ref(false);
const errorGlobal = ref('');
const intentado = ref(false);
const tests = computed<any[]>(() => props.config.tests ?? []);
const total = computed(() => tests.value.length);
const resultados = ref<Array<{ args: any[]; esperado: any; obtenido: any; paso: boolean; error?: string }>>([]);
const pasados = computed(() => resultados.value.filter((r) => r.paso === true).length);

// Pistas → afectan las estrellas máximas alcanzables
const pistaIdx = ref(0);
const pistaActual = ref('');
const estrellasPosibles = computed(() => (pistaIdx.value === 0 ? 3 : pistaIdx.value === 1 ? 2 : 1));
function mostrarPista() {
  const p = props.config.pistas || [];
  if (pistaIdx.value < p.length) { pistaActual.value = p[pistaIdx.value].texto ?? p[pistaIdx.value]; pistaIdx.value++; }
}

function fmt(v: any): string {
  if (typeof v === 'string') return JSON.stringify(v);
  return Array.isArray(v) || (v && typeof v === 'object') ? JSON.stringify(v) : String(v);
}
function fmtArgs(args: any[]): string { return (args ?? []).map(fmt).join(', '); }

// --- Gestión de workers ---
let jsWorker: Worker | null = null;
let pyWorker: Worker | null = null;   // persistente: Pyodide se carga una sola vez
let timer: number | undefined;

function nuevoPyWorker(): Worker {
  return new Worker(new URL('../workers/pythonRunner.worker.ts', import.meta.url), { type: 'module' });
}

function limpiarTimer() { if (timer) { clearTimeout(timer); timer = undefined; } }
function matarWorkers() {
  if (jsWorker) { jsWorker.terminate(); jsWorker = null; }
  if (pyWorker) { pyWorker.terminate(); pyWorker = null; }
  limpiarTimer();
}

function onResultado(data: any) {
  limpiarTimer();
  corriendo.value = false;
  cargandoPython.value = false;
  if (!data.ok) { errorGlobal.value = data.error || 'Error al ejecutar tu código.'; return; }
  resultados.value = (data.resultados || []).map((r: any) => ({ ...r }));
  const todosOk = resultados.value.length > 0 && resultados.value.every((r) => r.paso === true);
  emit('complete', todosOk ? estrellasPosibles.value : 0);
}

function ejecutar() {
  errorGlobal.value = '';
  corriendo.value = true;
  intentado.value = true;

  // Copia PLANA de los datos: los tests son un Proxy reactivo de Vue y postMessage
  // no puede clonar Proxies (structured clone → DOMException).
  const payload = {
    codigo: String(codigo.value),
    funcion: String(props.config.funcion),
    tests: JSON.parse(JSON.stringify(tests.value)),
  };

  if (esPython.value) {
    cargandoPython.value = !pyWorker; // primera vez muestra "cargando"
    if (!pyWorker) pyWorker = nuevoPyWorker();
    const w = pyWorker;
    w.onmessage = (e) => onResultado(e.data);
    w.onerror = (err) => { corriendo.value = false; cargandoPython.value = false; limpiarTimer(); errorGlobal.value = err.message || 'Error al cargar Python.'; };
    limpiarTimer();
    // Pyodide puede tardar en la 1ª carga; timeout amplio. Al vencerse, reinicia el worker.
    timer = window.setTimeout(() => { matarWorkers(); corriendo.value = false; cargandoPython.value = false; errorGlobal.value = 'Tardó demasiado (¿bucle infinito o carga lenta?). Intenta de nuevo.'; }, 40000);
    w.postMessage(payload);
  } else {
    if (jsWorker) jsWorker.terminate();
    jsWorker = new Worker(new URL('../workers/algoRunner.worker.ts', import.meta.url), { type: 'module' });
    jsWorker.onmessage = (e) => onResultado(e.data);
    jsWorker.onerror = (err) => { corriendo.value = false; limpiarTimer(); errorGlobal.value = err.message || 'Error de sintaxis en tu código.'; };
    limpiarTimer();
    timer = window.setTimeout(() => { if (jsWorker) { jsWorker.terminate(); jsWorker = null; } corriendo.value = false; errorGlobal.value = 'Tu código tardó demasiado (¿bucle infinito?). Revísalo.'; }, 3000);
    jsWorker.postMessage(payload);
  }
}

onBeforeUnmount(matarWorkers);
</script>

<style scoped>
.reto-layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1rem; padding: 1rem; height: calc(100vh - 70px); box-sizing: border-box; }
@media (max-width: 900px) { .reto-layout { grid-template-columns: 1fr; height: auto; } }
.reto-editor { display: flex; flex-direction: column; gap: .8rem; min-height: 0; }
.reto-enunciado { background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: .9rem 1.1rem; }
.reto-enunciado h3 { margin: 0 0 .4rem; color: #3730A3; }
.reto-texto { margin: 0 0 .4rem; color: #1F2937; font-size: 1rem; line-height: 1.5; }
.reto-firma { margin: 0; font-size: .85rem; color: #4B5563; }
.reto-estrellas { display: inline-block; margin-left: .4rem; color: #B45309; }
.reto-firma code, .reto-texto code { background: #E0E7FF; padding: 1px 6px; border-radius: 5px; }
.reto-editor :deep(.editor-texto), .reto-editor :deep(.monaco-editor) { flex: 1; min-height: 260px; border-radius: 10px; overflow: hidden; }
.reto-acciones { display: flex; gap: .6rem; }
.btn-run { flex: 1; padding: .8rem 1rem; background: linear-gradient(90deg,#7C3AED,#4338CA); color: #fff; border: none; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; }
.btn-run:disabled { opacity: .55; cursor: not-allowed; }
.btn-hint { padding: .8rem 1rem; background: #FEF3C7; color: #92400E; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
.reto-pista { background: #FEF9C3; border: 1px solid #FDE68A; border-radius: 10px; padding: .6rem .8rem; color: #854D0E; margin: 0; }
.pista-costo { font-size: .8rem; opacity: .8; }
.reto-error { background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 10px; padding: .6rem .8rem; color: #B91C1C; margin: 0; }

.reto-tests { background: #0F172A; border-radius: 14px; padding: 1rem; color: #E2E8F0; display: flex; flex-direction: column; min-height: 0; }
.tests-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: .6rem; }
.tests-head h4 { margin: 0; color: #fff; }
.tests-cont { font-weight: 800; font-size: 1.1rem; background: #334155; padding: .1rem .6rem; border-radius: 8px; }
.tests-cont.ok { background: #16A34A; color: #fff; }
.tests-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: .4rem; }
.test-item { display: flex; gap: .5rem; background: #1E293B; border-radius: 8px; padding: .5rem .6rem; border-left: 3px solid #475569; }
.test-item.ok { border-left-color: #22C55E; }
.test-item.fail { border-left-color: #EF4444; }
.test-body { min-width: 0; }
.test-in { color: #A5B4FC; font-size: .82rem; word-break: break-all; }
.test-diff { font-size: .78rem; color: #FCA5A5; margin-top: .2rem; }
.test-diff code { color: #FDE68A; }
.tests-vacio { color: #94A3B8; font-size: .85rem; }
.tests-nota { font-size: .76rem; color: #94A3B8; margin: .6rem 0 0; }
</style>
