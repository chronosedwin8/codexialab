<template>
  <div class="lb">
    <div class="lb-stage" ref="stageEl">
      <canvas ref="lienzo" class="lb-canvas"></canvas>
      <div v-if="sinWebgl" class="lb-nowebgl">Tu dispositivo no soporta 3D 😕</div>
      <div class="lb-meta">🎯 Enciende {{ metas.length }} placa{{ metas.length > 1 ? 's' : '' }} azul{{ metas.length > 1 ? 'es' : '' }}</div>
      <button class="lb-audio" @click="reproducirAudio" title="Escuchar explicación">🔊</button>
      <div class="zoom-ctrl">
        <button @click="zoomIn" title="Acercar">➕</button>
        <button @click="zoomOut" title="Alejar">➖</button>
      </div>
      <transition name="fade"><div v-if="mensaje" class="lb-msg" :class="estado">{{ mensaje }}</div></transition>
    </div>

    <div class="lb-panel">
      <!-- Paleta de comandos -->
      <div class="paleta">
        <button v-for="c in comandos" :key="c" class="cmd" :class="c" @click="addBlock(c)" :title="CMD_INFO[c].lbl">
          <span class="cmd-ic">{{ CMD_INFO[c].ic }}</span>
        </button>
      </div>

      <!-- Zonas de programa -->
      <div class="zonas">
        <div v-for="z in zonasVisibles" :key="z" class="zona" :class="{ sel: zonaSel === z }" @click="zonaSel = z">
          <div class="zona-lbl">{{ z === 'main' ? 'MAIN' : z.toUpperCase() }} <span class="cap">{{ prog[z].length }}/{{ limites[z] }}</span></div>
          <div class="slots">
            <button v-for="(b, i) in prog[z]" :key="i" class="slot" :class="b" @click.stop="removeBlock(z, i)">{{ CMD_INFO[b].ic }}</button>
            <span v-for="i in Math.max(0, limites[z] - prog[z].length)" :key="'e' + i" class="slot vacio"></span>
          </div>
        </div>
      </div>

      <div class="lb-acciones">
        <button class="btn-go" :disabled="animando" @click="ejecutar">▶ GO</button>
        <button class="btn-sec" :disabled="animando" @click="reset(true)">🗑️ Limpiar</button>
        <button class="btn-sec" :disabled="animando" @click="reset(false)">↺ Reiniciar bot</button>
        <span class="total">Comandos: {{ totalCmds }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { createThreeScene, webglDisponible, type ThreeScene } from '@/composables/useThreeScene';
import { useAudio } from '@/composables/useAudio';

type Cmd = 'avanzar' | 'girarIzquierda' | 'girarDerecha' | 'saltar' | 'encender' | 'f1' | 'f2' | 'siObstaculo' | 'siLibre';
type Zona = 'main' | 'f1' | 'f2';
const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();
const audio = useAudio();

const CMD_INFO: Record<Cmd, { ic: string; lbl: string }> = {
  avanzar: { ic: '⬆️', lbl: 'Avanzar' },
  girarIzquierda: { ic: '↺', lbl: 'Girar izquierda' },
  girarDerecha: { ic: '↻', lbl: 'Girar derecha' },
  saltar: { ic: '⤴️', lbl: 'Saltar' },
  encender: { ic: '💡', lbl: 'Encender luz' },
  f1: { ic: 'F1', lbl: 'Función 1' },
  f2: { ic: 'F2', lbl: 'Función 2' },
  siObstaculo: { ic: '⛔?', lbl: 'Si hay obstáculo, haz el siguiente bloque' },
  siLibre: { ic: '✅?', lbl: 'Si el paso está libre, haz el siguiente bloque' },
};

const grid: number[][] = props.config.grid;
const spawn = props.config.spawn as { x: number; y: number; dir: 'norte' | 'sur' | 'este' | 'oeste' };
const metas = (props.config.metas ?? []) as { x: number; y: number }[];
const comandos = (props.config.comandos ?? ['avanzar', 'girarIzquierda', 'girarDerecha', 'encender']) as Cmd[];
const funciones = props.config.funciones ?? { f1: false, f2: false };
const limites = props.config.limites ?? { main: 12, f1: 6, f2: 6 };
const estrellas = props.config.estrellas ?? { tres: 6, dos: 10 };

const rows = grid.length, cols = grid[0]?.length ?? 0;
const offX = (cols - 1) / 2, offZ = (rows - 1) / 2;
let maxH = 1; for (const r of grid) for (const h of r) if (h > maxH) maxH = h;

const prog = reactive<Record<Zona, Cmd[]>>({ main: [], f1: [], f2: [] });
const zonaSel = ref<Zona>('main');
const zonasVisibles = computed<Zona[]>(() => ['main', ...(funciones.f1 ? ['f1'] : []), ...(funciones.f2 ? ['f2'] : [])] as Zona[]);
const totalCmds = computed(() => prog.main.length + prog.f1.length + prog.f2.length);
const mensaje = ref('Arrastra... ¡toca comandos para armar tu algoritmo y pulsa GO!');
const estado = ref<'listo' | 'corriendo' | 'gano' | 'fallo'>('listo');
const animando = ref(false);
const sinWebgl = ref(false);

function addBlock(c: Cmd) {
  if (animando.value) return;
  const z = zonaSel.value;
  if (prog[z].length >= limites[z]) { mensaje.value = `La zona ${z.toUpperCase()} está llena`; return; }
  prog[z].push(c);
}
function removeBlock(z: Zona, i: number) { if (!animando.value) prog[z].splice(i, 1); }

function codeFor(t: Cmd): string { return t === 'f1' ? 'f1();' : t === 'f2' ? 'f2();' : `bot.${t}();`; }
function body(arr: Cmd[]): string {
  // Un bloque condicional (siObstaculo/siLibre) envuelve al SIGUIENTE bloque en un if(sensor){...}
  let out = '';
  for (let i = 0; i < arr.length; i++) {
    const t = arr[i];
    if (t === 'siObstaculo' || t === 'siLibre') {
      const next = arr[i + 1];
      if (next && next !== 'siObstaculo' && next !== 'siLibre') {
        const s = t === 'siObstaculo' ? 'bot.hayObstaculo()' : 'bot.puedeAvanzar()';
        out += `if(${s}){ ${codeFor(next)} } `; i++;
      }
    } else out += codeFor(t) + ' ';
  }
  return out;
}
function generarCodigo(): string {
  return `function f1(){ ${body(prog.f1)} }\nfunction f2(){ ${body(prog.f2)} }\n${body(prog.main)}`;
}

// ───────── Three.js ─────────
const stageEl = ref<HTMLDivElement | null>(null);
const lienzo = ref<HTMLCanvasElement | null>(null);
let ts: ThreeScene | null = null;
let robot: any = null, bulbMat: any = null;
let camTarget: any = null, camOff: any = null, camDist = 10, camBaseDist = 10;
const goalMeshes = new Map<string, any>();
let cola: any[] = [];
let anim: any = null;
let robotPos = { x: spawn.x, y: spawn.y, z: gridH(spawn.x, spawn.y) ?? 1 };
let resultadoGana = false;
let emitido = false;

function gridH(x: number, y: number): number | null { return (x >= 0 && y >= 0 && y < rows && x < cols && grid[y][x] > 0) ? grid[y][x] : null; }
function angDir(d: string): number { return d === 'sur' ? 0 : d === 'norte' ? Math.PI : d === 'este' ? Math.PI / 2 : -Math.PI / 2; }
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function construirMundo() {
  if (!ts) return;
  const T = ts.THREE;
  ts.scene.add(new T.AmbientLight(0xffffff, 0.62));
  const d = new T.DirectionalLight(0xffffff, 0.95); d.position.set(6, 12, 8); ts.scene.add(d);
  ts.scene.add(new T.HemisphereLight(0xbfe3ff, 0x334155, 0.5));

  const mundo = new T.Group();
  const matLado = new T.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.85 });
  const matTop = new T.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 });
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const h = grid[y][x]; if (!h) continue;
    const geo = new T.BoxGeometry(0.96, h, 0.96);
    const box = new T.Mesh(geo, [matLado, matLado, matTop, matLado, matLado, matLado]);
    box.position.set(x - offX, h / 2, y - offZ); mundo.add(box);
    box.add(new T.LineSegments(new T.EdgesGeometry(geo), new T.LineBasicMaterial({ color: 0x94a3b8 })));
    const k = `${x},${y}`;
    if (metas.some((m) => m.x === x && m.y === y)) {
      const placa = new T.Mesh(new T.BoxGeometry(0.84, 0.08, 0.84), new T.MeshStandardMaterial({ color: 0x2563eb, emissive: 0x1e40af, emissiveIntensity: 0.5, roughness: 0.4 }));
      placa.position.set(x - offX, h + 0.04, y - offZ); mundo.add(placa); goalMeshes.set(k, placa);
    }
  }
  ts.scene.add(mundo);

  // Robot
  robot = new T.Group();
  const gris = new T.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5, metalness: 0.1 });
  const cuerpo = new T.Mesh(new T.CylinderGeometry(0.2, 0.26, 0.42, 18), gris); cuerpo.position.y = 0.28; robot.add(cuerpo);
  const cabeza = new T.Mesh(new T.SphereGeometry(0.2, 20, 20), gris); cabeza.position.y = 0.64; robot.add(cabeza);
  // ojos (al frente, +Z)
  const ojoMat = new T.MeshStandardMaterial({ color: 0x1e293b });
  for (const sx of [-0.07, 0.07]) { const o = new T.Mesh(new T.SphereGeometry(0.035, 8, 8), ojoMat); o.position.set(sx, 0.66, 0.18); robot.add(o); }
  // antena + bombilla
  const tallo = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 0.16, 8), gris); tallo.position.y = 0.86; robot.add(tallo);
  bulbMat = new T.MeshStandardMaterial({ color: 0xfde68a, emissive: 0x000000, emissiveIntensity: 1 });
  const bulbo = new T.Mesh(new T.SphereGeometry(0.07, 14, 14), bulbMat); bulbo.position.y = 0.98; robot.add(bulbo);
  ts.scene.add(robot);
  colocarRobot();

  // Cámara isométrica que SIGUE al robot (zona del robot grande), con zoom ajustable
  const span = Math.max(cols, rows);
  camOff = new T.Vector3(0.55, 0.82, 0.72).normalize();
  camBaseDist = span * 1.15 + maxH * 0.8 + 3;
  camDist = Math.max(5.5, camBaseDist * 0.66);   // acercado por defecto
  camTarget = robot.position.clone();
  posicionarCamara();
}

