<template>
  <div class="mj sopa">
    <p class="mj-instr">🔤 Encuentra las palabras: toca la primera y la última letra de cada una.</p>
    <div class="sopa-wrap">
      <div class="grid" :style="{ gridTemplateColumns: `repeat(${N}, 1fr)` }">
        <button v-for="(ch, i) in celdas" :key="i"
          :class="['cell', { sel: inicio === i, found: encontradas.has(i) }]"
          @click="tocar(i)">{{ ch }}</button>
      </div>
      <div class="words">
        <span v-for="w in palabras" :key="w" :class="['word', { ok: halladas.includes(w) }]">{{ w }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const props = defineProps<{ data: { palabras: string[] } }>();
const emit = defineEmits<{ ganar: [] }>();

const N = 11;
const palabras = computed(() => (props.data.palabras ?? []).map((w) => w.toUpperCase().replace(/[^A-ZÑÁÉÍÓÚ]/g, '')).filter((w) => w.length >= 3 && w.length <= N).slice(0, 6));
const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const celdas = ref<string[]>([]);
const pos = ref<Record<string, number[]>>({}); // palabra -> indices
const halladas = ref<string[]>([]);
const encontradas = ref<Set<number>>(new Set());
const inicio = ref<number | null>(null);

function idx(r: number, c: number) { return r * N + c; }
function construir() {
  const g: (string | null)[] = Array(N * N).fill(null);
  const dirs = [[0, 1], [1, 0]]; // horizontal, vertical
  for (const w of palabras.value) {
    let colocada = false;
    for (let t = 0; t < 80 && !colocada; t++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
      const r0 = Math.floor(Math.random() * N), c0 = Math.floor(Math.random() * N);
      const rEnd = r0 + dr * (w.length - 1), cEnd = c0 + dc * (w.length - 1);
      if (rEnd >= N || cEnd >= N) continue;
      let ok = true; const cells: number[] = [];
      for (let k = 0; k < w.length; k++) {
        const ci = idx(r0 + dr * k, c0 + dc * k);
        if (g[ci] && g[ci] !== w[k]) { ok = false; break; }
        cells.push(ci);
      }
      if (!ok) continue;
      w.split('').forEach((ch, k) => { g[cells[k]] = ch; });
      pos.value[w] = cells;
      colocada = true;
    }
  }
  celdas.value = g.map((x) => x ?? ALF[Math.floor(Math.random() * ALF.length)]);
}
construir();

function tocar(i: number) {
  if (inicio.value === null) { inicio.value = i; return; }
  const a = inicio.value, b = i;
  const ar = Math.floor(a / N), ac = a % N, br = Math.floor(b / N), bc = b % N;
  inicio.value = null;
  if (ar !== br && ac !== bc) return; // solo líneas rectas
  const linea: number[] = [];
  const steps = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
  const dr = Math.sign(br - ar), dc = Math.sign(bc - ac);
  for (let k = 0; k <= steps; k++) linea.push(idx(ar + dr * k, ac + dc * k));
  const txt = linea.map((ci) => celdas.value[ci]).join('');
  const rev = [...txt].reverse().join('');
  for (const w of palabras.value) {
    if (halladas.value.includes(w)) continue;
    if (txt === w || rev === w) {
      halladas.value.push(w);
      linea.forEach((ci) => encontradas.value.add(ci));
      audio.sfx('sfx-correcto');
      if (halladas.value.length === palabras.value.length) { audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 600); }
      return;
    }
  }
  audio.sfx('sfx-error');
}
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; text-align: center; }
.sopa-wrap { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; align-items: flex-start; }
.grid { display: grid; gap: 3px; background: #0F172A; padding: 6px; border-radius: 12px; }
.cell { width: 30px; height: 30px; background: #1E293B; border: 1px solid #334155; border-radius: 5px; color: #E2E8F0; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.85rem; }
.cell:hover { background: #334155; }
.cell.sel { background: #0EA5E9; color: #fff; }
.cell.found { background: rgba(34,197,94,0.4); border-color: #16A34A; color: #fff; }
.words { display: flex; flex-direction: column; gap: 0.3rem; min-width: 110px; }
.word { color: #94A3B8; font-weight: 700; padding: 3px 8px; border-radius: 6px; background: #1E293B; }
.word.ok { color: #4ADE80; text-decoration: line-through; }
</style>
