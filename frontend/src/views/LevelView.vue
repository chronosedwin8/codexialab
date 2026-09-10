<template>
  <div class="level-page">
    <!-- Barra superior -->
    <header class="level-header">
      <RouterLink to="/mapa" class="btn-back">← Mapa</RouterLink>
      <div class="level-info">
        <h2 class="level-name">{{ levelConfig?.nombre ?? 'Cargando...' }}</h2>
        <div class="modality-switch" v-if="!isQuiz && !isNeurona && !isArcade && !isSimulacion && !isLightbot && !isCodigo">
          <button
            v-for="mod in availableModalities"
            :key="mod.id"
            :class="['mod-btn', { active: currentModality === mod.id }]"
            @click="switchModality(mod.id)"
          >
            {{ mod.label }}
          </button>
        </div>
      </div>
      <div class="level-stats">
        <StarRating :stars="bestStars" />
        <div class="currency-mini">🪙 {{ authStore.user?.monedas ?? 0 }}</div>
      </div>
    </header>

    <!-- Actividad tipo QUIZ (lógica, informática, etc.) -->
    <QuizActivity
      v-if="isQuiz && levelConfig"
      :key="activityKey"
      :preguntas="(levelConfig as any).preguntas ?? []"
      :contenido="(levelConfig as any).contenido ?? []"
      :aplicacion="(levelConfig as any).aplicacion ?? null"
      :juego="(levelConfig as any).juego ?? null"
      @complete="onQuizComplete"
    />

    <!-- Actividad tipo LABORATORIO DE NEURONA (IA) -->
    <NeuronaLab
      v-else-if="isNeurona && levelConfig"
      :key="activityKey"
      :config="(levelConfig as any)"
      @complete="onQuizComplete"
    />

    <!-- Actividad tipo JUEGO ARCADE -->
    <ArcadeGame
      v-else-if="isArcade && levelConfig"
      :key="activityKey"
      :config="(levelConfig as any)"
      @complete="onQuizComplete"
    />

    <!-- Actividad tipo SIMULACIÓN INTERACTIVA -->
    <SimulacionActivity
      v-else-if="isSimulacion && levelConfig"
      :key="activityKey"
      :config="(levelConfig as any)"
      @complete="onQuizComplete"
    />

    <!-- Actividad tipo PIENSA EN 3D (Light-Bot) -->
    <LightBotActivity
      v-else-if="isLightbot && levelConfig"
      :key="activityKey"
      :config="(levelConfig as any)"
      @complete="onQuizComplete"
    />

    <!-- Actividad tipo RETO DE CÓDIGO (algoritmos con casos de prueba) -->
    <CodigoRetoActivity
      v-else-if="isCodigo && levelConfig"
      :key="activityKey"
      :config="(levelConfig as any)"
      @complete="onQuizComplete"
    />

    <div class="level-layout" v-else>
      <!-- Panel izquierdo: editor -->
      <div class="editor-panel">
        <!-- v-show en lugar de v-if: el workspace Blockly sobrevive al cambio de pestaña -->
        <EditorBloques
          v-show="currentModality === 'bloques' || currentModality === 'bloques_texto'"
          ref="editorBloquesRef"
          :comandos_disponibles="levelConfig?.bloques_disponibles ?? []"
          :lenguaje="'javascript'"
          :readonly="gameStore.isRunning"
          @code-changed="onBlocksCodeChanged"
        />
        <!-- Monaco: se recrea en cada cambio de pestaña, pero recibe el código persistido -->
        <EditorTexto
          v-if="currentModality === 'texto'"
          :lenguaje="'javascript'"
          :codigo_inicial="textEditorCode"
          :readonly="gameStore.isRunning"
          :comandos_hint="levelConfig?.comandos_permitidos ?? []"
          @code-changed="onTextCodeChanged"
        />
        <!-- Monaco readonly en Mixto: muestra el código que generan los bloques -->
        <EditorTexto
          v-if="currentModality === 'bloques_texto'"
          :lenguaje="'javascript'"
          :codigo_inicial="monacoDisplayCode"
          :readonly="true"
          :comandos_hint="[]"
        />

        <!-- Panel de instrucciones -->
        <div class="instructions-panel">
          <div class="instructions-header">
            <h4>🎯 Objetivo</h4>
            <div class="legend">
              <span class="legend-item"><span class="legend-dot floor"></span> Camino</span>
              <span class="legend-item"><span class="legend-dot wall"></span> Pared</span>
              <span class="legend-item"><span class="legend-dot gold">★</span> Meta</span>
              <span class="legend-item"><span class="legend-dot hero">●</span> Tú</span>
            </div>
          </div>
          <p class="instructions-text">{{ levelConfig?.narracion?.intro ?? 'Lleva al héroe hasta la estrella dorada usando los comandos disponibles.' }}</p>

          <!-- Comandos disponibles en este nivel -->
          <div class="commands-available">
            <span class="commands-label">Comandos:</span>
            <code
              v-for="cmd in levelConfig?.comandos_permitidos ?? []"
              :key="cmd"
              class="cmd-chip"
            >heroe.{{ cmd }}()</code>
          </div>

          <div class="hints-section">
            <button class="btn-hint" :disabled="gameStore.isRunning" @click="showHint">
              💡 Pista {{ hintsUsed > 0 ? `(${hintsUsed}/${levelConfig?.pistas?.length ?? 0})` : '' }}
            </button>
            <p v-if="currentHint" class="hint-text">{{ currentHint }}</p>
          </div>
        </div>

        <!-- Botones de acción -->
        <div class="action-buttons">
          <button
            class="btn-run"
            :disabled="gameStore.isRunning || !currentCode.trim()"
            :title="!currentCode.trim() ? 'Coloca bloques o escribe código primero' : ''"
            @click="executeCode"
          >
            <span v-if="gameStore.isRunning" class="running-indicator">⏳ Ejecutando...</span>
            <span v-else-if="!currentCode.trim()">🧩 Añade instrucciones</span>
            <span v-else>▶ Ejecutar</span>
          </button>
          <button class="btn-reset" :disabled="gameStore.isRunning" @click="resetLevel">
            🔄 Reset
          </button>
        </div>

        <!-- Mensaje de error -->
        <div v-if="executionError" class="error-panel">
          <p>❌ {{ executionError }}</p>
          <small v-if="errorLine">Línea {{ errorLine }}</small>
        </div>
      </div>

      <!-- Panel derecho: juego -->
      <div class="game-panel">
        <GameCanvas
          ref="gameCanvas"
          :levelConfig="levelConfig"
          @level-complete="onLevelComplete"
        />
      </div>
    </div>

    <!-- Mascota guía -->
    <MascotaGuia :mensaje="mascotaMessage" :tipo="mascotaTipo" />

    <!-- Logros desbloqueados (con items gratis) -->
    <div v-if="nuevosLogros.length" class="logros-overlay" @click.self="nuevosLogros = []">
      <div class="logros-modal">
        <h2>🏆 ¡Logro{{ nuevosLogros.length > 1 ? 's' : '' }} desbloqueado{{ nuevosLogros.length > 1 ? 's' : '' }}!</h2>
        <div v-for="lg in nuevosLogros" :key="lg.id" :class="['logro-card', lg.rareza]">
          <div class="logro-icono">{{ lg.icono }}</div>
          <div class="logro-info">
            <p class="logro-nombre">{{ lg.nombre }}</p>
            <p class="logro-desc">{{ lg.descripcion }}</p>
            <div class="logro-rec">
              <span v-if="lg.recompensa.monedas">🪙 +{{ lg.recompensa.monedas }}</span>
              <span v-if="lg.recompensa.gemas">💎 +{{ lg.recompensa.gemas }}</span>
              <span v-if="lg.recompensa.item" class="logro-item">🎁 {{ lg.recompensa.item.nombre }} ¡GRATIS!</span>
            </div>
          </div>
        </div>
        <button class="btn-logro" @click="nuevosLogros = []">¡Genial! 🎉</button>
      </div>
    </div>

    <!-- Modal de celebración -->
    <CelebrationModal
      v-if="showCelebration"
      :stars="earnedStars"
      :monedas="earnedCoins"
      :gemas="earnedGems"
      @next-level="goToNextLevel"
      @retry="retryLevel"
      @map="router.push('/mapa')"
      @close="showCelebration = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineAsyncComponent } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useGameStore } from '@/stores/game';
