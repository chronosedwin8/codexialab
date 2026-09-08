// MATERIA "Piensa en 3D" (estilo Light-Bot). Mundos 3D de alturas donde el estudiante
// arma un algoritmo (avanzar, girar, saltar, encender, funciones F1/F2) que se ejecuta en
// el sandbox y los pasos suceden en 3D (Three.js). Objetivo: encender todas las placas azules.
// Cada nivel está diseñado con una solución conocida (verificada con el simulador de abajo)
// y umbrales de estrellas según el nº de comandos (premia optimizar y usar funciones).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const CATEGORIA = 'piensa3d';

// ── Simulador de verificación (mismas reglas que el worker) ──
const DIRS = { norte: [0, -1], sur: [0, 1], este: [1, 0], oeste: [-1, 0] };
const TR = { norte: 'este', este: 'sur', sur: 'oeste', oeste: 'norte' };
const TL = { norte: 'oeste', oeste: 'sur', sur: 'este', este: 'norte' };
// Intérprete fiel al worker: ejecuta paso a paso con sensores (condicionales) y recursión de F1/F2.
function simular(cfg, programa) {
  const { grid, spawn, metas } = cfg;
  const rows = grid.length, cols = grid[0].length;
  const H = (x, y) => (x >= 0 && y >= 0 && y < rows && x < cols && grid[y][x] > 0 ? grid[y][x] : null);
  const st = { x: spawn.x, y: spawn.y, dir: spawn.dir };
  const lit = new Set(); const metaSet = new Set(metas.map((m) => `${m.x},${m.y}`));
  let pasos = 0; const TOPE = 3000;
  const fwd = () => { const [dx, dy] = DIRS[st.dir]; return [st.x + dx, st.y + dy]; };
  const libre = () => { const [tx, ty] = fwd(); const th = H(tx, ty); return th !== null && th === H(st.x, st.y); };
  function uno(t) {
    if (++pasos > TOPE) return;
    if (t === 'f1') run(programa.f1 || []);
    else if (t === 'f2') run(programa.f2 || []);
    else if (t === 'girarDerecha') st.dir = TR[st.dir];
    else if (t === 'girarIzquierda') st.dir = TL[st.dir];
    else if (t === 'avanzar') { const [tx, ty] = fwd(); if (H(tx, ty) !== null && H(tx, ty) === H(st.x, st.y)) { st.x = tx; st.y = ty; } }
    else if (t === 'saltar') { const [tx, ty] = fwd(); const th = H(tx, ty), ch = H(st.x, st.y); if (th !== null && (th === ch + 1 || th < ch)) { st.x = tx; st.y = ty; } }
    else if (t === 'encender') { if (metaSet.has(`${st.x},${st.y}`)) lit.add(`${st.x},${st.y}`); }
  }
  function run(arr) {
    for (let i = 0; i < arr.length && pasos <= TOPE; i++) {
      const t = arr[i];
      if (t === 'siObstaculo' || t === 'siLibre') {
        const next = arr[i + 1];
        if (next && next !== 'siObstaculo' && next !== 'siLibre') { const cond = t === 'siObstaculo' ? !libre() : libre(); i++; if (cond) uno(next); }
      } else uno(t);
    }
  }
  run(programa.main);
  return metas.every((m) => lit.has(`${m.x},${m.y}`));
}

function nivel(id, nombre, intro, datos, programaSol) {
  const cfg = {
    tipo: 'lightbot', id: `${CATEGORIA}-${id}`, categoria: CATEGORIA, nombre, intro,
    narracion: { intro, url_audio_intro: null },
    grid: datos.grid, spawn: datos.spawn, metas: datos.metas,
    comandos: datos.comandos, funciones: datos.funciones || { f1: false, f2: false },
    limites: datos.limites || { main: 12, f1: 6, f2: 6 },
    estrellas: datos.estrellas || { tres: 6, dos: 10 },
  };
  if (!simular(cfg, programaSol)) throw new Error(`Nivel "${nombre}" SIN SOLUCIÓN con el programa de referencia`);
  return cfg;
}