function posicionarCamara() {
  if (!ts || !camTarget || !camOff) return;
  ts.camera.position.copy(camTarget).addScaledVector(camOff, camDist);
  ts.camera.lookAt(camTarget);
}
function zoomIn() { camDist = Math.max(3.5, camDist * 0.8); posicionarCamara(); }
function zoomOut() { camDist = Math.min(camBaseDist * 1.9, camDist * 1.25); posicionarCamara(); }
function reproducirAudio() { audio.narrate(props.config?.intro || '', props.config?.narracion?.url_audio_intro); }

function worldVec(x: number, y: number, h: number) { return new ts!.THREE.Vector3(x - offX, h, y - offZ); }
function colocarRobot() {
  if (!robot) return;
  robot.position.copy(worldVec(robotPos.x, robotPos.y, robotPos.z));
  robot.rotation.y = angDir(spawn.dir);
}

function reset(limpiarPrograma: boolean) {
  cola = []; anim = null; animando.value = false; estado.value = 'listo';
  resultadoGana = false; emitido = false;
  robotPos = { x: spawn.x, y: spawn.y, z: gridH(spawn.x, spawn.y) ?? 1 };
  colocarRobot();
  if (bulbMat) { bulbMat.emissive.setHex(0x000000); }
  for (const [k, m] of goalMeshes) { m.material.color.setHex(0x2563eb); m.material.emissive.setHex(0x1e40af); m.material.emissiveIntensity = 0.5; void k; }
  if (limpiarPrograma) { prog.main = []; prog.f1 = []; prog.f2 = []; }
  mensaje.value = limpiarPrograma ? 'Programa borrado. ¡Arma uno nuevo!' : 'Bot en la salida. ¡Pulsa GO!';
}