import { useCurriculumStore } from '@/stores/curriculum';
import { useLevelRunner } from '@/composables/useLevelRunner';
import { useAudio } from '@/composables/useAudio';
import type { NivelConfig } from '@/game/types';
import EditorBloques from '@/components/EditorBloques.vue';
import EditorTexto from '@/components/EditorTexto.vue';
import GameCanvas from '@/components/GameCanvas.vue';
import QuizActivity from '@/components/QuizActivity.vue';
import NeuronaLab from '@/components/NeuronaLab.vue';
import ArcadeGame from '@/components/ArcadeGame.vue';
import SimulacionActivity from '@/components/SimulacionActivity.vue';
const LightBotActivity = defineAsyncComponent(() => import('@/components/LightBotActivity.vue'));
const CodigoRetoActivity = defineAsyncComponent(() => import('@/components/CodigoRetoActivity.vue'));
import StarRating from '@/components/StarRating.vue';
import MascotaGuia from '@/components/MascotaGuia.vue';
import CelebrationModal from '@/components/CelebrationModal.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const gameStore = useGameStore();
const curriculumStore = useCurriculumStore();
const levelRunner = useLevelRunner();
const audio = useAudio();

const levelConfig = ref<NivelConfig | null>(null);
const currentModality = ref<'bloques' | 'bloques_texto' | 'texto'>('bloques');
const currentCode = ref('');         // Código que se ejecuta
const blocklyCode = ref('');         // Último código generado por Blockly (persiste entre pestañas)
const textEditorCode = ref('');      // Código escrito manualmente en modo Texto (persiste)
const monacoDisplayCode = ref('');   // Lo que muestra Monaco en modo Mixto (= blocklyCode)
const editorBloquesRef = ref<{ triggerResize: () => void } | null>(null);
const nuevosLogros = ref<any[]>([]);
const activityKey = ref(0); // al incrementar, remonta la actividad (quiz/arcade/neurona/simulación) para reiniciarla
const isQuiz = computed(() => (levelConfig.value as any)?.tipo === 'quiz');
const isNeurona = computed(() => (levelConfig.value as any)?.tipo === 'neurona');
const isArcade = computed(() => (levelConfig.value as any)?.tipo === 'arcade');
const isSimulacion = computed(() => (levelConfig.value as any)?.tipo === 'simulacion');
const isLightbot = computed(() => (levelConfig.value as any)?.tipo === 'lightbot');
const isCodigo = computed(() => (levelConfig.value as any)?.tipo === 'codigo');
const bestStars = ref(0);
const hintsUsed = ref(0);
const currentHint = ref('');
const executionError = ref('');
const errorLine = ref<number | undefined>(undefined);
const showCelebration = ref(false);
const earnedStars = ref(0);
const earnedCoins = ref(0);
const earnedGems = ref(0);
const gameCanvas = ref<InstanceType<typeof GameCanvas> | null>(null);
const mascotaMessage = ref('¡Hola! Soy Codi. Escribe tu código y presiona Ejecutar.');
const mascotaTipo = ref<'normal' | 'pista' | 'celebracion' | 'error'>('normal');

