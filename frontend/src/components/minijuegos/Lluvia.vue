<template>
  <div class="mj lluvia">
    <p class="mj-instr">🌧️ Atrapa la gota con la respuesta correcta antes de que caiga. ({{ q + 1 }}/{{ preguntas.length }})</p>
    <p class="pregunta">{{ actual?.enunciado }}</p>
    <div class="zona">
      <button v-for="(op, i) in actual?.opciones" :key="q + '-' + i"
        class="gota" :style="estilo(i)" @click="atrapar(i)">{{ op }}</button>
      <div class="suelo"></div>
      <transition name="pf"><div v-if="fb" class="fb" :class="fbOk ? 'ok' : 'no'">{{ fb }}</div></transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const props = defineProps<{ data: { preguntas: { enunciado: string; opciones: string[]; correcta: number }[] } }>();
const emit = defineEmits<{ ganar: [] }>();

const preguntas = computed(() => (props.data.preguntas ?? []).slice(0, 4));
const q = ref(0);
const fb = ref(''); const fbOk = ref(false);
const actual = computed(() => preguntas.value[q.value]);
const colores = ['#38BDF8', '#A78BFA', '#34D399', '#FBBF24', '#F472B6'];

function estilo(i: number) {
  const n = actual.value?.opciones.length ?? 1;
  return { left: (6 + (i * 88) / n) + '%', background: colores[i % colores.length], animationDuration: (3 + (i % 3) * 0.8) + 's', animationDelay: (i * 0.5) + 's' };
}
function atrapar(i: number) {
  if (fb.value) return;
  if (i === actual.value?.correcta) {
    audio.sfx('sfx-correcto'); fb.value = '¡Atrapada! 💧'; fbOk.value = true;
    setTimeout(() => {
      fb.value = '';
      if (q.value + 1 < preguntas.value.length) q.value++;
      else { audio.sfx('sfx-ganar'); emit('ganar'); }
    }, 650);
  } else {
    audio.sfx('sfx-error'); fb.value = 'Esa no era.'; fbOk.value = false;
    setTimeout(() => { fb.value = ''; }, 700);
  }
}
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; text-align: center; }
.pregunta { color: #F1F5F9; font-size: 1.1rem; font-weight: 700; text-align: center; margin: 0.2rem 0; }
.zona { position: relative; width: 100%; max-width: 620px; height: 280px; background: linear-gradient(#1E293B, #0F172A); border-radius: 16px; overflow: hidden; }
.gota { position: absolute; top: -50px; min-width: 64px; padding: 0.5rem 0.7rem; border: none; border-radius: 14px 14px 14px 4px; color: #06283D; font-weight: 800; font-size: 0.8rem; cursor: pointer; animation: caer linear infinite; box-shadow: 0 3px 8px rgba(0,0,0,0.3); }
.gota:hover { filter: brightness(1.12); }
@keyframes caer { from { transform: translateY(0); } to { transform: translateY(320px); } }
.suelo { position: absolute; bottom: 0; left: 0; right: 0; height: 16px; background: repeating-linear-gradient(90deg, #334155 0 16px, #1E293B 16px 32px); }
.fb { position: absolute; bottom: 26px; left: 50%; transform: translateX(-50%); padding: 5px 14px; border-radius: 16px; font-weight: 800; }
.fb.ok { background: #16A34A; color: #fff; } .fb.no { background: #DC2626; color: #fff; }
.pf-enter-active, .pf-leave-active { transition: opacity 0.2s; } .pf-enter-from, .pf-leave-to { opacity: 0; }
</style>
