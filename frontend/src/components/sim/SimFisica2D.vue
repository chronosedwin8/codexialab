<template>
  <div class="sf">
    <div class="sf-bar">
      <button class="voz" @click="narrar(config.instruccion)" aria-label="Escuchar">🔊</button>
      <p class="sf-instru">{{ config.instruccion }}</p>
    </div>

    <div class="sf-stage">
      <canvas ref="lienzo" :width="W" :height="H" class="sf-canvas"></canvas>
      <div class="hud">
        <span v-for="(v, k) in hud" :key="k" class="hud-chip"><i>{{ k }}</i> {{ v }}</span>
      </div>
    </div>

    <div v-if="usaPlaneta" class="planetas">
      <span class="pl-lbl">Gravedad:</span>
      <button v-for="(pl, i) in PLANETAS" :key="i" :class="['pl', { on: estado.planeta === i }]" @click="estado.planeta = i">{{ pl[0] }}</button>
    </div>

    <div v-if="sliders.length" class="sf-params">
      <div v-for="p in sliders" :key="p.key" class="ctl">
        <label>{{ p.label }}: <b>{{ fmt(estado[p.key], p) }}</b></label>
        <input type="range" :min="p.min" :max="p.max" :step="p.step || 1" v-model.number="estado[p.key]" @input="onParam" />
      </div>
    </div>

    <div class="sf-controls">
      <button v-if="escena === 'polea'" class="btn-peso" @click="addContrapeso">➕ Peso ({{ estado.contrapesos }})</button>
      <button v-if="accionLabel" class="btn-soltar" :disabled="accionHecha" @click="accion">{{ accionLabel }}</button>
      <button class="btn-reset" @click="reiniciar">↺ Reiniciar</button>
    </div>

    <div v-if="preguntaVisible && preg" class="sf-reto">
      <p class="reto-q">{{ preg.enunciado }}</p>
      <div class="reto-ops">
        <button v-for="(op, i) in preg.opciones" :key="i"
          :class="['op', { ok: resp && i === preg.correcta, mal: resp && sel === i && i !== preg.correcta }]"
          :disabled="resp && acerto" @click="responder(i)">{{ op }}</button>
      </div>
    </div>

    <div class="sf-footer">
      <p v-if="logrado" class="ok">🎉 ¡Excelente! Lo lograste.</p>
      <p v-else-if="metaTexto" class="meta">🎯 {{ metaTexto }}</p>
      <button class="btn-completar" :disabled="!logrado" @click="completar">{{ logrado ? '✅ ¡Completar!' : 'Experimenta…' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
// Física ANALÍTICA exacta (estilo PhET) — sin motor de cuerpos rígidos.
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useAudio } from '@/composables/useAudio';
import { slugFrase } from '@/composables/vozBank';

const props = defineProps<{ config: any }>();
const emit = defineEmits<{ complete: [stars: number] }>();
const audio = useAudio();
const narrar = (t?: string) => { if (t) audio.narrate('', `/audio/sim-bank/${slugFrase(t)}.mp3`); };

const W = 600, H = 380, GY = 354;
const escena = props.config.escena || 'caida';
const lienzo = ref<HTMLCanvasElement | null>(null);
let ctx: CanvasRenderingContext2D | null = null;
let raf = 0, last = 0;

const PLANETAS: Array<[string, number]> = [['🌙 Luna', 1.6], ['🔴 Marte', 3.7], ['🌍 Tierra', 9.8], ['🪐 Júpiter', 24.8]];
const usaPlaneta = escena === 'caida' || escena === 'pendulo';
const P = props.config.params || {};
const estado = reactive<Record<string, number>>({
  planeta: P.planeta ?? 2, angulo: P.angulo ?? (escena === 'proyectil' ? 45 : 25),
  masa: P.masa ?? 3, friccion: P.friccion ?? 0.05, fuerza: P.fuerza ?? 45,
  longitud: P.longitud ?? 150, amplitud: P.amplitud ?? 55, distR: P.distR ?? 90, contrapesos: 0,
});
const hud = reactive<Record<string, string>>({});
const gReal = computed(() => PLANETAS[escena === 'caida' || escena === 'pendulo' ? estado.planeta : 2][1]);
const G = computed(() => gReal.value * 40); // px/s²

// Baraja las opciones para que la correcta NO sea siempre la primera.
function barajar(q: any) { if (!q || !q.opciones) return q; const ok = q.opciones[q.correcta]; const ops = [...q.opciones]; for (let i = ops.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[ops[i], ops[j]] = [ops[j], ops[i]]; } return { ...q, opciones: ops, correcta: ops.indexOf(ok) }; }
const preg = ref<any>(barajar(props.config.pregunta));
const accionHecha = ref(false), preguntaVisible = ref(false);
const sel = ref<number | null>(null), resp = ref(false), acerto = ref(false), metaFisica = ref(false);
const USA_PREGUNTA = ['caida', 'plano_inclinado', 'colision', 'pendulo'];
const logrado = computed(() => (USA_PREGUNTA.includes(escena) ? acerto.value : metaFisica.value));

const SLIDERS: Record<string, any[]> = {
  caida: [],
  plano_inclinado: [{ key: 'angulo', label: 'Inclinación', min: 10, max: 50, suf: '°' }, { key: 'friccion', label: 'Fricción', min: 0, max: 0.4, step: 0.01 }],
  colision: [{ key: 'fuerza', label: 'Velocidad', min: 10, max: 60 }],
  pendulo: [{ key: 'longitud', label: 'Largo cuerda', min: 80, max: 240 }, { key: 'amplitud', label: 'Ángulo inicial', min: 20, max: 80, suf: '°' }],
  proyectil: [{ key: 'angulo', label: 'Ángulo', min: 20, max: 75, suf: '°' }, { key: 'fuerza', label: 'Fuerza', min: 25, max: 70 }],
  palanca: [{ key: 'distR', label: 'Distancia del peso', min: 40, max: 150 }, { key: 'masa', label: 'Peso derecho', min: 1, max: 6 }],
  polea: [],
};
const sliders = computed(() => SLIDERS[escena] || []);
const fmt = (v: number, p: any) => (p.step && p.step < 1 ? v.toFixed(2) : Math.round(v)) + (p.suf || '');
const accionLabel = computed<string>(() => ((({ caida: '⬇️ ¡Soltar!', plano_inclinado: '⬇️ ¡Soltar!', polea: '⬆️ ¡Soltar!', pendulo: '⬇️ ¡Soltar!', colision: '🎱 ¡Lanzar!', proyectil: '🚀 ¡Lanzar!' }) as Record<string, string>)[escena] || ''));
const metaTexto = computed<string>(() => ((({ proyectil: 'Ajusta ángulo y fuerza para dar en la diana 🎯', palanca: 'Equilibra: peso × distancia debe ser igual en los dos lados', polea: 'Pon más peso que la carga (4) para subirla a la zona verde' }) as Record<string, string>)[escena] || ''));
const rad = (d: number) => (d * Math.PI) / 180;

// ── Estado físico (analítico) ──
const S: any = {};
function build() {
  metaFisica.value = false;
  if (escena === 'caida') { S.balls = [{ x: 150, r: 30, c: '#F87171' }, { x: 300, r: 22, c: '#60A5FA' }, { x: 450, r: 14, c: '#FBBF24' }].map((b) => ({ ...b, y: 80, vy: 0 })); }
  else if (escena === 'plano_inclinado') { const a = rad(estado.angulo); S.bx = 525; S.by = GY - 4; S.L = 440; S.tx = S.bx - Math.cos(a) * S.L; S.ty = S.by - Math.sin(a) * S.L; S.a = a; S.s = 0; S.v = 0; S.smax = S.L - 46; }
  else if (escena === 'colision') { S.cueX = 70; S.cueV = 0; S.row = [330, 376, 422]; S.lastV = 0; S.hit = false; S.y = 200; }
  else if (escena === 'pendulo') { S.ax = W / 2; S.ay = 54; S.th = rad(estado.amplitud); S.om = 0; }
  else if (escena === 'proyectil') { S.cx = 60; S.cy = GY - 10; S.px = S.cx + 14; S.py = S.cy - 30; S.flying = false; S.vx = 0; S.vy = 0; S.trail = []; S.tx0 = W - 90; S.ty0 = GY - 44; S.tw = 84; S.th = 84; }
  else if (escena === 'palanca') { S.px = W / 2; S.py = GY - 86; S.phi = 0; }
  else if (escena === 'polea') { S.wheelX = 250; S.wheelY = 56; S.zoneY = 100; S.loadY = 230; S.basketY = 150; S.v = 0; S.go = false; }
}

function step(dt: number) {
  const g = G.value;
  if (escena === 'caida' && accionHecha.value) {
    for (const b of S.balls) { b.vy += g * dt; b.y += b.vy * dt; if (b.y > GY - b.r) { b.y = GY - b.r; b.vy = Math.abs(b.vy) < 40 ? 0 : -b.vy * 0.3; } }
  } else if (escena === 'plano_inclinado' && accionHecha.value) {
    const a = g * (Math.sin(S.a) - estado.friccion * Math.cos(S.a));
    if (a > 0) { S.v += a * dt; S.s = Math.min(S.smax, S.s + S.v * dt); if (S.s >= S.smax) S.v = 0; }
  } else if (escena === 'pendulo' && accionHecha.value) {
    const L = estado.longitud; S.om += -(g / L) * Math.sin(S.th) * dt; S.om *= 0.9995; S.th += S.om * dt;
  } else if (escena === 'colision' && accionHecha.value) {
    if (!S.hit) { S.cueX += S.cueV * dt; if (S.cueX >= S.row[0] - 44) { S.cueX = S.row[0] - 44; S.hit = true; S.lastV = S.cueV; S.cueV = 0; } }
    else { S.row[2] += S.lastV * dt; }
  } else if (escena === 'proyectil' && S.flying) {
    S.px += S.vx * dt; S.py -= S.vy * dt; S.vy -= g * dt; S.trail.push({ x: S.px, y: S.py }); if (S.trail.length > 260) S.trail.shift();
    if (S.py >= GY - 14 || S.px > W + 20) S.flying = false;
  } else if (escena === 'palanca') {
    const tau = estado.masa * estado.distR - 3 * 120;           // torque neto (der − izq)
    const target = Math.max(-0.42, Math.min(0.42, tau * 0.0009));
    S.phi += (target - S.phi) * Math.min(1, dt * 6);
  } else if (escena === 'polea' && S.go) {
    const mL = 4, mR = estado.contrapesos * 2;
    const a = ((mR - mL) / (mR + mL)) * g; S.v += a * dt;
    S.loadY -= S.v * dt; S.basketY += S.v * dt;
    if (S.loadY <= S.zoneY) { S.loadY = S.zoneY; S.go = false; }
  }
  checkMeta();
}

function checkMeta() {
  if (metaFisica.value) return;
  if (escena === 'proyectil') { if (S.px > S.tx0 - S.tw / 2 && S.px < S.tx0 + S.tw / 2 && S.py > S.ty0 - S.th / 2 && S.py < S.ty0 + S.th / 2) ganar(); }
  else if (escena === 'palanca') { if (Math.abs(estado.masa * estado.distR - 360) < 6 && Math.abs(S.phi) < 0.03) ganar(); }
  else if (escena === 'polea') { if (S.loadY <= S.zoneY + 1 && estado.contrapesos >= 3) ganar(); }
}
function ganar() { metaFisica.value = true; audio.sfx('sfx-correcto'); }

// ── Render ──
function bg() { const g = ctx!.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1228'); g.addColorStop(1, '#0f1e3a'); ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, H); ctx!.strokeStyle = 'rgba(148,163,184,0.10)'; ctx!.lineWidth = 1; for (let x = 0; x <= W; x += 40) { ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, H); ctx!.stroke(); } for (let y = 0; y <= H; y += 40) { ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(W, y); ctx!.stroke(); } }
function suelo() { const g = ctx!.createLinearGradient(0, GY, 0, H); g.addColorStop(0, '#3f4a63'); g.addColorStop(1, '#1e2638'); ctx!.fillStyle = g; ctx!.fillRect(0, GY, W, H - GY); ctx!.fillStyle = '#22c55e'; ctx!.fillRect(0, GY - 3, W, 4); }
function shade(hex: string, amt: number) { if (hex[0] !== '#') return hex; const n = parseInt(hex.slice(1), 16); let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt; r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b)); return `rgb(${r},${g},${b})`; }
function roundRect(x: number, y: number, w: number, h: number, r: number) { ctx!.beginPath(); ctx!.moveTo(x + r, y); ctx!.arcTo(x + w, y, x + w, y + h, r); ctx!.arcTo(x + w, y + h, x, y + h, r); ctx!.arcTo(x, y + h, x, y, r); ctx!.arcTo(x, y, x + w, y, r); ctx!.closePath(); }
function ball(x: number, y: number, r: number, color: string, label?: string) { const g = ctx!.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r); g.addColorStop(0, '#fff'); g.addColorStop(0.25, color); g.addColorStop(1, shade(color, -40)); ctx!.fillStyle = g; ctx!.beginPath(); ctx!.arc(x, y, r, 0, Math.PI * 2); ctx!.fill(); if (label) { ctx!.fillStyle = '#fff'; ctx!.font = 'bold 12px Nunito'; ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.fillText(label, x, y); } }
function box(cx: number, cy: number, sz: number, ang: number, color: string, label?: string) { ctx!.save(); ctx!.translate(cx, cy); ctx!.rotate(ang); const g = ctx!.createLinearGradient(-sz / 2, -sz / 2, sz / 2, sz / 2); g.addColorStop(0, shade(color, 35)); g.addColorStop(1, shade(color, -35)); ctx!.fillStyle = g; roundRect(-sz / 2, -sz / 2, sz, sz, 6); ctx!.fill(); if (label) { ctx!.fillStyle = '#0b1228'; ctx!.font = 'bold 14px Nunito'; ctx!.textAlign = 'center'; ctx!.textBaseline = 'middle'; ctx!.fillText(label, 0, 0); } ctx!.restore(); }
function bar(cx: number, cy: number, len: number, th: number, ang: number, color: string) { ctx!.save(); ctx!.translate(cx, cy); ctx!.rotate(ang); const g = ctx!.createLinearGradient(0, -th / 2, 0, th / 2); g.addColorStop(0, shade(color, 35)); g.addColorStop(1, shade(color, -35)); ctx!.fillStyle = g; roundRect(-len / 2, -th / 2, len, th, th / 2); ctx!.fill(); ctx!.restore(); }
function vector(x: number, y: number, vx: number, vy: number, c = '#22d3ee') { const m = Math.hypot(vx, vy); if (m < 8) return; const sc = 0.12, ex = x + vx * sc, ey = y + vy * sc; ctx!.strokeStyle = c; ctx!.fillStyle = c; ctx!.lineWidth = 3; ctx!.beginPath(); ctx!.moveTo(x, y); ctx!.lineTo(ex, ey); ctx!.stroke(); const a = Math.atan2(ey - y, ex - x); ctx!.beginPath(); ctx!.moveTo(ex, ey); ctx!.lineTo(ex - 9 * Math.cos(a - 0.4), ey - 9 * Math.sin(a - 0.4)); ctx!.lineTo(ex - 9 * Math.cos(a + 0.4), ey - 9 * Math.sin(a + 0.4)); ctx!.closePath(); ctx!.fill(); }
function txt(s: string, x: number, y: number, c = '#cbd5e1', size = 13, al: CanvasTextAlign = 'left') { ctx!.fillStyle = c; ctx!.font = `bold ${size}px Nunito`; ctx!.textAlign = al; ctx!.textBaseline = 'alphabetic'; ctx!.fillText(s, x, y); }

