// FASE 2 — Laboratorio de Física completo (Matter.js). Mundo en la materia 'fisica' con
// las 7 escenas: caída, plano inclinado, colisión, péndulo, proyectil, palanca, polea.
// tipo:'simulacion' sim:'fisica' fuente:'sim-rica'. Audio ElevenLabs en /audio/sim-bank/.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}
const bankUrl = (f) => `/audio/sim-bank/${slugFrase(f)}.mp3`;

const ACTS = [
  { sim: 'fisica', escena: 'caida', nombre: 'Caída libre', instruccion: 'Suelta las pelotas y observa: ¿cuál llega primero al suelo?',
    objetos: [{ color: '#F87171', radio: 30 }, { color: '#60A5FA', radio: 22 }, { color: '#FCD34D', radio: 15 }],
    pregunta: { enunciado: '¿Cuál pelota llegó primero al suelo?', opciones: ['Todas llegaron a la vez', 'La más grande', 'La más pequeña'], correcta: 0 } },
  { sim: 'fisica', escena: 'plano_inclinado', nombre: 'El plano inclinado', instruccion: 'Mueve la inclinación y suelta la caja. Observa cómo cambia su velocidad.',
    pregunta: { enunciado: 'Con más inclinación, ¿la caja baja más rápido o más lento?', opciones: ['Más rápido', 'Más lento', 'Igual de rápido'], correcta: 0 } },
  { sim: 'fisica', escena: 'colision', nombre: 'Choques', instruccion: 'Lanza la bola roja contra las azules y observa qué pasa.',
    pregunta: { enunciado: '¿Qué les pasó a las bolas azules al ser golpeadas?', opciones: ['Se movieron por el golpe', 'Desaparecieron', 'No se movieron'], correcta: 0 } },
  { sim: 'fisica', escena: 'pendulo', nombre: 'El péndulo', instruccion: 'Cambia el largo de la cuerda, suelta el péndulo y observa cómo cambia su balanceo.',
    pregunta: { enunciado: 'Con la cuerda más larga, ¿el péndulo se balancea más rápido o más lento?', opciones: ['Más lento', 'Más rápido', 'Igual de rápido'], correcta: 0 } },
  { sim: 'fisica', escena: 'proyectil', nombre: 'Tiro al blanco', instruccion: 'Ajusta el ángulo y la fuerza, y lanza para dar en la diana.' },
  { sim: 'fisica', escena: 'palanca', nombre: 'La balanza', instruccion: 'Mueve el peso amarillo hasta equilibrar la balanza.' },
  { sim: 'fisica', escena: 'polea', nombre: 'La polea', instruccion: 'Pon pesos en la cuerda para levantar la caja hasta la zona verde.' },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  const NOMBRE = '🔬 Gran Laboratorio de Física';
  // Idempotente: si el mundo ya existe (por nombre) reutiliza su numero_orden; si no, max+1.
  const ex = await client.query("SELECT numero_orden FROM mundos WHERE categoria='fisica' AND nombre=$1 ORDER BY id LIMIT 1", [NOMBRE]);
  const orden = ex.rows.length ? ex.rows[0].numero_orden : (await client.query("SELECT COALESCE(MAX(numero_orden),0)::int x FROM mundos WHERE categoria='fisica'")).rows[0].x + 1;
  const res = await client.query(
    `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
     VALUES ($1,$2,$3,'🔬','#DB2777','#F472B6','fisica',false,$4)
     ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, total_niveles=EXCLUDED.total_niveles RETURNING id`,
    [NOMBRE, 'Experimentos con física real: gravedad, planos, choques, péndulo, proyectiles, palanca y polea.', orden, ACTS.length]
  );
  const mundoId = res.rows[0].id;
  for (let a = 1; a <= ACTS.length; a++) {
    const act = ACTS[a - 1];
    const config = {
      version: 1, tipo: 'simulacion', fuente: 'sim-rica', id: `simrica-fisica-lab-${a}`, categoria: 'fisica', ...act,
      narracion: { intro: act.instruccion, url_audio_intro: bankUrl(act.instruccion) },
      recompensa: { monedas: 15 + a, gemas: a === ACTS.length ? 2 : 1 },
    };
    await client.query(
      `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
       ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
      [mundoId, act.nombre, a, config]
    );
    console.log(`  ✓ ${act.nombre} (${act.escena})`);
  }
  console.log(`\n✅ Gran Laboratorio de Física (orden ${orden}, id ${mundoId}) con ${ACTS.length} experimentos.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
