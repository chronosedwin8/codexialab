<template>
  <div class="mj memoria">
    <p class="mj-instr">🃏 Encuentra las parejas (pregunta ↔ respuesta). Movimientos: {{ movimientos }}</p>
    <div class="grid" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
      <button v-for="card in cartas" :key="card.uid"
        :class="['card', { flip: card.abierta || card.hecha, hecha: card.hecha }]"
        :disabled="card.abierta || card.hecha || bloqueo"
        @click="voltear(card)">
        <span class="cara front">❓</span>
        <span class="cara back">{{ card.texto }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const props = defineProps<{ data: { pares: [string, string][] } }>();
const emit = defineEmits<{ ganar: [] }>();

interface Carta { uid: number; par: number; texto: string; abierta: boolean; hecha: boolean }
const pares = computed(() => (props.data.pares ?? []).slice(0, 5));
const cols = computed(() => (pares.value.length > 3 ? Math.ceil((pares.value.length * 2) / 2) > 5 ? 5 : pares.value.length : pares.value.length));

const cartas = ref<Carta[]>([]);
const movimientos = ref(0);
const bloqueo = ref(false);
let abierta: Carta | null = null;

function barajar() {
  let uid = 0;
  const arr: Carta[] = [];
  pares.value.forEach(([a, b], p) => {
    arr.push({ uid: uid++, par: p, texto: a, abierta: false, hecha: false });
    arr.push({ uid: uid++, par: p, texto: b, abierta: false, hecha: false });
  });
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  cartas.value = arr;
}
barajar();

function voltear(c: Carta) {
  if (bloqueo.value || c.abierta || c.hecha) return;
  c.abierta = true;
  if (!abierta) { abierta = c; return; }
  movimientos.value++;
  if (abierta.par === c.par) {
    abierta.hecha = c.hecha = true; abierta = null; audio.sfx('sfx-correcto');
    if (cartas.value.every((x) => x.hecha)) { audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 600); }
  } else {
    bloqueo.value = true; audio.sfx('sfx-error');
    const prev = abierta; abierta = null;
    setTimeout(() => { prev.abierta = c.abierta = false; bloqueo.value = false; }, 800);
  }
}
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.75rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; text-align: center; }
.grid { display: grid; gap: 0.5rem; width: 100%; max-width: 640px; }
.card { position: relative; aspect-ratio: 3/2; min-height: 64px; border: none; background: transparent; cursor: pointer; perspective: 600px; padding: 0; }
.cara { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border-radius: 12px; backface-visibility: hidden; transition: transform 0.35s; padding: 4px; font-family: inherit; text-align: center; }
.front { background: linear-gradient(135deg, #6B46C1, #4338CA); color: #fff; font-size: 1.4rem; }
.back { background: #1E293B; border: 2px solid #0EA5E9; color: #E2E8F0; font-size: 0.78rem; font-weight: 600; transform: rotateY(180deg); }
.card.flip .front { transform: rotateY(180deg); }
.card.flip .back { transform: rotateY(360deg); }
.card.hecha .back { border-color: #16A34A; background: rgba(34,197,94,0.18); }
</style>
