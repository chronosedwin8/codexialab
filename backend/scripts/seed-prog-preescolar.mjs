// PREESCOLAR — Materia "Programación" (niños hasta 6 años).
// Juego de rejilla al estilo de los bloques de flecha (⬆️⬇️⬅️➡️): el niño arma una
// secuencia de flechas y un personaje recorre un escenario colorido. Las flechas se
// convierten en CÓDIGO REAL (heroe.moverArriba(), etc.) que se ejecuta en el MISMO
// sandbox (Web Worker) que usan los niños mayores → "responde al código de abajo".
//
// 5 MUNDOS máximo, del más fácil (líneas rectas) a un reto interesante (laberintos
// con estrellas que recoger), siempre con solo 4 movimientos: arriba/abajo/izq/der.
//
// Cada nivel se define con una rejilla ASCII y un SOLVER (BFS) auto-verifica que tenga
// solución (recoger todas las estrellas y llegar a la gema) ANTES de insertarlo.
//   '.' suelo   '#' pared   'S' inicio   'G' meta(gema)   '*' estrella a recoger
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const CATEGORIA = 'prog_preescolar';
const COMANDOS = ['moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha'];
const DELTA = { moverArriba: [0, -1], moverAbajo: [0, 1], moverIzquierda: [-1, 0], moverDerecha: [1, 0] };

// ── Parseo de rejilla ASCII ──
function parse(rows) {
  const tilemap = [], items = [];
  let spawn = null, meta = null;
  rows.forEach((fila, y) => {
    const r = [];
    [...fila].forEach((ch, x) => {
      if (ch === '#') { r.push(1); return; }
      r.push(0);
      if (ch === 'S') spawn = { x, y, dir: 'derecha' };
      else if (ch === 'G') meta = { x, y };
      else if (ch === '*') items.push({ x, y });
    });
    tilemap.push(r);
  });
  if (!spawn) throw new Error('falta inicio S');
  if (!meta) throw new Error('falta meta G');
  return { tilemap, spawn, meta, items };
}

// ── Solver BFS: estado = (x, y, máscara de estrellas recogidas) ──
function resolver({ tilemap, spawn, meta, items }) {
  const rows = tilemap.length, cols = tilemap[0].length;
  const full = (1 << items.length) - 1;
  const idxItem = new Map(items.map((it, i) => [`${it.x},${it.y}`, i]));
  const walk = (x, y) => x >= 0 && y >= 0 && y < rows && x < cols && tilemap[y][x] === 0;
  const maskAt = (x, y, m) => { const i = idxItem.get(`${x},${y}`); return i === undefined ? m : (m | (1 << i)); };

  const start = { x: spawn.x, y: spawn.y, m: maskAt(spawn.x, spawn.y, 0) };
  const key = (s) => `${s.x},${s.y},${s.m}`;
  const seen = new Set([key(start)]);
  const q = [{ s: start, path: [] }];
  while (q.length) {
    const { s, path } = q.shift();
    if (s.x === meta.x && s.y === meta.y && s.m === full) return path;
    for (const cmd of COMANDOS) {
      const [dx, dy] = DELTA[cmd];
      const nx = s.x + dx, ny = s.y + dy;
      if (!walk(nx, ny)) continue;
      const ns = { x: nx, y: ny, m: maskAt(nx, ny, s.m) };
      if (seen.has(key(ns))) continue;
      seen.add(key(ns));
      q.push({ s: ns, path: [...path, cmd] });
    }
  }
  return null;
}

// ── Temas (gráficos por mundo) ──
const TEMAS = {
  playa: { fondo: 'linear-gradient(180deg,#7DD3FC 0%,#FEF3C7 55%,#FCD34D 100%)', suelo1: '#FDE68A', suelo2: '#FCD34D', borde: '#F59E0B', heroe: '🐺', meta: '💎', pared: '🌴', item: '⭐' },
  bosque: { fondo: 'linear-gradient(180deg,#86EFAC 0%,#4ADE80 60%,#16A34A 100%)', suelo1: '#BBF7D0', suelo2: '#86EFAC', borde: '#16A34A', heroe: '🐺', meta: '💎', pared: '🌳', item: '⭐' },
  cuevas: { fondo: 'linear-gradient(180deg,#A5B4FC 0%,#818CF8 55%,#6366F1 100%)', suelo1: '#E0E7FF', suelo2: '#C7D2FE', borde: '#6366F1', heroe: '🐺', meta: '💎', pared: '🧊', item: '⭐' },
  jungla: { fondo: 'linear-gradient(180deg,#34D399 0%,#10B981 55%,#047857 100%)', suelo1: '#A7F3D0', suelo2: '#6EE7B7', borde: '#047857', heroe: '🐺', meta: '💎', pared: '🌿', item: '⭐' },
  espacio: { fondo: 'linear-gradient(180deg,#1E1B4B 0%,#312E81 55%,#4C1D95 100%)', suelo1: '#6D28D9', suelo2: '#7C3AED', borde: '#A78BFA', heroe: '🐺', meta: '💎', pared: '☄️', item: '⭐' },
};

