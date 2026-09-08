<template>
  <div class="mj globos">
    <p class="mj-instr">🎈 Revienta el globo con la respuesta correcta. ({{ q + 1 }}/{{ preguntas.length }})</p>
    <p class="pregunta">{{ actual?.enunciado }}</p>
    <div class="cielo">
      <button v-for="(op, i) in actual?.opciones" :key="q + '-' + i"
        class="globo" :style="estilo(i)" @click="pop(i)">
        <span class="cuerda"></span>
        <span class="txt">{{ op }}</span>
      </button>
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
const colores = ['#EF4444', '#3B82F6', '#22C55E', '#F59E0B', '#EC4899'];

function estilo(i: number) {
  const n = actual.value?.opciones.length ?? 1;
  return { left: (8 + (i * 84) / n + Math.random() * 6) + '%', background: colores[i % colores.length], animationDuration: (3.2 + i * 0.6) + 's' };
}
function pop(i: number) {
  if (fb.value) return;
  if (i === actual.value?.correcta) {
    audio.sfx('sfx-correcto'); fb.value = '¡Bien! 🎉'; fbOk.value = true;
    setTimeout(() => {
      fb.value = '';
      if (q.value + 1 < preguntas.value.length) q.value++;
      else { audio.sfx('sfx-ganar'); emit('ganar'); }
    }, 650);
  } else {
    audio.sfx('sfx-error'); fb.value = '¡Ups! Ese no.'; fbOk.value = false;
    setTimeout(() => { fb.value = ''; }, 700);
  }
}
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; }
.pregunta { color: #F1F5F9; font-size: 1.1rem; font-weight: 700; text-align: center; margin: 0.2rem 0; }
.cielo { position: relative; width: 100%; max-width: 620px; height: 280px; background: linear-gradient(#7DD3FC, #BAE6FD); border-radius: 16px; overflow: hidden; }
.globo { position: absolute; bottom: -70px; width: 78px; height: 92px; border-radius: 50% 50% 48% 48%; border: none; cursor: pointer; color: #fff; font-weight: 700; font-size: 0.72rem; padding: 0 6px; box-shadow: inset -6px -6px 0 rgba(0,0,0,0.12); animation: subir linear infinite; }
.globo:hover { filter: brightness(1.1); }
.cuerda { position: absolute; bottom: -14px; left: 50%; width: 2px; height: 14px; background: rgba(255,255,255,0.7); }
.txt { display: block; line-height: 1.1; }
@keyframes subir { from { transform: translateY(0); } to { transform: translateY(-360px); } }
.fb { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); padding: 5px 14px; border-radius: 16px; font-weight: 800; }
.fb.ok { background: #16A34A; color: #fff; } .fb.no { background: #DC2626; color: #fff; }
.pf-enter-active, .pf-leave-active { transition: opacity 0.2s; } .pf-enter-from, .pf-leave-to { opacity: 0; }
</style>
