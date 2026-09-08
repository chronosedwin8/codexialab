<template>
  <div class="s3">
    <div class="s3-bar">
      <button class="voz" @click="narrar(config.instruccion)" aria-label="Escuchar">🔊</button>
      <p class="s3-instru">{{ config.instruccion }}</p>
    </div>

    <div v-if="!soportado" class="s3-fallback">
      🛰️ Tu dispositivo no puede mostrar 3D, pero igual puedes responder el reto.
    </div>
    <canvas v-else ref="lienzo" :width="W" :height="H" class="s3-canvas"
      @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointerleave="onUp" @wheel.prevent="onWheel"></canvas>
    <p v-if="soportado" class="s3-hint">🖐️ Arrastra para girar · 🖱️ rueda para acercar</p>

    <!-- Reto -->
    <div v-if="reto" class="s3-reto">
      <p class="reto-q">{{ reto.enunciado }}</p>
      <div class="reto-ops">
        <button v-for="(op, i) in reto.opciones" :key="i"
          :class="['op', { ok: resp && i === reto.correcta, mal: resp && sel === i && i !== reto.correcta }]"
          :disabled="resp && acerto" @click="responder(i)">{{ op }}</button>
      </div>
    </div>

    <div class="s3-footer">
      <p v-if="logrado" class="ok">🎉 ¡Excelente! Lo lograste.</p>
      <button class="btn-completar" :disabled="!logrado" @click="completar">{{ logrado ? '✅ ¡Completar!' : 'Explora y responde…' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createThreeScene, webglDisponible, type ThreeScene } from '@/composables/useThreeScene';
import { useAudio } from '@/composables/useAudio';
import { slugFrase } from '@/composables/vozBank';

const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();
const audio = useAudio();
const narrar = (t?: string) => { if (t) audio.narrate('', `/audio/sim-bank/${slugFrase(t)}.mp3`); };

const W = 560, H = 340;
const soportado = webglDisponible();
const lienzo = ref<HTMLCanvasElement | null>(null);
let ts: ThreeScene | null = null;
let mundo: any = null;
const planetas: Array<{ mesh: any; r: number; ang: number; vel: number }> = [];

const sel = ref<number | null>(null);
const resp = ref(false);
const acerto = ref(false);
const logrado = ref(false);
// Baraja las opciones para que la correcta NO sea siempre la primera.
function barajar(q: any) { if (!q || !q.opciones) return q; const ok = q.opciones[q.correcta]; const ops = [...q.opciones]; for (let i = ops.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[ops[i], ops[j]] = [ops[j], ops[i]]; } return { ...q, opciones: ops, correcta: ops.indexOf(ok) }; }
const reto = ref<any>(barajar(props.config.reto));

// Arrastrar para girar
let drag = false, lx = 0, ly = 0;
function onDown(e: PointerEvent) { drag = true; lx = e.clientX; ly = e.clientY; }
function onMove(e: PointerEvent) {
  if (!drag || !mundo) return;
  mundo.rotation.y += (e.clientX - lx) * 0.01;
  mundo.rotation.x += (e.clientY - ly) * 0.01;
  lx = e.clientX; ly = e.clientY;
}
function onUp() { drag = false; }
function onWheel(e: WheelEvent) {
  if (!ts) return;
  ts.camera.position.z = Math.max(8, Math.min(34, ts.camera.position.z + (e.deltaY > 0 ? 1.5 : -1.5)));
}

function construirSistemaSolar() {
  const { THREE, scene, camera } = ts!;
  camera.position.set(0, 5, 20);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const luz = new THREE.PointLight(0xfff3c4, 2.2, 0, 1.4); scene.add(luz);

  mundo = new THREE.Group(); scene.add(mundo);
  // Sol
  const sol = new THREE.Mesh(new THREE.SphereGeometry(2.4, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffcc33 }));
  mundo.add(sol);
  // Planetas
  const DEF = props.config.planetas?.length ? props.config.planetas : [
    { color: 0x9ca3af, r: 4.2, size: 0.4, vel: 0.9 },
    { color: 0xe879a0, r: 6, size: 0.6, vel: 0.7 },
    { color: 0x3b82f6, r: 8, size: 0.7, vel: 0.5 },
    { color: 0xef4444, r: 10, size: 0.55, vel: 0.4 },
    { color: 0xf59e0b, r: 13, size: 1.2, vel: 0.28 },
  ];
  for (const p of DEF) {
    // anillo de órbita
    const anillo = new THREE.Mesh(new THREE.RingGeometry(p.r - 0.02, p.r + 0.02, 64), new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide }));
    anillo.rotation.x = Math.PI / 2; mundo.add(anillo);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.size, 24, 24), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8 }));
    mundo.add(mesh);
    planetas.push({ mesh, r: p.r, ang: Math.random() * Math.PI * 2, vel: p.vel });
  }
  mundo.rotation.x = 0.5;
}

