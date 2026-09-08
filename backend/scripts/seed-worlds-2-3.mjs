// Siembra Mundo 2 "Bosque de los Bucles" (Repetitivas) y Mundo 3 "Ríos de la Condición" (Condicionales).
// Genera soluciones VERIFICADAS: un solver BFS para los bucles del Mundo 2 y un generador de
// espirales (regla giro-a-la-derecha) para el Mundo 3, de modo que la "regla mágica" SIEMPRE funcione.
// Cada nivel se auto-verifica ejecutando su codigo_inicial con la lógica del worker antes de insertar.
import pg from 'pg';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const W = 1, F = 0;
const DIRS = { derecha: { dx: 1, dy: 0 }, izquierda: { dx: -1, dy: 0 }, abajo: { dx: 0, dy: 1 }, arriba: { dx: 0, dy: -1 } };
const TURN_R = { derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha' };
const MOVE_METHOD = { derecha: 'moverDerecha', izquierda: 'moverIzquierda', arriba: 'moverArriba', abajo: 'moverAbajo' };

// ---------- Simulador (idéntico a la lógica del worker) ----------
function simulate(cfg) {
  const map = cfg.tilemap, R = map.length, C = map[0].length;
  let x = cfg.spawn.x, y = cfg.spawn.y, dir = cfg.spawn.dir;
  const visited = new Set([`${x},${y}`]);
  const walkable = (nx, ny) => ny >= 0 && ny < R && nx >= 0 && nx < C && map[ny][nx] === 0;
  const move = (d) => {
    const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
    if (!walkable(nx, ny)) throw new Error(`colisión hacia ${d} desde (${x},${y})`);
    x = nx; y = ny; dir = d; visited.add(`${x},${y}`);
  };
  const heroe = {
    avanzar: () => move(dir), moverArriba: () => move('arriba'), moverAbajo: () => move('abajo'),
    moverIzquierda: () => move('izquierda'), moverDerecha: () => move('derecha'),
    girarDerecha: () => { dir = TURN_R[dir]; }, girarIzquierda: () => { dir = { derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha' }[dir]; },
    detectarObstaculo: () => !walkable(x + DIRS[dir].dx, y + DIRS[dir].dy), leerSensor: () => 'libre',
  };
  // eslint-disable-next-line no-new-func
  new Function('heroe', cfg.codigo_inicial.javascript)(heroe);
  return { x, y, visited };
}

// ---------- Solver BFS: camino más corto spawn→goal como lista de direcciones ----------
function bfsPath(map, sx, sy, gx, gy) {
  const R = map.length, C = map[0].length;
  const prev = new Map(); const key = (x, y) => `${x},${y}`;
  const q = [[sx, sy]]; prev.set(key(sx, sy), null);
  while (q.length) {
    const [x, y] = q.shift();
    if (x === gx && y === gy) break;
    for (const d of ['derecha', 'abajo', 'izquierda', 'arriba']) {
      const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy;
      if (ny >= 0 && ny < R && nx >= 0 && nx < C && map[ny][nx] === 0 && !prev.has(key(nx, ny))) {
        prev.set(key(nx, ny), { x, y, d }); q.push([nx, ny]);
      }
    }
  }
  const dirs = []; let cur = key(gx, gy);
  while (prev.get(cur)) { const p = prev.get(cur); dirs.unshift(p.d); cur = key(p.x, p.y); }
  return dirs;
}

// Compacta direcciones consecutivas iguales en bucles JS
function dirsToLoopCode(dirs) {
  let code = '', i = 0;
  while (i < dirs.length) {
    let j = i; while (j < dirs.length && dirs[j] === dirs[i]) j++;
    const n = j - i, m = MOVE_METHOD[dirs[i]];
    if (n >= 3) code += `for (let i = 0; i < ${n}; i++) {\n  heroe.${m}();\n}\n`;
    else for (let k = 0; k < n; k++) code += `heroe.${m}();\n`;
    i = j;
  }
  return code;
}

// ---------- Generador de espiral (regla giro-a-la-derecha, corredor de 1 celda con separación) ----------
function genSpiral(maxW, maxH) {
  const set = new Set(); const key = (x, y) => `${x},${y}`;
  const path = [[1, 1]]; set.add(key(1, 1));
  let x = 1, y = 1, dir = 'derecha';
  const canAdd = (nx, ny, fx, fy) => {
    if (nx < 1 || ny < 1 || nx > maxW || ny > maxH) return false;
    if (set.has(key(nx, ny))) return false;
    for (const d of Object.values(DIRS)) {
      const ax = nx + d.dx, ay = ny + d.dy;
      if ((ax !== fx || ay !== fy) && set.has(key(ax, ay))) return false; // separación entre brazos
    }
    return true;
  };
  for (let guard = 0; guard < 1000; guard++) {
    let nx = x + DIRS[dir].dx, ny = y + DIRS[dir].dy;
    if (canAdd(nx, ny, x, y)) { x = nx; y = ny; set.add(key(x, y)); path.push([x, y]); continue; }
    dir = TURN_R[dir];
    nx = x + DIRS[dir].dx; ny = y + DIRS[dir].dy;
    if (canAdd(nx, ny, x, y)) { x = nx; y = ny; set.add(key(x, y)); path.push([x, y]); continue; }
    break; // centro de la espiral
  }
  const H = maxH + 2, C = maxW + 2;
  const tilemap = Array.from({ length: H }, () => Array.from({ length: C }, () => W));
  for (const [px, py] of path) tilemap[py][px] = F;
  return { tilemap, spawn: { x: 1, y: 1, dir: 'derecha' }, goal: path[path.length - 1], steps: path.length - 1 };
}

function buildConfig(mundo, orden, nombre, tilemap, spawn, objetivos, criterios, comandos, narracion, pistas, recompensa, codigo) {
  return {
    version: 2, id: `m${mundo}-n${orden}`, nombre, mundo_id: mundo, banda_recomendada: 'aventureros',
    modalidades: ['bloques', 'bloques_texto', 'texto'], tilemap, spawn,
    comandos_permitidos: comandos, bloques_disponibles: comandos,
    codigo_inicial: { javascript: codigo, python: codigo.replace(/heroe\.(\w+)\(\)/g, 'heroe.$1()').replace(/\/\//g, '#') },
    narracion: { ...narracion, url_audio_intro: `/audio/narracion/m${mundo}-n${orden}-intro.mp3` },
    objetivos, criterios_estrella: criterios, pistas, recompensa, tope_ejecucion: 50000,
  };
}

const LOOP_CMDS = ['moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha', 'repetir'];
const COND_CMDS = ['avanzar', 'girarDerecha', 'girarIzquierda', 'detectarObstaculo', 'si', 'repetir'];

// ===================== MUNDO 2: BOSQUE DE LOS BUCLES =====================
// Mazes hechos a mano; el starter es la solución más corta (solver) compactada en bucles.
const W2_MAZES = [
  { n: 'El sendero sin fin', map: [[W,W,W,W,W,W,W,W,W],[W,F,F,F,F,F,F,F,W],[W,W,W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [7, 1], coins: [],
    intro: '¡Bienvenido al Bosque de los Bucles! Soy Astro. Aquí los caminos son largos. En vez de escribir "mover Derecha" muchas veces, usa el bloque mágico "repetir": ¡una orden que se repite sola!',
    exito: '¡Descubriste el poder de los bucles! Con "repetir" escribes menos y haces más.', rec: { monedas: 15, gemas: 1 } },
  { n: 'La torre del bosque', map: [[W,W,W,W,W],[W,W,F,W,W],[W,W,F,W,W],[W,W,F,W,W],[W,W,F,W,W],[W,W,F,W,W],[W,W,F,W,W],[W,W,W,W,W]], spawn: { x: 2, y: 1, dir: 'abajo' }, goal: [2, 6], coins: [],
    intro: 'Una torre altísima de árboles. Para bajar hasta el suelo, repite "mover Abajo" muchas veces. ¡El bucle te ahorra el trabajo!',
    exito: '¡Bajaste la torre con un solo bucle! ¿Ves lo fácil que es repetir una acción?', rec: { monedas: 15, gemas: 1 } },
  { n: 'Pasillo de monedas', map: [[W,W,W,W,W,W,W,W,W,W],[W,F,F,F,F,F,F,F,F,W],[W,W,W,W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [8, 1], coins: [[3, 1], [5, 1], [7, 1]],
    intro: 'Tres monedas doradas en fila. ¡Un solo bucle de "mover Derecha" las recoge todas de camino a la salida!',
    exito: '¡Tres monedas con un solo bucle! Repetir es la herramienta favorita de los programadores.', rec: { monedas: 20, gemas: 1 } },
  { n: 'Baja y avanza', map: [[W,W,W,W,W,W,W],[W,F,W,W,W,W,W],[W,F,W,W,W,W,W],[W,F,W,W,W,W,W],[W,F,F,F,F,F,W],[W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'abajo' }, goal: [5, 4], coins: [],
    intro: 'El camino baja y luego dobla a la derecha. ¡Usa DOS bucles! Uno para bajar y otro para avanzar.',
    exito: '¡Dos bucles, un camino! Aprendiste a combinar varios bucles en una solución.', rec: { monedas: 20, gemas: 1 } },
  { n: 'La escalera mágica', map: [[W,W,W,W,W,W,W],[W,F,F,W,W,W,W],[W,W,F,F,W,W,W],[W,W,W,F,F,W,W],[W,W,W,W,F,F,W],[W,W,W,W,W,F,W],[W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [5, 5], coins: [],
    intro: '¡Una escalera! Cada escalón es lo mismo: derecha y luego abajo. Mete DOS bloques dentro del "repetir" para repetir ese par.',
    exito: '¡Un bucle puede repetir VARIOS pasos juntos! Las escaleras ya no te asustan.', rec: { monedas: 25, gemas: 2 } },
  { n: 'El doble corredor', map: [[W,W,W,W,W,W,W,W],[W,F,F,F,F,F,F,W],[W,W,W,W,W,W,F,W],[W,F,F,F,F,F,F,W],[W,F,W,W,W,W,W,W],[W,W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [1, 4], coins: [],
    intro: 'Dos corredores largos unidos. Avanza por arriba, baja, regresa por abajo. Cada tramo largo es un bucle.',
    exito: '¡Dominaste el doble corredor! Varios bucles en secuencia resuelven los caminos largos.', rec: { monedas: 25, gemas: 2 } },
  { n: 'La gran escalera', map: [[W,W,W,W,W,W,W,W],[W,F,F,W,W,W,W,W],[W,W,F,F,W,W,W,W],[W,W,W,F,F,W,W,W],[W,W,W,W,F,F,W,W],[W,W,W,W,W,F,F,W],[W,W,W,W,W,W,F,W],[W,W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [6, 6], coins: [],
    intro: 'Una escalera aún más larga. ¡Pero un bucle no se cansa! Repite el patrón "derecha, abajo" las veces que necesites.',
    exito: '¡La longitud no importa con bucles! Solo cambiaste el número de repeticiones.', rec: { monedas: 28, gemas: 2 } },
  { n: 'El eco del bosque', map: [[W,W,W,W,W,W,W],[W,F,F,F,F,F,W],[W,W,W,W,W,F,W],[W,F,F,F,F,F,W],[W,F,W,W,W,W,W],[W,F,F,F,F,F,W],[W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [1, 5], coins: [],
    intro: 'El bosque hace eco con un camino en S. Cada fila larga se repite. Usa bucles para los tramos largos.',
    exito: '¡Encontraste el patrón en el eco! Detectar repeticiones es una súper habilidad.', rec: { monedas: 28, gemas: 2 } },
  { n: 'El laberinto repetido', map: [[W,W,W,W,W,W,W,W,W],[W,F,F,F,F,F,F,F,W],[W,W,W,W,W,W,W,F,W],[W,F,F,F,F,F,F,F,W],[W,F,W,W,W,W,W,W,W],[W,F,F,F,F,F,F,F,W],[W,W,W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [7, 5], coins: [[1, 3]],
    intro: 'Un laberinto en serpiente con una gema escondida. Cada fila larga es un bucle. ¡Atraviésalo!',
    exito: '¡Atravesaste el laberinto repetido! Ya sabes cuándo un camino largo pide un bucle.', rec: { monedas: 30, gemas: 3 } },
  { n: 'El corazón del bosque', map: [[W,W,W,W,W,W,W,W],[W,F,F,W,W,W,W,W],[W,W,F,F,W,W,W,W],[W,W,W,F,F,W,W,W],[W,W,W,W,F,F,W,W],[W,W,W,W,W,F,F,W],[W,W,W,W,W,W,F,W],[W,W,W,W,W,W,W,W]], spawn: { x: 1, y: 1, dir: 'derecha' }, goal: [6, 6], coins: [],
    intro: '¡El desafío final del bosque! Una larga escalera hasta el corazón. Resuélvela con el bucle más corto posible.',
    exito: '¡COMPLETASTE EL BOSQUE DE LOS BUCLES! Repetir acciones con un bucle es más corto, claro y poderoso. ¡Los Ríos de la Condición te esperan!', rec: { monedas: 40, gemas: 4 } },
];

function buildWorld2() {
  return W2_MAZES.map((m, i) => {
    const orden = i + 1, id = 200 + orden;
    const dirs = bfsPath(m.map, m.spawn.x, m.spawn.y, m.goal[0], m.goal[1]);
    const codigo = '// Resuelve el camino usando bucles\n' + dirsToLoopCode(dirs);
    const objetivos = [{ id: 'salida', tipo: 'alcanzar_celda', x: m.goal[0], y: m.goal[1], obligatorio: true },
      ...m.coins.map((c, k) => ({ id: `item${k + 1}`, tipo: 'recoger_item', x: c[0], y: c[1], obligatorio: false }))];
    const opt = m.coins.map((_, k) => `item${k + 1}`);
    const criterios = { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', ...opt] }, '3': { objetivos: ['salida', ...opt], max_bloques: Math.max(3, new Set(dirs).size * 2) } };
    const pistas = [{ texto: 'Busca el patrón que se repite y mételo dentro de un bloque "repetir".' }, { texto: 'Solución sugerida: ' + codigo.split('\n').filter((l) => l && !l.startsWith('//')).join(' ').replace(/heroe\./g, '').slice(0, 120) }];
    return { mundo: 2, orden, id, nombre: m.n, config: buildConfig(2, orden, m.n, m.map, m.spawn, objetivos, criterios, LOOP_CMDS, { intro: m.intro, exito: m.exito }, pistas, m.rec, codigo) };
  });
}

// ===================== MUNDO 3: RÍOS DE LA CONDICIÓN (espirales) =====================
const W3_SIZES = [[3, 3], [4, 3], [5, 3], [5, 4], [6, 4], [7, 4], [8, 4], [9, 5], [10, 5], [11, 6]];
const W3_STORY = [
  { n: 'La primera decisión', intro: '¡Bienvenido a los Ríos de la Condición! Soy Astro. Aquí el héroe debe DECIDIR. La regla mágica es: SI hay un obstáculo, gira; si no, avanza. ¡Pruébala en este pequeño remolino!', exito: '¡Tomaste tu primera decisión con código! El bloque "si" deja que el héroe reaccione a lo que encuentra.' },
  { n: 'El río que dobla', intro: 'El río dobla en una esquina. Usa la misma regla mágica: SI hay obstáculo, gira a la derecha; luego avanza. ¡El héroe sigue la orilla solo!', exito: '¡El río ya no te detiene! Sabes cuándo girar gracias a una condición.' },
  { n: 'Dos esquinas', intro: 'Ahora el río dobla varias veces. ¡Pero la regla mágica no cambia! La misma condición resuelve todas las esquinas. Solo repítela más veces.', exito: '¡Una sola regla para muchas esquinas! Empiezas a ver el poder de las condiciones.' },
  { n: 'El pequeño remolino', intro: 'Un remolino en espiral. La regla "si hay obstáculo, gira; avanza" sigue la pared hacia el centro. ¡Confía en tu condición!', exito: '¡La regla mágica venció al remolino! Una buena condición sirve para muchísimos caminos.' },
  { n: 'El caracol de agua', intro: 'Un río en espiral como un caracol. Misma regla mágica, solo más repeticiones. ¡Deja que el héroe se guíe solo!', exito: '¡El héroe se guió solo! Cuando la regla es buena, no importa cuántas vueltas tenga el río.' },
  { n: 'El remolino doble', intro: 'Un remolino más grande. Tu regla mágica ya es famosa en Codexia. Aumenta las repeticiones y mira la magia.', exito: '¡Otro remolino vencido! Las condiciones hacen que tu código sea inteligente.' },
  { n: 'El delta del río', intro: 'El delta serpentea hacia el corazón. La condición "si hay obstáculo, gira" te lleva por todo el recorrido.', exito: '¡Recorriste el delta entero con una sola regla! El código que decide es código poderoso.' },
  { n: 'El gran remolino', intro: 'Un remolino enorme. ¡Da igual su tamaño! La misma condición dentro de un bucle lo resuelve. Solo ajusta el número.', exito: '¡El tamaño no importa cuando tu héroe sabe decidir! Eso es pensar como programador.' },
  { n: 'El gran meandro', intro: 'El meandro más largo y curvo de todos. Tú tienes la regla mágica: condición + bucle. ¡Es como darle un cerebro a tu héroe!', exito: '¡Venciste el gran meandro! Combinar condiciones y bucles es una súper habilidad.' },
  { n: 'El corazón del río', intro: '¡El desafío final! El corazón del río es la espiral más grande. Tu regla con condiciones es lo único que necesitas. ¡Demuestra todo lo aprendido!', exito: '¡COMPLETASTE LOS RÍOS DE LA CONDICIÓN! El bloque "si" deja que tu héroe tome decisiones. ¡Ya programas con secuencias, bucles Y condiciones!' },
];

function buildWorld3() {
  return W3_SIZES.map((sz, i) => {
    const orden = i + 1, id = 300 + orden;
    const sp = genSpiral(sz[0], sz[1]);
    const codigo = `// La regla mágica: si hay obstáculo gira, luego avanza\nfor (let i = 0; i < ${sp.steps}; i++) {\n  if (heroe.detectarObstaculo()) {\n    heroe.girarDerecha();\n  }\n  heroe.avanzar();\n}\n`;
    const objetivos = [{ id: 'salida', tipo: 'alcanzar_celda', x: sp.goal[0], y: sp.goal[1], obligatorio: true }];
    const criterios = { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'] }, '3': { objetivos: ['salida'], max_bloques: 4 } };
    const st = W3_STORY[i];
    const pistas = [
      { texto: 'Mete un bloque "si (hay obstáculo)" con "girar Derecha" DENTRO de un bloque "repetir".' },
      { texto: `Repite ${sp.steps} veces: si hay obstáculo, gira a la derecha; luego avanza.` },
    ];
    const rec = { monedas: 18 + orden * 3, gemas: 1 + Math.floor(orden / 3) };
    return { mundo: 3, orden, id, nombre: st.n, config: buildConfig(3, orden, st.n, sp.tilemap, sp.spawn, objetivos, criterios, COND_CMDS, { intro: st.intro, exito: st.exito }, pistas, rec, codigo) };
  });
}

async function main() {
  const niveles = [...buildWorld2(), ...buildWorld3()];

  // Auto-verificación: el codigo_inicial debe resolver (llegar a meta) SIN chocar
  let fail = 0;
  for (const n of niveles) {
    const meta = n.config.objetivos.find((o) => o.obligatorio);
    try {
      const r = simulate(n.config);
      if (r.x !== meta.x || r.y !== meta.y) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": no llega (queda ${r.x},${r.y}, meta ${meta.x},${meta.y})`); fail++; }
      else console.log(`✓ M${n.mundo}-${n.orden} "${n.nombre}": solución verificada (${meta.x},${meta.y})`);
    } catch (e) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": CHOCA (${e.message})`); fail++; }
  }
  if (fail > 0) { console.log(`\n⛔ ${fail} nivel(es) con solución inválida. NO se insertó nada.`); process.exit(1); }

  await client.connect();
  for (const n of niveles) {
    await client.query(
      `INSERT INTO niveles (id, mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1, $2, $3, $4, $5, 'aventureros', ARRAY['bloques','bloques_texto','texto']::modalidad_codigo[], true)
       ON CONFLICT (id) DO UPDATE SET mundo_id = EXCLUDED.mundo_id, nombre = EXCLUDED.nombre, numero_orden = EXCLUDED.numero_orden, config = EXCLUDED.config`,
      [n.id, n.mundo, n.nombre, n.orden, n.config]
    );
  }
  await client.query('UPDATE mundos SET total_niveles = 10 WHERE id IN (2, 3)');
  console.log('\n✅ Mundos 2 y 3 sembrados (20 niveles, todas las soluciones verificadas).');
  await client.end();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
