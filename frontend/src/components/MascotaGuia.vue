<template>
  <div class="mascota-wrapper" :class="tipo">
    <Transition name="bubble">
      <div v-if="mensaje" class="bubble">
        <p>{{ mensaje }}</p>
      </div>
    </Transition>

    <div class="mascota-sprite" :class="[tipo, { talking: isTalking }]" @click="toggleMessage">
      <div class="mascota-body">
        <div class="mascota-face">
          <div class="eyes">
            <div class="eye left"></div>
            <div class="eye right"></div>
          </div>
          <div class="mouth" :class="{ open: isTalking }"></div>
        </div>
        <div class="mascota-antenna"></div>
        <div class="mascota-arms">
          <div class="arm left"></div>
          <div class="arm right"></div>
        </div>
      </div>
      <div class="mascota-label">Astro</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  mensaje: string;
  tipo?: 'normal' | 'pista' | 'celebracion' | 'error';
}>();

const isTalking = ref(false);
let talkTimer: ReturnType<typeof setTimeout> | null = null;

watch(() => props.mensaje, () => {
  isTalking.value = true;
  if (talkTimer) clearTimeout(talkTimer);
  talkTimer = setTimeout(() => { isTalking.value = false; }, 3000);
});

function toggleMessage() {
  isTalking.value = !isTalking.value;
}
</script>

<style scoped>
.mascota-wrapper {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
  z-index: 40;
  pointer-events: none;
}

.mascota-wrapper > * { pointer-events: auto; }

.bubble {
  max-width: 220px;
  background: white;
  border-radius: 16px 16px 4px 16px;
  padding: 0.75rem 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  position: relative;
}

.bubble p {
  margin: 0;
  font-size: 0.85rem;
  color: #374151;
  line-height: 1.4;
}

.mascota-wrapper.pista .bubble { background: #FFFBEB; border: 2px solid #FCD34D; }
.mascota-wrapper.celebracion .bubble { background: #F0FFF4; border: 2px solid #86EFAC; }
.mascota-wrapper.error .bubble { background: #FEF2F2; border: 2px solid #FCA5A5; }

.bubble-enter-active, .bubble-leave-active { transition: all 0.3s ease; }
.bubble-enter-from { opacity: 0; transform: translateY(10px) scale(0.9); }
.bubble-leave-to { opacity: 0; transform: translateY(-10px) scale(0.9); }

.mascota-sprite {
  cursor: pointer;
  animation: mascotaFloat 3s ease-in-out infinite;
  position: relative;
}

@keyframes mascotaFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.mascota-sprite.celebracion {
  animation: mascotaCelebrate 0.5s ease-in-out infinite alternate;
}

@keyframes mascotaCelebrate {
  from { transform: translateY(0) rotate(-5deg); }
  to { transform: translateY(-12px) rotate(5deg); }
}

.mascota-body {
  width: 60px;
  height: 70px;
  background: linear-gradient(135deg, #6B46C1, #8B5CF6);
  border-radius: 16px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(107, 70, 193, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.mascota-wrapper.celebracion .mascota-body { background: linear-gradient(135deg, #16A34A, #22C55E); }
.mascota-wrapper.error .mascota-body { background: linear-gradient(135deg, #DC2626, #EF4444); }
.mascota-wrapper.pista .mascota-body { background: linear-gradient(135deg, #D97706, #FBBF24); }

.mascota-antenna {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 12px;
  background: #A78BFA;
  border-radius: 2px;
}

.mascota-antenna::after {
  content: '';
  position: absolute;
  top: -5px;
  left: -3px;
  width: 10px;
  height: 10px;
  background: #FCD34D;
  border-radius: 50%;
  animation: antennaBlink 2s infinite;
}

@keyframes antennaBlink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}

.mascota-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.eyes { display: flex; gap: 10px; }

.eye {
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
  position: relative;
  animation: eyeBlink 4s infinite;
}

.eye::after {
  content: '';
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 5px;
  height: 5px;
  background: #1E293B;
  border-radius: 50%;
}

@keyframes eyeBlink {
  0%, 90%, 100% { transform: scaleY(1); }
  95% { transform: scaleY(0.1); }
}

.mouth {
  width: 18px;
  height: 8px;
  border-bottom: 3px solid white;
  border-radius: 0 0 10px 10px;
  transition: all 0.2s;
}

.mouth.open {
  height: 10px;
  border-radius: 0 0 12px 12px;
  animation: talking 0.2s ease-in-out infinite alternate;
}

@keyframes talking {
  from { height: 6px; }
  to { height: 10px; }
}

.mascota-arms { display: flex; justify-content: space-between; width: 70px; position: absolute; top: 50%; transform: translateY(-50%); }

.arm {
  width: 8px;
  height: 20px;
  background: #7C3AED;
  border-radius: 4px;
}

.arm.left { transform: rotate(-20deg); margin-left: -4px; }
.arm.right { transform: rotate(20deg); margin-right: -4px; }

.talking .arm.left { animation: armWave 0.3s ease-in-out infinite alternate; }
.talking .arm.right { animation: armWave 0.3s ease-in-out infinite alternate reverse; }

@keyframes armWave {
  from { transform: rotate(-20deg); }
  to { transform: rotate(-40deg); }
}

.mascota-label {
  text-align: center;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.7rem;
  font-weight: 700;
  margin-top: 2px;
}
</style>
