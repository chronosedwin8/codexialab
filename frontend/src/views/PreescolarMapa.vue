<template>
  <div class="pre-mapa" :style="{ background: fondo }">
    <header class="mapa-head">
      <button class="back" @click="volver">⬅️</button>
      <h1>{{ titulo }}</h1>
      <button class="voz-btn" @click="leerTitulo">🔊</button>
    </header>

    <div v-if="cargando" class="cargando">Cargando… ✨</div>

    <!-- Lista de mundos (unidades) -->
    <div v-else-if="!mundoSel" class="mundos">
      <button v-for="w in mundos" :key="w.id" class="mundo-tile"
        :style="{ background: `linear-gradient(160deg, ${w.colorPrimario}, ${w.colorSecundario})` }"
        @click="abrirMundo(w)" @mouseenter="voz.decir(VOZ_UI.mundo(w.id))">
        <span class="w-emoji">{{ w.icono || '⭐' }}</span>
        <span class="w-nombre">{{ w.nombre }}</span>
        <span class="w-prog">{{ completados(w) }}/{{ w.niveles.length }} ⭐</span>
      </button>
    </div>

    <!-- Actividades del mundo seleccionado -->
    <div v-else class="acts-wrap">
      <button class="back-mundo" @click="mundoSel = null">⬅️ Volver</button>
      <h2 class="mundo-titulo">{{ mundoSel.icono }} {{ mundoSel.nombre }}</h2>
      <div class="acts">
        <button v-for="(n, i) in mundoSel.niveles" :key="n.id"
          :class="['act-tile', { hecho: n.completado }]"
          @click="abrirNivel(n)" @mouseenter="voz.decir(n.audio)">
          <span class="a-num">{{ i + 1 }}</span>
          <span class="a-nombre">{{ n.nombre }}</span>
          <span class="a-estrellas">
            <span v-for="s in 3" :key="s" :class="{ on: (n.estrellas ?? 0) >= s }">⭐</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { curriculumApi } from '@/api/index';
import { useVoz, VOZ_UI } from '@/composables/useVoz';
import type { World } from '@/stores/curriculum';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const voz = useVoz();

const SLUG: Record<string, { cat: string; titulo: string; fondo: string; intro: string }> = {
  matematica: { cat: 'mate_preescolar', titulo: 'Matemáticas', fondo: 'linear-gradient(180deg,#86EFAC,#BBF7D0)', intro: VOZ_UI.mateIntro },
  mate_preescolar: { cat: 'mate_preescolar', titulo: 'Matemáticas', fondo: 'linear-gradient(180deg,#86EFAC,#BBF7D0)', intro: VOZ_UI.mateIntro },
  lectoescritura: { cat: 'lectoescritura', titulo: 'Letras', fondo: 'linear-gradient(180deg,#C4B5FD,#DDD6FE)', intro: VOZ_UI.letrasIntro },
  programacion: { cat: 'prog_preescolar', titulo: 'Programación', fondo: 'linear-gradient(180deg,#BFDBFE,#DBEAFE)', intro: VOZ_UI.progIntro },
  prog_preescolar: { cat: 'prog_preescolar', titulo: 'Programación', fondo: 'linear-gradient(180deg,#BFDBFE,#DBEAFE)', intro: VOZ_UI.progIntro },
  mundos: { cat: 'mundos_preescolar', titulo: 'Mundos Mágicos', fondo: 'linear-gradient(180deg,#FBCFE8,#FCE7F3)', intro: VOZ_UI.mundosIntro },
  mundos_preescolar: { cat: 'mundos_preescolar', titulo: 'Mundos Mágicos', fondo: 'linear-gradient(180deg,#FBCFE8,#FCE7F3)', intro: VOZ_UI.mundosIntro },
};

const slug = computed(() => SLUG[route.params.categoria as string] ?? SLUG.matematica);
const titulo = computed(() => slug.value.titulo);
const fondo = computed(() => slug.value.fondo);

