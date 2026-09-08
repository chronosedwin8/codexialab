<template>
  <div class="pre-home">
    <div class="sky">
      <span class="cloud c1">☁️</span><span class="cloud c2">☁️</span><span class="sun">🌞</span>
    </div>

    <header class="pre-head">
      <div class="mascota">🦉</div>
      <h1>¡Hola! Soy Búho</h1>
      <button class="voz-btn" @click="saludar" aria-label="Escuchar otra vez">🔊</button>
    </header>

    <p class="pregunta">¿Qué quieres aprender hoy?</p>

    <div class="opciones">
      <button class="materia mate" @click="ir('matematica')" @mouseenter="voz.decir(VOZ_UI.mate)">
        <span class="m-emoji">🔢</span>
        <span class="m-nombre">Matemáticas</span>
        <span class="m-deco">➕ ➖ ⭐</span>
      </button>
      <button class="materia lecto" @click="ir('lectoescritura')" @mouseenter="voz.decir(VOZ_UI.letras)">
        <span class="m-emoji">🔤</span>
        <span class="m-nombre">Letras</span>
        <span class="m-deco">📖 ✏️ 🅰️</span>
      </button>
      <button class="materia prog" @click="ir('programacion')" @mouseenter="voz.decir(VOZ_UI.prog)">
        <span class="m-emoji">🐺</span>
        <span class="m-nombre">Programación</span>
        <span class="m-deco">⬆️ ⬇️ ⬅️ ➡️</span>
      </button>
      <button class="materia mundos" @click="ir('mundos')" @mouseenter="voz.decir(VOZ_UI.mundos)">
        <span class="m-emoji">🪄</span>
        <span class="m-nombre">Mundos Mágicos</span>
        <span class="m-deco">🧩 🎨 🎵 🚀</span>
      </button>
    </div>

    <p v-if="cargando" class="cargando">Preparando todo… ✨</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useVoz, VOZ_UI } from '@/composables/useVoz';

const router = useRouter();
const auth = useAuthStore();
const voz = useVoz();
const cargando = ref(true);

function saludar() {
  voz.decir(VOZ_UI.saludo);
}

function ir(cat: string) {
  voz.parar();
  router.push(`/preescolar/${cat}`);
}

onMounted(async () => {
  try { await auth.ensurePreescolar(); } catch { /* sin conexión: igual mostramos la pantalla */ }
  cargando.value = false;
  setTimeout(saludar, 400);
});
</script>

<style scoped>
.pre-home {
  min-height: 100vh;
  background: linear-gradient(180deg, #7DD3FC 0%, #BAE6FD 45%, #BBF7D0 100%);
  display: flex; flex-direction: column; align-items: center;
  padding: 1.5rem; position: relative; overflow: hidden;
  font-family: 'Fredoka One', 'Baloo 2', sans-serif;
}
.sky { position: absolute; inset: 0; pointer-events: none; }
.cloud { position: absolute; font-size: 3rem; opacity: 0.9; animation: drift 18s linear infinite; }
.c1 { top: 8%; left: -10%; } .c2 { top: 22%; left: -10%; animation-duration: 26s; animation-delay: -8s; font-size: 2.2rem; }
.sun { position: absolute; top: 5%; right: 6%; font-size: 4rem; animation: spin 18s linear infinite; }
@keyframes drift { from { left: -15%; } to { left: 115%; } }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.pre-head { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; margin-top: 1rem; z-index: 1; }
.mascota { font-size: 4.5rem; animation: bob 2s ease-in-out infinite; }
@keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.pre-head h1 { color: #1E3A8A; margin: 0; font-size: 2rem; text-shadow: 0 2px 0 #fff; }
.voz-btn { margin-top: 0.3rem; background: #fff; border: 3px solid #F59E0B; border-radius: 50%; width: 56px; height: 56px; font-size: 1.6rem; cursor: pointer; box-shadow: 0 4px 0 #D97706; }
.voz-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #D97706; }

.pregunta { color: #166534; font-size: 1.4rem; margin: 1.2rem 0; text-align: center; text-shadow: 0 1px 0 #fff; z-index: 1; }

.opciones { display: flex; gap: 1.5rem; flex-wrap: wrap; justify-content: center; z-index: 1; }
.materia {
  width: 230px; height: 250px; border: none; border-radius: 32px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
  color: #fff; font-family: inherit; transition: transform 0.15s;
  box-shadow: 0 10px 0 rgba(0,0,0,0.18), 0 14px 24px rgba(0,0,0,0.2);
}
.materia:hover { transform: translateY(-6px) scale(1.03); }
.materia:active { transform: translateY(4px); box-shadow: 0 4px 0 rgba(0,0,0,0.18); }
.mate { background: linear-gradient(160deg, #22C55E, #16A34A); }
.lecto { background: linear-gradient(160deg, #A78BFA, #7C3AED); }
.prog { background: linear-gradient(160deg, #38BDF8, #2563EB); }
.mundos { background: linear-gradient(160deg, #F472B6, #DB2777); }
.m-emoji { font-size: 5rem; }
.m-nombre { font-size: 1.7rem; text-shadow: 0 2px 3px rgba(0,0,0,0.25); }
.m-deco { font-size: 1.1rem; opacity: 0.95; }
.cargando { color: #166534; margin-top: 1rem; z-index: 1; }
</style>
