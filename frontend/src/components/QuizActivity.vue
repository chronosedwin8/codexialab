<template>
  <div class="quiz-activity">
    <div class="quiz-card">
      <!-- ───────── FASE APRENDE: slides de contenido + aplicación ───────── -->
      <div v-if="modo === 'aprende'" class="learn">
        <div class="learn-head">
          <span class="learn-step">📘 Aprende {{ slideIdx + 1 }} de {{ slides.length }}</span>
          <button class="btn-voz" @click="narrar(slideActual.texto)" aria-label="Escuchar">🔊</button>
          <button class="btn-skip" @click="trasAprender">Saltar →</button>
        </div>
        <div class="slide" :class="{ aplica: slideActual._aplicacion }">
          <div class="slide-emoji">{{ slideActual.emoji || (slideActual._aplicacion ? '🎯' : '💡') }}</div>
          <span v-if="slideActual._aplicacion" class="slide-badge">Aplica lo aprendido</span>
          <h2 class="slide-title">{{ slideActual.titulo }}</h2>
          <p class="slide-text">{{ slideActual.texto }}</p>
        </div>
        <div class="slide-dots"><span v-for="(s, i) in slides" :key="i" :class="['sd', { on: i === slideIdx }]"></span></div>
        <div class="slide-nav">
          <button v-if="slideIdx > 0" class="btn-ghost" @click="slidePrev">← Atrás</button>
          <button class="btn-next slide-go" @click="slideNext">
            {{ slideIdx < slides.length - 1 ? 'Siguiente →' : (juego ? '¡A jugar! 🎮' : '¡A las preguntas! ✏️') }}
          </button>
        </div>
      </div>

      <!-- ───────── FASE MINI-JUEGO ───────── -->
      <div v-else-if="modo === 'juego' && juego" class="juego-fase">
        <MiniJuego :juego="juego" @terminar="modo = 'quiz'" />
      </div>

      <!-- ───────── FASE PREGUNTAS ───────── -->
      <template v-else>
      <div class="quiz-progress">
        <span>Pregunta {{ indiceActual + 1 }} de {{ preguntas.length }}</span>
        <div class="progress-bar"><div class="progress-fill" :style="{ width: `${(indiceActual / preguntas.length) * 100}%` }"></div></div>
        <span class="quiz-score">✅ {{ correctas }}</span>
      </div>

      <template v-if="!terminado">
        <span class="tipo-badge">{{ tipoLabel }}</span>
        <h2 class="quiz-question">{{ pregunta.enunciado }} <button class="btn-voz inline" @click="narrar(pregunta.enunciado)" aria-label="Escuchar">🔊</button></h2>

        <!-- OPCIÓN / COMPLETAR -->
        <div v-if="tipo === 'opcion' || tipo === 'completar'" class="quiz-options">
          <button v-for="(opt, i) in opciones" :key="i"
            :class="['quiz-option', { selected: sel === i, correct: respondida && i === correctaIdx, incorrect: respondida && sel === i && i !== correctaIdx, disabled: respondida }]"
            :disabled="respondida" @click="sel = i; checkSimple()">
            <span class="opt-letter">{{ ['A', 'B', 'C', 'D'][i] }}</span><span class="opt-text">{{ opt }}</span>
          </button>
        </div>

        <!-- VERDADERO / FALSO -->
        <div v-else-if="tipo === 'vf'" class="vf-options">
          <button v-for="(val, i) in [true, false]" :key="i"
            :class="['vf-btn', val ? 'v' : 'f', { selected: selVF === val, correct: respondida && val === pregunta.respuesta, incorrect: respondida && selVF === val && val !== pregunta.respuesta, disabled: respondida }]"
            :disabled="respondida" @click="selVF = val; checkVF()">
            {{ val ? '✔️ Verdadero' : '❌ Falso' }}
          </button>
        </div>

        <!-- ORDENAR (arrastrar para reordenar) -->
        <div v-else-if="tipo === 'ordenar'" class="ordenar-list">
          <p class="hint-mini">Arrastra (o usa ▲▼) para poner en el orden correcto:</p>
          <div v-for="(it, i) in ordenItems" :key="it"
            class="orden-item" :class="{ locked: respondida }" :draggable="!respondida"
            @dragstart="dragIdx = i" @dragover.prevent @drop="dropOrden(i)">
            <span class="orden-num">{{ i + 1 }}</span>
            <span class="orden-text">{{ it }}</span>
            <span class="orden-arrows" v-if="!respondida">
              <button @click="moverOrden(i, -1)" :disabled="i === 0">▲</button>
              <button @click="moverOrden(i, 1)" :disabled="i === ordenItems.length - 1">▼</button>
            </span>
          </div>
          <button v-if="!respondida" class="btn-check" @click="checkOrden">Comprobar</button>
        </div>

        <!-- RELACIONAR (clic izquierda, luego derecha) -->
        <div v-else-if="tipo === 'relacionar'" class="relacionar">
          <p class="hint-mini">Toca un elemento de la izquierda y luego su pareja de la derecha:</p>
          <div class="rel-cols">
            <div class="rel-col">
              <button v-for="(p, i) in pares" :key="'l' + i"
                :class="['rel-item', { sel: relSel === i, done: relAsign[i] != null, ok: respondida && relAsign[i] === i, bad: respondida && relAsign[i] !== i }]"
                :disabled="respondida" @click="relSel = i">
                {{ p[0] }} <span v-if="relAsign[i] != null" class="rel-tag">→ {{ derechas[relAsign[i]!] }}</span>
              </button>
            </div>
            <div class="rel-col">
              <button v-for="(d, j) in derechas" :key="'r' + j" class="rel-item right"
                :disabled="respondida || relSel === null" @click="asignarRel(j)">{{ d }}</button>
            </div>
          </div>
          <button v-if="!respondida" class="btn-check" :disabled="relAsign.some((x) => x === null)" @click="checkRel">Comprobar</button>
        </div>

        <!-- AGRUPAR (arrastrar items a las cajas) -->
        <div v-else-if="tipo === 'agrupar'" class="agrupar">
          <p class="hint-mini">Arrastra (o toca el item y luego la caja) para clasificar:</p>
          <div class="agrupar-pool">
            <button v-for="(it, i) in itemsSinGrupo" :key="it"
              :class="['agr-item', { sel: agrSel === it }]" :draggable="!respondida"
              @dragstart="dragItem = it" @click="agrSel = it">{{ it }}</button>
          </div>
          <div class="agrupar-bins">
            <div v-for="cat in categorias" :key="cat" class="agr-bin"
              @dragover.prevent @drop="soltarEnGrupo(cat)" @click="agrSel && asignarGrupo(cat)">
              <p class="bin-title">{{ cat }}</p>
              <button v-for="it in itemsDe(cat)" :key="it"
                :class="['agr-chip', { ok: respondida && grupoCorrecto(it) === cat, bad: respondida && grupoCorrecto(it) !== cat }]"
                @click.stop="!respondida && quitarDeGrupo(it)">{{ it }}</button>
            </div>
          </div>
          <button v-if="!respondida" class="btn-check" :disabled="itemsSinGrupo.length > 0" @click="checkAgrupar">Comprobar</button>
        </div>

        <!-- Feedback -->
        <div v-if="respondida" class="quiz-feedback" :class="esCorrecta ? 'ok' : 'no'">
          <p class="feedback-title">{{ esCorrecta ? '¡Correcto! 🎉' : 'Casi... 🤔' }}</p>
          <p class="feedback-exp">{{ pregunta.explicacion }}</p>
          <button class="btn-next" @click="siguiente">{{ indiceActual + 1 < preguntas.length ? 'Siguiente →' : 'Ver resultado' }}</button>
        </div>
      </template>

      <!-- Resultado -->
      <div v-else class="quiz-result">
        <div class="result-stars"><span v-for="i in 3" :key="i" :class="['rstar', { filled: estrellas >= i }]">★</span></div>
        <h2>{{ correctas }} de {{ preguntas.length }} correctas</h2>
        <p class="result-msg">{{ mensajeResultado }}</p>
        <button class="btn-retry" @click="reiniciar">🔄 Intentar de nuevo</button>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAudio } from '@/composables/useAudio';
