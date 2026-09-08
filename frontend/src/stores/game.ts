import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { NivelConfig, Accion } from '@/game/types';
import { sessionsApi, submissionsApi } from '@/api/index';

export const useGameStore = defineStore('game', () => {
  const currentLevel = ref<NivelConfig | null>(null);
  const currentSessionId = ref<number | null>(null);
  const actions = ref<Accion[]>([]);
  const isRunning = ref(false);
  const stars = ref(0);
  const lastResult = ref<{ ok: boolean; error?: string } | null>(null);

  async function loadLevel(config: NivelConfig) {
    currentLevel.value = config;
    stars.value = 0;
    actions.value = [];
    lastResult.value = null;
  }

  async function startSession(levelId: number, modalidad: string) {
    const data = await sessionsApi.start(levelId, modalidad);
    currentSessionId.value = data.session.id;
    return data.session;
  }

  async function submitCode(
    codigo: string,
    lenguaje: string,
    resultado: object
  ) {
    if (!currentSessionId.value || !currentLevel.value) return;

    await submissionsApi.create({
      sesion_id: currentSessionId.value,
      nivel_id: currentLevel.value.id as number,
      codigo,
      origen: lenguaje as 'bloques' | 'bloques_texto' | 'texto',
      resultado,
    });
  }

  async function completeLevel(estrellas: number) {
    if (!currentSessionId.value) return null;

    const data = await sessionsApi.complete(currentSessionId.value, {
      estrellas,
      acciones_ejecutadas: actions.value.length,
    });

    stars.value = estrellas;
    currentSessionId.value = null;
    return data;
  }

  function setActions(newActions: Accion[]) {
    actions.value = newActions;
  }

  function setRunning(val: boolean) {
    isRunning.value = val;
  }

  function resetLevel() {
    actions.value = [];
    isRunning.value = false;
    lastResult.value = null;
    stars.value = 0;
  }

  return {
    currentLevel,
    currentSessionId,
    actions,
    isRunning,
    stars,
    lastResult,
    loadLevel,
    startSession,
    submitCode,
    completeLevel,
    setActions,
    setRunning,
    resetLevel,
  };
});
