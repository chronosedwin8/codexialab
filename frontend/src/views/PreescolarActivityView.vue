<template>
  <div class="pre-act-view" :style="{ background: fondo }">
    <header class="av-head">
      <button class="back" @click="irMapa">⬅️</button>
      <h2>{{ config?.nombre ?? 'Cargando…' }}</h2>
    </header>

    <div v-if="cargando" class="cargando">Cargando… ✨</div>

    <PreescolarPrograma
      v-else-if="config && config.sub === 'programa'"
      :key="activityKey"
      :config="config"
      @complete="onComplete"
    />

    <PreescolarJuego
      v-else-if="config && config.sub === 'juego'"
      :key="activityKey"
      :config="config"
      @complete="onComplete"
    />

    <PreescolarActivity
      v-else-if="config"
      :key="activityKey"
      :config="config"
      @complete="onComplete"
    />

    <!-- Celebración -->
    <transition name="fade">
      <div v-if="celebrar" class="celebra">
        <div class="conf">🎉🎊⭐🌟✨</div>
        <div class="estrellas-big"><span v-for="s in 3" :key="s" :class="{ on: stars >= s }">⭐</span></div>
        <p class="msg">¡Lo lograste!</p>
        <div class="botones">
          <button class="cbtn repetir" @click="reintentar">🔁<span>Otra vez</span></button>
          <button class="cbtn siguiente" @click="siguiente">➡️<span>Seguir</span></button>
          <button class="cbtn mapa" @click="irMapa">🏠<span>Mapa</span></button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { curriculumApi } from '@/api/index';
import { useVoz, VOZ_UI } from '@/composables/useVoz';
import PreescolarActivity from '@/components/PreescolarActivity.vue';
import PreescolarPrograma from '@/components/PreescolarPrograma.vue';
import PreescolarJuego from '@/components/PreescolarJuego.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const game = useGameStore();
const voz = useVoz();

const config = ref<any>(null);
const cargando = ref(true);
const celebrar = ref(false);
const stars = ref(3);
const activityKey = ref(0);

const SLUG: Record<string, string> = { mate_preescolar: 'matematica', lectoescritura: 'lectoescritura', prog_preescolar: 'programacion', mundos_preescolar: 'mundos' };
const fondo = computed(() => {
  const c = config.value?.categoria;
  if (c === 'lectoescritura') return 'linear-gradient(180deg,#C4B5FD,#DDD6FE)';
  if (c === 'prog_preescolar') return 'linear-gradient(180deg,#BFDBFE,#DBEAFE)';
  if (c === 'mundos_preescolar') return 'linear-gradient(180deg,#FBCFE8,#FCE7F3)';
  return 'linear-gradient(180deg,#86EFAC,#BBF7D0)';
});

async function cargar(levelId: number) {
  cargando.value = true; celebrar.value = false;
  try {
    await auth.ensurePreescolar();
    const data = await curriculumApi.getLevel(levelId);
    const cfg = data.level.config;
    if (cfg?.tipo !== 'preescolar') { irMapa(); return; } // no es una actividad de preescolar
    config.value = cfg;
    await game.startSession(levelId, 'bloques');
  } catch {
    router.push('/preescolar');
  } finally {
    cargando.value = false;
  }
}

function onComplete(s: number) {
  stars.value = s;
  game.completeLevel(s).then((res: any) => {
    if (res?.recompensa?.monedas) auth.addCoins(res.recompensa.monedas);
    if (res?.recompensa?.gemas) auth.addGems(res.recompensa.gemas);
  }).catch(() => { /* sin conexión: la celebración igual se muestra */ });
  celebrar.value = true;
  // Una sola voz natural (ElevenLabs) para la celebración. No usamos otra voz a la vez.
  setTimeout(() => voz.decir(VOZ_UI.ganaste), 700);
}

function reintentar() { celebrar.value = false; activityKey.value++; cargar(currentId()); }
function siguiente() { voz.parar(); router.push(`/preescolar/nivel/${currentId() + 1}`); }
function irMapa() {
  voz.parar();
  const slug = SLUG[config.value?.categoria] ?? 'matematica';
  router.push(`/preescolar/${slug}`);
}
function currentId() { return parseInt(route.params.levelId as string, 10); }

onMounted(() => cargar(currentId()));
watch(() => route.params.levelId, (n) => { if (n) { activityKey.value++; cargar(parseInt(n as string, 10)); } });
</script>

<style scoped>
.pre-act-view { min-height: 100vh; padding: 1rem; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.av-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.av-head h2 { flex: 1; text-align: center; color: #1E293B; margin: 0; font-size: 1.3rem; }
.back { background: #fff; border: 3px solid #F59E0B; border-radius: 50%; width: 52px; height: 52px; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 0 #D97706; }
.back:active { transform: translateY(3px); box-shadow: 0 1px 0 #D97706; }
.cargando { text-align: center; color: #166534; font-size: 1.3rem; margin-top: 2rem; }

.celebra { position: fixed; inset: 0; z-index: 100; background: rgba(255,255,255,0.92); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
.conf { font-size: 3rem; letter-spacing: 0.3rem; animation: bob 1.2s ease-in-out infinite; }
.estrellas-big span { font-size: 3.5rem; filter: grayscale(1); opacity: 0.35; }
.estrellas-big span.on { filter: none; opacity: 1; animation: pop 0.5s; }
.msg { font-size: 2.6rem; color: #16A34A; margin: 0; }
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

.botones { display: flex; gap: 1.25rem; flex-wrap: wrap; justify-content: center; }
.cbtn { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; border: none; border-radius: 24px; width: 120px; height: 120px; font-size: 2.6rem; color: #fff; font-family: inherit; cursor: pointer; }
.cbtn span { font-size: 1rem; }
.cbtn:active { transform: translateY(4px); }
.repetir { background: linear-gradient(160deg,#FBBF24,#F59E0B); box-shadow: 0 6px 0 #B45309; }
.siguiente { background: linear-gradient(160deg,#22C55E,#16A34A); box-shadow: 0 6px 0 #15803D; }
.mapa { background: linear-gradient(160deg,#60A5FA,#2563EB); box-shadow: 0 6px 0 #1D4ED8; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; } .fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
