<template>
  <div class="mapa-mundo">
    <div class="world-grid">
      <div
        v-for="world in worlds"
        :key="world.id"
        :class="['world-node', {
          'locked': world.bloqueado,
          'completed': isWorldCompleted(world),
          'active': selectedWorld?.id === world.id,
          'special': isSpecial(world),
        }]"
        @click="handleWorldClick(world)"
      >
        <!-- Camino al siguiente mundo -->
        <div v-if="world.numeroOrden < worlds.length" class="path-connector">
          <div class="path-line" :class="{ revealed: !worlds[world.numeroOrden]?.bloqueado }"></div>
        </div>

        <div class="world-button" :style="getWorldStyle(world)">
          <div v-if="isSpecial(world)" class="special-badge" :title="specialLabel(world)">{{ specialIcon(world) }}</div>
          <div v-if="world.bloqueado" class="lock-icon">🔒</div>
          <div v-else-if="isWorldCompleted(world)" class="crown-icon">👑</div>
          <div v-else class="world-icon">{{ getWorldIcon(world.icono) }}</div>

          <div class="world-stars">
            <span
              v-for="i in 3"
              :key="i"
              :class="['mini-star', { filled: worldStarCount(world) >= i * Math.ceil(world.totalNiveles) }]"
            >★</span>
          </div>
        </div>

        <div class="world-label">
          <span v-if="isSpecial(world)" class="special-tag">{{ specialIcon(world) }} {{ specialLabel(world) }}</span>
          <span class="world-number">Mundo {{ world.numeroOrden }}</span>
          <span class="world-name">{{ world.nombre }}</span>
          <span class="world-progress">{{ world.estrellasObtenidas }}/{{ world.estrellasTotal }} ⭐</span>
        </div>
      </div>
    </div>

    <!-- Panel lateral de niveles -->
    <Transition name="slide-panel">
      <div v-if="selectedWorld && !selectedWorld.bloqueado" class="levels-panel">
        <div class="levels-panel-header">
          <h3>{{ selectedWorld.nombre }}</h3>
          <button class="close-btn" @click="selectedWorld = null">✕</button>
        </div>

        <div class="levels-list">
          <div
            v-for="level in selectedWorld.niveles"
            :key="level.id"
            :class="['level-item', { completed: level.completado, locked: !isLevelUnlocked(level, selectedWorld) }]"
            @click="selectLevel(level, selectedWorld)"
          >
            <div class="level-number">{{ level.numeroOrden }}</div>
            <div class="level-info">
              <p class="level-name">
                {{ level.nombre }}
                <span v-if="level.juego" class="juego-badge" :title="'Incluye mini-juego: ' + (level.juego ?? '')">{{ juegoEmoji(level.juego) }} Juego</span>
              </p>
              <p class="level-band">{{ level.bandaRecomendada }}</p>
            </div>
            <div class="level-stars">
              <span v-for="i in 3" :key="i" :class="['star', { filled: (level.estrellas ?? 0) >= i }]">★</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { World, WorldLevel } from '@/stores/curriculum';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  worlds: World[];
}>();

const authStore = useAuthStore();
// Docentes/admin pueden abrir cualquier mundo y nivel sin restricción
const accesoLibre = computed(() => authStore.user?.rol === 'docente' || authStore.user?.rol === 'admin');

const emit = defineEmits<{
  'select-level': [levelId: number];
  'select-world': [world: World];
}>();

const selectedWorld = ref<World | null>(null);

const worldIcons: Record<string, string> = {
  tree: '🌳', cave: '🦇', sun: '☀️', wave: '🌊', mountain: '⛰️',
  robot: '🤖', castle: '🏰', star: '🌟', portal: '🌀', trophy: '🏆',
};

const JUEGO_EMOJI: Record<string, string> = {
  sopa: '🔤', ahorcado: '🪢', memoria: '🃏', globos: '🎈', lluvia: '🌧️',
  topo: '🔨', camino: '🕹️', pacman: '🟡', mario: '🍄', rompecabezas: '🧩',
};
function juegoEmoji(tipo?: string | null): string {
  return tipo ? (JUEGO_EMOJI[tipo] ?? '🎮') : '🎮';
}

function getWorldIcon(icono: string | null): string {
  if (!icono) return '🌍';
  // La BD guarda emojis directamente; los nombres-clave antiguos se mapean.
  return worldIcons[icono] ?? icono;
}

// Mundos especiales: Arcade (🎮) y Laboratorio (🔬), normalmente con numeroOrden > 10.
function isSpecial(world: World): boolean {
  const ic = world.icono ?? '';
  return world.numeroOrden > 10 || ic.includes('🎮') || ic.includes('🔬');
}

function specialIcon(world: World): string {
  const ic = world.icono ?? '';
  if (ic.includes('🔬') || /laboratorio/i.test(world.nombre)) return '🔬';
  return '🎮';
}

function specialLabel(world: World): string {
  return specialIcon(world) === '🔬' ? 'Laboratorio' : 'Arcade';
}

function getWorldStyle(world: World): Record<string, string> {
  if (world.bloqueado) {
    return { background: 'linear-gradient(135deg, #374151, #4B5563)', borderColor: '#6B7280' };
  }
  return {
    background: `linear-gradient(135deg, ${world.colorPrimario}, ${world.colorSecundario})`,
    borderColor: world.colorPrimario,
  };
}

function isWorldCompleted(world: World): boolean {
  return world.estrellasObtenidas > 0 && world.niveles.every((n) => n.completado);
}

function worldStarCount(world: World): number {
  return world.niveles.filter((n) => (n.estrellas ?? 0) >= 1).length;
}

