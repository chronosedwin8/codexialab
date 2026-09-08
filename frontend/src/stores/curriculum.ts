import { defineStore } from 'pinia';
import { ref } from 'vue';
import { curriculumApi } from '@/api/index';

export interface WorldLevel {
  id: number;
  nombre: string;
  numeroOrden: number;
  bandaRecomendada: string | null;
  estrellas: number;
  completado: boolean;
  modalidadUsada?: string | null;
  juego?: string | null; // tipo de mini-juego si la actividad tiene uno
  audio?: string | null; // url del MP3 de instrucción (preescolar)
}

export interface World {
  id: number;
  nombre: string;
  descripcion: string | null;
  numeroOrden: number;
  icono: string | null;
  colorPrimario: string;
  colorSecundario: string;
  bloqueado: boolean;
  totalNiveles: number;
  estrellasObtenidas: number;
  estrellasTotal: number;
  niveles: WorldLevel[];
}

export const useCurriculumStore = defineStore('curriculum', () => {
  const worlds = ref<World[]>([]);
  const currentWorld = ref<World | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const categoriaActual = ref('programacion');

  async function fetchWorlds(categoria = categoriaActual.value) {
    isLoading.value = true;
    error.value = null;
    categoriaActual.value = categoria;
    try {
      const data = await curriculumApi.getWorlds(categoria);
      worlds.value = data.worlds;
    } catch (e: any) {
      error.value = e.message ?? 'Error cargando mundos';
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchWorldLevels(worldId: number) {
    isLoading.value = true;
    try {
      const data = await curriculumApi.getWorldLevels(worldId);
      currentWorld.value = { ...data.world, niveles: data.levels };
      return data;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchLevelConfig(levelId: number) {
    const data = await curriculumApi.getLevel(levelId);
    return data.level;
  }

  function selectWorld(world: World) {
    currentWorld.value = world;
  }

  return {
    worlds,
    currentWorld,
    isLoading,
    error,
    categoriaActual,
    fetchWorlds,
    fetchWorldLevels,
    fetchLevelConfig,
    selectWorld,
  };
});
