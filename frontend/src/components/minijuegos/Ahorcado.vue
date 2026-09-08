<template>
  <div class="mj ahorcado">
    <p class="mj-instr">🪢 Adivina la palabra. Pista: <b>{{ data.pista }}</b></p>
    <div class="figura">{{ FIG[Math.min(fallos, FIG.length - 1)] }}</div>
    <div class="vidas">Fallos: {{ fallos }} / {{ MAX }}</div>
    <div class="palabra">
      <span v-for="(ch, i) in letras" :key="i" class="hueco">{{ ch === ' ' ? ' ' : (adivinadas.has(ch) ? ch : '_') }}</span>
    </div>

    <div v-if="!fin" class="teclado">
      <button v-for="l in ALF" :key="l" :disabled="adivinadas.has(l)"
        :class="{ usada: adivinadas.has(l) }" @click="probar(l)">{{ l }}</button>
    </div>

    <div v-else class="fin">
      <p v-if="gano" class="msg ok">¡Adivinaste! 🎉 La palabra era <b>{{ palabra }}</b></p>
      <p v-else class="msg no">La palabra era <b>{{ palabra }}</b>. ¡Buen intento!</p>
      <button v-if="!gano" class="btn" @click="reiniciar">🔄 Otra vez</button>
      <button v-if="!gano" class="btn ghost" @click="emit('ganar')">Continuar →</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const props = defineProps<{ data: { palabra: string; pista: string } }>();
const emit = defineEmits<{ ganar: [] }>();

const ALF = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
const FIG = ['😀', '🙂', '😐', '😟', '😣', '😵', '💀'];
const MAX = 6;
const palabra = computed(() => (props.data.palabra ?? 'CODEXIA').toUpperCase());
const letras = computed(() => palabra.value.split(''));
const adivinadas = ref<Set<string>>(new Set());
const fallos = ref(0);

const gano = computed(() => letras.value.every((ch) => ch === ' ' || adivinadas.value.has(ch)));
const fin = computed(() => gano.value || fallos.value >= MAX);

function probar(l: string) {
  if (adivinadas.value.has(l) || fin.value) return;
  adivinadas.value.add(l);
  if (palabra.value.includes(l)) {
    audio.sfx('sfx-correcto');
    if (gano.value) { audio.sfx('sfx-ganar'); setTimeout(() => emit('ganar'), 700); }
  } else {
    fallos.value++; audio.sfx('sfx-error');
  }
}
function reiniciar() { adivinadas.value = new Set(); fallos.value = 0; }
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.6rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; }
.figura { font-size: 3.5rem; }
.vidas { color: #FCA5A5; font-weight: 700; font-size: 0.85rem; }
.palabra { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; margin: 0.3rem 0; }
.hueco { min-width: 22px; border-bottom: 3px solid #475569; color: #F1F5F9; font-size: 1.5rem; font-weight: 800; text-align: center; }
.teclado { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; max-width: 360px; }
.teclado button { aspect-ratio: 1; background: #1E293B; border: 1px solid #334155; border-radius: 6px; color: #E2E8F0; font-weight: 700; cursor: pointer; font-family: inherit; }
.teclado button:hover:not(:disabled) { background: #0EA5E9; }
.teclado button.usada { opacity: 0.3; cursor: default; }
.fin { text-align: center; }
.msg.ok { color: #4ADE80; } .msg.no { color: #FCA5A5; }
.btn { background: #7C3AED; color: #fff; border: none; padding: 0.5rem 1.1rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-family: inherit; margin: 0.3rem; }
.btn.ghost { background: #334155; }
</style>
