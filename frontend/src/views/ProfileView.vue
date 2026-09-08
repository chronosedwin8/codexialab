<template>
  <div class="profile-page">
    <header class="profile-header">
      <RouterLink to="/mapa" class="btn-back">← Mapa</RouterLink>
      <h1>Mi Perfil</h1>
    </header>

    <div class="profile-layout">
      <!-- Avatar e info principal -->
      <div class="profile-hero-card">
        <div class="avatar-big">
          <div class="avatar-circle" :style="{ background: avatarColor }">
            <span class="avatar-emoji">{{ bandaEmoji }}</span>
            <span v-if="user?.avatar_config?.sombrero" class="avatar-hat">🎩</span>
          </div>
          <RouterLink to="/tienda" class="edit-avatar-btn">✏️ Editar</RouterLink>
        </div>
        <div class="profile-identity">
          <h2 class="profile-name">{{ user?.nombre }}</h2>
          <span class="banda-badge" :class="user?.banda_edad">
            {{ bandaLabel }}
          </span>
          <p class="profile-email">{{ user?.email }}</p>
        </div>
        <div class="currency-row">
          <div class="currency-stat">
            <span class="cs-icon">🪙</span>
            <span class="cs-value">{{ user?.monedas ?? 0 }}</span>
            <span class="cs-label">Monedas</span>
          </div>
          <div class="currency-stat">
            <span class="cs-icon">💎</span>
            <span class="cs-value">{{ user?.gemas ?? 0 }}</span>
            <span class="cs-label">Gemas</span>
          </div>
          <div class="currency-stat">
            <span class="cs-icon">🔥</span>
            <span class="cs-value">{{ user?.racha_dias ?? 0 }}</span>
            <span class="cs-label">Racha</span>
          </div>
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">⭐</span>
          <span class="stat-value">{{ stats.totalEstrellas }}</span>
          <span class="stat-label">Estrellas totales</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">✅</span>
          <span class="stat-value">{{ stats.nivelesCompletados }}</span>
          <span class="stat-label">Niveles completados</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🧩</span>
          <span class="stat-value">{{ stats.enviosBloques }}</span>
          <span class="stat-label">Con bloques</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">💻</span>
          <span class="stat-value">{{ stats.enviosTexto }}</span>
          <span class="stat-label">Con código</span>
        </div>
      </div>

      <!-- Mi Progreso (estadísticas propias) -->
      <div v-if="mis" class="progreso-section">
        <h3>📊 Mi Progreso</h3>
        <div class="mp-kpis">
          <div class="mp-kpi"><span class="mp-num">{{ mis.resumen.actividades }}</span><span class="mp-lbl">✅ Actividades</span></div>
          <div class="mp-kpi"><span class="mp-num">{{ mis.resumen.estrellas }}</span><span class="mp-lbl">⭐ Estrellas</span></div>
          <div class="mp-kpi"><span class="mp-num">{{ fmtTiempo(mis.resumen.tiempoTotalSeg) }}</span><span class="mp-lbl">⏱️ Tiempo jugado</span></div>
          <div class="mp-kpi"><span class="mp-num">{{ mis.resumen.racha }}</span><span class="mp-lbl">🔥 Racha (días)</span></div>
          <div class="mp-kpi"><span class="mp-num">{{ mis.resumen.materiasIniciadas }}</span><span class="mp-lbl">📚 Materias</span></div>
        </div>

        <!-- Actividad últimos 14 días -->
        <div class="mp-card">
          <h4>📅 Tu actividad (14 días)</h4>
          <svg v-if="maxDia > 0" class="mp-linea" viewBox="0 0 560 120" preserveAspectRatio="none">
            <polyline :points="`0,110 ${lineaPuntos} 560,110`" fill="rgba(255,255,255,.15)" stroke="none" />
            <polyline :points="lineaPuntos" fill="none" stroke="#FDE68A" stroke-width="2.5" stroke-linejoin="round" />
          </svg>
          <p v-else class="mp-empty">Aún no has completado actividades. ¡Empieza en el mapa! 🚀</p>
        </div>

        <!-- Avance por materia -->
        <div class="mp-card" v-if="mis.porMateria.length">
          <h4>📚 Avance por materia</h4>
          <div v-for="m in mis.porMateria" :key="m.categoria" class="mp-mat">
            <span class="mp-mat-nom">{{ nombreMateria(m.categoria) }}</span>
            <div class="mp-bar"><div class="mp-fill" :style="{ width: pctMat(m) + '%' }"></div></div>
            <span class="mp-mat-val">{{ m.completados }}/{{ m.total }}</span>
          </div>
        </div>
      </div>

      <!-- Logros -->
      <div class="achievements-section">
        <h3>🏅 Mis Logros</h3>
        <div v-if="achievements.length === 0" class="empty-achievements">
          <p>¡Aún no has ganado logros! Completa niveles para conseguirlos.</p>
        </div>
        <div v-else class="achievements-grid">
          <div v-for="ua in achievements" :key="ua.id" class="achievement-card" :class="ua.logro.rareza">
            <div class="achievement-icon">🏅</div>
            <div class="achievement-info">
              <p class="achievement-name">{{ ua.logro.nombre }}</p>
              <p class="achievement-desc">{{ ua.logro.descripcion }}</p>
              <p class="achievement-date">{{ formatDate(ua.obtenidoEn) }}</p>
            </div>
            <span class="rarity-badge" :class="ua.logro.rareza">{{ ua.logro.rareza }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { curriculumApi } from '@/api/index';

const authStore = useAuthStore();
const user = computed(() => authStore.user);

const stats = ref({ totalEstrellas: 0, nivelesCompletados: 0, enviosBloques: 0, enviosTexto: 0 });
const achievements = ref<any[]>([]);
const mis = ref<any>(null);

const NOMBRES_MAT: Record<string, string> = { programacion: '🧑‍💻 Programación', programacion_md: '⚙️ Programación MD', programacion_hl: '⌨️ Programación HL', python: '🐍 Python', piensa3d: '🧊 Piensa 3D', logica: '🧠 Lógica', aritmetica: '➕ Aritmética', geometria: '📐 Geometría', informatica: '💻 Informática', seguridad: '🛡️ Seguridad', ia: '🤖 IA', fisica: '🔬 Física', lenguaje: '✍️ Lenguaje', ciencias: '🧪 Ciencias', mate_preescolar: '🔢 Mate Preescolar', lectoescritura: '🔤 Lectoescritura', prog_preescolar: '🐺 Prog. Preescolar', mundos_preescolar: '🪄 Mundos Mágicos' };
function nombreMateria(c: string) { return NOMBRES_MAT[c] ?? c; }
function fmtTiempo(seg: number): string {
  if (!seg) return '0m';
  const h = Math.floor(seg / 3600), m = Math.round((seg % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m` : `${seg}s`);
}
function pctMat(m: any): number { return m.total > 0 ? Math.min(100, Math.round((m.completados / m.total) * 100)) : 0; }
const maxDia = computed(() => Math.max(0, ...((mis.value?.actividadPorDia || []).map((d: any) => d.c))));
const lineaPuntos = computed(() => {
  const dias = mis.value?.actividadPorDia || [];
  const max = Math.max(1, maxDia.value);
  return dias.map((d: any, i: number) => {
    const x = dias.length > 1 ? (i / (dias.length - 1)) * 560 : 280;
    const y = 110 - (d.c / max) * 95;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
});

const bandaColors: Record<string, string> = {
  exploradores: '#22C55E',
  aventureros: '#6B46C1',
  heroes: '#EF4444',
};

const avatarColor = computed(() => {
  const colorMap: Record<string, string> = {
    azul: '#3B82F6', rojo: '#EF4444', verde: '#22C55E',
    dorado: '#EAB308', morado: '#8B5CF6', naranja: '#F97316',
  };
  return colorMap[user.value?.avatar_config?.color ?? 'azul'] ?? '#6B46C1';
});

const bandaEmoji = computed(() => {
  const map = { exploradores: '🌱', aventureros: '⚔️', heroes: '🦸' };
  return map[user.value?.banda_edad ?? 'aventureros'] ?? '🎮';
});

const bandaLabel = computed(() => {
  const map = { exploradores: '🌱 Explorador', aventureros: '⚔️ Aventurero', heroes: '🦸 Héroe' };
  return map[user.value?.banda_edad ?? 'aventureros'] ?? 'Estudiante';
});

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

onMounted(async () => {
  if (!user.value) return;
  try {
    const data = await curriculumApi.getProgress(user.value.id);
    stats.value = data.stats;
    achievements.value = data.logrosRecientes ?? [];
  } catch {}
  try { mis.value = await curriculumApi.getMisEstadisticas(); } catch {}
});
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
  padding-bottom: 2rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: rgba(0,0,0,0.3);
  color: white;
}

.profile-header h1 { font-family: 'Fredoka One', sans-serif; margin: 0; font-size: 1.5rem; }

.profile-layout {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.profile-hero-card {
  background: rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
}

.avatar-big { position: relative; display: inline-block; }

.avatar-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  border: 4px solid rgba(255,255,255,0.3);
  position: relative;
}

.avatar-hat { position: absolute; top: -15px; left: 50%; transform: translateX(-50%); font-size: 2rem; }

.edit-avatar-btn {
  display: block;
  margin-top: 0.5rem;
  text-align: center;
  color: #A78BFA;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.profile-name { color: white; font-size: 1.8rem; margin: 0; font-family: 'Fredoka One', sans-serif; }
.profile-email { color: rgba(255,255,255,0.5); font-size: 0.9rem; margin: 0; }

.banda-badge {
  padding: 0.3rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  color: white;
}

.banda-badge.exploradores { background: #16A34A; }
.banda-badge.aventureros { background: #6B46C1; }
.banda-badge.heroes { background: #DC2626; }

.currency-row { display: flex; gap: 2rem; }

.currency-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.cs-icon { font-size: 1.5rem; }
.cs-value { color: white; font-size: 1.5rem; font-weight: 800; }
.cs-label { color: rgba(255,255,255,0.6); font-size: 0.75rem; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  background: rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
}

.stat-icon { font-size: 2rem; }
.stat-value { color: white; font-size: 1.8rem; font-weight: 800; }
.stat-label { color: rgba(255,255,255,0.6); font-size: 0.75rem; }

.achievements-section h3 { color: white; margin: 0 0 1rem; }

/* Mi Progreso */
.progreso-section { margin-top: 1.5rem; }
.progreso-section h3 { color: white; margin: 0 0 1rem; }
.mp-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: .7rem; margin-bottom: 1rem; }
.mp-kpi { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 14px; padding: .8rem; display: flex; flex-direction: column; gap: .2rem; text-align: center; }
.mp-num { font-size: 1.5rem; font-weight: 800; color: #fff; }
.mp-lbl { font-size: .74rem; color: rgba(255,255,255,.8); }
.mp-card { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); border-radius: 14px; padding: 1rem; margin-bottom: 1rem; }
.mp-card h4 { margin: 0 0 .7rem; color: #fff; font-size: .95rem; }
.mp-linea { width: 100%; height: 120px; display: block; }
.mp-empty { color: rgba(255,255,255,.8); font-size: .9rem; margin: 0; text-align: center; }
.mp-mat { display: grid; grid-template-columns: 150px 1fr auto; align-items: center; gap: .6rem; margin-bottom: .5rem; }
.mp-mat-nom { font-size: .82rem; color: rgba(255,255,255,.92); }
.mp-bar { height: 10px; background: rgba(255,255,255,.18); border-radius: 6px; overflow: hidden; }
.mp-fill { height: 100%; background: linear-gradient(90deg, #FDE68A, #FBBF24); border-radius: 6px; }
.mp-mat-val { font-size: .8rem; font-weight: 700; color: #fff; min-width: 48px; text-align: right; }
@media (max-width: 560px) { .mp-mat { grid-template-columns: 110px 1fr auto; } }

.empty-achievements {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  color: rgba(255,255,255,0.5);
}

.achievements-grid { display: flex; flex-direction: column; gap: 0.75rem; }

.achievement-card {
  background: rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  gap: 1rem;
  align-items: center;
  border-left: 4px solid #6B46C1;
}

.achievement-card.raro { border-left-color: #8B5CF6; }
.achievement-card.epico { border-left-color: #EAB308; }

.achievement-icon { font-size: 2rem; }
.achievement-info { flex: 1; }
.achievement-name { color: white; font-weight: 700; margin: 0; }
.achievement-desc { color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0.2rem 0 0; }
.achievement-date { color: rgba(255,255,255,0.4); font-size: 0.75rem; margin: 0.2rem 0 0; }

.rarity-badge {
  padding: 0.2rem 0.6rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(107,70,193,0.3);
  color: #A78BFA;
}

.rarity-badge.raro { background: rgba(139,92,246,0.3); color: #C4B5FD; }
.rarity-badge.epico { background: rgba(234,179,8,0.3); color: #FCD34D; }

@media (max-width: 600px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .currency-row { gap: 1rem; }
}
</style>
