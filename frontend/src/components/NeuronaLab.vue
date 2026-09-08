<template>
  <div class="neurona-lab">
    <div class="lab-card">
      <h2 class="lab-title">🧠 {{ config.objetivo }}</h2>
      <p class="lab-desc">{{ config.descripcion }}</p>

      <!-- Diagrama de la neurona -->
      <div class="neuron-diagram">
        <div class="inputs-col">
          <div v-for="(label, i) in config.entradas" :key="i" class="node input-node">{{ label }}</div>
        </div>
        <div class="weights-col">
          <div v-for="(_, i) in config.entradas" :key="i" class="weight-line">
            <span class="weight-val">w{{ i + 1 }}={{ pesos[i] }}</span>
          </div>
        </div>
        <div class="body-col">
          <div class="node sum-node">Σ + sesgo<br /><small>{{ sesgo }}</small></div>
          <div class="node act-node">escalón</div>
        </div>
        <div class="output-col">
          <div class="node output-node">salida</div>
        </div>
      </div>

      <!-- Controles: pesos y sesgo -->
      <div class="controls">
        <div v-for="(label, i) in config.entradas" :key="i" class="control-row">
          <label>Peso de {{ label }} (w{{ i + 1 }})</label>
          <input type="range" :min="rango.min" :max="rango.max" :step="rango.paso" v-model.number="pesos[i]" />
          <span class="ctrl-val">{{ pesos[i] }}</span>
        </div>
        <div class="control-row">
          <label>Sesgo (bias)</label>
          <input type="range" :min="rango.min" :max="rango.max" :step="rango.paso" v-model.number="sesgo" />
          <span class="ctrl-val">{{ sesgo }}</span>
        </div>
      </div>

      <!-- Código equivalente -->
      <details class="code-box">
        <summary>💻 Ver el código de tu neurona</summary>
        <pre>{{ codigoNeurona }}</pre>
      </details>

      <!-- Tabla de verdad / resultados -->
      <table class="truth-table">
        <thead>
          <tr>
            <th v-for="(label, i) in config.entradas" :key="i">{{ label }}</th>
            <th>Esperado</th>
            <th>Tu neurona</th>
            <th>✓</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(fila, idx) in resultados" :key="idx" :class="{ bad: !fila.ok }">
            <td v-for="(v, i) in fila.e" :key="i">{{ v }}</td>
            <td>{{ fila.s }}</td>
            <td>{{ fila.got }}</td>
            <td>{{ fila.ok ? '✅' : '❌' }}</td>
          </tr>
        </tbody>
      </table>

      <div class="lab-footer">
        <p v-if="todoBien" class="lab-ok">🎉 ¡Tu neurona funciona perfecto!</p>
        <p v-else class="lab-hint">Ajusta los pesos y el sesgo hasta que todas las filas tengan ✅</p>
        <button class="btn-verify" :disabled="!todoBien" @click="verificar">
          {{ todoBien ? '✅ ¡Completar!' : 'Aún faltan filas' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface Caso { e: number[]; s: number; }
interface NeuronaConfig {
  objetivo: string;
  descripcion: string;
  entradas: string[];
  casos: Caso[];
  rango?: { min: number; max: number; paso: number };
}

const props = defineProps<{ config: NeuronaConfig }>();
const emit = defineEmits<{ 'complete': [stars: number] }>();

const rango = computed(() => props.config.rango ?? { min: -3, max: 3, paso: 0.5 });
const pesos = ref<number[]>(props.config.entradas.map(() => 0));
const sesgo = ref(0);

function salidaNeurona(entradas: number[]): number {
  let suma = sesgo.value;
  for (let i = 0; i < entradas.length; i++) suma += entradas[i] * pesos.value[i];
  return suma >= 0 ? 1 : 0;
}

const resultados = computed(() =>
  props.config.casos.map((c) => {
    const got = salidaNeurona(c.e);
    return { e: c.e, s: c.s, got, ok: got === c.s };
  })
);

const todoBien = computed(() => resultados.value.every((r) => r.ok));

const codigoNeurona = computed(() => {
  const args = props.config.entradas.map((_, i) => ['a', 'b', 'c', 'd'][i]);
  const terms = props.config.entradas.map((_, i) => `${args[i]} * ${pesos.value[i]}`).join(' + ');
  return `function neurona(${args.join(', ')}) {\n  let suma = ${terms} + (${sesgo.value});\n  return suma >= 0 ? 1 : 0;\n}`;
});

let completado = false;
function verificar() {
  if (todoBien.value && !completado) {
    completado = true;
    emit('complete', 3);
  }
}
</script>

<style scoped>
.neurona-lab { flex: 1; display: flex; justify-content: center; padding: 1.25rem; background: #0F172A; overflow-y: auto; }
.lab-card { width: 100%; max-width: 720px; background: #1E293B; border: 1px solid #334155; border-radius: 18px; padding: 1.5rem; }
.lab-title { color: #C4B5FD; margin: 0 0 0.25rem; }
.lab-desc { color: #CBD5E1; margin: 0 0 1.25rem; line-height: 1.5; }

.neuron-diagram { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 1.25rem; }
.node { background: #0F172A; border: 2px solid #7C3AED; border-radius: 10px; padding: 0.5rem 0.6rem; color: #E2E8F0; font-size: 0.78rem; text-align: center; }
.input-node { margin: 4px 0; background: #1E3A5F; border-color: #3B82F6; }
.output-node { background: #422006; border-color: #FBBF24; }
.weights-col { display: flex; flex-direction: column; gap: 4px; }
.weight-val { font-size: 0.68rem; color: #A78BFA; font-family: monospace; }
.body-col { display: flex; flex-direction: column; gap: 6px; }

.controls { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; }
.control-row { display: grid; grid-template-columns: 150px 1fr 40px; align-items: center; gap: 0.5rem; }
.control-row label { color: #CBD5E1; font-size: 0.8rem; }
.control-row input[type=range] { width: 100%; accent-color: #7C3AED; }
.ctrl-val { color: #A78BFA; font-weight: 700; font-family: monospace; text-align: right; }

.code-box { margin-bottom: 1rem; background: #0F172A; border: 1px solid #334155; border-radius: 10px; padding: 0.5rem 0.75rem; }
.code-box summary { color: #94A3B8; cursor: pointer; font-size: 0.85rem; }
.code-box pre { color: #86EFAC; font-size: 0.78rem; margin: 0.5rem 0 0; white-space: pre-wrap; font-family: 'Cascadia Code', monospace; }

.truth-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.truth-table th, .truth-table td { border: 1px solid #334155; padding: 0.4rem; text-align: center; color: #E2E8F0; font-size: 0.85rem; }
.truth-table th { background: #0F172A; color: #94A3B8; }
.truth-table tr.bad td { background: rgba(239, 68, 68, 0.08); }

.lab-footer { text-align: center; }
.lab-ok { color: #4ADE80; font-weight: 700; }
.lab-hint { color: #94A3B8; font-size: 0.85rem; }
.btn-verify {
  background: #7C3AED; color: white; border: none; padding: 0.7rem 1.5rem;
  border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: inherit;
}
.btn-verify:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-verify:hover:not(:disabled) { background: #6D28D9; }
</style>
