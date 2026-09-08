// PREESCOLAR — Juegos reimplementados NATIVOS del "Sitio Miguel" (sección Pre-escolar).
// Cada actividad es un nivel tipo:'preescolar' sub:'juego' con una secuencia de RONDAS
// que ejecuta el motor nativo PreescolarJuego.vue. Conserva la intención de las 4
// actividades originales (Formas/Colores, Tamaños/Posiciones, Cuento hasta 10, Familias
// de Números) y las mejora (rondas más cortas, variedad de tipos).
// El AUDIO de cada instrucción se genera con ElevenLabs (generate-audio-pre-juegos.mjs),
// NO se usa TTS del navegador. config.audio apunta al clip de la intro en el banco.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const CATEGORIA = 'mate_preescolar';

// slugFrase: idéntico a frontend/src/composables/vozBank.ts (¡no cambiar sin sincronizar!)
function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}
const bankUrl = (frase) => `/audio/preescolar/bank/${slugFrase(frase)}.mp3`;

const R = () => Math.random();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function opcionesNum(correcto, max = 10) {
  const set = new Set([correcto]);
  let g = 0;
  while (set.size < 3 && g++ < 60) { const d = correcto + (Math.floor(R() * 5) - 2); if (d >= 1 && d <= max && d !== correcto) set.add(d); }
  while (set.size < 3) { const d = Math.floor(R() * max) + 1; set.add(d); }
  return shuffle([...set]);
}

// ── Instrucciones fijas (cada una = 1 clip de voz) ──
const I = {
  cuantos: '¿Cuántos hay? Toca el número.',
  toca_cuenta: 'Toca cada uno y cuenta cuántos hay.',
  falta: '¿Qué número falta? Tócalo.',
  mas: '¿Cuál grupo tiene más? Tócalo.',
  orden5: 'Toca los números en orden, del uno al cinco.',
  que_numero: '¿Qué número es? Tócalo.',
  mayor: '¿Cuál número es más grande? Tócalo.',
  color: '¿De qué color es? Toca el color.',
  forma: '¿Qué forma es? Tócala.',
  diferente: '¿Cuál es diferente? Tócalo.',
  grande: '¿Cuál es más grande? Tócalo.',
  pequeno: '¿Cuál es más pequeño? Tócalo.',
  arriba_abajo: '¿Está arriba o abajo? Tócalo.',
  dentro_fuera: '¿Está dentro o fuera de la caja? Tócalo.',
  ord_tam: 'Toca del más pequeño al más grande.',
};

// ── Builders de ronda ──
const cuenta = (n, emoji) => ({ tipo: 'cuenta', n, emoji, opciones: opcionesNum(n), instruccion: I.cuantos });
const tapc = (n, emoji) => ({ tipo: 'tap_cuenta', n, emoji, instruccion: I.toca_cuenta });
function secuencia(start) {
  const seq = [start, start + 1, start + 2, start + 3];
  const bi = Math.floor(R() * 4);
  const ans = seq[bi];
  return { tipo: 'secuencia', seq: seq.map((n, i) => (i === bi ? '?' : String(n))), opciones: opcionesNum(ans, start + 6), correcta: ans, instruccion: I.falta };
}
const compara = (emoji, a, b) => ({ tipo: 'compara', grupos: shuffle([{ emoji, n: a }, { emoji, n: b }]), objetivo: 'mas', instruccion: I.mas });
const ordenNums = (hasta) => ({ tipo: 'ordena', items: shuffle(Array.from({ length: hasta }, (_, i) => ({ label: String(i + 1), orden: i + 1 }))), instruccion: I.orden5 });

