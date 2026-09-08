<template>
  <div class="game-canvas-wrapper">
    <div ref="phaserContainer" class="phaser-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import Phaser from 'phaser';
import { PhaserRenderer } from '@/game/PhaserRenderer';
import type { NivelConfig, Accion } from '@/game/types';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  levelConfig: NivelConfig | null;
  actions?: Accion[];
}>();

const emit = defineEmits<{
  'level-complete': [stars: number];
  'action-error': [accion: Accion];
}>();

const phaserContainer = ref<HTMLElement | null>(null);
const authStore = useAuthStore();

let game: Phaser.Game | null = null;
let renderer: PhaserRenderer | null = null;
let gameScene: Phaser.Scene | null = null;

function getRenderer(): PhaserRenderer {
  return renderer!;
}

defineExpose({ getRenderer, resetGame });

onMounted(() => {
  if (!phaserContainer.value) return;

  const heroColor = authStore.user?.avatar_config?.color ?? 'azul';

  class BootScene extends Phaser.Scene {
    constructor() { super({ key: 'BootScene' }); }

    create() {
      this.scene.start('GameScene');
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    create() {
      gameScene = this;

      // Fondo degradado
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x0F172A, 0x0F172A, 0x1E293B, 0x1E293B, 1);
      bg.fillRect(0, 0, 800, 600);

      // Texto de ayuda cuando no hay nivel
      if (!props.levelConfig) {
        this.add.text(400, 300, '🎮 Cargando nivel...', {
          fontSize: '24px',
          color: '#94A3B8',
          fontFamily: 'Nunito, sans-serif',
        }).setOrigin(0.5);
        return;
      }

      renderer = new PhaserRenderer(this, heroColor);
      renderer.loadLevel(props.levelConfig);

      // Leyenda del juego (esquina inferior)
      this.add.text(10, 480, '● = Tú (círculo)   ★ = META (estrella dorada)   ▪ = Pared', {
        fontSize: '11px',
        color: '#475569',
        fontFamily: 'Nunito, sans-serif',
      });
    }
  }

  game = new Phaser.Game({
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    parent: phaserContainer.value,
    backgroundColor: '#0F172A',
    scene: [BootScene, GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    audio: { disableWebAudio: true },
  });
});

watch(() => props.levelConfig, (newConfig) => {
  if (!newConfig || !game) return;

  if (renderer) {
    // Renderer ya existe: recargar el nivel directamente sin recrear la escena
    renderer.loadLevel(newConfig);
  } else {
    // Renderer aún no existe (levelConfig llegó después de que Phaser inicializó):
    // detener y reiniciar la GameScene para que su create() vea el nuevo levelConfig
    const scene = game.scene.getScene('GameScene');
    if (scene) {
      // Usar el ScenePlugin de la propia escena para reiniciarla
      (scene as any).scene.restart();
    } else {
      game.scene.start('GameScene');
    }
  }
});

function resetGame() {
  if (renderer) {
    renderer.reset();
  }
}

onUnmounted(() => {
  renderer?.destroy();
  renderer = null;
  game?.destroy(true);
  game = null;
  gameScene = null;
});
</script>

<style scoped>
.game-canvas-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0F172A;
  overflow: hidden;
}

.phaser-container {
  width: 100%;
  height: 100%;
}

:deep(canvas) {
  display: block;
  max-width: 100%;
  max-height: 100%;
}
</style>
