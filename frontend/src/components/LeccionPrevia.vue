<template>
  <Teleport to="body">
    <Transition name="lec-fade" appear>
      <div v-if="visible" class="lec" :style="{ '--lec-color': color }" role="dialog" aria-label="Explicación previa">
        <div class="lec-card">
          <!-- Encabezado -->
          <header class="lec-head">
            <div class="lec-titulos">
              <p class="lec-kicker">{{ kicker }}</p>
              <h2 class="lec-tema">{{ titulo }}</h2>
            </div>
            <button class="lec-cerrar" title="Ir directo al reto" @click="terminar">✕</button>
          </header>

          <!-- Barra de progreso -->
          <div class="lec-barra"><div class="lec-barra-fill" :style="{ width: `${((indice + 1) / slides.length) * 100}%` }"></div></div>

          <!-- Diapositiva -->
          <Transition name="lec-slide" mode="out-in">
            <div class="lec-cuerpo" :key="indice">
              <div class="lec-badge" :class="`t-${slide.tipo}`">
                <span class="lec-badge-ico">{{ ICONO[slide.tipo] }}</span>
                <span>{{ ETIQUETA[slide.tipo] }}</span>
              </div>

              <h3 class="lec-slide-titulo">{{ slide.titulo }}</h3>
              <p class="lec-texto">{{ slide.texto }}</p>

              <pre v-if="slide.codigo" class="lec-codigo"><code>{{ slide.codigo }}</code></pre>

              <ol v-if="slide.pasos?.length" class="lec-pasos">
                <li v-for="(p, i) in slide.pasos" :key="i">{{ p }}</li>
              </ol>
            </div>
          </Transition>

          <!-- Pie: Codi + navegación -->
          <footer class="lec-pie">
            <div class="lec-codi">
              <FuzzAvatar :color="color" :tamano="52" :expresion="expresion" :mirar="false" />
              <button v-if="slide.audio" class="lec-voz" :title="narrando ? 'Silenciar' : 'Escuchar de nuevo'" @click="alternarVoz">
                {{ narrando ? '🔊' : '🔈' }}
              </button>
            </div>

            <div class="lec-puntos">
              <button
                v-for="(_, i) in slides"
                :key="i"
                class="lec-punto"
                :class="{ on: i === indice, visto: i < indice }"
                :aria-label="`Diapositiva ${i + 1}`"
                @click="irA(i)"
              ></button>
            </div>

            <div class="lec-nav">
              <button v-if="indice > 0" class="lec-btn ghost" @click="anterior">← Atrás</button>
              <button class="lec-btn principal" @click="siguiente">
                {{ esUltimo ? '¡Empezar el reto! ▶' : 'Siguiente →' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import FuzzAvatar from './FuzzAvatar.vue';
import { useAudio } from '@/composables/useAudio';
import { marcarVista } from '@/composables/cinematicas';
import type { Slide, TipoSlide } from '@/data/lecciones';

const props = withDefaults(
  defineProps<{
    slides: readonly Slide[];
    titulo: string;
    kicker?: string;
    color?: string;
    recordarComo?: string | null;
  }>(),
  { kicker: 'Antes de empezar', color: '#7C3AED', recordarComo: null },
);
const emit = defineEmits<{ terminada: [] }>();

const ICONO: Record<TipoSlide, string> = {
  concepto: '💡', ejemplo: '🌎', codigo: '💻', aplicacion: '🚀', pasos: '🧭', aviso: '⚠️',
};
const ETIQUETA: Record<TipoSlide, string> = {
  concepto: 'Concepto', ejemplo: 'Ejemplo', codigo: 'En código', aplicacion: 'En la vida real',
  pasos: 'Paso a paso', aviso: 'Error común',
};

const audio = useAudio();
const indice = ref(0);
const visible = ref(true);
const narrando = ref(true);

const slide = computed(() => props.slides[indice.value]);
const esUltimo = computed(() => indice.value >= props.slides.length - 1);
const expresion = computed(() => {
  if (slide.value?.tipo === 'aviso') return 'confundido' as const;
  if (esUltimo.value) return 'celebrando' as const;
  return 'feliz' as const;
});

// La diapositiva se narra con su audio real si existe. Si falta el archivo, se LEE:
// el texto siempre está en pantalla y no se usa la voz robótica del navegador.
function narrar(): void {
  const a = slide.value?.audio;
  if (!a || !narrando.value) return;
  audio.narrate('', a);
}

function alternarVoz(): void {
  narrando.value = !narrando.value;
  if (narrando.value) narrar();
  else audio.stop();
}

function irA(i: number): void {
  if (i === indice.value) return;
  indice.value = i;
}

function siguiente(): void {
  if (esUltimo.value) { terminar(); return; }
  indice.value += 1;
}

function anterior(): void {
  if (indice.value > 0) indice.value -= 1;
}

function terminar(): void {
  audio.stop();
  visible.value = false;
  if (props.recordarComo) marcarVista(props.recordarComo);
  setTimeout(() => emit('terminada'), 220);
}

function onTecla(e: KeyboardEvent): void {
  if (e.key === 'ArrowRight' || e.key === 'Enter') siguiente();
  else if (e.key === 'ArrowLeft') anterior();
  else if (e.key === 'Escape') terminar();
}

watch(indice, narrar);
onMounted(() => { narrar(); window.addEventListener('keydown', onTecla); });
onBeforeUnmount(() => { window.removeEventListener('keydown', onTecla); audio.stop(); });
</script>

<style scoped>
.lec {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(11, 8, 32, 0.82);
  backdrop-filter: blur(6px);
}

.lec-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(760px, 100%);
  max-height: min(92vh, 780px);
  background: linear-gradient(160deg, #1e1b4b, #161335);
  border: 1px solid color-mix(in srgb, var(--lec-color) 45%, transparent);
  border-radius: 24px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.55);
  overflow: hidden;
  animation: lecPop 0.45s cubic-bezier(0.34, 1.4, 0.64, 1);
}

@keyframes lecPop {
  from { transform: scale(0.94) translateY(18px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

/* Encabezado */
.lec-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.4rem 0.9rem;
  background: linear-gradient(120deg, color-mix(in srgb, var(--lec-color) 55%, transparent), transparent);
}
.lec-kicker {
  margin: 0 0 0.15rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
}
.lec-tema {
  margin: 0;
  font-size: clamp(1.15rem, 2.6vw, 1.55rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
}
.lec-cerrar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(0, 0, 0, 0.28);
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}
.lec-cerrar:hover { background: rgba(0, 0, 0, 0.5); }

/* Progreso */
.lec-barra { height: 3px; background: rgba(255, 255, 255, 0.12); }
.lec-barra-fill {
  height: 100%;
  background: var(--lec-color);
  border-radius: 0 3px 3px 0;
  transition: width 0.35s ease;
}

/* Cuerpo */
.lec-cuerpo {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.4rem;
}
.lec-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.14);
}
.lec-badge-ico { font-size: 0.95rem; }
.lec-badge.t-aviso { background: rgba(234, 179, 8, 0.16); border-color: rgba(234, 179, 8, 0.4); color: #FDE68A; }
.lec-badge.t-pasos { background: rgba(34, 197, 94, 0.16); border-color: rgba(34, 197, 94, 0.4); color: #BBF7D0; }
.lec-badge.t-codigo { background: rgba(59, 130, 246, 0.16); border-color: rgba(59, 130, 246, 0.4); color: #BFDBFE; }

.lec-slide-titulo {
  margin: 0.85rem 0 0.55rem;
  font-size: clamp(1.25rem, 3vw, 1.7rem);
  font-weight: 800;
  color: #fff;
  line-height: 1.25;
}
.lec-texto {
  margin: 0;
  font-size: clamp(0.98rem, 2vw, 1.08rem);
  line-height: 1.62;
  color: rgba(255, 255, 255, 0.86);
}

.lec-codigo {
  margin: 1.1rem 0 0;
  padding: 1rem 1.1rem;
  background: #0b1020;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-left: 3px solid var(--lec-color);
  border-radius: 12px;
  overflow-x: auto;
  font-family: 'Fira Code', 'Consolas', ui-monospace, monospace;
  font-size: 0.88rem;
  line-height: 1.65;
  color: #E2E8F0;
  white-space: pre;
  tab-size: 2;
}

.lec-pasos {
  margin: 1.1rem 0 0;
  padding: 0;
  list-style: none;
  counter-reset: paso;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.lec-pasos li {
  counter-increment: paso;
  position: relative;
  padding: 0.55rem 0.8rem 0.55rem 2.6rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.86);
}
.lec-pasos li::before {
  content: counter(paso);
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--lec-color);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 800;
}

/* Pie */
.lec-pie {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.9rem;
  flex-wrap: wrap;
  padding: 0.9rem 1.4rem 1.15rem;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(0, 0, 0, 0.18);
}
.lec-codi { position: relative; display: flex; align-items: center; }
.lec-voz {
  position: absolute;
  right: -6px;
  bottom: -2px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: #1e1b4b;
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 0;
}
.lec-voz:hover { background: var(--lec-color); }

.lec-puntos { display: flex; gap: 0.35rem; }
.lec-punto {
  width: 9px;
  height: 9px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.22);
  cursor: pointer;
  transition: all 0.25s;
}
.lec-punto.visto { background: rgba(255, 255, 255, 0.5); }
.lec-punto.on { background: var(--lec-color); transform: scale(1.45); box-shadow: 0 0 10px var(--lec-color); }

.lec-nav { display: flex; gap: 0.5rem; align-items: center; }
.lec-btn {
  border: none;
  border-radius: 14px;
  padding: 0.7rem 1.25rem;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s, filter 0.15s;
}
.lec-btn.principal { background: var(--lec-color); color: #fff; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35); }
.lec-btn.ghost { background: rgba(255, 255, 255, 0.09); color: rgba(255, 255, 255, 0.82); border: 1px solid rgba(255, 255, 255, 0.16); }
.lec-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }

/* Transiciones */
.lec-fade-enter-active, .lec-fade-leave-active { transition: opacity 0.3s ease; }
.lec-fade-enter-from, .lec-fade-leave-to { opacity: 0; }
.lec-slide-enter-active, .lec-slide-leave-active { transition: opacity 0.22s ease, transform 0.22s ease; }
.lec-slide-enter-from { opacity: 0; transform: translateX(18px); }
.lec-slide-leave-to { opacity: 0; transform: translateX(-18px); }

@media (max-width: 560px) {
  .lec { padding: 0.5rem; }
  .lec-card { max-height: 96vh; border-radius: 18px; }
  .lec-head { padding: 1rem 1rem 0.75rem; }
  .lec-cuerpo { padding: 1.1rem 1rem; }
  .lec-pie { padding: 0.8rem 1rem 1rem; justify-content: center; }
  .lec-nav { width: 100%; }
  .lec-btn.principal { flex: 1; }
  .lec-codigo { font-size: 0.8rem; }
}
</style>
