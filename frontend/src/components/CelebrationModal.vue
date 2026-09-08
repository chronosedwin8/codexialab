<template>
  <Teleport to="body">
    <div class="celebration-overlay" @click.self="$emit('close')">
      <div class="celebration-modal">
        <!-- Confeti -->
        <div class="confetti-container">
          <div v-for="i in 30" :key="i" class="confetti-piece" :style="getConfettiStyle(i)"></div>
        </div>

        <div class="modal-content">
          <div class="success-icon">🎉</div>
          <h2 class="success-title">¡Lo lograste!</h2>

          <!-- Estrellas animadas -->
          <div class="stars-container">
            <div
              v-for="i in 3"
              :key="i"
              :class="['celebration-star', { earned: stars >= i }]"
              :style="{ animationDelay: `${(i - 1) * 0.3}s` }"
            >★</div>
          </div>

          <!-- Recompensas -->
          <div class="rewards">
            <div v-if="monedas > 0" class="reward-item coins">
              <span class="reward-icon">🪙</span>
              <span class="reward-value">+{{ monedas }}</span>
              <span class="reward-label">monedas</span>
            </div>
            <div v-if="gemas > 0" class="reward-item gems">
              <span class="reward-icon">💎</span>
              <span class="reward-value">+{{ gemas }}</span>
              <span class="reward-label">gemas</span>
            </div>
          </div>

          <p class="stars-message">{{ starsMessage }}</p>

          <!-- Botones -->
          <div class="action-buttons">
            <button class="btn-action next" @click="$emit('next-level')">
              Siguiente nivel →
            </button>
            <button class="btn-action retry" @click="$emit('retry')">
              🔄 Repetir
            </button>
            <button class="btn-action map" @click="$emit('map')">
              🗺️ Mapa
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  stars: number;
  monedas: number;
  gemas: number;
}>();

defineEmits<{
  'next-level': [];
  retry: [];
  map: [];
  close: [];
}>();

const starsMessage = computed(() => {
  if (props.stars === 3) return '¡Perfecto! Eres un genio del código. ✨';
  if (props.stars === 2) return '¡Muy bien! Puedes intentar conseguir 3 estrellas.';
  return '¡Lo lograste! Sigue practicando para mejorar.';
});

function getConfettiStyle(i: number): Record<string, string> {
  const colors = ['#6B46C1', '#22C55E', '#EAB308', '#EF4444', '#3B82F6', '#EC4899', '#F97316'];
  const delay = (Math.random() * 2).toFixed(2);
  const duration = (2 + Math.random() * 2).toFixed(2);
  const left = (Math.random() * 100).toFixed(0);
  const color = colors[i % colors.length];
  return {
    '--delay': `${delay}s`,
    '--duration': `${duration}s`,
    '--left': `${left}%`,
    '--color': color,
  };
}
</script>

<style scoped>
.celebration-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.celebration-modal {
  position: relative;
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-radius: 28px;
  padding: 2.5rem;
  max-width: 440px;
  width: 90%;
  border: 2px solid rgba(139, 92, 246, 0.4);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 92, 246, 0.2);
  overflow: hidden;
  animation: modalPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from { transform: scale(0.5) translateY(50px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  width: 8px;
  height: 12px;
  background: var(--color);
  border-radius: 2px;
  top: -20px;
  left: var(--left);
  animation: confettiFall var(--duration) ease-in var(--delay) infinite;
  opacity: 0.8;
}

@keyframes confettiFall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(600px) rotate(720deg); opacity: 0; }
}

.modal-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.25rem;
  text-align: center;
}

.success-icon { font-size: 3.5rem; animation: bounceIcon 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both; }

@keyframes bounceIcon {
  from { transform: scale(0) rotate(-20deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}

.success-title {
  font-family: 'Fredoka One', sans-serif;
  font-size: 2.5rem;
  color: white;
  margin: 0;
  text-shadow: 0 2px 10px rgba(139, 92, 246, 0.5);
}

.stars-container {
  display: flex;
  gap: 0.5rem;
}

.celebration-star {
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.15);
  transition: all 0.4s;
  line-height: 1;
}

.celebration-star.earned {
  color: #FCD34D;
  text-shadow: 0 0 20px rgba(252, 211, 77, 0.8), 0 0 40px rgba(252, 211, 77, 0.4);
  animation: starReveal 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) var(--delay, 0s) both;
}

@keyframes starReveal {
  from { transform: scale(0) rotate(-30deg); color: rgba(255, 255, 255, 0.15); }
  to { transform: scale(1) rotate(0deg); }
}

.rewards {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.reward-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  animation: rewardPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both;
}

@keyframes rewardPop {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.reward-icon { font-size: 1.8rem; }
.reward-value { font-size: 1.5rem; font-weight: 800; color: white; }
.reward-label { font-size: 0.75rem; color: rgba(255, 255, 255, 0.6); }

.stars-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.95rem;
  margin: 0;
  max-width: 300px;
}

.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-action {
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: 16px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.btn-action.next {
  background: linear-gradient(135deg, #16A34A, #22C55E);
  color: white;
  padding: 0.85rem 1.75rem;
  font-size: 1.05rem;
}

.btn-action.retry { background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
.btn-action.map { background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }

.btn-action:hover { transform: translateY(-2px); filter: brightness(1.1); }
</style>
