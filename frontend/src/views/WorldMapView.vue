<template>
  <div class="worldmap-page">
    <!-- Header -->
    <header class="map-header">
      <div class="header-left">
        <RouterLink to="/perfil" class="avatar-link">
          <AvatarConfig v-if="user" :avatar="user.avatar_config" :mini="true" />
          <span class="user-name">{{ user?.nombre }}</span>
        </RouterLink>
      </div>

      <div class="header-center">
        <h1 class="page-title">🗺️ Mapa del Mundo</h1>
      </div>

      <div class="header-right">
        <div class="currency-badge">
          <span class="currency-icon">🪙</span>
          <span class="currency-value">{{ user?.monedas ?? 0 }}</span>
        </div>
        <div class="currency-badge gem">
          <span class="currency-icon">💎</span>
          <span class="currency-value">{{ user?.gemas ?? 0 }}</span>
        </div>
        <RouterLink to="/juegos" class="btn-secondary btn-sm">🎮 Juegos</RouterLink>
        <RouterLink to="/tienda" class="btn-secondary btn-sm">Tienda</RouterLink>
        <RouterLink v-if="user?.rol === 'docente' || user?.rol === 'admin'" to="/docente" class="btn-secondary btn-sm">
          Panel Docente
        </RouterLink>
        <button class="btn-danger btn-sm" @click="handleLogout">Salir</button>
      </div>
    </header>

    <!-- Selector de materias agrupado en mega-categorías -->
    <div class="materias-bar">
      <div v-for="mega in MEGA_CATEGORIAS" :key="mega.id" class="mega-group">
        <span class="mega-label" :style="{ color: mega.color }">{{ mega.icono }} {{ mega.nombre }}</span>
        <div class="mega-chips">
          <button
            v-for="mat in materiasDe(mega.id)"
            :key="mat.id"
            :class="['materia-chip', { active: materiaActual === mat.id, disabled: !materiaTieneContenido(mat.id) }]"
            :style="materiaActual === mat.id ? { background: mat.color, borderColor: mat.color } : {}"
            @click="seleccionarMateria(mat.id)"
          >
            <span class="materia-icono">{{ mat.icono }}</span>
            <span class="materia-nombre">{{ mat.nombre }}</span>
            <span v-if="!materiaTieneContenido(mat.id)" class="materia-pronto">Próximamente</span>
            <span v-else class="materia-count">{{ contenidoPorMateria[mat.id] }} mundos</span>
          </button>
        </div>
      </div>
    </div>

    <div class="map-layout">
      <!-- Mapa principal -->
      <main class="map-main">
        <div v-if="curriculumStore.isLoading" class="loading-state">
          <div class="spinner"></div>
          <p>Cargando mundos...</p>
        </div>
        <div v-else-if="!materiaTieneContenido(materiaActual)" class="empty-materia">
          <div class="empty-icon">{{ materiaInfo?.icono }}</div>
          <h2>{{ materiaInfo?.nombre }}</h2>
          <p>{{ materiaInfo?.descripcion }}</p>
          <p class="pronto-text">🚧 Esta materia estará disponible muy pronto. ¡Sigue aprendiendo en las materias activas!</p>
        </div>
        <MapaMundo
          v-else
          :worlds="curriculumStore.worlds"
          @select-level="navigateToLevel"
          @select-world="handleWorldSelect"
        />
      </main>

      <!-- Sidebar -->
      <aside class="map-sidebar" :class="{ colapsada: !sidebarAbierta }">
        <button class="sidebar-toggle" @click="sidebarAbierta = !sidebarAbierta">
          {{ sidebarAbierta ? '✕ Ocultar panel' : '📊 Mi panel' }}
        </button>

        <template v-if="sidebarAbierta">
          <!-- Mi Progreso (global, compacto) -->
          <div class="sidebar-card">
            <h3>📊 Mi Progreso</h3>
            <div class="prog-chips">
              <div class="chip"><span class="chip-n">{{ totalStars }}</span><span class="chip-l">⭐ Estrellas</span></div>
              <div class="chip"><span class="chip-n">{{ completedLevels }}</span><span class="chip-l">✅ Niveles</span></div>
              <div class="chip"><span class="chip-n">{{ user?.racha_dias ?? 0 }}</span><span class="chip-l">🔥 Racha</span></div>
            </div>
          </div>

          <!-- Mis Tareas -->
          <div v-if="user?.rol === 'estudiante'" class="sidebar-card asignaciones-card">
            <h3>📋 Mis Tareas <span v-if="misAsignaciones.length" class="badge">{{ misAsignaciones.length }}</span></h3>
            <p v-if="misAsignaciones.length === 0" class="empty-mini">Sin tareas asignadas. ¡Explora libremente! 🚀</p>
            <div v-else class="asignaciones-list">
              <button v-for="t in misAsignaciones" :key="t.id" class="asignacion-item" @click="irAAsignacion(t)">
                <span class="asignacion-titulo">{{ t.titulo || t.mundoNombre || t.nivelNombre }}</span>
                <span class="asignacion-meta">{{ t.nivelNombre ? `Nivel: ${t.nivelNombre}` : `Mundo: ${t.mundoNombre}` }}<span v-if="t.fechaLimite"> · 📅 {{ formatFecha(t.fechaLimite) }}</span> →</span>
              </button>
            </div>
          </div>

          <!-- Mis Logros (con el motivo de cada medalla) -->
          <div class="sidebar-card">
            <h3>🏆 Mis Logros <span v-if="recentAchievements.length" class="badge">{{ recentAchievements.length }}</span></h3>
            <p v-if="recentAchievements.length === 0" class="empty-mini">Aún no tienes medallas. ¡Completa niveles para ganarlas! 🏅</p>
            <ul v-else class="logros-list">
              <li v-for="l in recentAchievements" :key="l.id" class="logro-item" :class="l.logro?.rareza || 'comun'" :title="l.logro?.descripcion">
                <span class="logro-ic">{{ l.logro?.icono || '🏅' }}</span>
                <div class="logro-txt">
                  <span class="logro-nom">{{ l.logro?.nombre || 'Logro' }}</span>
                  <span class="logro-desc">{{ l.logro?.descripcion || 'Logro desbloqueado' }}</span>
                </div>
                <span class="logro-fecha">{{ formatFecha(l.obtenidoEn) }}</span>
              </li>
            </ul>
          </div>
        </template>
      </aside>
    </div>

    <!-- Historia narrada de entrada del mundo (se ve una vez) -->
    <Cinematica
      v-if="cineVisible"
      :beats="cineBeats"
      :color="cineColor"
      :recordar-como="cineClave"
      @terminada="onHistoriaTerminada"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useCurriculumStore } from '@/stores/curriculum';