const availableModalities = computed(() => {
  if (!levelConfig.value) return [];
  const all: Array<{ id: 'bloques' | 'bloques_texto' | 'texto'; label: string }> = [
    { id: 'bloques', label: '🧩 Bloques' },
    { id: 'bloques_texto', label: '🔀 Mixto' },
    { id: 'texto', label: '💻 Código' },
  ];
  return all.filter((m) => (levelConfig.value!.modalidades as string[]).includes(m.id));
});

async function loadLevel(levelId: number) {
  // Reiniciar estado entre niveles
  executionError.value = '';
  currentHint.value = '';
  hintsUsed.value = 0;
  showCelebration.value = false;
  blocklyCode.value = '';

  let level;
  try {
    level = await curriculumStore.fetchLevelConfig(levelId);
  } catch {
    // Nivel inexistente o bloqueado → volver al mapa
    router.push('/mapa');
    return;
  }
  levelConfig.value = level.config as NivelConfig;
  bestStars.value = level.estrellasMejor ?? 0;

  // Modalidad preferida del usuario, pero solo si el nivel la permite; si no, la primera disponible.
  // (Evita que niveles solo-texto —p. ej. Programación HL— queden sin editor visible.)
  const permitidas = (levelConfig.value.modalidades as string[]) ?? ['bloques'];
  const pref = (authStore.user?.modalidad_pref ?? 'bloques');
  currentModality.value = (permitidas.includes(pref) ? pref : permitidas[0]) as any;
  const initialCode = levelConfig.value.codigo_inicial?.javascript ?? '';
  textEditorCode.value = initialCode;
  monacoDisplayCode.value = '';
  currentCode.value = currentModality.value === 'texto' ? initialCode : '';

  await gameStore.startSession(levelId, currentModality.value);
  mascotaMessage.value = levelConfig.value.narracion?.intro ?? '¡Usa los comandos para llegar a la salida!';
  mascotaTipo.value = 'normal';

  if (levelConfig.value.narracion?.intro) {
    audio.narrate(levelConfig.value.narracion.intro, levelConfig.value.narracion.url_audio_intro);
  }
}

