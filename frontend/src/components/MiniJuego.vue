<template>
  <div class="minijuego">
    <div class="mj-bar">
      <span class="mj-title">🎮 {{ titulo }}</span>
      <button class="mj-skip" @click="$emit('terminar')">Saltar juego →</button>
    </div>

    <div v-if="completado" class="mj-done">
      <div class="done-emoji">🏆</div>
      <h3>¡Juego superado!</h3>
      <p>¡Genial! Ahora demuestra lo aprendido en las preguntas.</p>
      <button class="btn-go" @click="$emit('terminar')">Ir a las preguntas ✏️</button>
    </div>

    <component
      v-else
      :is="comp"
      :data="juego"
      @ganar="onGanar"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAudio } from '@/composables/useAudio';
import SopaLetras from '@/components/minijuegos/SopaLetras.vue';
import Ahorcado from '@/components/minijuegos/Ahorcado.vue';
import Memoria from '@/components/minijuegos/Memoria.vue';
import Globos from '@/components/minijuegos/Globos.vue';
import Lluvia from '@/components/minijuegos/Lluvia.vue';
import Topo from '@/components/minijuegos/Topo.vue';
import Camino from '@/components/minijuegos/Camino.vue';
import Pacman from '@/components/minijuegos/Pacman.vue';
import Mario from '@/components/minijuegos/Mario.vue';
import Rompecabezas from '@/components/minijuegos/Rompecabezas.vue';

const audio = useAudio();
const props = defineProps<{ juego: { tipo: string; [k: string]: any } }>();
const emit = defineEmits<{ terminar: []; bonus: [n: number] }>();

const REG: Record<string, { c: any; t: string }> = {
  sopa: { c: SopaLetras, t: 'Sopa de Letras' },
  ahorcado: { c: Ahorcado, t: 'El Ahorcado' },
  memoria: { c: Memoria, t: 'Memoria' },
  globos: { c: Globos, t: 'Revienta Globos' },
  lluvia: { c: Lluvia, t: 'Lluvia de Respuestas' },
  topo: { c: Topo, t: 'Golpea al Topo' },
  camino: { c: Camino, t: 'El Camino' },
  pacman: { c: Pacman, t: 'Come-puntos' },
  mario: { c: Mario, t: 'Aventura de Plataformas' },
  rompecabezas: { c: Rompecabezas, t: 'Rompecabezas' },
};

const entry = computed(() => REG[props.juego?.tipo] ?? null);
const comp = computed(() => entry.value?.c ?? null);
const titulo = computed(() => entry.value?.t ?? 'Mini-juego');
const completado = ref(false);

function onGanar() {
  completado.value = true;
  audio.sfx('sfx-ganar');
  emit('bonus', 5);
}
</script>

<style scoped>
.minijuego { width: 100%; max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 0.75rem; }
.mj-bar { display: flex; align-items: center; justify-content: space-between; }
.mj-title { color: #C4B5FD; font-weight: 800; font-size: 0.95rem; }
.mj-skip { background: transparent; border: none; color: #64748B; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; }
.mj-skip:hover { color: #94A3B8; }
.mj-done { text-align: center; background: #1E293B; border: 2px solid #FCD34D; border-radius: 18px; padding: 1.75rem; box-shadow: 0 0 30px rgba(252,211,77,0.2); }
.done-emoji { font-size: 3rem; }
.mj-done h3 { color: #FCD34D; margin: 0.3rem 0; }
.mj-done p { color: #CBD5E1; margin: 0.4rem 0 1rem; }
.btn-go { background: #16A34A; color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; font-family: inherit; }
.btn-go:hover { background: #15803D; }
</style>
