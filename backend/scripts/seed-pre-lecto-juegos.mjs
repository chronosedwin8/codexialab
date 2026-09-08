// PREESCOLAR — Lectoescritura NATIVA (reimplementación del "Sitio Miguel": Bosque de las
// Vocales, Reino de las Letras, Montaña de las Sílabas). Niveles tipo:'preescolar' sub:'juego'
// que ejecuta PreescolarJuego.vue. Audio 100% ElevenLabs (banco de frases), NADA de TTS.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const CATEGORIA = 'lectoescritura';

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

const I_dif = '¿Cuál es diferente? Tócala.';

// Datos por letra: L, nombre, sonido, palabras [emoji, palabra]
const LETRAS = {
  A: { name: 'a', son: 'Aaaa', pal: [['🕷️', 'araña'], ['🐝', 'abeja'], ['🌳', 'árbol']] },
  E: { name: 'e', son: 'Eeee', pal: [['🐘', 'elefante'], ['⭐', 'estrella'], ['🪜', 'escalera']] },
  I: { name: 'i', son: 'Iiii', pal: [['🧊', 'iglú'], ['🏝️', 'isla'], ['🧲', 'imán']] },
  O: { name: 'o', son: 'Oooo', pal: [['🐻', 'oso'], ['👁️', 'ojo'], ['🐑', 'oveja']] },
  U: { name: 'u', son: 'Uuuu', pal: [['🍇', 'uvas'], ['🦄', 'unicornio'], ['1️⃣', 'uno']] },
  M: { name: 'eme', son: 'Mmmm', pal: [['🖐️', 'mano'], ['🐵', 'mono'], ['🦋', 'mariposa']] },
  P: { name: 'pe', son: 'Pppp', pal: [['🦆', 'pato'], ['🍐', 'pera'], ['⚽', 'pelota']] },
  S: { name: 'ese', son: 'Ssss', pal: [['☀️', 'sol'], ['🐍', 'serpiente'], ['🍉', 'sandía']] },
  L: { name: 'ele', son: 'Llll', pal: [['🌙', 'luna'], ['🦁', 'león'], ['🍋', 'limón']] },
  T: { name: 'te', son: 'Tttt', pal: [['🐢', 'tortuga'], ['🍅', 'tomate'], ['🚂', 'tren']] },
  N: { name: 'ene', son: 'Nnnn', pal: [['👃', 'nariz'], ['☁️', 'nube'], ['🪺', 'nido']] },
  D: { name: 'de', son: 'Dddd', pal: [['🎲', 'dado'], ['🐬', 'delfín'], ['🦕', 'dinosaurio']] },
  F: { name: 'efe', son: 'Ffff', pal: [['🦭', 'foca'], ['🔥', 'fuego'], ['🌸', 'flor']] },
  C: { name: 'ce', son: 'Cccc', pal: [['🏠', 'casa'], ['🚗', 'coche'], ['🐰', 'conejo']] },
  B: { name: 'be', son: 'Bbbb', pal: [['⛵', 'barco'], ['👢', 'bota'], ['🐋', 'ballena']] },
  R: { name: 'erre', son: 'Rrrr', pal: [['🐭', 'ratón'], ['🌹', 'rosa'], ['🤖', 'robot']] },
  G: { name: 'ge', son: 'Gggg', pal: [['🐈', 'gato'], ['🎈', 'globo'], ['🐔', 'gallina']] },
};

const todosEmojis = Object.values(LETRAS).flatMap((d) => d.pal.map((p) => p[0]));

function nivelLetra(L, vocal) {
  const d = LETRAS[L];
  const intro = `La ${L}. La ${d.name} suena ${d.son}. ${d.pal.map((p) => p[1]).join(', ')}.`;
  const otrasLetras = Object.keys(LETRAS).filter((x) => x !== L);
  const ajenos = todosEmojis.filter((e) => !d.pal.some((p) => p[0] === e));
  const rondas = [];
  // 1. ¿Cuál es la letra?
  rondas.push({ tipo: 'elige', opciones: shuffle([{ emoji: L, correcta: true }, ...pick(otrasLetras, 2).map((x) => ({ emoji: x }))]), instruccion: `¿Cuál es la letra ${L}? Tócala.` });
  // 2 y 3. Empieza con...
  for (let k = 0; k < 2; k++) {
    const correcto = d.pal[k % d.pal.length];
    rondas.push({ tipo: 'elige', opciones: shuffle([{ emoji: correcto[0], correcta: true }, ...pick(ajenos, 2).map((e) => ({ emoji: e }))]), instruccion: `Toca el dibujo que empieza con la ${L}.` });
  }
  // 4. Toca todas las L
  const correct = Array.from({ length: 3 }, () => ({ emoji: L, correcta: true }));
  const wrong = pick(otrasLetras, 5).map((x) => ({ emoji: x }));
  rondas.push({ tipo: 'multi', grid: shuffle([...correct, ...wrong]), instruccion: `Toca todas las letras ${L}.` });
  // 5. Diferente
  const dif = pick(otrasLetras, 1)[0];
  const items = [L, L, L, L]; const odd = Math.floor(R() * 4); items[odd] = dif;
  rondas.push({ tipo: 'diferente', items, correcta: odd, instruccion: I_dif });
  return { nombre: `Letra ${L}${vocal ? ' (vocal)' : ''}`, icono: vocal ? '🅰️' : '🔤', intro, rondas };
}

