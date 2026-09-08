// Crea mundos de SIMULACIONES interactivas (numero_orden 12) para geometría, aritmética y física.
// El estudiante manipula la simulación (sliders, fracciones, recta, tanque de agua) para hallar/explicar.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const MUNDOS = [
  { cat: 'geometria', nombre: '🔬 Laboratorio de Geometría', c1: '#F59E0B', c2: '#FCD34D', intro: '¡Bienvenido al laboratorio! Aquí construyes figuras con tus manos. Mueve los controles y observa cómo cambian el área y el perímetro. ¡Aprender experimentando es lo máximo!', acts: [
    { sim: 'area_rect', objetivo: 12, nombre: 'Construye un área de 12', instruccion: 'Mueve los controles de ancho y alto hasta que el rectángulo tenga un ÁREA de 12 unidades². Cada cuadradito es 1 unidad.' },
    { sim: 'area_rect', objetivo: 20, nombre: 'Construye un área de 20', instruccion: 'Ajusta el rectángulo para que su ÁREA sea 20 unidades². Recuerda: área = ancho × alto.' },
    { sim: 'perimetro_rect', objetivo: 14, nombre: 'Construye un perímetro de 14', instruccion: 'Ajusta el rectángulo para que su PERÍMETRO (el borde azul) sea 14 unidades. Perímetro = 2 × (ancho + alto).' },
    { sim: 'area_rect', objetivo: 24, nombre: 'Construye un área de 24', instruccion: 'Logra un ÁREA de 24 unidades². ¿De cuántas formas distintas puedes hacerlo?' },
    { sim: 'perimetro_rect', objetivo: 20, nombre: 'Construye un perímetro de 20', instruccion: 'Logra un PERÍMETRO de 20 unidades moviendo ancho y alto.' },
  ] },
  { cat: 'aritmetica', nombre: '🔬 Laboratorio de Números', c1: '#16A34A', c2: '#4ADE80', intro: '¡Bienvenido al laboratorio de números! Aquí las fracciones y los números se vuelven visibles. Sombrea partes y coloca marcadores. ¡Verás las matemáticas con tus propios ojos!', acts: [
    { sim: 'fraccion', numerador: 1, denominador: 2, forma: 'barra', nombre: 'La mitad', instruccion: 'Toca las partes de la barra para sombrear 1/2 (un medio) de la figura.' },
    { sim: 'fraccion', numerador: 3, denominador: 4, forma: 'barra', nombre: 'Tres cuartos', instruccion: 'Sombrea 3/4 (tres cuartos) de la barra tocando las partes.' },
    { sim: 'fraccion', numerador: 2, denominador: 3, forma: 'pizza', nombre: 'Dos tercios de pizza', instruccion: 'Sombrea 2/3 (dos tercios) de la pizza tocando las porciones.' },
    { sim: 'recta', objetivo: 7, max: 10, nombre: 'Coloca el 7', instruccion: 'Toca la recta numérica para colocar el marcador 📍 en el número 7.' },
    { sim: 'recta', objetivo: 4, max: 10, nombre: 'Coloca el 4', instruccion: 'Coloca el marcador en el número 4 de la recta numérica.' },
    { sim: 'fraccion', numerador: 3, denominador: 5, forma: 'barra', nombre: 'Tres quintos', instruccion: 'Sombrea 3/5 (tres quintos) de la barra.' },
  ] },
  { cat: 'fisica', nombre: '🔬 Laboratorio de Física', c1: '#DB2777', c2: '#F472B6', intro: '¡Bienvenido al laboratorio de física! Aquí experimentas de verdad: suelta objetos al agua y observa qué flota y qué se hunde. ¡La ciencia se aprende observando!', acts: [
    { sim: 'flota', nombre: '¿Flota o se hunde? (1)', instruccion: 'Toca cada objeto para soltarlo al agua. Observa cuáles flotan y cuáles se hunden, y luego responde.',
      objetos: [{ nombre: 'Corcho', emoji: '🪵', flota: true, x: 12 }, { nombre: 'Piedra', emoji: '🪨', flota: false, x: 38 }, { nombre: 'Pelota', emoji: '⚽', flota: true, x: 64 }, { nombre: 'Moneda', emoji: '🪙', flota: false, x: 84 }],
      pregunta: { enunciado: '¿Cuál de estos objetos SE HUNDE?', opciones: ['Piedra', 'Corcho', 'Pelota'], correcta: 0 } },
    { sim: 'flota', nombre: '¿Flota o se hunde? (2)', instruccion: 'Suelta los objetos al agua tocándolos y observa. Luego responde la pregunta.',
      objetos: [{ nombre: 'Hoja', emoji: '🍃', flota: true, x: 14 }, { nombre: 'Clavo', emoji: '🔩', flota: false, x: 40 }, { nombre: 'Patito', emoji: '🦆', flota: true, x: 66 }, { nombre: 'Llave', emoji: '🔑', flota: false, x: 86 }],
      pregunta: { enunciado: '¿Cuál de estos objetos FLOTA?', opciones: ['Patito', 'Clavo', 'Llave'], correcta: 0 } },
    { sim: 'flota', nombre: 'El barco y la roca', instruccion: 'Suelta los objetos y observa. ¿Por qué un barco de metal flota pero una roca no?',
      objetos: [{ nombre: 'Barco', emoji: '⛵', flota: true, x: 16 }, { nombre: 'Roca', emoji: '🪨', flota: false, x: 50 }, { nombre: 'Botella', emoji: '🍾', flota: true, x: 80 }],
      pregunta: { enunciado: '¿Qué ayuda a un barco de metal a FLOTAR?', opciones: ['Su forma', 'Su color', 'Su peso solamente'], correcta: 0 } },
    { sim: 'flota', nombre: 'Madera y metal', instruccion: 'Experimenta: suelta cada objeto y observa qué pasa con la madera y el metal.',
      objetos: [{ nombre: 'Tabla', emoji: '🪵', flota: true, x: 18 }, { nombre: 'Tuerca', emoji: '🔩', flota: false, x: 50 }, { nombre: 'Esponja', emoji: '🧽', flota: true, x: 82 }],
      pregunta: { enunciado: 'En general, ¿qué suele FLOTAR?', opciones: ['La madera', 'El metal pesado', 'Las piedras'], correcta: 0 } },
    { sim: 'flota', nombre: 'Gran experimento', instruccion: 'Suelta todos los objetos y observa con atención antes de responder.',
      objetos: [{ nombre: 'Globo', emoji: '🎈', flota: true, x: 12 }, { nombre: 'Ancla', emoji: '⚓', flota: false, x: 38 }, { nombre: 'Manzana', emoji: '🍎', flota: true, x: 64 }, { nombre: 'Martillo', emoji: '🔨', flota: false, x: 86 }],
      pregunta: { enunciado: '¿Cuál NO flota?', opciones: ['Ancla', 'Globo', 'Manzana'], correcta: 0 } },
  ] },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const m of MUNDOS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,12,'🔬',$3,$4,$5,false,$6)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles RETURNING id`,
      [m.nombre, 'Simulaciones interactivas: aprende experimentando.', m.c1, m.c2, m.cat, m.acts.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= m.acts.length; a++) {
      const act = m.acts[a - 1];
      const config = { version: 1, tipo: 'simulacion', id: `sim-${m.cat}-n${a}`, categoria: m.cat, ...act,
        narracion: { intro: a === 1 ? m.intro : `Experimento ${a}: ${act.nombre}. ¡Manos a la obra!`, url_audio_intro: null },
        recompensa: { monedas: 15 + a, gemas: a === m.acts.length ? 2 : 1 } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, act.nombre, a, config]);
    }
    console.log(`✓ ${m.nombre} (${m.acts.length} simulaciones)`);
  }
  console.log('\n✅ Mundos de simulaciones creados para geometría, aritmética y física.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