const mundos = ref<World[]>([]);
const mundoSel = ref<World | null>(null);
const cargando = ref(true);

function completados(w: World) { return w.niveles.filter((n) => n.completado).length; }

function leerTitulo() { voz.decir(slug.value.intro); }

function abrirMundo(w: World) {
  voz.decir(VOZ_UI.mundo(w.id));
  mundoSel.value = w;
}
function abrirNivel(n: { id: number }) {
  voz.parar();
  router.push(`/preescolar/nivel/${n.id}`);
}
function volver() {
  voz.parar();
  if (mundoSel.value) { mundoSel.value = null; return; }
  router.push('/preescolar');
}

onMounted(async () => {
  try {
    await auth.ensurePreescolar();
    const data = await curriculumApi.getWorlds(slug.value.cat);
    mundos.value = data.worlds;
  } finally {
    cargando.value = false;
    setTimeout(leerTitulo, 400);
  }
});
</script>

<style scoped>
.pre-mapa { min-height: 100vh; padding: 1rem; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.mapa-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.mapa-head h1 { flex: 1; text-align: center; color: #1E3A8A; margin: 0; font-size: 1.8rem; text-shadow: 0 2px 0 #fff; }
.back, .voz-btn { background: #fff; border: 3px solid #F59E0B; border-radius: 50%; width: 52px; height: 52px; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 0 #D97706; flex-shrink: 0; }
.back:active, .voz-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #D97706; }
.cargando { text-align: center; color: #166534; font-size: 1.3rem; margin-top: 2rem; }

.mundos, .acts { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 1rem; max-width: 1000px; margin: 0 auto; }
.mundo-tile {
  border: none; border-radius: 26px; cursor: pointer; color: #fff; font-family: inherit;
  padding: 1rem 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  min-height: 160px; justify-content: center; box-shadow: 0 8px 0 rgba(0,0,0,0.15), 0 10px 18px rgba(0,0,0,0.18);
  transition: transform 0.15s;
}
.mundo-tile:hover { transform: translateY(-5px) scale(1.03); }
.mundo-tile:active { transform: translateY(3px); box-shadow: 0 3px 0 rgba(0,0,0,0.15); }
.w-emoji { font-size: 3.2rem; }
.w-nombre { font-size: 1rem; text-align: center; line-height: 1.15; text-shadow: 0 1px 2px rgba(0,0,0,0.25); }
.w-prog { font-size: 0.8rem; opacity: 0.95; }

.acts-wrap { max-width: 1000px; margin: 0 auto; }
.back-mundo { background: #fff; border: 3px solid #7C3AED; border-radius: 18px; padding: 0.5rem 1rem; font-size: 1rem; font-family: inherit; cursor: pointer; color: #5B21B6; font-weight: 700; box-shadow: 0 4px 0 #5B21B6; }
.mundo-titulo { text-align: center; color: #1E293B; margin: 0.5rem 0 1rem; }
.act-tile {
  border: none; border-radius: 22px; cursor: pointer; font-family: inherit; background: #fff;
  padding: 0.9rem 0.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  min-height: 150px; justify-content: center; box-shadow: 0 6px 0 rgba(0,0,0,0.12), 0 8px 14px rgba(0,0,0,0.15);
  transition: transform 0.15s; border: 4px solid #FDE68A;
}
.act-tile:hover { transform: translateY(-4px) scale(1.03); }
.act-tile.hecho { border-color: #4ADE80; }
.a-num { width: 42px; height: 42px; border-radius: 50%; background: #6B46C1; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
.a-nombre { font-size: 0.85rem; color: #334155; text-align: center; line-height: 1.15; }
.a-estrellas span { filter: grayscale(1); opacity: 0.4; font-size: 0.85rem; }
.a-estrellas span.on { filter: none; opacity: 1; }
</style>
