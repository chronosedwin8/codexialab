<template>
  <Teleport to="body">
    <div class="cel-overlay" @click.self="$emit('close')">
      <!-- Rayos que giran detrás de todo -->
      <div class="cel-rayos" :class="{ on: fase >= 1 }"></div>

      <!-- Fuegos artificiales -->
      <div class="cel-fuegos" aria-hidden="true">
        <span v-for="f in fuegos" :key="f.id" class="cel-fuego" :style="f.estilo">
          <i v-for="n in 10" :key="n" class="cel-chispa" :style="{ '--ang': `${n * 36}deg` }"></i>
        </span>
      </div>

      <!-- Confeti -->
      <div class="cel-confeti" aria-hidden="true">
        <div v-for="i in 42" :key="i" class="cel-papelito" :style="confeti(i)"></div>
      </div>

      <div class="cel-modal">
        <div class="cel-contenido">
          <!-- Codi celebrando -->
          <div class="cel-codi" :class="{ on: fase >= 1 }">
            <FuzzAvatar :tamano="130" expresion="celebrando" color="#7C3AED" :mirar="false" />
          </div>

          <h2 class="cel-titulo" :class="{ on: fase >= 1 }">{{ titulo }}</h2>

          <!-- Estrellas, una por una -->
          <div class="cel-estrellas">
            <div
              v-for="i in 3"
              :key="i"
              class="cel-estrella"
              :class="{ ganada: fase >= 2 && stars >= i, apagada: fase >= 2 && stars < i }"
              :style="{ '--d': `${(i - 1) * 0.34}s` }"
            >
              <span class="cel-estrella-glifo">★</span>
              <span v-if="stars >= i" class="cel-destello" :style="{ '--d': `${(i - 1) * 0.34 + 0.2}s` }"></span>
            </div>
          </div>

          <!-- Recompensas con conteo -->
          <div v-if="monedas > 0 || gemas > 0" class="cel-premios" :class="{ on: fase >= 3 }">
            <div v-if="monedas > 0" class="cel-premio">
              <span class="cel-premio-ico">🪙</span>
              <span class="cel-premio-val">+{{ monedasVis }}</span>
              <span class="cel-premio-lbl">monedas</span>
            </div>
            <div v-if="gemas > 0" class="cel-premio">
              <span class="cel-premio-ico">💎</span>
              <span class="cel-premio-val">+{{ gemas }}</span>
              <span class="cel-premio-lbl">gemas</span>
            </div>
          </div>

          <!-- Logros: entran dentro de la celebración, no encima de ella -->
          <div v-if="logros.length" class="cel-logros" :class="{ on: fase >= 3 }">
            <p class="cel-logros-titulo">🏆 ¡Logro{{ logros.length > 1 ? 's' : '' }} desbloqueado{{ logros.length > 1 ? 's' : '' }}!</p>
            <div v-for="lg in logros" :key="lg.id" class="cel-logro-card">
              <span class="cel-logro-ico">{{ lg.icono }}</span>
              <div class="cel-logro-info">
                <p class="cel-logro-nombre">{{ lg.nombre }}</p>
                <p class="cel-logro-desc">{{ lg.descripcion }}</p>
                <p class="cel-logro-rec">
                  <span v-if="lg.recompensa?.monedas">🪙 +{{ lg.recompensa.monedas }}</span>
                  <span v-if="lg.recompensa?.gemas">💎 +{{ lg.recompensa.gemas }}</span>
                  <span v-if="lg.recompensa?.item" class="cel-logro-item">🎁 {{ lg.recompensa.item.nombre }} ¡GRATIS!</span>
                </p>
              </div>
            </div>
          </div>

          <!-- Mensaje motivador -->
          <div class="cel-mensaje" :class="{ on: fase >= 3 }">
            <p class="cel-logro">{{ mensajeLogro }}</p>
            <p class="cel-animo">{{ mensajeAnimo }}</p>
          </div>

          <!-- Progreso del mundo -->
          <div v-if="totalNiveles && totalNiveles > 0" class="cel-progreso" :class="{ on: fase >= 3 }">
            <div class="cel-progreso-barra">
              <div class="cel-progreso-fill" :style="{ width: `${porcentaje}%` }"></div>
            </div>
            <p class="cel-progreso-txt">
              {{ mundoNombre ? `${mundoNombre}: ` : '' }}{{ nivelActual }} de {{ totalNiveles }} niveles
              <strong v-if="porcentaje === 100"> · ¡mundo completo! 🏆</strong>
            </p>
          </div>

          <div class="cel-botones" :class="{ on: fase >= 3 }">
            <button class="cel-btn sig" @click="$emit('next-level')">Siguiente nivel →</button>
            <button class="cel-btn sec" @click="$emit('retry')">🔄 Repetir</button>
            <button class="cel-btn sec" @click="$emit('map')">🗺️ Mapa</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import FuzzAvatar from './FuzzAvatar.vue';
