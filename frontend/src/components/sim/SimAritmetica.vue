<template>
  <div class="sa">
    <div class="sa-bar">
      <button class="voz" @click="narrar(config.instruccion)" aria-label="Escuchar">🔊</button>
      <p class="sa-instru">{{ config.instruccion }}</p>
    </div>

    <!-- ════ BALANZA DE IGUALDAD ════ -->
    <template v-if="modo === 'balanza'">
      <div class="bal-stage">
        <div class="bal-beam" :style="{ transform: `rotate(${angle}deg)` }">
          <div class="tray izq">
            <div class="tray-blocks"><span v-for="i in izq" :key="i" class="blk b1">🟦</span></div>
            <div class="tray-num">{{ izq }}</div>
          </div>
          <div class="tray der">
            <div class="tray-blocks"><span v-for="i in der" :key="i" class="blk b2">🟧</span></div>
            <div class="tray-num">{{ der }}</div>
          </div>
        </div>
        <div class="bal-fulcro"></div>
        <div class="bal-base"></div>
      </div>
      <p class="bal-eq" :class="{ ok: der === izq }">{{ izqLabel }} <b>{{ der === izq ? '=' : der > izq ? '<' : '>' }}</b> {{ der }}</p>
      <div class="sa-controls">
        <button class="cbtn menos" :disabled="der <= 0" @click="der--">➖</button>
        <span class="cbtn-lbl">Pon bloques 🟧</span>
        <button class="cbtn mas" :disabled="der >= 12" @click="der++">➕</button>
      </div>
    </template>

    <!-- ════ SUMAR JUNTANDO GRUPOS ════ -->
    <template v-else-if="modo === 'suma'">
      <div class="suma-stage">
        <div class="grupo" :class="{ vaciado: juntado }">
          <div class="g-objs"><span v-for="i in config.a" :key="i" class="obj">{{ config.objeto }}</span></div>
          <div class="g-num">{{ config.a }}</div>
        </div>
        <div class="signo">➕</div>
        <div class="grupo" :class="{ vaciado: juntado }">
          <div class="g-objs"><span v-for="i in config.b" :key="i" class="obj">{{ config.objeto }}</span></div>
          <div class="g-num">{{ config.b }}</div>
        </div>
        <template v-if="juntado">
          <div class="signo">=</div>
          <div class="caja">
            <div class="g-objs"><span v-for="i in (config.a + config.b)" :key="i" class="obj pop">{{ config.objeto }}</span></div>
            <div class="g-num grande">?</div>
          </div>
        </template>
      </div>
      <button v-if="!juntado" class="btn-juntar" @click="juntar">🤝 ¡Juntar los grupos!</button>
      <div v-else class="sa-reto">
        <p class="reto-q">¿Cuántos hay en total?</p>
        <div class="reto-ops">
          <button v-for="(op, i) in ops" :key="i"
            :class="['op', { ok: resp && i === okIdx, mal: resp && sel === i && i !== okIdx }]"
            :disabled="resp && acerto" @click="responder(i)">{{ op }}</button>
        </div>
      </div>
    </template>

    <div class="sa-footer">
      <p v-if="logrado" class="ok-msg">🎉 ¡Excelente! Lo lograste.</p>
      <p v-else-if="metaTxt" class="meta">🎯 {{ metaTxt }}</p>
      <button class="btn-completar" :disabled="!logrado" @click="completar">{{ logrado ? '✅ ¡Completar!' : 'Resuelve…' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAudio } from '@/composables/useAudio';
import { slugFrase } from '@/composables/vozBank';

const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();
const audio = useAudio();
const narrar = (t?: string) => { if (t) audio.narrate('', `/audio/sim-bank/${slugFrase(t)}.mp3`); };

const modo = computed(() => props.config.modo || 'balanza');
const izq = computed(() => props.config.izquierda ?? 5);
const izqLabel = computed(() => props.config.etiquetaIzq || String(izq.value));

// Balanza
const der = ref(0);
const angle = computed(() => Math.max(-26, Math.min(26, (der.value - izq.value) * 7)));
let intentos = 0;
watch(der, () => { intentos++; if (der.value === izq.value) { audio.sfx('sfx-correcto'); } });

// Suma
const juntado = ref(false);
const sel = ref<number | null>(null), resp = ref(false), acerto = ref(false);
function barajar(arr: number[]) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }
const total = computed(() => (props.config.a ?? 0) + (props.config.b ?? 0));
const ops = ref<number[]>([]);
const okIdx = ref(0);
function prepararOps() { const t = total.value; const set = new Set<number>([t]); while (set.size < 3) { const d = t + (Math.floor(Math.random() * 5) - 2); if (d >= 0 && d !== t) set.add(d); } ops.value = barajar([...set]); okIdx.value = ops.value.indexOf(t); }

const logrado = computed(() => (modo.value === 'balanza' ? der.value === izq.value : acerto.value));
const metaTxt = computed(() => (modo.value === 'balanza' ? 'Pon los bloques 🟧 necesarios para equilibrar la balanza' : 'Junta los grupos y di cuántos hay en total'));

function juntar() { juntado.value = true; audio.sfx('sfx-salto'); }
function responder(i: number) { if (resp.value && acerto.value) return; sel.value = i; resp.value = true; acerto.value = i === okIdx.value; audio.sfx(acerto.value ? 'sfx-correcto' : 'sfx-error'); }

let done = false;
function completar() { if (logrado.value && !done) { done = true; audio.sfx('sfx-ganar'); const stars = modo.value === 'balanza' ? (intentos <= izq.value + 1 ? 3 : 2) : (resp.value && !acerto.value ? 2 : 3); emit('complete', stars); } }

