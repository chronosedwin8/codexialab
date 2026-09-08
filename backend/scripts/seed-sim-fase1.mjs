// FASE 1 (cimientos) — siembra 2 simulaciones ricas de ejemplo:
//  · Física (Matter.js): caída libre en la materia 'fisica'.
//  · Ciencias (Three.js): sistema solar 3D en la materia 'ciencias'.
// tipo:'simulacion' + sim:'fisica'|'escena3d', fuente:'sim-rica'. Audio ElevenLabs en /audio/sim-bank/.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}
const bankUrl = (f) => `/audio/sim-bank/${slugFrase(f)}.mp3`;

const MUNDOS = [
  {
    cat: 'fisica', nombre: '🔬 Laboratorio de Caídas', c1: '#DB2777', c2: '#F472B6',
    intro: '¡Laboratorio de física! Suelta los objetos y descubre cómo caen.',
    acts: [{
      sim: 'fisica', escena: 'caida', nombre: 'Caída libre',
      instruccion: 'Suelta las pelotas y observa con atención: ¿cuál llega primero al suelo?',
      objetos: [{ color: '#F87171', radio: 30 }, { color: '#60A5FA', radio: 22 }, { color: '#FCD34D', radio: 15 }],
      pregunta: { enunciado: '¿Cuál pelota llegó primero al suelo?', opciones: ['Todas llegaron a la vez', 'La más grande', 'La más pequeña'], correcta: 0 },
    }],
  },
  {
    cat: 'ciencias', nombre: '🔬 Laboratorio del Espacio', c1: '#0D9488', c2: '#5EEAD4',
    intro: '¡Viaje al espacio! Explora el sistema solar girándolo con tu dedo.',
    acts: [{
      sim: 'escena3d', escena3d: 'sistema_solar', nombre: 'El Sistema Solar 3D',
      instruccion: 'Arrastra para girar y usa la rueda para acercarte. Explora el sistema solar y responde.',
      reto: { enunciado: '¿Cuál es el astro que da luz y calor?', opciones: ['El Sol', 'La Luna', 'Un planeta'], correcta: 0 },
    }],
  },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  for (const m of MUNDOS) {
    const ex = await client.query('SELECT numero_orden FROM mundos WHERE categoria=$1 AND nombre=$2 ORDER BY id LIMIT 1', [m.cat, m.nombre]);
    const orden = ex.rows.length ? ex.rows[0].numero_orden : (await client.query('SELECT COALESCE(MAX(numero_orden),0)::int x FROM mundos WHERE categoria=$1', [m.cat])).rows[0].x + 1;
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,'🔬',$4,$5,$6,false,$7)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles RETURNING id`,
      [m.nombre, 'Simulaciones realistas: aprende experimentando.', orden, m.c1, m.c2, m.cat, m.acts.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= m.acts.length; a++) {
      const act = m.acts[a - 1];
      const config = {
        version: 1, tipo: 'simulacion', fuente: 'sim-rica', id: `simrica-${m.cat}-n${a}`, categoria: m.cat, ...act,
        narracion: { intro: m.intro, url_audio_intro: bankUrl(m.intro) },
        recompensa: { monedas: 15 + a, gemas: 2 },
      };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, act.nombre, a, config]
      );
    }
    console.log(`✓ [${m.cat}] ${m.nombre} (orden ${orden}, id ${mundoId})`);
  }
  console.log('\n✅ Fase 1: 2 simulaciones ricas sembradas (fisica caída + ciencias sistema solar).');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