// ── Mundos ──
const MUNDOS = [
  ['Primeros Pasos', '🤖', '#2563EB', '#1D4ED8', [
    nivel('m1-n1', 'En línea recta', 'Lleva al robot hasta la placa azul y enciende su luz. Usa Avanzar y Encender.',
      { grid: [[1, 1, 1, 1, 1]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 4, y: 0 }], comandos: ['avanzar', 'encender'], limites: { main: 8, f1: 4, f2: 4 }, estrellas: { tres: 5, dos: 7 } },
      { main: ['avanzar', 'avanzar', 'avanzar', 'avanzar', 'encender'] }),
    nivel('m1-n2', 'La esquina', 'Gira con las flechas ↻ ↺ para doblar. ¡El giro es del robot, no tuyo!',
      { grid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 2, y: 2 }], comandos: ['avanzar', 'girarDerecha', 'girarIzquierda', 'encender'], limites: { main: 10, f1: 4, f2: 4 }, estrellas: { tres: 6, dos: 9 } },
      { main: ['avanzar', 'avanzar', 'girarDerecha', 'avanzar', 'avanzar', 'encender'] }),
    nivel('m1-n3', 'Dos lucecitas', 'Hay 2 placas azules. ¡Enciéndelas todas!',
      { grid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 2, y: 0 }, { x: 2, y: 2 }], comandos: ['avanzar', 'girarDerecha', 'girarIzquierda', 'encender'], limites: { main: 12, f1: 4, f2: 4 }, estrellas: { tres: 7, dos: 10 } },
      { main: ['avanzar', 'avanzar', 'encender', 'girarDerecha', 'avanzar', 'avanzar', 'encender'] }),
  ]],
  ['Sube y Baja', '🧗', '#7C3AED', '#5B21B6', [
    nivel('m2-n1', 'Un escalón', 'Para subir un nivel usa Saltar ⤴️. Avanzar solo sirve si el suelo está a la misma altura.',
      { grid: [[1, 1, 2, 2]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 3, y: 0 }], comandos: ['avanzar', 'saltar', 'encender'], limites: { main: 8, f1: 4, f2: 4 }, estrellas: { tres: 4, dos: 6 } },
      { main: ['avanzar', 'saltar', 'avanzar', 'encender'] }),
    nivel('m2-n2', 'Baja y sube', 'Saltar también sirve para bajar. ¡Cruza el valle!',
      { grid: [[2, 1, 1, 2]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 3, y: 0 }], comandos: ['avanzar', 'saltar', 'encender'], limites: { main: 8, f1: 4, f2: 4 }, estrellas: { tres: 4, dos: 6 } },
      { main: ['saltar', 'avanzar', 'saltar', 'encender'] }),
    nivel('m2-n3', 'La escalera', 'Sube escalón por escalón hasta la cima.',
      { grid: [[1, 2, 3, 4]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 3, y: 0 }], comandos: ['avanzar', 'saltar', 'encender'], limites: { main: 8, f1: 4, f2: 4 }, estrellas: { tres: 4, dos: 6 } },
      { main: ['saltar', 'saltar', 'saltar', 'encender'] }),
    nivel('m2-n4', 'Giro y salto', 'Combina girar y saltar para llegar a la cima.',
      { grid: [[1, 1, 2], [1, 0, 2], [1, 1, 1]], spawn: { x: 0, y: 2, dir: 'norte' }, metas: [{ x: 2, y: 0 }], comandos: ['avanzar', 'girarDerecha', 'girarIzquierda', 'saltar', 'encender'], limites: { main: 10, f1: 4, f2: 4 }, estrellas: { tres: 6, dos: 9 } },
      { main: ['avanzar', 'avanzar', 'girarDerecha', 'avanzar', 'saltar', 'encender'] }),
  ]],
  ['Funciones Mágicas', '🔁', '#DB2777', '#9D174D', [
    nivel('m3-n1', 'Patrón repetido', 'MAIN es muy corto. Guarda el patrón que se repite en F1 y llámalo desde MAIN.',
      { grid: [[1, 1, 1, 1, 1, 1, 1, 1, 1]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 8, y: 0 }], comandos: ['avanzar', 'encender', 'f1'], funciones: { f1: true, f2: false }, limites: { main: 5, f1: 6, f2: 4 }, estrellas: { tres: 7, dos: 9 } },
      { main: ['f1', 'f1', 'encender'], f1: ['avanzar', 'avanzar', 'avanzar', 'avanzar'] }),
    nivel('m3-n2', 'La vuelta completa', '¡El truco mágico! Pon en F1 "encender, avanzar, avanzar, girar" y llámalo 4 veces para recorrer el cuadrado y encender las 4 esquinas.',
      { grid: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }], comandos: ['avanzar', 'girarDerecha', 'encender', 'f1'], funciones: { f1: true, f2: false }, limites: { main: 4, f1: 6, f2: 4 }, estrellas: { tres: 8, dos: 12 } },
      { main: ['f1', 'f1', 'f1', 'f1'], f1: ['encender', 'avanzar', 'avanzar', 'girarDerecha'] }),
    nivel('m3-n3', 'Dos funciones', 'Usa F1 para avanzar tramos y F2 para encender en las esquinas. ¡Combina ambas!',
      { grid: [[1, 1, 1, 1, 1], [0, 0, 0, 0, 1], [1, 1, 1, 1, 1]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 4, y: 0 }, { x: 0, y: 2 }], comandos: ['avanzar', 'girarDerecha', 'encender', 'f1', 'f2'], funciones: { f1: true, f2: true }, limites: { main: 8, f1: 5, f2: 4 }, estrellas: { tres: 11, dos: 15 } },
      { main: ['f1', 'f2', 'girarDerecha', 'avanzar', 'avanzar', 'girarDerecha', 'f1', 'f2'], f1: ['avanzar', 'avanzar', 'avanzar', 'avanzar'], f2: ['encender'] }),
  ]],
  ['Sensores y Bucles', '🤔', '#0891B2', '#155E75', [
    nivel('m4-n1', 'Avanza hasta el muro', 'No sabes cuántos pasos hay. Usa un BUCLE: F1 = "avanzar" y "si el paso está libre ✅→ F1". ¡Se repite sola hasta el muro!',
      { grid: [[1, 1, 1, 1, 1, 2]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 4, y: 0 }], comandos: ['avanzar', 'encender', 'f1', 'siLibre'], funciones: { f1: true, f2: false }, limites: { main: 4, f1: 5, f2: 4 }, estrellas: { tres: 5, dos: 7 } },
      { main: ['f1', 'encender'], f1: ['avanzar', 'siLibre', 'f1'] }),
    nivel('m4-n2', 'Salta los baches', 'Camino mixto: a veces avanzas y a veces hay un escalón. Usa "si hay obstáculo ⛔→ salta". El bucle F1 se repite mientras pueda seguir.',
      { grid: [[1, 1, 2, 2, 1, 3]], spawn: { x: 0, y: 0, dir: 'este' }, metas: [{ x: 4, y: 0 }], comandos: ['avanzar', 'saltar', 'encender', 'f1', 'siObstaculo', 'siLibre'], funciones: { f1: true, f2: false }, limites: { main: 4, f1: 6, f2: 4 }, estrellas: { tres: 7, dos: 10 } },
      { main: ['f1', 'encender'], f1: ['avanzar', 'siObstaculo', 'saltar', 'siLibre', 'f1'] }),
  ]],
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  let total = 0;
  for (let w = 0; w < MUNDOS.length; w++) {
    const [nombre, icono, c1, c2, niveles] = MUNDOS[w];
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
       RETURNING id`,
      [nombre, `Piensa en 3D — ${nombre}`, w + 1, icono, c1, c2, CATEGORIA, niveles.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 0; a < niveles.length; a++) {
      const cfg = niveles[a];
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, cfg.nombre, a + 1, cfg]
      );
      total++;
    }
    console.log(`  ✓ M${w + 1} "${nombre}" (${niveles.length} niveles) — soluciones verificadas`);
  }
  console.log(`\n✅ Piensa en 3D sembrado: ${MUNDOS.length} mundos, ${total} niveles.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