function addLuces() {
  const { THREE, scene } = ts!;
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(5, 8, 6); scene.add(d);
}
function bond(a: any, b: any) {
  const THREE = ts!.THREE; const dir = new THREE.Vector3().subVectors(b, a); const len = dir.length();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, len, 12), new THREE.MeshStandardMaterial({ color: 0xcbd5e1 }));
  cyl.position.copy(a).addScaledVector(dir, 0.5); cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); mundo.add(cyl);
}

// CIENCIAS — Moléculas (átomos = esferas de colores, enlaces = cilindros)
function construirMolecula() {
  const { THREE, scene, camera } = ts!; camera.position.set(0, 0, 9); camera.lookAt(0, 0, 0); addLuces();
  mundo = new THREE.Group(); scene.add(mundo);
  const atom = (x: number, y: number, z: number, r: number, color: number) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 32), new THREE.MeshStandardMaterial({ color, roughness: 0.35 })); m.position.set(x, y, z); mundo.add(m); return m.position; };
  if ((props.config.molecula || 'agua') === 'agua') {
    const O = atom(0, 0.4, 0, 1.1, 0xef4444); const ang = (104.5 * Math.PI) / 360, d = 2;
    const H1 = atom(Math.sin(ang) * d, 0.4 - Math.cos(ang) * d, 0, 0.6, 0xf1f5f9);
    const H2 = atom(-Math.sin(ang) * d, 0.4 - Math.cos(ang) * d, 0, 0.6, 0xf1f5f9);
    bond(O, H1); bond(O, H2);
  } else {
    const C = atom(0, 0, 0, 0.95, 0x475569); const O1 = atom(2.2, 0, 0, 1, 0xef4444), O2 = atom(-2.2, 0, 0, 1, 0xef4444);
    bond(C, O1); bond(C, O2);
  }
  mundo.rotation.x = 0.3;
}

// CIENCIAS — Célula (membrana translúcida + núcleo + organelos)
function construirCelula() {
  const { THREE, scene, camera } = ts!; camera.position.set(0, 0, 12); camera.lookAt(0, 0, 0); addLuces();
  mundo = new THREE.Group(); scene.add(mundo);
  mundo.add(new THREE.Mesh(new THREE.SphereGeometry(4, 40, 40), new THREE.MeshStandardMaterial({ color: 0x34d399, transparent: true, opacity: 0.22, roughness: 0.5 })));
  mundo.add(new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), new THREE.MeshStandardMaterial({ color: 0x7c3aed }))); // núcleo
  const cols = [0xf59e0b, 0x60a5fa, 0xfbbf24, 0x22d3ee, 0xf472b6, 0xa3e635];
  for (let i = 0; i < 7; i++) { const r = 0.35 + Math.random() * 0.3; const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), new THREE.MeshStandardMaterial({ color: cols[i % cols.length] })); const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI, rad = 2.7; m.position.set(rad * Math.sin(b) * Math.cos(a), rad * Math.sin(b) * Math.sin(a), rad * Math.cos(b)); mundo.add(m); }
  mundo.rotation.x = 0.3;
}

