// PREESCOLAR — Materia NUEVA "Mundos Mágicos" (categoría mundos_preescolar): juegos
// temáticos del "Sitio Miguel" apropiados para ≤6 años, reimplementados NATIVOS con
// PreescolarJuego.vue. Audio 100% ElevenLabs (banco de frases). NADA de TTS.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const CATEGORIA = 'mundos_preescolar';

function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}
const bankUrl = (f) => `/audio/preescolar/bank/${slugFrase(f)}.mp3`;
const R = () => Math.random();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const I_dif = '¿Cuál es diferente? Tócalo.';

const SHAPES = [['circulo', 'Círculo', '#e53935'], ['cuadrado', 'Cuadrado', '#1e88e5'], ['triangulo', 'Triángulo', '#43a047'], ['estrella', 'Estrella', '#fdd835'], ['corazon', 'Corazón', '#e91e63'], ['rombo', 'Rombo', '#8e24aa']];
function eligeForma() {
  const [tp, name, clr] = SHAPES[Math.floor(R() * SHAPES.length)];
  const wrong = pick(SHAPES.filter(([t]) => t !== tp), 3);
  return { tipo: 'elige', estimulo: { forma: tp, color: clr }, opciones: shuffle([{ forma: tp, colorFig: clr, label: name, correcta: true }, ...wrong.map(([wt, wn, wc]) => ({ forma: wt, colorFig: wc, label: wn }))]), instruccion: '¿Qué forma es? Tócala.' };
}

// ── Figuras ──
function mundoFiguras() {
  const figs = ['🔴', '🔵', '🟢', '⭐', '🔺', '❤️'];
  const r = [eligeForma(), eligeForma(), eligeForma()];
  // multi: toca todas las estrellas
  const corr = Array.from({ length: 3 }, () => ({ emoji: '⭐', correcta: true }));
  const wrong = pick(['🔴', '🔵', '🟢', '🔺', '❤️', '🟦'], 5).map((e) => ({ emoji: e }));
  r.push({ tipo: 'multi', grid: shuffle([...corr, ...wrong]), instruccion: 'Toca todas las estrellas.' });
  const items = ['🔺', '🔺', '🔵', '🔺']; const odd = Math.floor(R() * 4); const t = items[odd]; items[odd] = '🔵'; if (t === '🔵') items[odd] = '🔵';
  r.push({ tipo: 'diferente', items: ['🔺', '🔺', '🔵', '🔺'], correcta: 2, instruccion: I_dif });
  return { nombre: 'Isla de las Figuras', icono: '🧩', niveles: [{ nombre: 'Isla de las Figuras', intro: '¡Isla de las Figuras! Encuentra círculos, cuadrados y triángulos.', rondas: r }] };
}

// ── Memoria ──
const MEM_POOL = ['🍎', '⭐', '🐶', '🌸', '🎈', '🐠', '🦋', '🐥', '🌙', '🚗'];
function nivelMemoria(nPares, nombre) {
  return { nombre, intro: '¡A jugar a la memoria! Encuentra las parejas iguales.', rondas: [{ tipo: 'memoria', pares: pick(MEM_POOL, nPares), instruccion: 'Encuentra las parejas iguales.' }] };
}
function mundoMemoria() {
  return { nombre: 'Desafío de Memoria', icono: '🧠', niveles: [nivelMemoria(4, 'Memoria fácil'), nivelMemoria(6, 'Memoria media'), nivelMemoria(8, 'Memoria experto')] };
}

// ── Arte (colores + mezclas) ──
function eligeColorObj() {
  const COL = [['Rojo', '#e53935', '🍎'], ['Azul', '#1e88e5', '💧'], ['Amarillo', '#fdd835', '🍋'], ['Verde', '#43a047', '🐸'], ['Naranja', '#fb8c00', '🍊'], ['Morado', '#8e24aa', '🍇']];
  const [n, h, e] = COL[Math.floor(R() * COL.length)];
  const wrong = pick(COL.filter(([cn]) => cn !== n), 3);
  return { tipo: 'elige', estimulo: { emoji: e, bg: h }, opciones: shuffle([{ color: h, correcta: true }, ...wrong.map(([, wh]) => ({ color: wh }))]), instruccion: '¿De qué color es? Toca el color.' };
}
function mezcla(a, b, res, resHex, instr) {
  const otras = [['#e53935'], ['#1e88e5'], ['#fdd835'], ['#43a047'], ['#fb8c00'], ['#8e24aa']].map((x) => x[0]).filter((h) => h !== resHex);
  return { tipo: 'elige', estimulo: { emoji: `${a}➕${b}` }, opciones: shuffle([{ color: resHex, correcta: true }, ...pick(otras, 3).map((h) => ({ color: h }))]), instruccion: instr };
}
function mundoArte() {
  const r = [eligeColorObj(), eligeColorObj(), eligeColorObj(),
    mezcla('🔴', '🟡', 'naranja', '#fb8c00', 'Rojo y amarillo. ¿Qué color sale? Tócalo.'),
    mezcla('🔵', '🟡', 'verde', '#43a047', 'Azul y amarillo. ¿Qué color sale? Tócalo.'),
    mezcla('🔴', '🔵', 'morado', '#8e24aa', 'Rojo y azul. ¿Qué color sale? Tócalo.')];
  return { nombre: 'Galería del Arte', icono: '🎨', niveles: [{ nombre: 'Galería del Arte', intro: '¡Galería del Arte! Aprende los colores y sus mezclas.', rondas: r }] };
}