import MapaMundo from '@/components/MapaMundo.vue';
import Cinematica from '@/components/Cinematica.vue';
import { historiaMundo, type BeatHistoria } from '@/data/historias';
import { yaSeVio, claveEntrada } from '@/composables/cinematicas';

// Estado de la cinemática de entrada de mundo.
const cineVisible = ref(false);
const cineBeats = ref<readonly BeatHistoria[]>([]);
const cineColor = ref('#7C3AED');
const cineClave = ref<string | null>(null);
const cinePendiente = ref<number | null>(null);
import AvatarConfig from '@/components/AvatarConfig.vue';
import { curriculumApi, teacherApi } from '@/api/index';
import { MATERIAS, MEGA_CATEGORIAS } from '@/data/materias';

// Materias (objetos completos) de una mega-categoría, en su orden.
function materiasDe(megaId: string) {
  const mega = MEGA_CATEGORIAS.find((m) => m.id === megaId);
  if (!mega) return [];
  return mega.materias
    .map((id) => MATERIAS.find((mat) => mat.id === id))
    .filter((m): m is (typeof MATERIAS)[number] => !!m);
}

const router = useRouter();
const authStore = useAuthStore();
const curriculumStore = useCurriculumStore();

const user = computed(() => authStore.user);
const recentAchievements = ref<any[]>([]);
const misAsignaciones = ref<any[]>([]);
const progressStats = ref<{ totalEstrellas: number; nivelesCompletados: number }>({ totalEstrellas: 0, nivelesCompletados: 0 });
const sidebarAbierta = ref(true);