import { slugFrase } from '@/composables/vozBank';
import MiniJuego from '@/components/MiniJuego.vue';

const audio = useAudio();
// Narración con voz natural ElevenLabs (banco de clips por frase). NUNCA TTS robótico:
// si el clip no existe, queda en silencio.
const bankUrl = (t: string) => `/audio/quiz-bank/${slugFrase(t)}.mp3`;
function narrar(t?: string | null) { if (t) audio.narrate('', bankUrl(t)); }

interface Pregunta {
  tipo?: 'opcion' | 'vf' | 'completar' | 'ordenar' | 'relacionar' | 'agrupar';
  enunciado: string; explicacion: string;
  opciones?: string[]; correcta?: number;
  respuesta?: boolean;
  items?: string[];
  pares?: [string, string][];
  grupos?: Record<string, string[]>;
}

interface Slide { emoji?: string; titulo: string; texto: string; _aplicacion?: boolean }

const props = defineProps<{
  preguntas: Pregunta[];
  contenido?: Slide[];
  aplicacion?: Slide | null;
  juego?: { tipo: string; [k: string]: any } | null;
}>();
const emit = defineEmits<{ 'complete': [stars: number, correctas: number] }>();

// Slides de la fase "Aprende": contenido + (al final) la aplicación destacada
const slides = computed<Slide[]>(() => {
  const arr: Slide[] = [...(props.contenido ?? [])];
  if (props.aplicacion) arr.push({ ...props.aplicacion, _aplicacion: true });
  return arr;
});
// Fases: aprende (slides) → juego (mini-juego, si existe) → quiz (preguntas)
const faseInicial = () => slides.value.length ? 'aprende' : (props.juego ? 'juego' : 'quiz');
const modo = ref<'aprende' | 'juego' | 'quiz'>(faseInicial());
const slideIdx = ref(0);
const slideActual = computed<Slide>(() => slides.value[slideIdx.value] ?? { titulo: '', texto: '' });
function trasAprender() { modo.value = props.juego ? 'juego' : 'quiz'; }
function slideNext() { if (slideIdx.value < slides.value.length - 1) slideIdx.value++; else trasAprender(); }
function slidePrev() { if (slideIdx.value > 0) slideIdx.value--; }