function ejecutar() {
  if (animando.value) return;
  if (prog.main.length === 0) { mensaje.value = 'Agrega comandos a MAIN y pulsa GO ▶'; return; }
  reset(false);
  const codigo = generarCodigo();
  const api = comandos.filter((c) => c !== 'f1' && c !== 'f2');
  estado.value = 'corriendo'; mensaje.value = '🤖 Ejecutando tu algoritmo…';
  const w = new Worker(new URL('../workers/lightBot.worker.ts', import.meta.url), { type: 'module' });
  const to = setTimeout(() => { w.terminate(); mensaje.value = '⏱️ Tardó demasiado (¿bucle infinito?)'; estado.value = 'listo'; }, 5000);
  w.onmessage = (e: MessageEvent) => {
    clearTimeout(to); w.terminate();
    const { ok, acciones, ganaste, error } = e.data;
    if (!ok && (!acciones || !acciones.length)) { mensaje.value = '⚠️ ' + (error || 'Error en el programa'); estado.value = 'listo'; return; }
    cola = (acciones || []).slice(); resultadoGana = !!ganaste; animando.value = true; mensaje.value = '';
  };
  w.onerror = () => { clearTimeout(to); w.terminate(); mensaje.value = '⚠️ Error al ejecutar'; estado.value = 'listo'; };
  // Objetos planos: los Proxies reactivos de Vue no son clonables por structuredClone
  w.postMessage({ codigo, grid: JSON.parse(JSON.stringify(grid)), spawn: { x: spawn.x, y: spawn.y, dir: spawn.dir }, metas: JSON.parse(JSON.stringify(metas)), api: [...api], tope: 1500 });
}