function formatFecha(d: string): string {
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

async function irAAsignacion(t: any) {
  if (t.nivelId) {
    router.push(`/nivel/${t.nivelId}`);
    return;
  }
  if (t.mundoId) {
    // Abrir el primer nivel del mundo asignado
    try {
      const data = await curriculumApi.getWorldLevels(t.mundoId);
      const first = data.levels?.[0];
      if (first) router.push(`/nivel/${first.id}`);
    } catch { /* noop */ }
  }
}

// Multi-materia
const materiaActual = ref('programacion');
const contenidoPorMateria = ref<Record<string, number>>({});
const materiaInfo = computed(() => MATERIAS.find((m) => m.id === materiaActual.value));
function materiaTieneContenido(id: string): boolean {
  return (contenidoPorMateria.value[id] ?? 0) > 0;
}
async function seleccionarMateria(id: string) {
  if (id === materiaActual.value) return;
  materiaActual.value = id;
  if (materiaTieneContenido(id)) {
    await curriculumStore.fetchWorlds(id);
  } else {
    curriculumStore.worlds.length = 0;
  }
}

// Progreso GLOBAL (todas las materias), no solo la materia abierta.
const totalStars = computed(() => progressStats.value.totalEstrellas);
const completedLevels = computed(() => progressStats.value.nivelesCompletados);

onMounted(async () => {
  // Cargar conteo de materias para el selector
  try {
    const data = await curriculumApi.getCategorias();
    const map: Record<string, number> = {};
    for (const c of data.categorias) map[c.categoria] = c.mundos;
    contenidoPorMateria.value = map;
  } catch { /* silencioso */ }

  await curriculumStore.fetchWorlds(materiaActual.value);

  if (user.value) {
    try {
      const data = await curriculumApi.getProgress(user.value.id);
      recentAchievements.value = data.logrosRecientes?.slice(0, 5) ?? [];
      if (data.stats) progressStats.value = { totalEstrellas: data.stats.totalEstrellas ?? 0, nivelesCompletados: data.stats.nivelesCompletados ?? 0 };
    } catch {
      // silencioso
    }
    if (user.value.rol === 'estudiante') {
      try {
        const data = await teacherApi.getMyAssignments();
        misAsignaciones.value = data.assignments ?? [];
      } catch { /* silencioso */ }
    }
  }
});

function navigateToLevel(levelId: number) {
  // Al ENTRAR a un mundo por primera vez, se cuenta su historia narrada (una vez).
  const world = curriculumStore.worlds.find((w: any) => (w.niveles ?? []).some((n: any) => n.id === levelId));
  if (world && !yaSeVio(claveEntrada(world.id))) {
    const h = historiaMundo(world);
    if (h.beats.length) {
      cineBeats.value = h.beats as any;
      cineColor.value = h.color;
      cineClave.value = claveEntrada(world.id);
      cinePendiente.value = levelId;
      cineVisible.value = true;
      return;
    }
  }
  router.push(`/nivel/${levelId}`);
}

function onHistoriaTerminada() {
  cineVisible.value = false;
  const destino = cinePendiente.value;
  cinePendiente.value = null;
  if (destino != null) router.push(`/nivel/${destino}`);
}

function handleWorldSelect(world: any) {
  curriculumStore.selectWorld(world);
}

function handleLogout() {
  authStore.logout();
  router.push('/');
}
</script>

<style scoped>
.worldmap-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%);
  display: flex;
  flex-direction: column;
}

.map-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-wrap: wrap;
  gap: 0.5rem;
}

.header-left { display: flex; align-items: center; }
.avatar-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: white;
}

.user-name { font-weight: 700; font-size: 1rem; }

.page-title {
  font-family: 'Fredoka One', sans-serif;
  font-size: 1.5rem;
  color: white;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.currency-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  background: rgba(255, 255, 255, 0.15);
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  color: white;
  font-weight: 700;
}

.currency-badge.gem { background: rgba(139, 92, 246, 0.4); }
.currency-icon { font-size: 1.1rem; }
.currency-value { font-size: 1rem; }

.materias-bar {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.6rem 1rem;
  background: #1E293B;
  border-bottom: 1px solid #334155;
  overflow-x: auto;
  flex-shrink: 0;
}
.mega-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-right: 0.75rem;
  border-right: 1px solid #334155;
  flex-shrink: 0;
}
.mega-group:last-child { border-right: none; padding-right: 0; }
.mega-label {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  white-space: nowrap;
  padding-left: 0.15rem;
}
.mega-chips { display: flex; gap: 0.5rem; }
.materia-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 92px;
  padding: 0.5rem 0.7rem;
  background: #0F172A;
  border: 1px solid #334155;
  border-radius: 12px;
  color: #CBD5E1;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.materia-chip:hover { border-color: #64748B; transform: translateY(-1px); }
