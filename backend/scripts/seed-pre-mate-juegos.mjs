// PREESCOLAR — Juegos de matemáticas del "Sitio Miguel" apropiados para ≤6 (Valle de las
// Sumas, Cañón de las Restas, Mina de los Números) reimplementados NATIVOS con
// PreescolarJuego.vue, en la materia mate_preescolar. Audio 100% ElevenLabs. NADA de TTS.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const CATEGORIA = 'mate_preescolar';

function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}
const bankUrl = (f) => `/audio/preescolar/bank/${slugFrase(f)}.mp3`;
const R = () => Math.random();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function opcionesNum(correcto, max = 10) {
  const set = new Set([correcto]); let g = 0;
  while (set.size < 3 && g++ < 60) { const d = correcto + (Math.floor(R() * 5) - 2); if (d >= 0 && d <= max && d !== correcto) set.add(d); }
  while (set.size < 3) set.add(Math.floor(R() * (max + 1)));
  return shuffle([...set]);
}
const I_suma = 'Cuenta y suma. ¿Cuántos hay en total? Tócalo.';
const I_resta = 'Cuenta lo que queda. ¿Cuántos quedan? Tócalo.';
const I_cuenta = '¿Cuántos hay? Toca el número.';
const I_mas = '¿Cuál grupo tiene más? Tócalo.';
const I_orden = 'Toca los números en orden, del más pequeño al más grande.';

const suma = (a, b, e) => ({ tipo: 'operacion', a, b, op: '+', emoji: e, opciones: opcionesNum(a + b, 10), instruccion: I_suma });
const resta = (a, b, e) => ({ tipo: 'operacion', a, b, op: '-', emoji: e, opciones: opcionesNum(a - b, 10), instruccion: I_resta });
const cuenta = (n, e) => ({ tipo: 'cuenta', n, emoji: e, opciones: opcionesNum(n, 10), instruccion: I_cuenta });
const compara = (e, a, b) => ({ tipo: 'compara', grupos: shuffle([{ emoji: e, n: a }, { emoji: e, n: b }]), objetivo: 'mas', instruccion: I_mas });
function ordenNums(set) { return { tipo: 'ordena', items: shuffle(set.map((v, i) => ({ label: String(v), orden: i + 1 }))), instruccion: I_orden }; }

const MUNDOS = [
  {
    nombre: 'Valle de las Sumas', icono: '➕', intro: '¡Valle de las Sumas! Une los grupos y cuenta el total.',
    rondas: [suma(1, 1, '🍎'), suma(2, 1, '⭐'), suma(2, 2, '🎈'), suma(3, 2, '🐠'), suma(4, 2, '🍓'),
      suma(3, 3, '🚗'), suma(5, 2, '🌸'), suma(4, 4, '🐥'), suma(6, 3, '🦋'), suma(5, 5, '💎')],
  },
  {
    nombre: 'Cañón de las Restas', icono: '➖', intro: '¡Cañón de las Restas! Quita y cuenta lo que queda.',
    rondas: [resta(3, 1, '🎈'), resta(4, 2, '🍎'), resta(5, 1, '⭐'), resta(5, 3, '🐠'), resta(6, 2, '🍓'),
      resta(7, 3, '🚗'), resta(8, 4, '🌸'), resta(9, 4, '🐥'), resta(10, 5, '🦋'), resta(8, 6, '💎')],
  },
  {
    nombre: 'Mina de los Números', icono: '💎', intro: '¡Mina de los Números! Cuenta los tesoros de la mina.',
    rondas: [cuenta(4, '💎'), cuenta(6, '🪙'), compara('💎', 3, 7), cuenta(8, '💰'), compara('🪙', 9, 4),
      ordenNums([1, 2, 3, 4, 5]), cuenta(10, '💎'), compara('💎', 5, 8), ordenNums([2, 4, 6, 8, 10]), cuenta(7, '🪙')],
  },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  let orden = (await client.query('SELECT COALESCE(MAX(numero_orden),0)::int m FROM mundos WHERE categoria=$1', [CATEGORIA])).rows[0].m;

  for (const w of MUNDOS) {
    orden++;
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,1)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, bloqueado=false
       RETURNING id`,
      [w.nombre, `Preescolar — ${w.nombre} (Sitio Miguel)`, orden, w.icono, '#16A34A', '#86EFAC', CATEGORIA]
    );
    const mundoId = res.rows[0].id;
    const cfg = {
      version: 1, tipo: 'preescolar', sub: 'juego', categoria: CATEGORIA,
      id: `${CATEGORIA}-mate-${orden}`, nombre: w.nombre, icono: w.icono,
      instruccion: w.intro, audio: bankUrl(w.intro), tema: { c1: '#16A34A', c2: '#86EFAC' },
      rondas: w.rondas, recompensa: { monedas: 8, gemas: 1 },
      narracion: { intro: w.intro, url_audio_intro: bankUrl(w.intro) },
    };
    await client.query(
      `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1,$2,1,$3,'exploradores', ARRAY['bloques']::modalidad_codigo[], true)
       ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
      [mundoId, w.nombre, cfg]
    );
    console.log(`  ✓ ${w.nombre} (${w.rondas.length} rondas)`);
  }
  console.log(`\n✅ Matemáticas juegos: ${MUNDOS.length} mundos.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