// Sílabas: formar sílaba consonante+vocal
function nivelSilabas(L) {
  const d = LETRAS[L];
  const vocales = ['A', 'E', 'I', 'O', 'U'];
  const sels = pick(vocales, 3);
  const rondas = sels.map((v) => ({
    tipo: 'ordena',
    items: shuffle([{ emoji: L, orden: 1 }, { emoji: v, orden: 2 }]),
    instruccion: `Forma la sílaba ${L}${v.toLowerCase()}: toca la ${d.name} y luego la ${v.toLowerCase()}.`,
  }));
  // lectura: ¿con qué sílaba empieza la palabra?
  const palabra = d.pal[0];
  rondas.push({ tipo: 'elige', opciones: shuffle([{ emoji: L + sels[0].toLowerCase(), correcta: true }, { emoji: pick(vocales, 1)[0] + L.toLowerCase() }, { emoji: 'S' + 'a' }]), instruccion: `Toca la sílaba que suena ${L}${sels[0].toLowerCase()}.` });
  return { nombre: `Sílabas con ${L}`, icono: '⛰️', intro: `¡Sílabas con la ${d.name}! Vamos a formar sílabas.`, rondas };
}

// ── Mundos (worlds) de lectoescritura ──
const VOCALES = ['A', 'E', 'I', 'O', 'U'];
const CONS1 = ['M', 'P', 'S', 'L', 'T', 'N'];
const CONS2 = ['D', 'F', 'C', 'B', 'R', 'G'];

const WORLDS = [
  { nombre: 'Bosque de las Vocales', icono: '🌳', c1: '#16A34A', c2: '#86EFAC', intro: '¡Bosque de las Vocales! Conoce la a, la e, la i, la o y la u.', niveles: VOCALES.map((v) => nivelLetra(v, true)) },
  { nombre: 'Reino de las Letras 1', icono: '🏰', c1: '#7C3AED', c2: '#C4B5FD', intro: '¡Reino de las Letras! Aprende nuevas letras.', niveles: CONS1.map((l) => nivelLetra(l, false)) },
  { nombre: 'Reino de las Letras 2', icono: '👑', c1: '#9333EA', c2: '#D8B4FE', intro: '¡Más letras del Reino! Sigue aprendiendo.', niveles: CONS2.map((l) => nivelLetra(l, false)) },
  { nombre: 'Montaña de las Sílabas', icono: '⛰️', c1: '#0EA5E9', c2: '#7DD3FC', intro: '¡Montaña de las Sílabas! Une letras para formar sílabas.', niveles: ['M', 'P', 'L', 'S'].map((l) => nivelSilabas(l)) },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  let orden = (await client.query('SELECT COALESCE(MAX(numero_orden),0)::int m FROM mundos WHERE categoria=$1', [CATEGORIA])).rows[0].m;

  let totalNiv = 0;
  for (const w of WORLDS) {
    orden++;
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
       RETURNING id`,
      [w.nombre, `Preescolar — ${w.nombre} (Sitio Miguel)`, orden, w.icono, w.c1, w.c2, CATEGORIA, w.niveles.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 0; a < w.niveles.length; a++) {
      const n = w.niveles[a];
      const cfg = {
        version: 1, tipo: 'preescolar', sub: 'juego', categoria: CATEGORIA,
        id: `${CATEGORIA}-juego-${orden}-${a + 1}`, nombre: n.nombre, icono: n.icono,
        instruccion: n.intro, audio: bankUrl(n.intro), tema: { c1: w.c1, c2: w.c2 },
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
  console.log(`\n✅ Lectoescritura juegos: ${WORLDS.length} mundos, ${totalNiv} niveles.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