const baseInstr = '¡Ayuda al lobito a llegar a la gema! Toca las flechas para hacer el camino y pulsa Iniciar.';
const itemsInstr = '¡Recoge todas las estrellas y lleva al lobito a la gema! Toca las flechas y pulsa Iniciar.';

// ── 5 MUNDOS ──
const MUNDOS = [
  // 1 · La playa — líneas rectas (introduce ➡️ ⬇️ ⬆️ ⬅️)
  ['La Playa del Lobito', '🏖️', 'playa', '#FBBF24', '#F59E0B', [
    ['A la derecha', ['S..G']],
    ['Hacia abajo', ['S', '.', 'G']],
    ['Hacia arriba', ['G', '.', 'S']],
    ['A la izquierda', ['G..S']],
    ['Camino largo', ['S...G']],
  ]],
  // 2 · El bosque — una vuelta (esquinas)
  ['El Bosque Mágico', '🌲', 'bosque', '#22C55E', '#16A34A', [
    ['La primera vuelta', ['S.', '..', '.G']],
    ['Sube y dobla', ['..G', '...', 'S..']],
    ['Dobla hacia abajo', ['S...', '...G']],
    ['Sube y camina', ['...G', '....', 'S...']],
    ['El sendero', ['S....', '.....', '....G']],
  ]],
  // 3 · Las cuevas — paredes que esquivar
  ['Las Cuevas de Cristal', '🔷', 'cuevas', '#6366F1', '#4338CA', [
    ['Rodea la roca', ['S#G', '.#.', '...']],
    ['Por debajo', ['S..', '##.', 'G..']],
    ['El puente', ['S....', '####.', '....G']],
    ['Esquina con hielo', ['G..', '.#.', '..S']],
    ['El gran laberinto', ['S...', '###.', '....', 'G###']],
  ]],
  // 4 · La jungla — recoger estrellas + llegar a la gema
  ['La Jungla Perdida', '🌴', 'jungla', '#10B981', '#047857', [
    ['Una estrella', ['S*G']],
    ['Dos estrellas', ['S*.', '..*', '..G']],
    ['Estrellas y vueltas', ['*.G', '...', 'S.*']],
    ['Recoge y avanza', ['S.*.', '....', '*..G']],
    ['Tesoro de la jungla', ['S.*.', '..#.', '.*#.', '*..G']],
  ]],
  // 5 · El espacio — reto final (laberintos + estrellas)
  ['Aventura Espacial', '🚀', 'espacio', '#7C3AED', '#5B21B6', [
    ['Despegue', ['S..*.', '####.', '....G']],
    ['Órbita con estrellas', ['S.*.', '...#', '*..G']],
    ['El cometa', ['S...*', '..#..', '*..G.']],
    ['La galaxia espiral', ['S...', '###.', '....', 'G..*']],
    ['El gran final', ['S..*', '.##.', '....', '*..G']],
  ]],
];

function lvl(nombre, rows, tema) {
  const parsed = parse(rows);
  const sol = resolver(parsed);
  if (!sol) throw new Error(`Nivel "${nombre}" SIN SOLUCIÓN — revisa la rejilla`);
  return {
    version: 1, tipo: 'preescolar', sub: 'programa',
    nombre,
    instruccion: parsed.items.length ? itemsInstr : baseInstr,
    recompensa: { monedas: 5, gemas: parsed.items.length ? 1 : 0 },
    tilemap: parsed.tilemap, spawn: parsed.spawn, meta: parsed.meta, items: parsed.items,
    comandos_permitidos: COMANDOS, tope_ejecucion: 500,
    tema: TEMAS[tema],
    solucion: sol,                 // referencia (BFS verificado), para pistas/depuración
    pasos_optimos: sol.length,
  };
}

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  let totalNiveles = 0;
  for (let w = 0; w < MUNDOS.length; w++) {
    const [nombre, icono, tema, c1, c2, niveles] = MUNDOS[w];
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
       RETURNING id`,
      [nombre, `Preescolar — Programación — ${nombre}`, w + 1, icono, c1, c2, CATEGORIA, niveles.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 0; a < niveles.length; a++) {
      const [nombreNivel, rows] = niveles[a];
      const cfg = lvl(nombreNivel, rows, tema);
      cfg.id = `${CATEGORIA}-m${w + 1}-n${a + 1}`;
      cfg.categoria = CATEGORIA;
      cfg.narracion = { intro: cfg.instruccion, url_audio_intro: null };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'exploradores', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, cfg.nombre, a + 1, cfg]
      );
      totalNiveles++;
    }
    console.log(`  ✓ M${w + 1} "${nombre}" (${niveles.length} niveles) — todos con solución verificada`);
  }

  console.log(`\n✅ Programación preescolar sembrada: ${MUNDOS.length} mundos, ${totalNiveles} niveles.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