// ── Espacio ──
function mundoEspacio() {
  const r = [
    { tipo: 'elige', opciones: shuffle([{ emoji: '☀️', correcta: true }, { emoji: '🌙' }, { emoji: '⭐' }]), instruccion: 'Toca el Sol.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '🌙', correcta: true }, { emoji: '☀️' }, { emoji: '🚀' }]), instruccion: '¿Qué vemos de noche? Tócalo.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '🚀', correcta: true }, { emoji: '🪐' }, { emoji: '⭐' }]), instruccion: 'Toca el cohete.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '🪐', correcta: true }, { emoji: '☀️' }, { emoji: '🌙' }]), instruccion: 'Toca el planeta.' },
    { tipo: 'multi', grid: shuffle([...Array.from({ length: 3 }, () => ({ emoji: '⭐', correcta: true })), ...pick(['🚀', '🪐', '🌙', '☀️', '👽'], 5).map((e) => ({ emoji: e }))]), instruccion: 'Toca todas las estrellas.' },
    { tipo: 'diferente', items: ['⭐', '⭐', '🚀', '⭐'], correcta: 2, instruccion: I_dif },
  ];
  return { nombre: 'Planeta del Espacio', icono: '🚀', niveles: [{ nombre: 'Planeta del Espacio', intro: '¡Planeta del Espacio! Viaja por el cielo y conoce los astros.', rondas: r }] };
}

// ── Valores ──
function mundoValores() {
  const r = [
    { tipo: 'elige', opciones: shuffle([{ label: '🤝 Lo ayudo a levantarse', correcta: true }, { label: '😴 No hago nada' }]), instruccion: 'Tu amigo se cayó. ¿Qué haces? Tócalo.' },
    { tipo: 'elige', opciones: shuffle([{ label: '👋 ¡Hola, buenos días!', correcta: true }, { label: '😠 No saludo' }]), instruccion: '¿Cómo saludas a tu maestra? Tócalo.' },
    { tipo: 'elige', opciones: shuffle([{ label: '🧸 Comparto mi juguete', correcta: true }, { label: '🙅 No comparto' }]), instruccion: 'Un amigo quiere jugar. ¿Qué haces? Tócalo.' },
    { tipo: 'elige', opciones: shuffle([{ label: '🙏 Digo gracias', correcta: true }, { label: '🤐 No digo nada' }]), instruccion: 'Te dan un regalo. ¿Qué dices? Tócalo.' },
    { tipo: 'elige', opciones: shuffle([{ label: '🗑️ La boto en la caneca', correcta: true }, { label: '🌳 La tiro al piso' }]), instruccion: '¿Qué haces con la basura? Tócalo.' },
  ];
  return { nombre: 'Teatro de los Valores', icono: '🎭', niveles: [{ nombre: 'Teatro de los Valores', intro: '¡Teatro de los Valores! Aprende a ser un buen amigo.', rondas: r }] };
}