const COLORS = [['Rojo', '#e53935'], ['Azul', '#1e88e5'], ['Amarillo', '#fdd835'], ['Verde', '#43a047'], ['Naranja', '#fb8c00'], ['Morado', '#8e24aa']];
const COL_OBJ = { Rojo: ['🍎', '❤️', '🌹', '🍓'], Azul: ['💧', '🫐', '🐬', '🐳'], Amarillo: ['⭐', '🍋', '🌞', '🍌'], Verde: ['🐸', '🌿', '🥦', '🐊'], Naranja: ['🍊', '🦊', '🥕', '🎃'], Morado: ['🍇', '🔮', '🦄', '🟣'] };
function eligeColor() {
  const [n, h] = COLORS[Math.floor(R() * COLORS.length)];
  const emoji = COL_OBJ[n][Math.floor(R() * COL_OBJ[n].length)];
  const wrong = shuffle(COLORS.filter(([cn]) => cn !== n)).slice(0, 3);
  const ops = shuffle([{ color: h, correcta: true }, ...wrong.map(([, wh]) => ({ color: wh }))]);
  return { tipo: 'elige', estimulo: { emoji, bg: h }, opciones: ops, instruccion: I.color };
}
const SHAPES = [['circulo', 'Círculo', '#e53935'], ['cuadrado', 'Cuadrado', '#1e88e5'], ['triangulo', 'Triángulo', '#43a047'], ['rectangulo', 'Rectángulo', '#fb8c00'], ['estrella', 'Estrella', '#fdd835'], ['corazon', 'Corazón', '#e91e63']];
function eligeForma() {
  const [tp, name, clr] = SHAPES[Math.floor(R() * SHAPES.length)];
  const wrong = shuffle(SHAPES.filter(([t]) => t !== tp)).slice(0, 3);
  const ops = shuffle([{ forma: tp, colorFig: clr, label: name, correcta: true }, ...wrong.map(([wt, wn, wc]) => ({ forma: wt, colorFig: wc, label: wn }))]);
  return { tipo: 'elige', estimulo: { forma: tp, color: clr }, opciones: ops, instruccion: I.forma };
}
function multiColor(colorName) {
  const objs = COL_OBJ[colorName];
  const otras = Object.entries(COL_OBJ).filter(([cn]) => cn !== colorName).flatMap(([, v]) => v);
  const correct = shuffle(objs).slice(0, 3).map((e) => ({ emoji: e, correcta: true }));
  const wrong = shuffle(otras).slice(0, 5).map((e) => ({ emoji: e }));
  return { tipo: 'multi', grid: shuffle([...correct, ...wrong]), instruccion: `Toca todos los de color ${colorName.toLowerCase()}.` };
}
function diferente() {
  const [a, b] = shuffle(['🍎', '⭐', '🐸', '🍊', '🫐', '❤️', '🦊', '🌸', '🐱']).slice(0, 2);
  const items = [a, a, a, a];
  const odd = Math.floor(R() * 4);
  items[odd] = b;
  return { tipo: 'diferente', items, correcta: odd, instruccion: I.diferente };
}
function pinta() {
  const [name, h, forma] = (() => { const c = COLORS[Math.floor(R() * 4)]; const f = ['circulo', 'cuadrado', 'triangulo', 'rectangulo'][Math.floor(R() * 4)]; return [c[0], c[1], f]; })();
  const wrong = shuffle(COLORS.filter(([cn]) => cn !== name)).slice(0, 3);
  const ops = shuffle([{ color: h, correcta: true }, ...wrong.map(([, wh]) => ({ color: wh }))]);
  const fnom = { circulo: 'círculo', cuadrado: 'cuadrado', triangulo: 'triángulo', rectangulo: 'rectángulo' }[forma];
  return { tipo: 'pinta', forma, opciones: ops, instruccion: `Pinta el ${fnom} de color ${name.toLowerCase()}.` };
}
// Tamaños / posiciones
const GS = [['🐘', '🐭'], ['🌳', '🌱'], ['🐋', '🐟'], ['🦁', '🐱'], ['🌻', '🌸'], ['🏠', '🏡']];
function eligeTam(grande) {
  const [g, p] = GS[Math.floor(R() * GS.length)];
  const ops = shuffle([{ emoji: g, size: 5, correcta: grande }, { emoji: p, size: 2.4, correcta: !grande }]);
  return { tipo: 'elige', opciones: ops, instruccion: grande ? I.grande : I.pequeno };
}
function posicion(arriba) {
  const obj = arriba ? ['⭐', '🌈', '☁️', '🦅', '🌙'][Math.floor(R() * 5)] : ['🌊', '🐠', '🌻', '🐢', '🍄'][Math.floor(R() * 5)];
  const ops = shuffle([{ label: '⬆️ Arriba', correcta: arriba }, { label: '⬇️ Abajo', correcta: !arriba }]);
  return { tipo: 'elige', estimulo: { escena: arriba ? 'arriba' : 'abajo', emoji: obj }, opciones: ops, instruccion: I.arriba_abajo };
}
function dentroFuera(dentro) {
  const obj = ['🍎', '⭐', '🎈', '🍭', '🐱', '🌸'][Math.floor(R() * 6)];
  const ops = shuffle([{ label: '📥 Dentro', correcta: dentro }, { label: '📤 Fuera', correcta: !dentro }]);
  return { tipo: 'elige', estimulo: { escena: dentro ? 'dentro' : 'fuera', emoji: obj }, opciones: ops, instruccion: I.dentro_fuera };
}
const TAM3 = [[['🐱', 2], ['🐈', 3], ['🦁', 4.5]], [['🌱', 2], ['🌿', 3], ['🌳', 4.5]], [['🥚', 2.2], ['🐣', 3.2], ['🦃', 4.5]], [['⭐', 1.8], ['🌟', 3], ['💫', 4.5]], [['🍬', 2], ['🍦', 3.2], ['🎂', 4.5]]];
function ordenTam() {
  const set = TAM3[Math.floor(R() * TAM3.length)];
  return { tipo: 'ordena', items: shuffle(set.map(([emoji, size], i) => ({ emoji, size, orden: i + 1 }))), instruccion: I.ord_tam };
}
function eligeNumero(n) {
  const wrong = opcionesNum(n, 20).filter((x) => x !== n).slice(0, 3);
  const ops = shuffle([{ emoji: String(n), correcta: true }, ...wrong.map((w) => ({ emoji: String(w) }))]);
  return { tipo: 'elige', estimulo: { emoji: String(n) }, opciones: ops, instruccion: I.que_numero };
}
function eligeMayor(a, b) {
  const ops = shuffle([{ emoji: String(a), correcta: a > b }, { emoji: String(b), correcta: b > a }]);
  return { tipo: 'elige', opciones: ops, instruccion: I.mayor };
}

