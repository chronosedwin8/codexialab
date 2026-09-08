// FASE 3-4 — Simulaciones 3D (Three.js): Ciencias (moléculas, célula) y Geometría (sólidos).
// tipo:'simulacion' sim:'escena3d' fuente:'sim-rica'. Audio ElevenLabs en /audio/sim-bank/.
// Idempotente: busca el mundo por nombre y reutiliza su numero_orden.
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
    cat: 'ciencias', nombre: '🧪 Laboratorio 3D de Ciencias', c1: '#0D9488', c2: '#5EEAD4',
    acts: [
      { sim: 'escena3d', escena3d: 'molecula', molecula: 'agua', nombre: 'La molécula de agua', instruccion: 'Gira la molécula de agua con tu dedo y cuenta sus átomos.', reto: { enunciado: '¿Cuántos átomos tiene la molécula de agua, H₂O?', opciones: ['3 átomos', '2 átomos', '1 átomo'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'molecula', molecula: 'co2', nombre: 'El dióxido de carbono', instruccion: 'Explora la molécula de dióxido de carbono. Las esferas rojas son oxígeno.', reto: { enunciado: '¿Cuántos átomos de oxígeno tiene el CO₂?', opciones: ['2', '1', '3'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'celula', nombre: 'La célula', instruccion: 'Gira la célula y obsérvala por dentro. La esfera morada del centro es el núcleo.', reto: { enunciado: '¿Qué parte controla la célula?', opciones: ['El núcleo (morado, en el centro)', 'La membrana', 'Un organelo pequeño'], correcta: 0 } },
    ],
  },
  {
    cat: 'geometria', nombre: '📐 Laboratorio 3D de Sólidos', c1: '#F59E0B', c2: '#FCD34D',
    acts: [
      { sim: 'escena3d', escena3d: 'solido', solido: 'cubo', nombre: 'El cubo', instruccion: 'Gira el cubo y cuenta sus caras (los lados planos).', reto: { enunciado: '¿Cuántas caras tiene el cubo?', opciones: ['6', '4', '8', '12'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'piramide', solido: 'piramide', nombre: 'La pirámide', instruccion: 'Gira la pirámide de base cuadrada y cuenta todas sus caras.', reto: { enunciado: '¿Cuántas caras tiene esta pirámide?', opciones: ['5', '4', '6'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'prisma', solido: 'prisma', nombre: 'El prisma triangular', instruccion: 'Observa el prisma triangular girándolo. Tiene dos triángulos y rectángulos.', reto: { enunciado: '¿Cuántas caras tiene el prisma triangular?', opciones: ['5', '3', '6'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'cilindro', solido: 'cilindro', nombre: 'El cilindro', instruccion: 'Gira el cilindro. Fíjate en sus dos tapas circulares.', reto: { enunciado: '¿Cuántas caras planas (circulares) tiene el cilindro?', opciones: ['2', '1', '3'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'cono', solido: 'cono', nombre: 'El cono', instruccion: 'Gira el cono y mira su punta.', reto: { enunciado: '¿Cuántas puntas (vértices) tiene el cono?', opciones: ['1', '0', '2'], correcta: 0 } },
      { sim: 'escena3d', escena3d: 'esfera', solido: 'esfera', nombre: 'La esfera', instruccion: 'Gira la esfera. Es completamente redonda.', reto: { enunciado: '¿Cuántas caras planas tiene la esfera?', opciones: ['Ninguna', '1', '2'], correcta: 0 } },
    ],
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
      [m.nombre, 'Simulaciones 3D interactivas: gira, explora y aprende.', orden, m.c1, m.c2, m.cat, m.acts.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= m.acts.length; a++) {
      const act = m.acts[a - 1];
      const config = {
        version: 1, tipo: 'simulacion', fuente: 'sim-rica', id: `sim3d-${m.cat}-${a}`, categoria: m.cat, ...act,
        narracion: { intro: act.instruccion, url_audio_intro: bankUrl(act.instruccion) },
        recompensa: { monedas: 15 + a, gemas: a === m.acts.length ? 2 : 1 },
      };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, act.nombre, a, config]
      );
    }
    console.log(`  ✓ [${m.cat}] ${m.nombre} (orden ${orden}, ${m.acts.length} niveles)`);
  }
  console.log('\n✅ Simulaciones 3D: Ciencias (moléculas+célula) y Geometría (sólidos).');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