onMounted(() => loadLevel(parseInt(route.params.levelId as string, 10)));

// Al navegar a /nivel/:id+1 Vue reutiliza el componente: recargar cuando cambia el id
watch(() => route.params.levelId, (newId) => {
  if (newId) loadLevel(parseInt(newId as string, 10));
});

onUnmounted(() => {
  levelRunner.terminate();
});

function switchModality(mod: 'bloques' | 'bloques_texto' | 'texto') {
  currentModality.value = mod;
  if (mod === 'texto') {
    // Al pasar a Texto: usar el código manual guardado
    currentCode.value = textEditorCode.value;
  } else {
    // Al pasar a Bloques o Mixto: usar el código de Blockly
    currentCode.value = blocklyCode.value;
    // Dar tiempo al DOM para mostrar el editor antes de refrescar Blockly
    setTimeout(() => editorBloquesRef.value?.triggerResize(), 50);
  }
}

// Blockly emite código → persiste en blocklyCode, actualiza Monaco en Mixto
function onBlocksCodeChanged(code: string) {
  blocklyCode.value = code;
  monacoDisplayCode.value = code;
  currentCode.value = code;
}

// Monaco en modo Texto emite → persiste en textEditorCode
function onTextCodeChanged(code: string) {
  textEditorCode.value = code;
  currentCode.value = code;
}

async function executeCode() {
  if (!levelConfig.value || gameStore.isRunning) return;

  executionError.value = '';
  errorLine.value = undefined;
  currentHint.value = '';
  gameStore.setRunning(true);
  mascotaMessage.value = '¡Ejecutando tu código! Mira al héroe...';
  mascotaTipo.value = 'normal';

  const result = await levelRunner.runCode(currentCode.value, 'javascript', levelConfig.value);

  // Telemetría: no debe bloquear la animación si el backend falla
  try {
    await gameStore.submitCode(currentCode.value, currentModality.value, result);
  } catch (e) {
    console.warn('No se pudo registrar la telemetría:', e);
  }

  // El héroe siempre anima desde el inicio: reiniciar el renderer antes de reproducir.
  if (gameCanvas.value) gameCanvas.value.resetGame();

  if (!result.ok) {
    executionError.value = result.error?.mensaje ?? 'Error desconocido';
    errorLine.value = result.error?.linea;
    mascotaMessage.value = `¡Ups! Hay un error: ${result.error?.mensaje}`;
    mascotaTipo.value = 'error';
    gameStore.setRunning(false);

    if (result.accionesParciales && result.accionesParciales.length > 0 && gameCanvas.value) {
      await levelRunner.playActions(result.accionesParciales, gameCanvas.value.getRenderer());
    }
    return;
  }

  const acciones = result.acciones ?? [];
  gameStore.setActions(acciones);

  if (gameCanvas.value) {
    await levelRunner.playActions(acciones, gameCanvas.value.getRenderer());
  }

  const objetivosCompletados = levelRunner.checkObjectives(acciones, levelConfig.value);
  const programSize = levelRunner.countProgramSize(currentCode.value);
  const stars = levelRunner.calculateStars(objetivosCompletados, acciones.length, levelConfig.value, programSize);

  if (stars > 0) {
    await finishLevel(stars);
  } else {
    mascotaMessage.value = 'Hmm, el héroe no llegó a la salida. ¡Inténtalo de nuevo!';
    mascotaTipo.value = 'error';
  }

  gameStore.setRunning(false);
}

