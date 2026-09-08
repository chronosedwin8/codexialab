<template>
  <div class="jz">
    <header class="jz-head">
      <RouterLink to="/mapa" class="back">⬅️ Mapa</RouterLink>
      <h1>🎮 Zona de Juegos</h1>
      <span></span>
    </header>
    <p class="jz-sub">Juegos de concentración con mundos infinitos. ¡Compite por el mejor puntaje!</p>

    <div class="jz-grid">
      <button class="jcard play" @click="$router.push('/juegos/roll-ball-up')">
        <div class="jc-emoji">🟠⬆️</div>
        <div class="jc-name">Roll-Ball-Up</div>
        <div class="jc-desc">Sube saltando sin caer. Mundos infinitos que se ponen más difíciles.</div>
        <div class="jc-record">🥇 {{ record1 ? `${record1.nombre} — ${record1.puntos} m` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>

      <button class="jcard play ap" @click="$router.push('/juegos/arrow-path')">
        <div class="jc-emoji">🧭➡️</div>
        <div class="jc-name">Arrow Path</div>
        <div class="jc-desc">Arma el camino de flechas hasta la meta. 100+ niveles que suben de dificultad.</div>
        <div class="jc-record">🥇 {{ recordAP ? `${recordAP.nombre} — Niv ${recordAP.puntos}` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>

      <button class="jcard play mf" @click="$router.push('/juegos/memo-flash')">
        <div class="jc-emoji">🧠✨</div>
        <div class="jc-name">Memo-Flash</div>
        <div class="jc-desc">Observa la secuencia que destella y repítela. Mundos infinitos, cada vez más rápido.</div>
        <div class="jc-record">🥇 {{ recordMF ? `${recordMF.nombre} — R${recordMF.puntos}` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>

      <button class="jcard play mt" @click="$router.push('/juegos/memo-tablas')">
        <div class="jc-emoji">✖️🧠</div>
        <div class="jc-name">Memo-Tablas</div>
        <div class="jc-desc">Empareja cada multiplicación con su resultado. Tablas 1–10, rondas y mundos con tiempo.</div>
        <div class="jc-record">🥇 {{ recordMT ? `${recordMT.nombre} — ${recordMT.puntos}` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>

      <button class="jcard play sn" @click="$router.push('/juegos/mind-snake')">
        <div class="jc-emoji">🐍🍎</div>
        <div class="jc-name">Mind-Snake</div>
        <div class="jc-desc">Come y crece sin chocar. Mundos infinitos que aceleran y suman obstáculos.</div>
        <div class="jc-record">🥇 {{ recordSN ? `${recordSN.nombre} — ${recordSN.puntos}🍎` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>

      <button class="jcard play lh" @click="$router.push('/juegos/lee-hora')">
        <div class="jc-emoji">🕐⏰</div>
        <div class="jc-name">Lee la Hora</div>
        <div class="jc-desc">Mira el reloj digital y elige el analógico que marca la misma hora. Mundos con minutos y 24h.</div>
        <div class="jc-record">🥇 {{ recordLH ? `${recordLH.nombre} — ${recordLH.puntos}` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>

      <button class="jcard play b3" @click="$router.push('/juegos/bloque-3d')">
        <div class="jc-emoji">🧊🕳️</div>
        <div class="jc-name">Puzzle de Bloque 3D</div>
        <div class="jc-desc">Estilo Bloxorz: rueda el bloque y déjalo parado en el agujero. Niveles de razonamiento espacial.</div>
        <div class="jc-record">🥇 {{ recordB3 ? `${recordB3.nombre} — Niv ${recordB3.puntos}` : 'Sé el primero' }}</div>
        <span class="jc-btn">▶ Jugar</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { juegosApi } from '@/api/index';
const record1 = ref<any>(null);
const recordAP = ref<any>(null);
const recordMF = ref<any>(null);
const recordSN = ref<any>(null);
const recordMT = ref<any>(null);
const recordLH = ref<any>(null);
const recordB3 = ref<any>(null);
onMounted(async () => {
  try { record1.value = (await juegosApi.top('roll-ball-up', 1)).top?.[0] ?? null; } catch { /* noop */ }
  try { recordAP.value = (await juegosApi.top('arrow-path', 1)).top?.[0] ?? null; } catch { /* noop */ }
  try { recordMF.value = (await juegosApi.top('memo-flash', 1)).top?.[0] ?? null; } catch { /* noop */ }
  try { recordSN.value = (await juegosApi.top('mind-snake', 1)).top?.[0] ?? null; } catch { /* noop */ }
  try { recordMT.value = (await juegosApi.top('memo-tablas', 1)).top?.[0] ?? null; } catch { /* noop */ }
  try { recordLH.value = (await juegosApi.top('lee-hora', 1)).top?.[0] ?? null; } catch { /* noop */ }
  try { recordB3.value = (await juegosApi.top('bloque3d', 1)).top?.[0] ?? null; } catch { /* noop */ }
});
</script>

<style scoped>
.jz { min-height: 100vh; background: linear-gradient(180deg, #1e1b4b, #312e81); padding: 1rem; font-family: 'Fredoka One', 'Baloo 2', sans-serif; }
.jz-head { display: flex; align-items: center; gap: 0.75rem; }
.jz-head h1 { flex: 1; text-align: center; color: #fff; margin: 0; font-size: 1.5rem; text-shadow: 0 2px 6px rgba(0,0,0,0.5); }
.back { background: rgba(255,255,255,0.9); border-radius: 14px; padding: 0.5rem 0.9rem; color: #312e81; font-weight: 700; text-decoration: none; }
.jz-sub { color: #c7d2fe; text-align: center; margin: 0.5rem 0 1.4rem; }
.jz-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-width: 900px; margin: 0 auto; }
.jcard { border: none; border-radius: 22px; padding: 1.3rem 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; min-height: 230px; justify-content: center; font-family: inherit; cursor: default; }
.jcard.play { background: linear-gradient(160deg, #f97316, #ea580c); color: #fff; cursor: pointer; box-shadow: 0 10px 0 #9a3412, 0 14px 24px rgba(0,0,0,0.3); transition: transform 0.15s; }
.jcard.play:hover { transform: translateY(-5px); }
.jcard.play:active { transform: translateY(4px); box-shadow: 0 5px 0 #9a3412; }
.jcard.play.ap { background: linear-gradient(160deg, #6366f1, #4338ca); box-shadow: 0 10px 0 #312e81, 0 14px 24px rgba(0,0,0,0.3); }
.jcard.play.ap:active { box-shadow: 0 5px 0 #312e81; }
.jcard.play.ap .jc-btn { color: #4338ca; }
.jcard.play.mf { background: linear-gradient(160deg, #ec4899, #be185d); box-shadow: 0 10px 0 #831843, 0 14px 24px rgba(0,0,0,0.3); }
.jcard.play.mf:active { box-shadow: 0 5px 0 #831843; }
.jcard.play.mf .jc-btn { color: #be185d; }
.jcard.play.sn { background: linear-gradient(160deg, #22c55e, #15803d); box-shadow: 0 10px 0 #14532d, 0 14px 24px rgba(0,0,0,0.3); }
.jcard.play.sn:active { box-shadow: 0 5px 0 #14532d; }
.jcard.play.sn .jc-btn { color: #15803d; }
.jcard.play.mt { background: linear-gradient(160deg, #06b6d4, #0e7490); box-shadow: 0 10px 0 #155e75, 0 14px 24px rgba(0,0,0,0.3); }
.jcard.play.mt:active { box-shadow: 0 5px 0 #155e75; }
.jcard.play.mt .jc-btn { color: #0e7490; }
.jcard.play.lh { background: linear-gradient(160deg, #f59e0b, #b45309); box-shadow: 0 10px 0 #7c2d12, 0 14px 24px rgba(0,0,0,0.3); }
.jcard.play.lh:active { box-shadow: 0 5px 0 #7c2d12; }
.jcard.play.lh .jc-btn { color: #b45309; }
.jcard.play.b3 { background: linear-gradient(160deg, #64748b, #334155); box-shadow: 0 10px 0 #1e293b, 0 14px 24px rgba(0,0,0,0.3); }
.jcard.play.b3:active { box-shadow: 0 5px 0 #1e293b; }
.jcard.play.b3 .jc-btn { color: #334155; }
.jcard.soon { background: rgba(255,255,255,0.08); color: #cbd5e1; border: 2px dashed #475569; }
.jc-emoji { font-size: 3.2rem; }
.jc-name { font-size: 1.3rem; font-weight: 800; text-shadow: 0 2px 3px rgba(0,0,0,0.25); }
.jc-desc { font-size: 0.85rem; opacity: 0.95; line-height: 1.3; }
.jc-record { background: rgba(0,0,0,0.25); border-radius: 999px; padding: 0.2rem 0.7rem; font-size: 0.78rem; }
.jc-btn { margin-top: 0.4rem; background: #fff; color: #ea580c; font-weight: 800; padding: 0.5rem 1.4rem; border-radius: 14px; }
.jc-soon { background: #475569; color: #e2e8f0; padding: 0.25rem 0.8rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
</style>