function siguienteAnim() {
  const a = cola.shift(); if (!a) return null;
  const T = ts!.THREE;
  if (a.cmd === 'girarDerecha' || a.cmd === 'girarIzquierda') {
    const from = robot.rotation.y; const to = from + (a.cmd === 'girarDerecha' ? -Math.PI / 2 : Math.PI / 2);
    return { tipo: 'girar', t: 0, dur: 0.32, from, to };
  }
  if (a.cmd === 'encender') {
    if (a.ok) { const m = goalMeshes.get(`${a.x},${a.y}`); return { tipo: 'encender', t: 0, dur: 0.45, mesh: m }; }
    return { tipo: 'fallo', t: 0, dur: 0.25 };
  }
  if ((a.cmd === 'avanzar' || a.cmd === 'saltar')) {
    if (a.ok) {
      const from = robot.position.clone(); const to = worldVec(a.x, a.y, a.z);
      robotPos = { x: a.x, y: a.y, z: a.z };
      return { tipo: 'mover', t: 0, dur: a.cmd === 'saltar' ? 0.45 : 0.35, from, to, hop: a.cmd === 'saltar' ? 0.6 : 0.12 };
    }
    // bloqueado: empujón hacia adelante y vuelta
    const fwd = new T.Vector3(Math.sin(robot.rotation.y), 0, Math.cos(robot.rotation.y));
    return { tipo: 'bump', t: 0, dur: 0.3, base: robot.position.clone(), fwd };
  }
  return { tipo: 'fallo', t: 0, dur: 0.15 };
}