function draw() {
  if (!ctx) return; bg();
  if (escena === 'caida') {
    suelo(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(22, 60); ctx.lineTo(22, GY); ctx.stroke();
    for (let m = 0; m <= 5; m++) { const y = GY - (m / 5) * (GY - 60); txt(m + 'm', 4, y + 4, '#64748b', 10); ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(26, y); ctx.stroke(); }
    let vm = 0; for (const b of S.balls) { ball(b.x, b.y, b.r, b.c); vector(b.x, b.y, 0, b.vy, '#22d3ee'); vm = Math.max(vm, Math.abs(b.vy)); }
    hud['velocidad'] = (vm / 40).toFixed(1) + ' m/s'; hud['gravedad'] = gReal.value.toFixed(1) + ' m/s²';
  } else if (escena === 'plano_inclinado') {
    suelo(); const a = S.a, dx = Math.cos(a), dy = Math.sin(a), nx = Math.sin(a), ny = -Math.cos(a);
    bar((S.tx + S.bx) / 2, (S.ty + S.by) / 2, S.L, 16, a, '#8b5cf6');
    const cxb = S.tx + dx * (S.s + 23) + nx * 27, cyb = S.ty + dy * (S.s + 23) + ny * 27;
    box(cxb, cyb, 38, a, '#fbbf24');
    vector(cxb, cyb, dx * S.v, dy * S.v, '#22d3ee');
    hud['ángulo'] = estado.angulo + '°'; hud['velocidad'] = (S.v / 40).toFixed(1) + ' m/s'; hud['fricción'] = estado.friccion.toFixed(2);
  } else if (escena === 'colision') {
    ctx.strokeStyle = '#334155'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(0, S.y + 24); ctx.lineTo(W, S.y + 24); ctx.stroke();
    ball(S.cueX, S.y, 22, '#F87171', 'A'); vector(S.cueX, S.y - 34, S.cueV, 0, '#22d3ee');
    ball(S.row[0], S.y, 22, '#60A5FA'); ball(S.row[1], S.y, 22, '#60A5FA'); ball(S.row[2], S.y, 22, '#60A5FA');
    hud['velocidad'] = ((S.hit ? S.lastV : S.cueV) / 40).toFixed(1) + ' m/s';
  } else if (escena === 'pendulo') {
    const L = estado.longitud, bx = S.ax + Math.sin(S.th) * L, by = S.ay + Math.cos(S.th) * L;
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S.ax, S.ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(S.ax, S.ay, 8, 0, Math.PI * 2); ctx.fill();
    ball(bx, by, 22, '#34D399');
    hud['largo'] = Math.round(L) + ''; hud['período'] = (2 * Math.PI * Math.sqrt((L / 40) / gReal.value)).toFixed(2) + ' s'; hud['gravedad'] = gReal.value.toFixed(1);
  } else if (escena === 'proyectil') {
    suelo(); ctx.save(); ctx.translate(S.cx, S.cy); ctx.rotate(-rad(estado.angulo)); ctx.fillStyle = '#64748b'; roundRect(-6, -10, 48, 20, 6); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.arc(S.cx, S.cy, 13, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#f8fafc' : '#22c55e'; ctx.beginPath(); ctx.arc(S.tx0, S.ty0, 38 - i * 9, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(34,211,238,0.8)'; ctx.setLineDash([4, 5]); ctx.lineWidth = 2.5; ctx.beginPath(); S.trail.forEach((t: any, i: number) => i ? ctx!.lineTo(t.x, t.y) : ctx!.moveTo(t.x, t.y)); ctx.stroke(); ctx.setLineDash([]);
    ball(S.px, S.py, 14, '#F87171'); if (S.flying) vector(S.px, S.py, S.vx, -S.vy, '#22d3ee');
    hud['ángulo'] = estado.angulo + '°'; hud['fuerza'] = Math.round(estado.fuerza) + '';
  } else if (escena === 'palanca') {
    ctx.fillStyle = '#475569'; ctx.beginPath(); ctx.moveTo(S.px - 24, S.py + 42); ctx.lineTo(S.px + 24, S.py + 42); ctx.lineTo(S.px, S.py); ctx.closePath(); ctx.fill();
    bar(S.px, S.py, 340, 14, S.phi, '#8b5cf6');
    const c = Math.cos(S.phi), s = Math.sin(S.phi);
    const lx = S.px - 120 * c, ly = S.py - 120 * s, rx = S.px + estado.distR * c, ry = S.py + estado.distR * s;
    box(lx, ly - 26, 34, S.phi, '#F87171', '3'); box(rx, ry - 26, 34, S.phi, '#FBBF24', String(Math.round(estado.masa)));
    hud['torque izq'] = (3 * 120 / 100).toFixed(1); hud['torque der'] = (estado.masa * estado.distR / 100).toFixed(1);
  } else if (escena === 'polea') {
    ctx.fillStyle = 'rgba(34,197,94,0.22)'; ctx.fillRect(120 - 50, S.zoneY - 30, 100, 60); ctx.strokeStyle = '#22c55e'; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.strokeRect(120 - 50, S.zoneY - 30, 100, 60); ctx.setLineDash([]);
    ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(S.wheelX - 22, S.wheelY); ctx.lineTo(120, S.loadY - 28); ctx.stroke(); ctx.beginPath(); ctx.moveTo(S.wheelX + 22, S.wheelY); ctx.lineTo(S.wheelX + 70, S.basketY - 8); ctx.stroke();
    ctx.fillStyle = '#64748b'; ctx.beginPath(); ctx.arc(S.wheelX, S.wheelY, 22, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#334155'; ctx.beginPath(); ctx.arc(S.wheelX, S.wheelY, 7, 0, Math.PI * 2); ctx.fill();
    box(120, S.loadY, 54, 0, '#F59E0B', '4');
    for (let i = 0; i < estado.contrapesos; i++) { ctx.fillStyle = '#A78BFA'; roundRect(S.wheelX + 52, S.basketY + i * 13, 36, 11, 3); ctx.fill(); }
    hud['carga'] = '4'; hud['contrapeso'] = String(estado.contrapesos * 2);
  }
}

function loop(t: number) { raf = requestAnimationFrame(loop); if (document.hidden) { last = t; return; } const dt = Math.min(0.04, (t - last) / 1000 || 0); last = t; step(dt); draw(); }

function onParam() { if (!accionHecha.value || escena === 'palanca') build(); }
function accion() {
  if (accionHecha.value) return; accionHecha.value = true; audio.sfx('sfx-salto');
  if (escena === 'colision') S.cueV = estado.fuerza * 8;
  else if (escena === 'proyectil') { const v = estado.fuerza * 9; S.vx = Math.cos(rad(estado.angulo)) * v; S.vy = Math.sin(rad(estado.angulo)) * v; S.flying = true; }
  else if (escena === 'polea') { if (estado.contrapesos * 2 > 4) S.go = true; }
  if (USA_PREGUNTA.includes(escena)) setTimeout(() => { preguntaVisible.value = true; }, 1900);
}
function addContrapeso() { if (estado.contrapesos < 6) { estado.contrapesos++; build(); } }
function reiniciar() { accionHecha.value = false; preguntaVisible.value = false; sel.value = null; resp.value = false; acerto.value = false; metaFisica.value = false; preg.value = barajar(props.config.pregunta); estado.contrapesos = escena === 'polea' ? 0 : estado.contrapesos; build(); }
function responder(i: number) { if (resp.value && acerto.value) return; sel.value = i; resp.value = true; acerto.value = i === preg.value.correcta; audio.sfx(acerto.value ? 'sfx-correcto' : 'sfx-error'); }
let done = false;
function completar() { if (logrado.value && !done) { done = true; audio.sfx('sfx-ganar'); emit('complete', resp.value && !acerto.value ? 2 : 3); } }

watch(() => estado.planeta, () => { if (escena === 'pendulo' && !accionHecha.value) build(); });
onMounted(() => { ctx = lienzo.value?.getContext('2d') ?? null; build(); last = performance.now(); raf = requestAnimationFrame(loop); setTimeout(() => narrar(props.config.instruccion), 350); });
onUnmounted(() => cancelAnimationFrame(raf));
</script>

<style scoped>
.sf { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; }
.sf-bar { display: flex; align-items: center; gap: 0.6rem; width: 100%; max-width: 600px; }
.voz { background: #14B8A6; border: none; color: #fff; border-radius: 50%; width: 36px; height: 36px; font-size: 1rem; cursor: pointer; flex-shrink: 0; }
.voz:active { transform: scale(0.92); }
.sf-instru { color: #CBD5E1; margin: 0; font-size: 0.95rem; line-height: 1.4; }
.sf-stage { position: relative; width: 100%; max-width: 600px; }
.sf-canvas { width: 100%; border-radius: 14px; border: 1px solid #334155; display: block; touch-action: none; }
.hud { position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; pointer-events: none; }
.hud-chip { background: rgba(15,23,42,0.8); border: 1px solid #334155; color: #E2E8F0; font-size: 0.78rem; font-weight: 700; padding: 2px 8px; border-radius: 8px; }
.hud-chip i { color: #5EEAD4; font-style: normal; font-weight: 600; margin-right: 4px; text-transform: capitalize; }
.planetas { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; justify-content: center; }
.pl-lbl { color: #94A3B8; font-size: 0.85rem; }
.pl { background: #1E293B; border: 2px solid #334155; color: #CBD5E1; border-radius: 999px; padding: 0.35rem 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 0.85rem; }
.pl.on { border-color: #38BDF8; background: rgba(56,189,248,0.18); color: #fff; }
.sf-params { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 600px; }
.ctl { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 150px; }
.ctl label { color: #CBD5E1; font-size: 0.82rem; } .ctl input { accent-color: #F59E0B; width: 100%; }
.sf-controls { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; justify-content: center; }
.btn-peso { background: #7C3AED; color: #fff; border: none; padding: 0.55rem 1rem; border-radius: 10px; font-weight: 700; cursor: pointer; font-family: inherit; }
.btn-soltar { background: #F59E0B; color: #3a2606; border: none; padding: 0.6rem 1.3rem; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; font-family: inherit; }
.btn-soltar:disabled { opacity: 0.5; cursor: default; }
.btn-reset { background: #334155; color: #E2E8F0; border: none; padding: 0.6rem 1rem; border-radius: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
.sf-reto { width: 100%; max-width: 600px; background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 0.9rem; }
.reto-q { color: #F1F5F9; font-weight: 600; margin: 0 0 0.6rem; }
.reto-ops { display: grid; grid-template-columns: 1fr; gap: 0.5rem; }
.op { padding: 0.6rem; background: #0F172A; border: 2px solid #334155; border-radius: 10px; color: #E2E8F0; cursor: pointer; font-family: inherit; text-align: left; }
.op.ok { border-color: #16A34A; background: rgba(34,197,94,0.18); }
.op.mal { border-color: #DC2626; background: rgba(239,68,68,0.18); }
.sf-footer { text-align: center; }
.ok { color: #4ADE80; font-weight: 700; margin: 0 0 0.4rem; }
.meta { color: #94A3B8; margin: 0 0 0.4rem; font-size: 0.9rem; }
.btn-completar { background: #14B8A6; color: #fff; border: none; padding: 0.7rem 1.5rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: inherit; }
.btn-completar:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