.materia-chip.active { color: white; }
.materia-chip.disabled { opacity: 0.55; }
.materia-icono { font-size: 1.4rem; }
.materia-nombre { font-size: 0.72rem; font-weight: 700; text-align: center; line-height: 1.1; }
.materia-count { font-size: 0.62rem; opacity: 0.8; }
.materia-pronto { font-size: 0.58rem; background: #475569; color: #E2E8F0; padding: 1px 5px; border-radius: 6px; }

.empty-materia {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; height: 100%; color: #94A3B8; padding: 2rem; gap: 0.5rem;
}
.empty-materia .empty-icon { font-size: 4rem; }
.empty-materia h2 { color: #E2E8F0; margin: 0; }
.empty-materia .pronto-text { color: #FCD34D; margin-top: 1rem; max-width: 420px; }

.asignaciones-card { border: 1px solid #0EA5E9; }
.asignaciones-list { display: flex; flex-direction: column; gap: 0.5rem; }
.asignacion-item {
  display: flex; flex-direction: column; gap: 2px; align-items: flex-start;
  background: rgba(14, 165, 233, 0.12); border: 1px solid #0EA5E9; border-radius: 10px;
  padding: 0.55rem 0.7rem; cursor: pointer; text-align: left; width: 100%; font-family: inherit;
  transition: background 0.15s;
}
.asignacion-item:hover { background: rgba(14, 165, 233, 0.25); }
.asignacion-top { display: flex; justify-content: space-between; width: 100%; gap: 0.4rem; }
.asignacion-titulo { color: #E0F2FE; font-weight: 700; font-size: 0.85rem; }
.asignacion-fecha { color: #FCD34D; font-size: 0.7rem; white-space: nowrap; }
.asignacion-meta { color: #94A3B8; font-size: 0.72rem; }

.map-layout {
  display: flex;
  flex: 1;
  gap: 1rem;
  padding: 1rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.map-main {
  flex: 1;
  min-height: 500px;
}

.map-sidebar {
  width: 250px;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  flex-shrink: 0;
}
.sidebar-toggle {
  display: none; width: 100%; padding: 0.6rem; border: none; border-radius: 12px;
  background: rgba(255,255,255,0.14); color: #fff; font-weight: 700; cursor: pointer; font-family: inherit;
}

.sidebar-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  padding: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.sidebar-card h3 {
  color: white;
  margin: 0 0 0.6rem;
  font-size: 0.92rem;
  display: flex; align-items: center; gap: 0.4rem;
}
.badge { background: #6366f1; color: #fff; font-size: 0.7rem; border-radius: 999px; padding: 0 0.45rem; line-height: 1.5; }
.empty-mini { color: rgba(255,255,255,0.6); font-size: 0.8rem; margin: 0; line-height: 1.35; }

/* Mi Progreso: 3 fichas en fila */
.prog-chips { display: flex; gap: 0.4rem; }
.chip { flex: 1; background: rgba(255,255,255,0.08); border-radius: 10px; padding: 0.5rem 0.2rem; text-align: center; display: flex; flex-direction: column; gap: 2px; }
.chip-n { color: #fff; font-size: 1.25rem; font-weight: 800; line-height: 1; }
.chip-l { color: rgba(255,255,255,0.7); font-size: 0.62rem; }

/* Logros: medalla + nombre (qué) + descripción (por qué) + fecha */
.logros-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.logro-item {
  display: grid; grid-template-columns: auto 1fr auto; gap: 0.5rem; align-items: center;
  background: rgba(255,255,255,0.06); border-radius: 10px; padding: 0.4rem 0.55rem;
  border-left: 3px solid #94a3b8;
}
.logro-item.raro { border-left-color: #38bdf8; }
.logro-item.epico { border-left-color: #a78bfa; }
.logro-item.legendario { border-left-color: #fbbf24; }
.logro-ic { font-size: 1.35rem; }
.logro-txt { display: flex; flex-direction: column; min-width: 0; }
.logro-nom { color: #fff; font-weight: 700; font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.logro-desc { color: rgba(255,255,255,0.65); font-size: 0.7rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.logro-fecha { color: rgba(255,255,255,0.45); font-size: 0.62rem; white-space: nowrap; }

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: white;
  gap: 1rem;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .map-layout { flex-direction: column; }
  .map-sidebar { width: 100%; }
  .sidebar-toggle { display: block; }
  .header-center { display: none; }
}
</style>
