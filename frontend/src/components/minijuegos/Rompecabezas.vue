<template>
  <div class="mj puzzle">
    <p class="mj-instr">🧩 Ordena las fichas del 1 al 8 deslizándolas. Movimientos: {{ movimientos }}</p>
    <div class="board">
      <button v-for="(t, i) in fichas" :key="i"
        :class="['ficha', { vacia: t === 0, ok: resuelto }]"
        :disabled="t === 0"
        @click="mover(i)">{{ t === 0 ? '' : t }}</button>
    </div>
    <transition name="fade">
      <p v-if="resuelto" class="resuelto-msg">✅ ¡Resuelto! {{ data.fact }}</p>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const props = defineProps<{ data: { fact?: string } }>();
const emit = defineEmits<{ ganar: [] }>();

const META = [1, 2, 3, 4, 5, 6, 7, 8, 0];
const fichas = ref<number[]>([]);
const movimientos = ref(0);
const resuelto = ref(false);

function vecinos(i: number) {
  const r = Math.floor(i / 3), c = i % 3; const v: number[] = [];
  if (r > 0) v.push(i - 3); if (r < 2) v.push(i + 3); if (c > 0) v.push(i - 1); if (c < 2) v.push(i + 1);
  return v;
}
function mezclar() {
  let arr = [...META];
  for (let k = 0; k < 120; k++) {
    const z = arr.indexOf(0); const vs = vecinos(z); const j = vs[Math.floor(Math.random() * vs.length)];
    [arr[z], arr[j]] = [arr[j], arr[z]];
  }
  if (arr.join() === META.join()) { [arr[0], arr[1]] = [arr[1], arr[0]]; }
  fichas.value = arr;
}
mezclar();

function mover(i: number) {
  if (resuelto.value) return;
  const z = fichas.value.indexOf(0);
  if (!vecinos(i).includes(z)) return;
  const arr = [...fichas.value]; [arr[i], arr[z]] = [arr[z], arr[i]]; fichas.value = arr;
  movimientos.value++;
  audio.sfx('sfx-salto');
  if (fichas.value.join() === META.join()) { resuelto.value = true; audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 1200); }
}

const _ = computed(() => props.data); void _;
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; text-align: center; }
.board { display: grid; grid-template-columns: repeat(3, 72px); grid-auto-rows: 72px; gap: 6px; background: #0F172A; padding: 8px; border-radius: 14px; }
.ficha { font-size: 1.6rem; font-weight: 800; border: none; border-radius: 10px; background: linear-gradient(135deg, #0EA5E9, #2563EB); color: #fff; cursor: pointer; font-family: inherit; transition: transform 0.1s; }
.ficha:hover:not(:disabled) { transform: scale(1.05); }
.ficha.vacia { background: transparent; cursor: default; }
.ficha.ok { background: linear-gradient(135deg, #16A34A, #22C55E); }
.resuelto-msg { color: #4ADE80; font-weight: 700; text-align: center; max-width: 360px; }
.fade-enter-active { transition: opacity 0.4s; } .fade-enter-from { opacity: 0; }
</style>