function update(dt: number) {
  if (!robot) return;
  if (animando.value) {
    if (!anim) anim = siguienteAnim();
    if (anim) {
      anim.t += dt / anim.dur; const k = Math.min(1, anim.t); const e = ease(k);
      if (anim.tipo === 'mover') {
        robot.position.lerpVectors(anim.from, anim.to, e);
        robot.position.y += Math.sin(k * Math.PI) * anim.hop;
      } else if (anim.tipo === 'girar') {
        robot.rotation.y = anim.from + (anim.to - anim.from) * e;
      } else if (anim.tipo === 'bump') {
        const f = Math.sin(k * Math.PI) * 0.18;
        robot.position.copy(anim.base).addScaledVector(anim.fwd, f);
      } else if (anim.tipo === 'encender' && anim.mesh) {
        anim.mesh.material.color.setHex(0x38bdf8); anim.mesh.material.emissive.setHex(0x38bdf8);
        anim.mesh.material.emissiveIntensity = 0.4 + Math.sin(k * Math.PI) * 0.9;
        if (bulbMat) bulbMat.emissive.setHex(0xfde047);
      }
      if (k >= 1) anim = null;
    } else {
      // terminó toda la animación
      finalizar();
    }
  }
  if (camTarget && robot) { camTarget.lerp(robot.position, Math.min(1, dt * 3.2)); posicionarCamara(); }
}

function finalizar() {
  animando.value = false;
  if (resultadoGana) {
    estado.value = 'gano'; if (bulbMat) bulbMat.emissive.setHex(0xfde047);
    audio.sfx('sfx-ganar'); mensaje.value = '✨ ¡Encendiste todas las luces!';
    const stars = totalCmds.value <= estrellas.tres ? 3 : totalCmds.value <= estrellas.dos ? 2 : 1;
    if (!emitido) { emitido = true; setTimeout(() => emit('complete', stars), 900); }
  } else {
    estado.value = 'fallo'; audio.sfx('sfx-error');
    const faltan = metas.length && goalsApagadas();
    mensaje.value = faltan ? '💡 Te faltó encender alguna luz azul' : '🤖 El robot no llegó. ¡Ajusta tu algoritmo!';
  }
}
function goalsApagadas(): boolean { for (const m of goalMeshes.values()) if (m.material.color.getHex() === 0x2563eb) return true; return false; }

onMounted(() => {
  if (!webglDisponible()) { sinWebgl.value = true; return; }
  const w = stageEl.value?.clientWidth || 360, h = stageEl.value?.clientHeight || 320;
  ts = createThreeScene(lienzo.value!, w, h);
  construirMundo();
  ts.start(update);
  mensaje.value = props.config.intro || '¡Toca comandos para armar tu algoritmo y pulsa GO!';
  window.addEventListener('resize', onResize);
});
function onResize() {
  if (!ts || !stageEl.value) return;
  const w = stageEl.value.clientWidth, h = stageEl.value.clientHeight;
  ts.renderer.setSize(w, h, false); ts.camera.aspect = w / h; ts.camera.updateProjectionMatrix();
}
onUnmounted(() => { window.removeEventListener('resize', onResize); if (ts) { ts.dispose(); ts = null; } });
</script>