// ── Cuentos ──
function mundoCuentos() {
  const r = [
    { tipo: 'ordena', items: shuffle([{ emoji: '🥚', orden: 1 }, { emoji: '🐣', orden: 2 }, { emoji: '🐔', orden: 3 }]), instruccion: 'Ordena la historia: huevo, pollito, gallina.' },
    { tipo: 'ordena', items: shuffle([{ emoji: '🌱', orden: 1 }, { emoji: '🌿', orden: 2 }, { emoji: '🌳', orden: 3 }]), instruccion: 'Ordena la historia: semilla, planta, árbol.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '👧', correcta: true }, { emoji: '🏠' }, { emoji: '🌳' }]), instruccion: 'En el cuento, la niña juega. ¿Quién es el personaje? Tócalo.' },
    { tipo: 'ordena', items: shuffle([{ emoji: '🌅', orden: 1 }, { emoji: '☀️', orden: 2 }, { emoji: '🌙', orden: 3 }]), instruccion: 'Ordena el día: amanece, es de día, es de noche.' },
  ];
  return { nombre: 'Ciudad de los Cuentos', icono: '📖', niveles: [{ nombre: 'Ciudad de los Cuentos', intro: '¡Ciudad de los Cuentos! Ordena y descubre historias.', rondas: r }] };
}

// ── Música ──
function mundoMusica() {
  const r = [
    { tipo: 'elige', opciones: shuffle([{ emoji: '🥁', correcta: true }, { emoji: '🎸' }, { emoji: '🎺' }]), instruccion: 'Toca el tambor.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '🎸', correcta: true }, { emoji: '🥁' }, { emoji: '🎹' }]), instruccion: 'Toca la guitarra.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '🐄', correcta: true }, { emoji: '🐶' }, { emoji: '🐱' }]), instruccion: '¿Qué animal hace muu? Tócalo.' },
    { tipo: 'elige', opciones: shuffle([{ emoji: '🐶', correcta: true }, { emoji: '🐄' }, { emoji: '🐦' }]), instruccion: '¿Qué animal hace guau? Tócalo.' },
    { tipo: 'memoria', pares: ['🥁', '🎸', '🎺', '🎹'], instruccion: 'Encuentra las parejas de instrumentos.' },
  ];
  return { nombre: 'Estación Musical', icono: '🎵', niveles: [{ nombre: 'Estación Musical', intro: '¡Estación Musical! Conoce instrumentos y sonidos.', rondas: r }] };
}

// ── Lógica (patrones) ──
function patron(a, b, next) {
  return { tipo: 'elige', estimulo: { emoji: `${a}${b}${a}${b}❓` }, opciones: shuffle([{ emoji: next, correcta: true }, { emoji: next === a ? b : a }]), instruccion: '¿Qué sigue en el patrón? Tócalo.' };
}
function mundoLogica() {
  const r = [
    patron('🔴', '🔵', '🔴'), patron('⭐', '❤️', '⭐'), patron('🐶', '🐱', '🐶'),
    { tipo: 'diferente', items: ['🍎', '🍎', '🚗', '🍎'], correcta: 2, instruccion: I_dif },
    { tipo: 'elige', estimulo: { emoji: '🔺🔺🔺❓' }, opciones: shuffle([{ emoji: '🔺', correcta: true }, { emoji: '⭐' }]), instruccion: '¿Qué sigue en el patrón? Tócalo.' },
  ];
  return { nombre: 'Laberinto de Lógica', icono: '🔁', niveles: [{ nombre: 'Laberinto de Lógica', intro: '¡Laberinto de Lógica! Descubre los patrones.', rondas: r }] };
}

const COL = { c1: '#DB2777', c2: '#F472B6' };
const MUNDOS = [mundoFiguras(), mundoMemoria(), mundoArte(), mundoEspacio(), mundoValores(), mundoCuentos(), mundoMusica(), mundoLogica()];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  let orden = (await client.query('SELECT COALESCE(MAX(numero_orden),0)::int m FROM mundos WHERE categoria=$1', [CATEGORIA])).rows[0].m;

  let totalNiv = 0;
  for (const w of MUNDOS) {
    orden++;
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
       RETURNING id`,
      [w.nombre, `Preescolar — ${w.nombre} (Sitio Miguel)`, orden, w.icono, COL.c1, COL.c2, CATEGORIA, w.niveles.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 0; a < w.niveles.length; a++) {
      const n = w.niveles[a];
      const cfg = {
        version: 1, tipo: 'preescolar', sub: 'juego', categoria: CATEGORIA,
        id: `${CATEGORIA}-${orden}-${a + 1}`, nombre: n.nombre, icono: w.icono,
        instruccion: n.intro, audio: bankUrl(n.intro), tema: { c1: COL.c1, c2: COL.c2 },
        rondas: n.rondas, recompensa: { monedas: 8, gemas: 1 },
        narracion: { intro: n.intro, url_audio_intro: bankUrl(n.intro) },
      };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'exploradores', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, n.nombre, a + 1, cfg]
      );
      totalNiv++;
    }
    console.log(`  ✓ ${w.nombre} (${w.niveles.length} niveles)`);
  }
  console.log(`\n✅ Mundos Mágicos: ${MUNDOS.length} mundos, ${totalNiv} niveles.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