onMounted(() => { if (modo.value === 'suma') prepararOps(); setTimeout(() => narrar(props.config.instruccion), 350); });
onUnmounted(() => { /* nada que liberar */ });
</script>

<style scoped>
.sa { display: flex; flex-direction: column; align-items: center; gap: 0.9rem; width: 100%; }
.sa-bar { display: flex; align-items: center; gap: 0.6rem; width: 100%; max-width: 600px; }
.voz { background: #14B8A6; border: none; color: #fff; border-radius: 50%; width: 36px; height: 36px; font-size: 1rem; cursor: pointer; flex-shrink: 0; }
.voz:active { transform: scale(0.92); }
.sa-instru { color: #CBD5E1; margin: 0; font-size: 0.95rem; line-height: 1.4; }

/* Balanza */
.bal-stage { position: relative; width: 100%; max-width: 560px; height: 240px; display: flex; align-items: flex-end; justify-content: center; }
.bal-beam { position: absolute; top: 70px; left: 50%; width: 420px; height: 14px; margin-left: -210px; background: linear-gradient(180deg,#a78bfa,#7c3aed); border-radius: 10px; transform-origin: 50% 50%; transition: transform 0.5s cubic-bezier(.34,1.4,.64,1); }
.tray { position: absolute; top: -6px; width: 130px; display: flex; flex-direction: column; align-items: center; }
.tray.izq { left: -40px; } .tray.der { right: -40px; }
.tray-blocks { min-height: 64px; display: flex; flex-wrap: wrap-reverse; gap: 2px; justify-content: center; align-items: flex-end; background: rgba(255,255,255,0.06); border: 2px solid #475569; border-radius: 10px; padding: 4px; width: 120px; }
.blk { font-size: 1.2rem; line-height: 1; }
.tray-num { margin-top: 4px; font-size: 1.5rem; font-weight: 800; color: #E2E8F0; font-family: 'Space Grotesk', sans-serif; }
.bal-fulcro { position: absolute; bottom: 30px; left: 50%; width: 0; height: 0; margin-left: -26px; border-left: 26px solid transparent; border-right: 26px solid transparent; border-bottom: 100px solid #475569; }
.bal-base { position: absolute; bottom: 22px; left: 50%; width: 140px; height: 14px; margin-left: -70px; background: #334155; border-radius: 8px; }
.bal-eq { font-size: 1.6rem; color: #E2E8F0; margin: 0; font-family: 'Space Grotesk', sans-serif; }
.bal-eq b { color: #F59E0B; font-size: 1.9rem; } .bal-eq.ok b { color: #4ADE80; }
.sa-controls { display: flex; gap: 1rem; align-items: center; }
.cbtn { width: 64px; height: 64px; border-radius: 50%; border: none; font-size: 1.8rem; cursor: pointer; color: #fff; }
.cbtn.mas { background: linear-gradient(160deg,#22C55E,#16A34A); box-shadow: 0 5px 0 #15803D; }
.cbtn.menos { background: linear-gradient(160deg,#F87171,#DC2626); box-shadow: 0 5px 0 #991B1B; }
.cbtn:disabled { opacity: 0.4; } .cbtn:active:not(:disabled) { transform: translateY(3px); }
.cbtn-lbl { color: #94A3B8; font-size: 0.9rem; }

/* Suma */
.suma-stage { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; justify-content: center; background: rgba(255,255,255,0.04); border: 1px solid #334155; border-radius: 16px; padding: 1rem; max-width: 600px; }
.grupo, .caja { background: #0F172A; border: 2px solid #334155; border-radius: 12px; padding: 0.6rem; text-align: center; transition: opacity 0.4s; }
.grupo.vaciado { opacity: 0.35; }
.caja { border-color: #22D3EE; }
.g-objs { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; max-width: 150px; }
.obj { font-size: 1.7rem; } .obj.pop { animation: pop 0.4s; }
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
.g-num { font-size: 1.6rem; font-weight: 800; color: #FCD34D; margin-top: 4px; font-family: 'Space Grotesk', sans-serif; }
.g-num.grande { font-size: 2.2rem; color: #22D3EE; }
.signo { font-size: 1.8rem; color: #CBD5E1; }
.btn-juntar { background: linear-gradient(160deg,#0EA5E9,#0369A1); color: #fff; border: none; padding: 0.8rem 1.6rem; border-radius: 14px; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 5px 0 #075985; }
.btn-juntar:active { transform: translateY(3px); box-shadow: 0 2px 0 #075985; }
.sa-reto { width: 100%; max-width: 560px; background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 0.9rem; }
.reto-q { color: #F1F5F9; font-weight: 600; margin: 0 0 0.6rem; text-align: center; }
.reto-ops { display: flex; gap: 0.6rem; justify-content: center; }
.op { width: 80px; height: 70px; background: #0F172A; border: 2px solid #334155; border-radius: 12px; color: #E2E8F0; cursor: pointer; font-family: inherit; font-size: 2rem; font-weight: 800; }
.op.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.op.mal { border-color: #DC2626; background: rgba(239,68,68,0.18); }

.sa-footer { text-align: center; }
.ok-msg { color: #4ADE80; font-weight: 700; margin: 0 0 0.4rem; }
.meta { color: #94A3B8; margin: 0 0 0.4rem; font-size: 0.9rem; }
.btn-completar { background: #14B8A6; color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: inherit; }
.btn-completar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