// ── Las 4 actividades (rondas) ──
const ACTIVIDADES = [
  {
    nombre: 'Cuento hasta 10', icono: '🔢',
    intro: '¡Cuento hasta diez! Vamos a contar jugando.',
    rondas: [cuenta(3, '🍎'), cuenta(5, '⭐'), cuenta(7, '🐥'), tapc(4, '🎈'), cuenta(9, '🦋'),
      secuencia(1), secuencia(4), tapc(6, '🐟'), compara('⭐', 3, 7), compara('🍎', 8, 2), secuencia(6), ordenNums(5)],
  },
  {
    nombre: 'Familias de Números', icono: '🏠',
    intro: '¡Familias de números! Conoce los números del uno al veinte.',
    rondas: [cuenta(6, '🪙'), eligeNumero(7), secuencia(8), cuenta(10, '💎'), eligeNumero(12),
      secuencia(13), eligeMayor(5, 9), eligeNumero(15), eligeMayor(14, 8), secuencia(17), eligeMayor(20, 11)],
  },
  {
    nombre: 'Formas y Colores', icono: '🌈',
    intro: '¡Formas y colores! Aprende los colores y las figuras.',
    rondas: [eligeColor(), eligeColor(), eligeForma(), eligeForma(), multiColor('Rojo'), diferente(),
      eligeColor(), eligeForma(), multiColor('Azul'), diferente(), pinta(), pinta()],
  },
  {
    nombre: 'Tamaños y Posiciones', icono: '📏',
    intro: '¡Tamaños y posiciones! ¿Cuál es más grande? ¿Dónde está?',
    rondas: [eligeTam(true), eligeTam(false), eligeTam(true), posicion(true), posicion(false),
      dentroFuera(true), dentroFuera(false), posicion(true), ordenTam(), ordenTam()],
  },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  const maxOrden = (await client.query('SELECT COALESCE(MAX(numero_orden),0)::int m FROM mundos WHERE categoria=$1', [CATEGORIA])).rows[0].m;
  const orden = maxOrden + 1;

  const res = await client.query(
    `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
     VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
     ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
     RETURNING id`,
    ['Juegos Pre-escolar', 'Preescolar — Juegos de conceptos (Sitio Miguel)', orden, '🎲', '#ff9800', '#ffd54f', CATEGORIA, ACTIVIDADES.length]
  );
  const mundoId = res.rows[0].id;

  for (let a = 0; a < ACTIVIDADES.length; a++) {
    const act = ACTIVIDADES[a];
    const cfg = {
      version: 1, tipo: 'preescolar', sub: 'juego', categoria: CATEGORIA,
      id: `${CATEGORIA}-juego-${a + 1}`,
      nombre: act.nombre, icono: act.icono,
      instruccion: act.intro,
      audio: bankUrl(act.intro),
      tema: { c1: '#ff9800', c2: '#ffd54f' },
      rondas: act.rondas,
      recompensa: { monedas: 8, gemas: 1 },
      narracion: { intro: act.intro, url_audio_intro: bankUrl(act.intro) },
    };
    await client.query(
      `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1,$2,$3,$4,'exploradores', ARRAY['bloques']::modalidad_codigo[], true)
       ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
      [mundoId, act.nombre, a + 1, cfg]
    );
    console.log(`  ✓ ${act.nombre} (${act.rondas.length} rondas)`);
  }

  console.log(`\n✅ Juegos preescolar (Fase 1): mundo "Juegos Pre-escolar" (orden ${orden}, id ${mundoId}) con ${ACTIVIDADES.length} actividades.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
