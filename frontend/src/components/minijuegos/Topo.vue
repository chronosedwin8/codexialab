<template>
  <div class="mj topo">
    <p class="mj-instr">🔨 ¡Golpea al topo con la respuesta correcta! ({{ q + 1 }}/{{ preguntas.length }})</p>
    <p class="pregunta">{{ actual?.enunciado }}</p>
    <div class="hoyos">
      <div v-for="(h, i) in hoyos" :key="i" class="hoyo">
        <transition name="pop">
          <button v-if="h.visible" class="topo-btn" @click="golpear(i)">
            <span class="cara">🐹</span>
            <span class="op">{{ h.texto }}</span>
          </button>
        </transition>
      </div>
    </div>
    <transition name="pf"><p v-if="fb" class="fb" :class="fbOk ? 'ok' : 'no'">{{ fb }}</p></transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAudio } from '@/composables/useAudio';
const audio = useAudio();
const props = defineProps<{ data: { preguntas: { enunciado: string; opciones: string[]; correcta: number }[] } }>();
const emit = defineEmits<{ ganar: [] }>();

const preguntas = computed(() => (props.data.preguntas ?? []).slice(0, 4));
const q = ref(0);
const fb = ref(''); const fbOk = ref(false);
const actual = computed(() => preguntas.value[q.value]);
const hoyos = ref(Array.from({ length: 6 }, () => ({ visible: false, texto: '', correcta: false })));
let timer = 0;

function tick() {
  // Oculta algunos y muestra opciones en hoyos aleatorios, garantizando que la correcta aparezca
  const ops = actual.value?.opciones ?? [];
  hoyos.value.forEach((h) => { if (Math.random() < 0.5) h.visible = false; });
  const libres = hoyos.value.map((h, i) => (!h.visible ? i : -1)).filter((i) => i >= 0);
  // baraja opciones
  const idxs = ops.map((_, i) => i).sort(() => Math.random() - 0.5);
  let li = 0;
  for (const oi of idxs) {
    if (li >= libres.length) break;
    if (Math.random() < 0.7 || oi === actual.value?.correcta) {
      const hi = libres[li++];
      hoyos.value[hi] = { visible: true, texto: ops[oi], correcta: oi === actual.value?.correcta };
    }
  }
  // asegura que la correcta esté visible
  if (!hoyos.value.some((h) => h.visible && h.correcta) && libres.length) {
    const hi = libres[0];
    hoyos.value[hi] = { visible: true, texto: ops[actual.value!.correcta], correcta: true };
  }
}
function golpear(i: number) {
  const h = hoyos.value[i];
  if (!h.visible || fb.value) return;
  if (h.correcta) {
    audio.sfx('sfx-correcto'); fb.value = '¡Toma! 🎯'; fbOk.value = true;
    hoyos.value.forEach((x) => (x.visible = false));
    setTimeout(() => {
      fb.value = '';
      if (q.value + 1 < preguntas.value.length) q.value++;
      else { stop(); audio.sfx('sfx-ganar'); emit('ganar'); }
    }, 650);
  } else {
    audio.sfx('sfx-error'); fb.value = '¡Ese no!'; fbOk.value = false; h.visible = false;
    setTimeout(() => { fb.value = ''; }, 600);
  }
}
function stop() { clearInterval(timer); }
onMounted(() => { tick(); timer = window.setInterval(tick, 1100); });
onUnmounted(stop);
</script>

<style scoped>
.mj { display: flex; flex-direction: column; gap: 0.5rem; align-items: center; }
.mj-instr { color: #CBD5E1; font-size: 0.9rem; margin: 0; }
.pregunta { color: #F1F5F9; font-size: 1.1rem; font-weight: 700; text-align: center; margin: 0.2rem 0; }
.hoyos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; width: 100%; max-width: 560px; }
.hoyo { position: relative; height: 96px; background: radial-gradient(ellipse at center bottom, #422006 0 60%, #1E293B 60%); border-radius: 0 0 50% 50% / 0 0 30% 30%; display: flex; align-items: flex-end; justify-content: center; overflow: hidden; border: 2px solid #334155; }
.topo-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: #92400E; border: none; border-radius: 12px 12px 0 0; padding: 6px 10px 10px; cursor: pointer; font-family: inherit; }
.cara { font-size: 1.6rem; }
.op { color: #fff; font-weight: 700; font-size: 0.72rem; max-width: 120px; }
.pop-enter-active { animation: salir 0.18s; } .pop-leave-active { animation: salir 0.18s reverse; }
@keyframes salir { from { transform: translateY(60px); } to { transform: translateY(0); } }
.fb { font-weight: 800; margin: 0.2rem 0 0; } .fb.ok { color: #4ADE80; } .fb.no { color: #FCA5A5; }
.pf-enter-active, .pf-leave-active { transition: opacity 0.2s; } .pf-enter-from, .pf-leave-to { opacity: 0; }
</style>