<style scoped>
.lb { display: flex; flex-direction: column; height: 100%; gap: 0.5rem; padding: 0.5rem; }
.lb-stage { position: relative; width: 100%; height: 48vh; min-height: 280px; border-radius: 16px; overflow: hidden; background: linear-gradient(180deg, #1e293b, #0f172a); }
.lb-canvas { width: 100%; height: 100%; display: block; }
.lb-nowebgl { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; }
.lb-meta { position: absolute; top: 8px; left: 10px; background: rgba(0,0,0,0.5); color: #fff; padding: 0.25rem 0.6rem; border-radius: 999px; font-size: 0.8rem; }
.lb-audio { position: absolute; top: 6px; right: 10px; width: 38px; height: 38px; border: none; border-radius: 50%; background: rgba(255,255,255,0.9); font-size: 1.1rem; cursor: pointer; }
.zoom-ctrl { position: absolute; bottom: 10px; right: 10px; display: flex; flex-direction: column; gap: 6px; }
.zoom-ctrl button { width: 40px; height: 40px; border: none; border-radius: 10px; background: rgba(255,255,255,0.9); font-size: 1.1rem; font-weight: 800; cursor: pointer; }
.zoom-ctrl button:active { transform: scale(0.92); }
.lb-msg { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.72); color: #fff; padding: 0.5rem 1rem; border-radius: 14px; font-weight: 700; text-align: center; max-width: 90%; }
.lb-msg.gano { background: #16a34a; } .lb-msg.fallo { background: #b91c1c; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; } .fade-enter-from, .fade-leave-to { opacity: 0; }

.lb-panel { background: #0f172a; border-radius: 16px; padding: 0.7rem; display: flex; flex-direction: column; gap: 0.6rem; }
.paleta { display: flex; gap: 0.45rem; flex-wrap: wrap; justify-content: center; }
.cmd { width: 52px; height: 52px; border: none; border-radius: 12px; background: #334155; color: #fff; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.cmd:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.4); }
.cmd.avanzar { background: #2563eb; } .cmd.saltar { background: #7c3aed; } .cmd.encender { background: #ca8a04; }
.cmd.girarDerecha, .cmd.girarIzquierda { background: #0891b2; } .cmd.f1 { background: #db2777; } .cmd.f2 { background: #be123c; font-size: 1rem; }
.cmd.f1, .cmd.f2 { font-size: 1.05rem; font-weight: 800; }
.cmd.siObstaculo { background: #ea580c; font-size: 0.95rem; } .cmd.siLibre { background: #15803d; font-size: 0.95rem; }

.zonas { display: flex; flex-direction: column; gap: 0.45rem; }
.zona { background: rgba(255,255,255,0.05); border: 2px solid transparent; border-radius: 12px; padding: 0.4rem 0.5rem; cursor: pointer; }
.zona.sel { border-color: #38bdf8; background: rgba(56,189,248,0.1); }
.zona-lbl { color: #94a3b8; font-size: 0.72rem; font-weight: 800; letter-spacing: 1px; display: flex; justify-content: space-between; margin-bottom: 0.25rem; }
.cap { color: #64748b; }
.slots { display: flex; gap: 5px; flex-wrap: wrap; }
.slot { width: 34px; height: 34px; border: none; border-radius: 8px; background: #334155; color: #fff; font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.slot.avanzar { background: #2563eb; } .slot.saltar { background: #7c3aed; } .slot.encender { background: #ca8a04; }
.slot.girarDerecha, .slot.girarIzquierda { background: #0891b2; } .slot.f1 { background: #db2777; font-weight: 800; font-size: 0.85rem; } .slot.f2 { background: #be123c; font-weight: 800; font-size: 0.85rem; }
.slot.siObstaculo { background: #ea580c; font-size: 0.7rem; } .slot.siLibre { background: #15803d; font-size: 0.7rem; }
.slot.vacio { background: rgba(255,255,255,0.06); cursor: default; }

.lb-acciones { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.btn-go { background: linear-gradient(160deg,#22c55e,#16a34a); color: #fff; border: none; padding: 0.6rem 1.6rem; border-radius: 12px; font-weight: 800; font-size: 1.1rem; cursor: pointer; box-shadow: 0 4px 0 #15803d; font-family: inherit; }
.btn-go:disabled { opacity: 0.5; }
.btn-go:active:not(:disabled) { transform: translateY(2px); box-shadow: 0 2px 0 #15803d; }
.btn-sec { background: #334155; color: #e2e8f0; border: none; padding: 0.55rem 0.8rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.85rem; }
.total { color: #94a3b8; font-size: 0.85rem; margin-left: auto; font-weight: 700; }
</style>