import { useAudio } from '@/composables/useAudio';

const props = withDefaults(
  defineProps<{
    stars: number;
    monedas: number;
    gemas: number;
    mundoNombre?: string;
    nivelActual?: number;
    totalNiveles?: number;
    /** Qué viene después, para invitar a seguir ("bucles anidados"). */
    siguienteTema?: string;
    /** Logros recién desbloqueados: se muestran aquí en lugar de tapar la celebración. */
    logros?: readonly any[];
  }>(),
  { mundoNombre: '', nivelActual: 0, totalNiveles: 0, siguienteTema: '', logros: () => [] },
);

defineEmits<{ 'next-level': []; retry: []; map: []; close: [] }>();

const audio = useAudio();

// La celebración entra por fases: primero Codi y el título, luego las estrellas,
// y al final premios, mensaje y botones. Da ritmo en lugar de soltarlo todo de golpe.
const fase = ref(0);
const monedasVis = ref(0);
const temporizadores: ReturnType<typeof setTimeout>[] = [];
const intervalos: ReturnType<typeof setInterval>[] = [];

const titulo = computed(() => {
  if (props.stars === 3) return '¡PERFECTO!';
  if (props.stars === 2) return '¡MUY BIEN!';
  return '¡LO LOGRASTE!';
});

const mensajeLogro = computed(() => {
  if (props.stars === 3) return 'Tres estrellas. Resolviste el reto de la forma más eficiente posible.';
  if (props.stars === 2) return 'Dos estrellas. Tu solución funciona; hay una versión aún más corta esperándote.';
  return 'Superaste el reto. Cada nivel que completas te deja algo nuevo.';
});

const ANIMOS = [
  'Los programadores no nacen sabiendo: se hacen resolviendo un reto tras otro. Vas por buen camino.',
  'Cada error que corregiste te enseñó más que un acierto de suerte. Sigue así.',
  'Lo que acabas de hacer es pensamiento computacional de verdad. Y apenas estás empezando.',
  'Tu cerebro acaba de construir una conexión nueva. El próximo reto te va a costar menos.',
  'Nadie aprende a programar leyendo: se aprende programando, justo como lo estás haciendo.',
];

const mensajeAnimo = computed(() => {
  if (props.siguienteTema) return `Lo que viene: ${props.siguienteTema}. ¿Te animas a seguir?`;
  if (porcentaje.value === 100) return '¡Terminaste el mundo completo! Un mundo nuevo te espera en el mapa.';
  // Determinista por nivel: no cambia si el componente se vuelve a renderizar.
  return ANIMOS[(props.nivelActual + props.stars) % ANIMOS.length];
});

const porcentaje = computed(() => {
  if (!props.totalNiveles) return 0;
  return Math.min(100, Math.round((props.nivelActual / props.totalNiveles) * 100));
});