function isLevelUnlocked(level: WorldLevel, world: World): boolean {
  if (accesoLibre.value) return true;
  if (level.numeroOrden === 1) return true;
  const prev = world.niveles.find((n) => n.numeroOrden === level.numeroOrden - 1);
  return (prev?.estrellas ?? 0) > 0;
}

function handleWorldClick(world: World) {
  if (world.bloqueado) return;
  selectedWorld.value = selectedWorld.value?.id === world.id ? null : world;
  emit('select-world', world);
}

function selectLevel(level: WorldLevel, world: World) {
  if (!isLevelUnlocked(level, world)) return;
  emit('select-level', level.id);
}
</script>

<style scoped>
.mapa-mundo {
  position: relative;
  padding: 2rem;
  min-height: 400px;
}

.world-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem 3rem;
  justify-content: center;
  align-items: flex-start;
  position: relative;
}

.world-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  position: relative;
}

.world-node.locked { cursor: default; }

.path-connector {
  position: absolute;
  right: -3rem;
  top: 40px;
  width: 3rem;
  z-index: 0;
}

.path-line {
  height: 4px;
  width: 100%;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.path-line.revealed::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  background: linear-gradient(90deg, #FCD34D, #F59E0B);
  border-radius: 2px;
  animation: revealPath 1s ease forwards;
}

@keyframes revealPath {
  from { width: 0; }
  to { width: 100%; }
}

.world-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px solid;
  position: relative;
  transition: all 0.2s;
  z-index: 1;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.world-node:not(.locked) .world-button:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.world-node.active .world-button {
  transform: scale(1.15);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.4), 0 8px 25px rgba(0, 0, 0, 0.4);
}

.lock-icon, .crown-icon, .world-icon { font-size: 2rem; }

/* En desktop los mundos y sus íconos se ven más grandes. */
@media (min-width: 900px) {
  .world-button { width: 112px; height: 112px; }
  .lock-icon, .crown-icon, .world-icon { font-size: 3.1rem; }
  .path-connector { top: 56px; }
}

/* Mundos especiales (Arcade / Laboratorio) */
.world-node.special .world-button {
  border-color: #FCD34D;
  box-shadow: 0 0 0 3px rgba(252, 211, 77, 0.35), 0 4px 15px rgba(0, 0, 0, 0.3);
  animation: specialPulse 2s ease-in-out infinite;
}

@keyframes specialPulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(252, 211, 77, 0.35), 0 4px 15px rgba(0, 0, 0, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(252, 211, 77, 0.5), 0 4px 18px rgba(0, 0, 0, 0.4); }
}

.special-badge {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #FCD34D, #F59E0B);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  z-index: 2;
}

.special-tag {
  font-size: 0.65rem;
  font-weight: 700;
  color: #1e1b4b;
  background: #FCD34D;
  padding: 1px 8px;
  border-radius: 10px;
  margin-bottom: 2px;
}

.world-stars {
  position: absolute;
  bottom: -8px;
  display: flex;
  gap: 1px;
}

.mini-star {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
}

.mini-star.filled { color: #FCD34D; text-shadow: 0 0 4px rgba(252, 211, 77, 0.8); }

.world-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  text-align: center;
}

.world-number { color: rgba(255, 255, 255, 0.5); font-size: 0.7rem; }
.world-name { color: white; font-weight: 700; font-size: 0.85rem; max-width: 100px; line-height: 1.2; }
.world-progress { color: rgba(255, 255, 255, 0.6); font-size: 0.7rem; }

/* Panel lateral de niveles */
.levels-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 320px;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(20px);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.levels-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.levels-panel-header h3 { color: white; margin: 0; font-size: 1.1rem; }

.close-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 6px;
  transition: color 0.2s;
}

.close-btn:hover { color: white; }

.levels-list {
  overflow-y: auto;
  flex: 1;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.level-item:hover:not(.locked) { background: rgba(107, 70, 193, 0.3); border-color: #6B46C1; }
.level-item.completed { border-color: rgba(34, 197, 94, 0.3); }
.level-item.locked { opacity: 0.4; cursor: not-allowed; }

.level-number {
  width: 32px;
  height: 32px;
  background: rgba(107, 70, 193, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.level-info { flex: 1; }
.level-name { color: white; font-weight: 600; font-size: 0.9rem; margin: 0; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }

.juego-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.62rem;
  font-weight: 800;
  color: #1e1b4b;
  background: linear-gradient(135deg, #FCD34D, #FB923C);
  padding: 1px 7px;
  border-radius: 10px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  box-shadow: 0 0 8px rgba(251, 146, 60, 0.5);
  animation: juegoPulse 1.8s ease-in-out infinite;
}

@keyframes juegoPulse {
  0%, 100% { box-shadow: 0 0 6px rgba(251, 146, 60, 0.45); transform: scale(1); }
  50% { box-shadow: 0 0 14px rgba(251, 146, 60, 0.8); transform: scale(1.06); }
}
.level-band { color: rgba(255, 255, 255, 0.5); font-size: 0.75rem; margin: 0; }

.level-stars { display: flex; gap: 2px; }
.star { color: rgba(255, 255, 255, 0.2); font-size: 0.9rem; }
.star.filled { color: #FCD34D; text-shadow: 0 0 4px rgba(252, 211, 77, 0.6); }

.slide-panel-enter-active, .slide-panel-leave-active {
  transition: transform 0.3s ease;
}

.slide-panel-enter-from, .slide-panel-leave-to {
  transform: translateX(100%);
}
</style>