const indiceActual = ref(0);
const correctas = ref(0);
const terminado = ref(false);
const respondida = ref(false);
const esCorrecta = ref(false);

const pregunta = computed(() => props.preguntas[indiceActual.value]);
const tipo = computed(() => pregunta.value.tipo ?? 'opcion');
const tipoLabel = computed(() => ({ opcion: 'Elige la correcta', completar: 'Completa', vf: 'Verdadero o Falso', ordenar: 'Ordena', relacionar: 'Relaciona', agrupar: 'Agrupa' }[tipo.value] ?? ''));

// Estados de trabajo
const opciones = ref<string[]>([]);   // opciones BARAJADAS (la correcta no es siempre la primera)
const correctaIdx = ref(0);
const sel = ref<number | null>(null);
const selVF = ref<boolean | null>(null);
const ordenItems = ref<string[]>([]);
const dragIdx = ref<number | null>(null);
const pares = computed(() => pregunta.value.pares ?? []);
const derechas = ref<string[]>([]);
const relAsign = ref<(number | null)[]>([]);
const relSel = ref<number | null>(null);
const categorias = ref<string[]>([]);
const grupAsign = ref<Record<string, string>>({});
const agrSel = ref<string | null>(null);
const dragItem = ref<string | null>(null);

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function prepararPregunta() {
  respondida.value = false; esCorrecta.value = false;
  sel.value = null; selVF.value = null; relSel.value = null; agrSel.value = null;
  const p = pregunta.value;
  if (tipo.value === 'opcion' || tipo.value === 'completar') { const ok = (p.opciones ?? [])[p.correcta ?? 0]; const ops = shuffle(p.opciones ?? []); opciones.value = ops; correctaIdx.value = ops.indexOf(ok); }
  if (tipo.value === 'ordenar') { let s = shuffle(p.items ?? []); if (s.join() === (p.items ?? []).join() && s.length > 1) s = s.reverse(); ordenItems.value = s; }
  if (tipo.value === 'relacionar') { derechas.value = shuffle((p.pares ?? []).map((x) => x[1])); relAsign.value = (p.pares ?? []).map(() => null); }
  if (tipo.value === 'agrupar') { categorias.value = Object.keys(p.grupos ?? {}); grupAsign.value = {}; }
}
watch(indiceActual, prepararPregunta, { immediate: true });
// Narrar (voz ElevenLabs) al cambiar de slide o al entrar a las preguntas.
watch(slideIdx, () => { if (modo.value === 'aprende') narrar(slideActual.value.texto); });
watch(modo, (m) => { if (m === 'quiz') setTimeout(() => narrar(pregunta.value?.enunciado), 180); });