// Fuegos artificiales en posiciones fijas para que no salten entre renders.
const fuegos = computed(() =>
  [
    { x: 18, y: 26, c: '#FCD34D', d: 0.2 },
    { x: 82, y: 20, c: '#22D3EE', d: 0.6 },
    { x: 30, y: 68, c: '#F472B6', d: 1.0 },
    { x: 72, y: 60, c: '#A78BFA', d: 1.4 },
    { x: 50, y: 14, c: '#34D399', d: 1.8 },
  ].map((f, i) => ({
    id: i,
    estilo: { left: `${f.x}%`, top: `${f.y}%`, '--c': f.c, '--d': `${f.d}s` } as Record<string, string>,
  })),
);

function confeti(i: number): Record<string, string> {
  const colores = ['#6B46C1', '#22C55E', '#EAB308', '#EF4444', '#3B82F6', '#EC4899', '#F97316', '#22D3EE'];
  // Pseudoaleatorio determinista: mismo confeti en cada render, sin saltos.
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return {
    '--delay': `${(r(1) * 2.2).toFixed(2)}s`,
    '--duration': `${(2.2 + r(2) * 2).toFixed(2)}s`,
    '--left': `${(r(3) * 100).toFixed(0)}%`,
    '--giro': `${(r(4) * 720 + 360).toFixed(0)}deg`,
    '--color': colores[i % colores.length],
  };
}

onMounted(() => {
  // Solo el efecto: la voz de felicitación la dispara LevelView con audio.celebrate().
  audio.sfx('sfx-ganar');
  temporizadores.push(setTimeout(() => (fase.value = 1), 60));
  temporizadores.push(setTimeout(() => (fase.value = 2), 620));
  temporizadores.push(
    setTimeout(() => {
      fase.value = 3;
      // Las monedas suben contando en ~700 ms, sin importar cuántas sean.
      const meta = props.monedas;
      if (meta <= 0) return;
      const paso = Math.max(1, Math.ceil(meta / 28));
      const iv = setInterval(() => {
        monedasVis.value = Math.min(meta, monedasVis.value + paso);
        if (monedasVis.value >= meta) clearInterval(iv);
      }, 25);
      intervalos.push(iv);
    }, 1750),
  );
});

onBeforeUnmount(() => {
  temporizadores.forEach(clearTimeout);
  intervalos.forEach(clearInterval);
});
</script>

<style scoped>
.cel-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  overflow: hidden;
  background: radial-gradient(circle at 50% 45%, rgba(76, 29, 149, 0.75), rgba(0, 0, 0, 0.86));
  backdrop-filter: blur(5px);
  animation: celFade 0.35s ease;
}
@keyframes celFade { from { opacity: 0; } to { opacity: 1; } }

/* Rayos giratorios */
.cel-rayos {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 190vmax;
  height: 190vmax;
  margin: -95vmax 0 0 -95vmax;
  opacity: 0;
  background: repeating-conic-gradient(
    from 0deg,
    rgba(255, 255, 255, 0.07) 0deg 7deg,
    transparent 7deg 20deg
  );
  transition: opacity 0.7s ease;
  animation: celGirar 26s linear infinite;
  pointer-events: none;
}
.cel-rayos.on { opacity: 1; }
@keyframes celGirar { to { transform: rotate(360deg); } }

/* Fuegos artificiales */
.cel-fuegos { position: absolute; inset: 0; pointer-events: none; }
.cel-fuego { position: absolute; width: 0; height: 0; }
.cel-chispa {
  position: absolute;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 10px var(--c);
  animation: celEstallar 1.5s ease-out var(--d) infinite;
  transform: rotate(var(--ang)) translateY(0);
  opacity: 0;
}
@keyframes celEstallar {
  0% { transform: rotate(var(--ang)) translateY(0) scale(1); opacity: 1; }
  70% { opacity: 0.75; }
  100% { transform: rotate(var(--ang)) translateY(-90px) scale(0.25); opacity: 0; }
}