// GEOMETRÍA — Sólidos 3D rotables (con aristas resaltadas en los poliedros)
function construirSolido() {
  const { THREE, scene, camera } = ts!; camera.position.set(0, 0, 7); camera.lookAt(0, 0, 0); addLuces();
  mundo = new THREE.Group(); scene.add(mundo);
  const t = props.config.solido || 'cubo';
  let geo: any;
  if (t === 'esfera') geo = new THREE.SphereGeometry(1.9, 40, 40);
  else if (t === 'cono') geo = new THREE.ConeGeometry(1.8, 3, 48);
  else if (t === 'cilindro') geo = new THREE.CylinderGeometry(1.5, 1.5, 3, 48);
  else if (t === 'piramide') geo = new THREE.ConeGeometry(2, 2.8, 4);
  else if (t === 'prisma') geo = new THREE.CylinderGeometry(1.7, 1.7, 3, 3);
  else geo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5, flatShading: t === 'piramide' || t === 'prisma' || t === 'cubo' }));
  mundo.add(mesh);
  if (t === 'cubo' || t === 'piramide' || t === 'prisma') mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff })));
  mundo.rotation.set(0.5, 0.6, 0);
}

function update(dt: number) {
  for (const p of planetas) { p.ang += p.vel * dt; p.mesh.position.set(Math.cos(p.ang) * p.r, 0, Math.sin(p.ang) * p.r); }
  if (!drag && mundo) mundo.rotation.y += dt * 0.05;
}

function responder(i: number) {
  if (resp.value && acerto.value) return;
  sel.value = i; resp.value = true; acerto.value = i === reto.value.correcta;
  audio.sfx(acerto.value ? 'sfx-correcto' : 'sfx-error');
  if (acerto.value) logrado.value = true;
}
let done = false;
function completar() { if (logrado.value && !done) { done = true; audio.sfx('sfx-ganar'); emit('complete', resp.value && !acerto.value ? 2 : 3); } }

onMounted(() => {
  if (soportado && lienzo.value) {
    try {
      ts = createThreeScene(lienzo.value, W, H);
      const escena = props.config.escena3d || 'sistema_solar';
      if (escena === 'molecula') construirMolecula();
      else if (escena === 'celula') construirCelula();
      else if (escena === 'solido' || props.config.solido) construirSolido();
      else construirSistemaSolar();
      ts.start(update);
    } catch { ts = null; }
  }
  if (!reto.value) logrado.value = true; // exploración libre sin reto
  setTimeout(() => narrar(props.config.instruccion), 350);
});
onUnmounted(() => { if (ts) { ts.dispose(); ts = null; } });
</script>

<style scoped>
.s3 { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; }
.s3-bar { display: flex; align-items: center; gap: 0.6rem; width: 100%; max-width: 560px; }
.voz { background: #14B8A6; border: none; color: #fff; border-radius: 50%; width: 36px; height: 36px; font-size: 1rem; cursor: pointer; flex-shrink: 0; }
.voz:active { transform: scale(0.92); }
.s3-instru { color: #CBD5E1; margin: 0; font-size: 0.95rem; line-height: 1.4; }
.s3-canvas { width: 100%; max-width: 560px; border-radius: 14px; border: 1px solid #334155; background: radial-gradient(circle at 50% 40%, #0b1030, #05060f); touch-action: none; cursor: grab; }
.s3-canvas:active { cursor: grabbing; }
.s3-fallback { width: 100%; max-width: 560px; padding: 1.4rem; background: #1E293B; border: 1px solid #334155; border-radius: 14px; color: #CBD5E1; text-align: center; }
.s3-hint { color: #64748B; font-size: 0.78rem; margin: 0; }
.s3-reto { width: 100%; max-width: 560px; background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 0.9rem; }
.reto-q { color: #F1F5F9; font-weight: 600; margin: 0 0 0.6rem; }
.reto-ops { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
.op { padding: 0.6rem; background: #0F172A; border: 2px solid #334155; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; text-align: left; }
.op.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.op.mal { border-color: #DC2626; background: rgba(239,68,68,0.18); }
.s3-footer { text-align: center; }
.ok { color: #4ADE80; font-weight: 700; margin: 0 0 0.4rem; }
.btn-completar { background: #14B8A6; color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: inherit; }
.btn-completar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