// Items de agrupar
const todosItems = computed(() => Object.values(pregunta.value.grupos ?? {}).flat());
const itemsSinGrupo = computed(() => todosItems.value.filter((it) => !(it in grupAsign.value)));
function itemsDe(cat: string) { return todosItems.value.filter((it) => grupAsign.value[it] === cat); }
function grupoCorrecto(it: string): string { const g = pregunta.value.grupos ?? {}; return Object.keys(g).find((c) => g[c].includes(it)) ?? ''; }

const estrellas = computed(() => { const r = correctas.value / props.preguntas.length; if (r >= 0.999) return 3; if (r >= 0.66) return 2; if (r >= 0.34) return 1; return 0; });
const mensajeResultado = computed(() => estrellas.value === 3 ? '¡Perfecto! 🌟' : estrellas.value === 2 ? '¡Muy bien!' : estrellas.value === 1 ? '¡Buen intento!' : 'No te rindas, ¡otra vez!');

function marcar(ok: boolean) { respondida.value = true; esCorrecta.value = ok; if (ok) correctas.value++; audio.sfx(ok ? 'sfx-correcto' : 'sfx-error'); }
function checkSimple() { if (respondida.value) return; marcar(sel.value === correctaIdx.value); }
function checkVF() { if (respondida.value) return; marcar(selVF.value === pregunta.value.respuesta); }

// Ordenar
function dropOrden(i: number) { if (dragIdx.value === null || respondida.value) return; const arr = [...ordenItems.value]; const [m] = arr.splice(dragIdx.value, 1); arr.splice(i, 0, m); ordenItems.value = arr; dragIdx.value = null; }
function moverOrden(i: number, d: number) { const j = i + d; if (j < 0 || j >= ordenItems.value.length) return; const arr = [...ordenItems.value]; [arr[i], arr[j]] = [arr[j], arr[i]]; ordenItems.value = arr; }
function checkOrden() { marcar(ordenItems.value.join('|') === (pregunta.value.items ?? []).join('|')); }

// Relacionar
function asignarRel(j: number) { if (relSel.value === null || respondida.value) return; relAsign.value[relSel.value] = j; relSel.value = null; }
function checkRel() { marcar(relAsign.value.every((j, i) => j !== null && derechas.value[j] === pares.value[i][1])); }

// Agrupar
function asignarGrupo(cat: string) { if (!agrSel.value || respondida.value) return; grupAsign.value = { ...grupAsign.value, [agrSel.value]: cat }; agrSel.value = null; }
function soltarEnGrupo(cat: string) { if (!dragItem.value || respondida.value) return; grupAsign.value = { ...grupAsign.value, [dragItem.value]: cat }; dragItem.value = null; }
function quitarDeGrupo(it: string) { const g = { ...grupAsign.value }; delete g[it]; grupAsign.value = g; }
function checkAgrupar() { marcar(todosItems.value.every((it) => grupAsign.value[it] === grupoCorrecto(it))); }

function siguiente() {
  if (indiceActual.value + 1 < props.preguntas.length) { indiceActual.value++; setTimeout(() => narrar(pregunta.value?.enunciado), 120); }
  else { terminado.value = true; emit('complete', estrellas.value, correctas.value); }
}
function reiniciar() {
  indiceActual.value = 0; correctas.value = 0; terminado.value = false; prepararPregunta();
  slideIdx.value = 0;
  modo.value = faseInicial();
}
</script>

