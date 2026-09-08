<template>
  <div class="star-rating">
    <span
      v-for="i in 3"
      :key="i"
      :class="['star', { filled: stars >= i, new: newStar === i }]"
    >★</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  stars: number;
}>();

const newStar = ref(0);
let prevStars = props.stars;

watch(() => props.stars, (val) => {
  if (val > prevStars) {
    for (let i = prevStars + 1; i <= val; i++) {
      const starIndex = i;
      setTimeout(() => {
        newStar.value = starIndex;
        setTimeout(() => { newStar.value = 0; }, 800);
      }, (starIndex - prevStars - 1) * 400);
    }
  }
  prevStars = val;
});
</script>

<style scoped>
.star-rating {
  display: flex;
  gap: 2px;
}

.star {
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.2);
  transition: color 0.3s, transform 0.3s;
  line-height: 1;
}

.star.filled {
  color: #FCD34D;
  text-shadow: 0 0 8px rgba(252, 211, 77, 0.6);
}

.star.new {
  animation: starPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes starPop {
  0% { transform: scale(0) rotate(-30deg); }
  60% { transform: scale(1.4) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); }
}
</style>