// Flujo de recompensa/celebración compartido por programación y quiz
async function finishLevel(stars: number) {
  if (!levelConfig.value) return;
  let completion = null;
  try {
    completion = await gameStore.completeLevel(stars);
  } catch (e) {
    console.warn('No se pudo guardar el progreso:', e);
  }
  earnedStars.value = stars;
  earnedCoins.value = completion?.recompensa?.monedas ?? levelConfig.value.recompensa?.monedas ?? 0;
  earnedGems.value = completion?.recompensa?.gemas ?? levelConfig.value.recompensa?.gemas ?? 0;

  if (completion?.recompensa?.monedas) authStore.addCoins(completion.recompensa.monedas);
  if (completion?.recompensa?.gemas) authStore.addGems(completion.recompensa.gemas);

  // Logros nuevos (con items de tienda gratis)
  const logros = (completion as any)?.logrosNuevos ?? [];
  if (logros.length) {
    for (const lg of logros) {
      if (lg.recompensa?.monedas) authStore.addCoins(lg.recompensa.monedas);
      if (lg.recompensa?.gemas) authStore.addGems(lg.recompensa.gemas);
    }
    nuevosLogros.value = logros;
  }

  mascotaMessage.value = levelConfig.value.narracion?.exito ?? '¡Lo lograste! ¡Increíble!';
  mascotaTipo.value = 'celebracion';
  audio.celebrate(levelConfig.value.narracion?.url_audio_exito);
  showCelebration.value = true;
}

// Quiz terminado: si logra al menos 1 estrella, recompensa y celebración
async function onQuizComplete(stars: number) {
  if (stars > 0) {
    await finishLevel(stars);
  } else {
    mascotaMessage.value = '¡Casi! Repasa e inténtalo de nuevo. ¡Tú puedes!';
    mascotaTipo.value = 'error';
  }
}

function resetLevel() {
  executionError.value = '';
  currentHint.value = '';
  gameStore.resetLevel();
  mascotaMessage.value = '¡Vamos a intentarlo de nuevo! Puedes hacerlo.';
  mascotaTipo.value = 'normal';
  if (gameCanvas.value) {
    gameCanvas.value.resetGame();
  }
}

// "Repetir" desde el modal de celebración: cierra el modal, reinicia la actividad
// y abre una sesión nueva para poder volver a completar y ganar recompensas.
async function retryLevel() {
  showCelebration.value = false;
  nuevosLogros.value = [];
  executionError.value = '';
  currentHint.value = '';
  gameStore.resetLevel();
  const levelId = parseInt(route.params.levelId as string, 10);
  try {
    await gameStore.startSession(levelId, currentModality.value);
  } catch (e) {
    console.warn('No se pudo reiniciar la sesión:', e);
  }
  activityKey.value++; // fuerza el remontaje de quiz/arcade/neurona/simulación
  if (gameCanvas.value) gameCanvas.value.resetGame();
  mascotaMessage.value = '¡Vamos a intentarlo de nuevo! Puedes hacerlo.';
  mascotaTipo.value = 'normal';
}

function showHint() {
  if (!levelConfig.value?.pistas) return;
  const pistas = levelConfig.value.pistas;
  if (hintsUsed.value < pistas.length) {
    currentHint.value = pistas[hintsUsed.value].texto;
    mascotaMessage.value = pistas[hintsUsed.value].texto;
    mascotaTipo.value = 'pista';
    // La pista se muestra como texto; no usamos voz robótica del navegador.
    hintsUsed.value++;
  } else {
    currentHint.value = '¡Ya usaste todas las pistas! Revisa el objetivo del nivel.';
  }
}

function onLevelComplete(stars: number) {
  earnedStars.value = stars;
}

function goToNextLevel() {
  showCelebration.value = false;
  const currentId = parseInt(route.params.levelId as string, 10);
  // Avanzar al siguiente nivel; si no existe, loadLevel redirige al mapa
  router.push(`/nivel/${currentId + 1}`);
}
</script>

<style scoped>
.level-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #0F172A;
  overflow: hidden;
}

.level-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #1E293B;
  border-bottom: 1px solid #334155;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.btn-back {
  color: #94A3B8;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  border: 1px solid #334155;
  transition: all 0.2s;
}

