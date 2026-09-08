// FASE 5 — Aritmética interactiva (analítica): Balanza de igualdad + Sumar juntando grupos.
// tipo:'simulacion' sim:'aritmetica' fuente:'sim-rica'. Audio ElevenLabs en /audio/sim-bank/.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
function slugFrase(t) { return (t || '').toLowerCase().replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i').replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x'; }
const bankUrl = (f) => `/audio/sim-bank/${slugFrase(f)}.mp3`;

const ACTS = [
  { sim: 'aritmetica', modo: 'balanza', izquierda: 4, nombre: 'Equilibra el 4', instruccion: 'Pon bloques naranjas hasta que la balanza quede igual al lado izquierdo.' },
  { sim: 'aritmetica', modo: 'balanza', izquierda: 7, nombre: 'Equilibra el 7', instruccion: 'Agrega bloques para equilibrar la balanza con el número de la izquierda.' },
  { sim: 'aritmetica', modo: 'balanza', izquierda: 5, etiquetaIzq: '3 + 2', nombre: 'La suma equilibrada', instruccion: 'A la izquierda hay 3 más 2. Pon los bloques que igualen esa suma.' },
  { sim: 'aritmetica', modo: 'suma', a: 3, b: 2, objeto: '🍎', nombre: 'Junta las manzanas', instruccion: 'Junta los dos grupos de manzanas y di cuántas hay en total.' },
  { sim: 'aritmetica', modo: 'suma', a: 4, b: 5, objeto: '⭐', nombre: 'Junta las estrellas', instruccion: 'Junta los grupos de estrellas y cuenta el total.' },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  const NOM = '🧮 Laboratorio de Aritmética';
  const ex = await client.query("SELECT numero_orden FROM mundos WHERE categoria='aritmetica' AND nombre=$1 ORDER BY id LIMIT 1", [NOM]);
  const orden = ex.rows.length ? ex.rows[0].numero_orden : (await client.query("SELECT COALESCE(MAX(numero_orden),0)::int x FROM mundos WHERE categoria='aritmetica'")).rows[0].x + 1;
  const res = await client.query(
    `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
     VALUES ($1,$2,$3,'🔬','#16A34A','#86EFAC','aritmetica',false,$4)
     ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, total_niveles=EXCLUDED.total_niveles RETURNING id`,
    [NOM, 'Balanzas y grupos para entender la igualdad y la suma jugando.', orden, ACTS.length]
  );
  const mundoId = res.rows[0].id;
  for (let a = 1; a <= ACTS.length; a++) {
    const act = ACTS[a - 1];
    const config = { version: 1, tipo: 'simulacion', fuente: 'sim-rica', id: `sim-arit-${a}`, categoria: 'aritmetica', ...act, narracion: { intro: act.instruccion, url_audio_intro: bankUrl(act.instruccion) }, recompensa: { monedas: 12 + a, gemas: a === ACTS.length ? 2 : 1 } };
    await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo) VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true) ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, act.nombre, a, config]);
    console.log(`  ✓ ${act.nombre} (${act.modo})`);
  }
  console.log(`\n✅ Laboratorio de Aritmética (orden ${orden}, id ${mundoId}, ${ACTS.length} niveles).`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