/* Confeti */
.cel-confeti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.cel-papelito {
  position: absolute;
  top: -24px;
  left: var(--left);
  width: 9px;
  height: 14px;
  background: var(--color);
  border-radius: 2px;
  opacity: 0.85;
  animation: celCaer var(--duration) linear var(--delay) infinite;
}
@keyframes celCaer {
  0% { transform: translateY(-24px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(102vh) rotate(var(--giro)); opacity: 0; }
}

/* Tarjeta */
.cel-modal {
  position: relative;
  z-index: 2;
  width: min(470px, 100%);
  max-height: 94vh;
  overflow-y: auto;
  padding: 2rem 1.75rem;
  border-radius: 30px;
  background: linear-gradient(150deg, rgba(30, 27, 75, 0.96), rgba(49, 46, 129, 0.96));
  border: 2px solid rgba(167, 139, 250, 0.45);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6), 0 0 70px rgba(139, 92, 246, 0.28);
  animation: celPop 0.55s cubic-bezier(0.34, 1.5, 0.64, 1);
}
@keyframes celPop {
  from { transform: scale(0.6) translateY(45px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.cel-contenido { display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }

/* Codi */
.cel-codi { opacity: 0; transform: scale(0.4) rotate(-18deg); transition: all 0.6s cubic-bezier(0.34, 1.5, 0.64, 1); }
.cel-codi.on { opacity: 1; transform: scale(1) rotate(0); animation: celFlotar 2.6s ease-in-out 0.7s infinite; }
@keyframes celFlotar { 0%, 100% { translate: 0 0; } 50% { translate: 0 -9px; } }

.cel-titulo {
  margin: 0;
  font-family: 'Fredoka One', sans-serif;
  font-size: clamp(1.9rem, 6vw, 2.6rem);
  font-weight: 900;
  letter-spacing: 0.02em;
  color: #fff;
  text-shadow: 0 3px 16px rgba(139, 92, 246, 0.7);
  opacity: 0;
  transform: translateY(14px);
  transition: all 0.5s ease 0.15s;
}
.cel-titulo.on { opacity: 1; transform: translateY(0); }

/* Estrellas */
.cel-estrellas { display: flex; gap: 0.7rem; }
.cel-estrella { position: relative; line-height: 1; }
.cel-estrella-glifo { font-size: clamp(2.4rem, 8vw, 3.2rem); color: rgba(255, 255, 255, 0.14); display: block; }
.cel-estrella.ganada .cel-estrella-glifo {
  color: #FCD34D;
  text-shadow: 0 0 22px rgba(252, 211, 77, 0.9), 0 0 44px rgba(252, 211, 77, 0.45);
  animation: celEstrella 0.65s cubic-bezier(0.34, 1.6, 0.64, 1) var(--d) both;
}
@keyframes celEstrella {
  0% { transform: scale(0) rotate(-45deg); }
  60% { transform: scale(1.35) rotate(10deg); }
  100% { transform: scale(1) rotate(0); }
}
.cel-estrella.apagada .cel-estrella-glifo { animation: celApagada 0.4s ease var(--d) both; }
@keyframes celApagada { from { opacity: 0; } to { opacity: 1; } }

.cel-destello {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  border: 2px solid rgba(252, 211, 77, 0.85);
  opacity: 0;
  animation: celOnda 0.8s ease-out var(--d) both;
  pointer-events: none;
}
@keyframes celOnda {
  0% { transform: scale(0.35); opacity: 0.95; }
  100% { transform: scale(1.7); opacity: 0; }
}

/* Premios */
.cel-premios {
  display: flex;
  gap: 1.8rem;
  justify-content: center;
  opacity: 0;
  transform: scale(0.75);
  transition: all 0.45s cubic-bezier(0.34, 1.5, 0.64, 1);
}
.cel-premios.on { opacity: 1; transform: scale(1); }
.cel-premio { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
.cel-premio-ico { font-size: 1.9rem; animation: celTintinear 1.9s ease-in-out infinite; }
@keyframes celTintinear { 0%, 100% { transform: rotate(-9deg); } 50% { transform: rotate(9deg); } }
.cel-premio-val { font-size: 1.5rem; font-weight: 900; color: #fff; font-variant-numeric: tabular-nums; }
.cel-premio-lbl { font-size: 0.72rem; color: rgba(255, 255, 255, 0.6); }

/* Logros */
.cel-logros {
  width: 100%;
  padding: 0.85rem;
  border-radius: 16px;
  background: rgba(252, 211, 77, 0.09);
  border: 1px solid rgba(252, 211, 77, 0.42);
  opacity: 0;
  transform: scale(0.92);
  transition: all 0.5s cubic-bezier(0.34, 1.5, 0.64, 1) 0.18s;
}
.cel-logros.on { opacity: 1; transform: scale(1); }
.cel-logros-titulo {
  margin: 0 0 0.6rem;
  font-size: 0.9rem;
  font-weight: 800;
  color: #FCD34D;
}
.cel-logro-card {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  text-align: left;
  padding: 0.6rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
}
.cel-logro-card + .cel-logro-card { margin-top: 0.45rem; }
.cel-logro-ico { font-size: 1.6rem; flex-shrink: 0; }
.cel-logro-info { min-width: 0; }
.cel-logro-nombre { margin: 0; font-size: 0.92rem; font-weight: 800; color: #fff; }
.cel-logro-desc { margin: 0.1rem 0 0; font-size: 0.78rem; color: rgba(255, 255, 255, 0.62); }
.cel-logro-rec { margin: 0.3rem 0 0; display: flex; gap: 0.6rem; flex-wrap: wrap; font-size: 0.78rem; font-weight: 700; color: #FCD34D; }
.cel-logro-item { color: #86EFAC; }

/* Mensajes */
.cel-mensaje {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.45s ease 0.12s;
}
.cel-mensaje.on { opacity: 1; transform: translateY(0); }
.cel-logro { margin: 0; font-size: 0.95rem; font-weight: 700; color: rgba(255, 255, 255, 0.92); line-height: 1.45; }
.cel-animo {
  margin: 0;
  padding: 0.65rem 0.9rem;
  font-size: 0.87rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
}

/* Progreso */
.cel-progreso { width: 100%; opacity: 0; transition: opacity 0.45s ease 0.2s; }
.cel-progreso.on { opacity: 1; }
.cel-progreso-barra {
  height: 8px;
  background: rgba(255, 255, 255, 0.13);
  border-radius: 999px;
  overflow: hidden;
}
.cel-progreso-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #22C55E, #FCD34D);
  transition: width 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.35s;
}
.cel-progreso-txt { margin: 0.45rem 0 0; font-size: 0.78rem; color: rgba(255, 255, 255, 0.68); }
.cel-progreso-txt strong { color: #FCD34D; }

/* Botones */
.cel-botones {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  justify-content: center;
  opacity: 0;
  transform: translateY(12px);
  transition: all 0.45s ease 0.28s;
}
.cel-botones.on { opacity: 1; transform: translateY(0); }
.cel-btn {
  padding: 0.78rem 1.3rem;
  border: none;
  border-radius: 16px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s, filter 0.18s;
}
.cel-btn.sig {
  background: linear-gradient(135deg, #16A34A, #22C55E);
  color: #fff;
  padding: 0.88rem 1.7rem;
  font-size: 1.03rem;
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.36);
  animation: celLatir 2.1s ease-in-out 1.2s infinite;
}
@keyframes celLatir { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.045); } }
.cel-btn.sec { background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); }
.cel-btn:hover { transform: translateY(-2px); filter: brightness(1.12); }

@media (max-width: 560px) {
  .cel-modal { padding: 1.5rem 1.15rem; border-radius: 22px; }
  .cel-premios { gap: 1.2rem; }
  .cel-btn.sig { width: 100%; }
}

/* Quien prefiere menos movimiento no recibe el espectáculo completo. */
@media (prefers-reduced-motion: reduce) {
  .cel-rayos, .cel-chispa, .cel-papelito { display: none; }
  .cel-codi.on, .cel-premio-ico, .cel-btn.sig { animation: none; }
}
</style>