.btn-back:hover { background: #334155; color: white; }

.level-info { flex: 1; }
.level-name { color: white; margin: 0; font-size: 1.1rem; font-weight: 700; }

.modality-switch { display: flex; gap: 4px; margin-top: 4px; }

.mod-btn {
  padding: 0.25rem 0.6rem;
  border: 1px solid #334155;
  background: transparent;
  color: #94A3B8;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.mod-btn.active { background: #6B46C1; border-color: #6B46C1; color: white; }

.level-stats { display: flex; align-items: center; gap: 0.75rem; }
.currency-mini { color: #FCD34D; font-weight: 700; font-size: 0.9rem; }

.level-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-panel {
  width: 380px;
  min-width: 300px;
  background: #1E293B;
  border-right: 1px solid #334155;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.game-panel {
  flex: 1;
  background: #0F172A;
  position: relative;
  overflow: hidden;
}

.instructions-panel {
  padding: 0.75rem;
  border-top: 1px solid #334155;
  background: #0F172A;
}

.instructions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.instructions-panel h4 { color: #E2E8F0; margin: 0; font-size: 0.85rem; }

.legend {
  display: flex;
  gap: 0.5rem;
  font-size: 0.7rem;
  color: #64748B;
}

.legend-item { display: flex; align-items: center; gap: 3px; }

.legend-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  font-size: 9px;
}

.legend-dot.floor { background: #1E3A5F; border: 1px solid #2D4A7A; }
.legend-dot.wall { background: #374151; border: 1px solid #4B5563; }
.legend-dot.gold { background: transparent; color: #fbbf24; font-size: 13px; }
.legend-dot.hero { background: transparent; color: #3B82F6; font-size: 13px; }

.instructions-text {
  color: #CBD5E1;
  font-size: 0.85rem;
  margin: 0 0 0.6rem;
  line-height: 1.5;
}

.commands-available {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.6rem;
}

.commands-label {
  font-size: 0.75rem;
  color: #64748B;
  font-weight: 600;
  flex-shrink: 0;
}

.cmd-chip {
  background: #1E3A5F;
  color: #60A5FA;
  border: 1px solid #1D4ED8;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.72rem;
  font-family: 'Courier New', monospace;
  font-weight: 600;
}

.hints-section { margin-top: 0.6rem; }

.btn-hint {
  background: #FCD34D;
  color: #78350F;
  border: none;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}

.btn-hint:disabled { opacity: 0.5; cursor: not-allowed; }

.hint-text {
  margin-top: 0.5rem;
  color: #FCD34D;
  font-size: 0.82rem;
  background: rgba(252, 211, 77, 0.1);
  padding: 0.5rem;
  border-radius: 6px;
  border-left: 3px solid #FCD34D;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid #334155;
}

.btn-run {
  flex: 1;
  padding: 0.75rem;
  background: #16A34A;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-run:hover:not(:disabled) { background: #15803D; transform: translateY(-1px); }
.btn-run:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-reset {
  padding: 0.75rem 1rem;
  background: #374151;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}

.btn-reset:hover:not(:disabled) { background: #4B5563; }
.btn-reset:disabled { opacity: 0.5; cursor: not-allowed; }

.running-indicator { animation: pulse 1s infinite; }

.error-panel {
  margin: 0.5rem 0.75rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #EF4444;
  border-radius: 8px;
  padding: 0.6rem;
  color: #FCA5A5;
  font-size: 0.82rem;
}

.error-panel p { margin: 0; }
.error-panel small { color: #94A3B8; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Overlay de logros desbloqueados */
.logros-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
.logros-modal { background: #1E293B; border: 2px solid #FCD34D; border-radius: 20px; padding: 1.5rem; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 0 40px rgba(252,211,77,0.3); }
.logros-modal h2 { color: #FCD34D; margin: 0 0 1rem; }
.logro-card { display: flex; gap: 0.85rem; align-items: center; background: #0F172A; border: 2px solid #475569; border-radius: 14px; padding: 0.85rem; margin-bottom: 0.6rem; text-align: left; }
.logro-card.raro { border-color: #38BDF8; } .logro-card.epico { border-color: #A78BFA; } .logro-card.legendario { border-color: #FCD34D; box-shadow: 0 0 16px rgba(252,211,77,0.35); }
.logro-icono { font-size: 2.5rem; }
.logro-info { flex: 1; }
.logro-nombre { color: #F1F5F9; font-weight: 800; margin: 0; }
.logro-desc { color: #94A3B8; font-size: 0.82rem; margin: 2px 0 0.4rem; }
.logro-rec { display: flex; flex-wrap: wrap; gap: 0.5rem; font-size: 0.85rem; color: #FCD34D; font-weight: 700; }
.logro-item { color: #4ADE80; }
.btn-logro { background: #FCD34D; color: #78350F; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; font-family: inherit; margin-top: 0.5rem; }
.btn-logro:hover { background: #FBBF24; }

@media (max-width: 768px) {
  .level-layout { flex-direction: column; }
  .editor-panel { width: 100%; height: 40vh; }
}
</style>