<style scoped>
.quiz-activity { flex: 1; display: flex; align-items: center; justify-content: center; padding: 1.5rem; background: #0F172A; overflow-y: auto; }
.quiz-card { width: 100%; max-width: 680px; background: #1E293B; border: 1px solid #334155; border-radius: 18px; padding: 1.5rem; }
.quiz-progress { display: flex; align-items: center; gap: 0.75rem; font-size: 0.8rem; color: #94A3B8; margin-bottom: 1rem; }
.progress-bar { flex: 1; height: 8px; background: #334155; border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: linear-gradient(90deg, #0EA5E9, #22D3EE); transition: width 0.3s; }
.quiz-score { color: #4ADE80; font-weight: 700; }
.tipo-badge { display: inline-block; background: #334155; color: #94A3B8; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; }
.quiz-question { color: #F1F5F9; font-size: 1.25rem; line-height: 1.4; margin: 0.5rem 0 1.1rem; }
.hint-mini { color: #94A3B8; font-size: 0.78rem; margin: 0 0 0.6rem; }

.quiz-options { display: flex; flex-direction: column; gap: 0.55rem; }
.quiz-option { display: flex; align-items: center; gap: 0.75rem; padding: 0.8rem 1rem; background: #0F172A; border: 2px solid #334155; border-radius: 12px; color: #E2E8F0; font-size: 1rem; cursor: pointer; transition: all 0.15s; text-align: left; font-family: inherit; }
.quiz-option:hover:not(.disabled) { border-color: #0EA5E9; transform: translateX(3px); }
.quiz-option.correct { border-color: #16A34A; background: rgba(34,197,94,0.15); }
.quiz-option.incorrect { border-color: #DC2626; background: rgba(239,68,68,0.15); }
.opt-letter { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; background: #334155; color: #CBD5E1; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
.opt-text { flex: 1; }

.vf-options { display: flex; gap: 1rem; }
.vf-btn { flex: 1; padding: 1.3rem; border-radius: 14px; border: 2px solid #334155; background: #0F172A; color: #E2E8F0; font-size: 1.1rem; font-weight: 700; cursor: pointer; font-family: inherit; }
.vf-btn.v:hover:not(.disabled) { border-color: #16A34A; }
.vf-btn.f:hover:not(.disabled) { border-color: #DC2626; }
.vf-btn.correct { border-color: #16A34A; background: rgba(34,197,94,0.15); }
.vf-btn.incorrect { border-color: #DC2626; background: rgba(239,68,68,0.15); }

.ordenar-list { display: flex; flex-direction: column; gap: 0.5rem; }
.orden-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 0.9rem; background: #0F172A; border: 2px solid #475569; border-radius: 10px; color: #E2E8F0; cursor: grab; }
.orden-item.locked { cursor: default; }
.orden-num { width: 24px; height: 24px; border-radius: 50%; background: #0EA5E9; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
.orden-text { flex: 1; }
.orden-arrows button { background: #334155; border: none; color: #E2E8F0; border-radius: 6px; cursor: pointer; padding: 2px 6px; margin-left: 2px; }
.orden-arrows button:disabled { opacity: 0.3; }

.rel-cols { display: flex; gap: 1rem; }
.rel-col { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.rel-item { padding: 0.65rem 0.8rem; background: #0F172A; border: 2px solid #475569; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; text-align: left; }
.rel-item.sel { border-color: #0EA5E9; background: rgba(14,165,233,0.15); }
.rel-item.done { border-color: #0EA5E9; }
.rel-item.ok { border-color: #16A34A; background: rgba(34,197,94,0.12); }
.rel-item.bad { border-color: #DC2626; background: rgba(239,68,68,0.12); }
.rel-item.right { background: #1E293B; }
.rel-tag { color: #38BDF8; font-size: 0.78rem; }

.agrupar-pool { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.8rem; min-height: 38px; }
.agr-item { padding: 0.5rem 0.8rem; background: #1E3A5F; border: 2px solid #3B82F6; border-radius: 18px; color: #E2E8F0; cursor: grab; font-family: inherit; }
.agr-item.sel { background: #2563EB; }
.agrupar-bins { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.agr-bin { flex: 1; min-width: 130px; min-height: 90px; background: #0F172A; border: 2px dashed #475569; border-radius: 12px; padding: 0.5rem; }
.bin-title { color: #CBD5E1; font-weight: 700; font-size: 0.85rem; margin: 0 0 0.4rem; text-align: center; }
.agr-chip { display: block; width: 100%; margin: 3px 0; padding: 0.35rem 0.5rem; background: #1E293B; border: 1px solid #475569; border-radius: 8px; color: #E2E8F0; cursor: pointer; font-family: inherit; font-size: 0.85rem; }
.agr-chip.ok { border-color: #16A34A; background: rgba(34,197,94,0.12); }
.agr-chip.bad { border-color: #DC2626; background: rgba(239,68,68,0.12); }

.btn-check { margin-top: 0.9rem; background: #0EA5E9; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-check:disabled { opacity: 0.5; cursor: not-allowed; }

.quiz-feedback { margin-top: 1.1rem; padding: 1rem; border-radius: 12px; }
.quiz-feedback.ok { background: rgba(34,197,94,0.1); border-left: 4px solid #16A34A; }
.quiz-feedback.no { background: rgba(239,68,68,0.1); border-left: 4px solid #DC2626; }
.feedback-title { margin: 0 0 0.4rem; font-weight: 700; color: #F1F5F9; }
.feedback-exp { margin: 0 0 0.9rem; color: #CBD5E1; font-size: 0.92rem; }
.btn-next { background: #0EA5E9; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.95rem; }

.quiz-result { text-align: center; padding: 1rem; }
.result-stars { font-size: 2.5rem; margin-bottom: 0.5rem; }
.rstar { color: #475569; } .rstar.filled { color: #FCD34D; }
.quiz-result h2 { color: #F1F5F9; margin: 0.5rem 0; }
.result-msg { color: #CBD5E1; margin-bottom: 1.25rem; }
.btn-retry { background: #334155; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 600; cursor: pointer; font-family: inherit; }

/* ───────── Fase Aprende (slides) ───────── */
.learn { display: flex; flex-direction: column; gap: 1rem; }
.learn-head { display: flex; align-items: center; justify-content: space-between; }
.learn-step { color: #7DD3FC; font-weight: 700; font-size: 0.85rem; }
.btn-voz { background: #0EA5E9; border: none; color: white; border-radius: 50%; width: 34px; height: 34px; font-size: 1rem; cursor: pointer; margin-left: auto; }
.btn-voz.inline { width: 30px; height: 30px; font-size: 0.9rem; vertical-align: middle; margin-left: 0.4rem; }
.btn-voz:active { transform: scale(0.92); }
.btn-skip { background: transparent; border: none; color: #64748B; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; }
.btn-skip:hover { color: #94A3B8; }
.slide {
  background: linear-gradient(160deg, #0F172A, #1E293B);
  border: 2px solid #334155; border-radius: 18px; padding: 1.75rem 1.5rem;
  text-align: center; min-height: 240px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.6rem;
  animation: slideIn 0.35s ease;
}
.slide.aplica { border-color: #FCD34D; background: linear-gradient(160deg, #1E293B, #422006); }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
.slide-emoji { font-size: 3.2rem; line-height: 1; }
.slide-badge { background: #FCD34D; color: #78350F; font-size: 0.7rem; font-weight: 800; padding: 3px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.slide-title { color: #F1F5F9; font-size: 1.4rem; margin: 0; line-height: 1.3; }
.slide-text { color: #CBD5E1; font-size: 1.02rem; line-height: 1.6; margin: 0; max-width: 520px; }
.slide-dots { display: flex; gap: 6px; justify-content: center; }
.sd { width: 8px; height: 8px; border-radius: 50%; background: #334155; transition: all 0.2s; }
.sd.on { background: #0EA5E9; transform: scale(1.3); }
.slide-nav { display: flex; gap: 0.75rem; justify-content: center; }
.btn-ghost { background: #334155; color: #E2E8F0; border: none; padding: 0.65rem 1.2rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-ghost:hover { background: #475569; }
.slide-go { font-size: 1rem; padding: 0.65rem 1.6rem; }
.juego-fase { display: flex; flex-direction: column; }
</style>
