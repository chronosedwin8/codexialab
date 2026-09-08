// Mundo 6 "La Ciudad Robótica" (bucle MIENTRAS / while) y
// Mundo 7 "El Castillo de los Algoritmos" (bucles anidados + combinación de todo).
// Auto-verifica cada solución con la lógica del worker (incluye puedeAvanzar).
import pg from 'pg';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const DIRS = { derecha: { dx: 1, dy: 0 }, izquierda: { dx: -1, dy: 0 }, abajo: { dx: 0, dy: 1 }, arriba: { dx: 0, dy: -1 } };
const TURN_R = { derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha' };
const TURN_L = { derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha' };
const W = 1, F = 0;

function simulate(cfg) {
  const map = cfg.tilemap, R = map.length, C = map[0].length;
  let x = cfg.spawn.x, y = cfg.spawn.y, dir = cfg.spawn.dir;
  const visited = new Set([`${x},${y}`]);
  const ok = (nx, ny) => ny >= 0 && ny < R && nx >= 0 && nx < C && map[ny][nx] === 0;
  const move = (d) => { const nx = x + DIRS[d].dx, ny = y + DIRS[d].dy; if (!ok(nx, ny)) throw new Error(`colisión ${d} en (${x},${y})`); x = nx; y = ny; dir = d; visited.add(`${x},${y}`); };
  const heroe = {
    avanzar: () => move(dir), moverArriba: () => move('arriba'), moverAbajo: () => move('abajo'),
    moverIzquierda: () => move('izquierda'), moverDerecha: () => move('derecha'),
    girarDerecha: () => { dir = TURN_R[dir]; }, girarIzquierda: () => { dir = TURN_L[dir]; },
    detectarObstaculo: () => !ok(x + DIRS[dir].dx, y + DIRS[dir].dy),
    puedeAvanzar: () => ok(x + DIRS[dir].dx, y + DIRS[dir].dy), leerSensor: () => 'libre',
  };
  // eslint-disable-next-line no-new-func
  new Function('heroe', cfg.codigo_inicial.javascript)(heroe);
  return { x, y, visited };
}

// Espiral con regla giro-a-la-derecha; devuelve también el número de tramos (arms)
function genSpiral(maxW, maxH) {
  const set = new Set(); const key = (x, y) => `${x},${y}`;
  const path = [[1, 1]]; set.add(key(1, 1));
  let x = 1, y = 1, dir = 'derecha';
  const canAdd = (nx, ny, fx, fy) => {
    if (nx < 1 || ny < 1 || nx > maxW || ny > maxH || set.has(key(nx, ny))) return false;
    for (const d of Object.values(DIRS)) { const ax = nx + d.dx, ay = ny + d.dy; if ((ax !== fx || ay !== fy) && set.has(key(ax, ay))) return false; }
    return true;
  };
  for (let g = 0; g < 1000; g++) {
    let nx = x + DIRS[dir].dx, ny = y + DIRS[dir].dy;
    if (canAdd(nx, ny, x, y)) { x = nx; y = ny; set.add(key(x, y)); path.push([x, y]); continue; }
    dir = TURN_R[dir]; nx = x + DIRS[dir].dx; ny = y + DIRS[dir].dy;
    if (canAdd(nx, ny, x, y)) { x = nx; y = ny; set.add(key(x, y)); path.push([x, y]); continue; }
    break;
  }
  let arms = 1;
  for (let i = 2; i < path.length; i++) {
    const d1 = `${path[i - 1][0] - path[i - 2][0]},${path[i - 1][1] - path[i - 2][1]}`;
    const d2 = `${path[i][0] - path[i - 1][0]},${path[i][1] - path[i - 1][1]}`;
    if (d1 !== d2) arms++;
  }
  const tilemap = Array.from({ length: maxH + 2 }, () => Array.from({ length: maxW + 2 }, () => W));
  for (const [px, py] of path) tilemap[py][px] = F;
  return { tilemap, spawn: { x: 1, y: 1, dir: 'derecha' }, goal: path[path.length - 1], arms };
}

function buildPathMaze(startDir, segments) {
  let x = 0, y = 0; const cells = [[0, 0]];
  for (const [dir, count] of segments) for (let k = 0; k < count; k++) { x += DIRS[dir].dx; y += DIRS[dir].dy; cells.push([x, y]); }
  const minx = Math.min(...cells.map((c) => c[0])), miny = Math.min(...cells.map((c) => c[1]));
  const norm = cells.map(([cx, cy]) => [cx - minx + 1, cy - miny + 1]);
  const maxx = Math.max(...norm.map((c) => c[0])), maxy = Math.max(...norm.map((c) => c[1]));
  const tilemap = Array.from({ length: maxy + 2 }, () => Array.from({ length: maxx + 2 }, () => W));
  for (const [cx, cy] of norm) tilemap[cy][cx] = F;
  return { tilemap, spawn: { x: norm[0][0], y: norm[0][1], dir: startDir }, goal: norm[norm.length - 1], cells: norm };
}

function cfgLvl(mundo, orden, nombre, maze, comandos, narr, pistas, rec, codigo, coins = []) {
  const objetivos = [{ id: 'salida', tipo: 'alcanzar_celda', x: maze.goal[0], y: maze.goal[1], obligatorio: true },
    ...coins.map((c, k) => ({ id: `item${k + 1}`, tipo: 'recoger_item', x: c[0], y: c[1], obligatorio: false }))];
  const opt = coins.map((_, k) => `item${k + 1}`);
  return {
    mundo, orden, id: mundo * 100 + orden, nombre,
    config: {
      version: 2, id: `m${mundo}-n${orden}`, nombre, mundo_id: mundo, banda_recomendada: 'aventureros',
      modalidades: ['bloques', 'bloques_texto', 'texto'], tilemap: maze.tilemap, spawn: maze.spawn,
      comandos_permitidos: comandos, bloques_disponibles: comandos,
      codigo_inicial: { javascript: codigo, python: codigo },
      narracion: { intro: narr.intro, exito: narr.exito, url_audio_intro: `/audio/narracion/m${mundo}-n${orden}-intro.mp3` },
      objetivos,
      criterios_estrella: { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', ...opt] }, '3': { objetivos: ['salida', ...opt], max_bloques: 6 } },
      pistas, recompensa: rec, tope_ejecucion: 50000,
    },
  };
}

const W6_CMDS = ['avanzar', 'girarDerecha', 'girarIzquierda', 'mientras', 'repetir'];
const W7_CMDS = ['avanzar', 'girarDerecha', 'girarIzquierda', 'moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha', 'repetir', 'si', 'mientras', 'variables', 'funciones'];

// ===================== MUNDO 6: LA CIUDAD ROBÓTICA (mientras / while) =====================
const W6_SIZES = [[4, 3], [5, 3], [5, 4], [6, 4], [7, 4], [7, 5], [8, 5], [9, 5], [10, 6], [11, 6]];
const W6_STORY = [
  { n: 'El robot que no cuenta', intro: '¡Bienvenido a la Ciudad Robótica! Soy Astro. Los robots de aquí no cuentan pasos: avanzan MIENTRAS puedan. Usa el bloque "mientras puede avanzar" para que el robot siga hasta toparse con una pared.', exito: '¡Tu primer bucle "mientras"! El robot avanzó sin contar pasos, solo "mientras pudo". Mucho más listo.' },
  { n: 'La primera esquina', intro: 'El robot avanza mientras puede y, al chocar, gira. ¡No importa cuán largo sea el tramo! "mientras puede avanzar" se encarga.', exito: '¡El robot dobló solo! "mientras" + girar resuelve cualquier longitud de calle.' },
  { n: 'Calles de la ciudad', intro: 'Más calles, más esquinas. La misma regla: mientras puedas avanzar, avanza; luego gira. Repítela para cada calle.', exito: '¡Recorriste varias calles con una sola regla! Los robots aman "mientras".' },
  { n: 'El barrio en espiral', intro: 'Un barrio que da vueltas hacia el centro. "mientras puede avanzar" no necesita saber cuántos pasos: ¡simplemente va!', exito: '¡La espiral no te detuvo! "mientras" se adapta a cualquier camino.' },
  { n: 'La plaza giratoria', intro: 'Una plaza en espiral más grande. Tu robot con "mientras" y giros llega al centro sin contar nada.', exito: '¡Al centro de la plaza! No contaste ni un paso. Esa es la magia de "mientras".' },
  { n: 'El distrito enrollado', intro: 'Calles enrolladas como un caracol. La regla "mientras + gira" repetida por cada tramo es todo lo que necesitas.', exito: '¡Distrito conquistado! "mientras" hace que tu código funcione sin importar el tamaño.' },
  { n: 'La autopista curva', intro: 'Una autopista larga y curva. ¡Deja que el robot decida cuándo parar de avanzar con "puede avanzar"!', exito: '¡La autopista fue pan comido! El robot supo exactamente cuándo girar.' },
  { n: 'El gran circuito', intro: 'Un circuito enorme en espiral. Tu robot con "mientras" no se cansa ni se confunde. ¡Suéltalo!', exito: '¡Circuito completado! Cuando usas "mientras", el tamaño deja de importar.' },
  { n: 'El laberinto urbano', intro: 'El laberinto más grande de la ciudad. La combinación "mientras puede avanzar + girar" sigue la pared hasta el final.', exito: '¡Saliste del laberinto urbano! Eres todo un ingeniero de robots.' },
  { n: 'El corazón de la ciudad', intro: '¡El desafío final robótico! La espiral más larga de toda la ciudad. Tu robot con "mientras" llegará al corazón. ¡Demuestra tu maestría!', exito: '¡COMPLETASTE LA CIUDAD ROBÓTICA! El bucle "mientras" repite acciones según una condición, sin contar. ¡El Castillo de los Algoritmos te espera!' },
];

function buildWorld6() {
  return W6_SIZES.map((sz, i) => {
    const orden = i + 1; const sp = genSpiral(sz[0], sz[1]);
    const codigo = `// Por cada calle: avanza mientras puedas, luego gira\nfor (let i = 0; i < ${sp.arms}; i++) {\n  while (heroe.puedeAvanzar()) {\n    heroe.avanzar();\n  }\n  heroe.girarDerecha();\n}\n`;
    const st = W6_STORY[i];
    const pistas = [
      { texto: 'Usa "mientras (puede avanzar) { avanzar }" para recorrer cada calle sin contar pasos.' },
      { texto: `Repite ${sp.arms} veces: mientras puedas avanzar avanza, luego gira a la derecha.` },
    ];
    return cfgLvl(6, orden, st.n, sp, W6_CMDS, st, pistas, { monedas: 20 + orden * 3, gemas: 1 + Math.floor(orden / 3) }, codigo);
  });
}

// ===================== MUNDO 7: EL CASTILLO DE LOS ALGORITMOS (anidados + combinar) =====================
const ring = (n) => buildPathMaze('derecha', [['derecha', n], ['abajo', n], ['izquierda', n]]);
const world7 = [
  cfgLvl(7, 1, 'El cuadrado encantado', ring(3), W7_CMDS,
    { intro: '¡Bienvenido al Castillo de los Algoritmos! Soy Astro. Aquí combinamos todo lo aprendido. Para recorrer los lados de este cuadrado, usa un bucle DENTRO de otro bucle: el de afuera cuenta los lados, el de adentro avanza por cada lado.', exito: '¡Tu primer bucle anidado! Un bucle dentro de otro. Así se dibujan formas y patrones.' },
    [{ texto: 'Bucle exterior: 3 lados. Bucle interior: avanzar 3 y girar.' }, { texto: 'repite 3 { repite 3 {avanzar}; girar Derecha }.' }],
    { monedas: 30, gemas: 2 },
    '// Bucle dentro de bucle: recorre los lados del cuadrado\nfor (let lado = 0; lado < 3; lado++) {\n  for (let i = 0; i < 3; i++) {\n    heroe.avanzar();\n  }\n  heroe.girarDerecha();\n}\n'),

  cfgLvl(7, 2, 'El cuadrado mayor', ring(5), W7_CMDS,
    { intro: 'Un cuadrado más grande. ¡Pero el bucle anidado no cambia! Solo el número de pasos de cada lado. La estructura es la misma.', exito: '¡Mismo algoritmo, cuadrado más grande! Los bucles anidados escalan sin reescribir.' },
    [{ texto: 'repite 3 { repite 5 {avanzar}; girar Derecha }.' }],
    { monedas: 32, gemas: 2 },
    '// El mismo bucle anidado, lados más largos\nfor (let lado = 0; lado < 3; lado++) {\n  for (let i = 0; i < 5; i++) {\n    heroe.avanzar();\n  }\n  heroe.girarDerecha();\n}\n'),

  cfgLvl(7, 3, 'El cuadrado variable', ring(4), W7_CMDS,
    { intro: 'Ahora guarda el largo del lado en una VARIABLE y úsala en el bucle interior. ¡Variables + bucles anidados juntos! Cambia la variable y cambia el cuadrado.', exito: '¡Variables y bucles anidados combinados! Estás pensando como un verdadero programador.' },
    [{ texto: 'Crea "lado" = 4.' }, { texto: 'repite 3 { repite lado {avanzar}; girar Derecha }.' }],
    { monedas: 34, gemas: 3 },
    '// Variable + bucle anidado\nlet lado = 4;\nfor (let l = 0; l < 3; l++) {\n  for (let i = 0; i < lado; i++) {\n    heroe.avanzar();\n  }\n  heroe.girarDerecha();\n}\n'),

  cfgLvl(7, 4, 'La espiral del castillo', genSpiral(6, 4), W7_CMDS,
    { intro: 'Una espiral en las torres del castillo. Combina "mientras puede avanzar" con giros para llegar al centro sin contar.', exito: '¡Espiral del castillo resuelta! Sabes elegir la herramienta correcta: aquí, "mientras".' },
    [{ texto: 'Usa "mientras puede avanzar { avanzar }" y gira en cada esquina.' }],
    { monedas: 35, gemas: 3 },
    (() => { const s = genSpiral(6, 4); return `// "mientras" para la espiral del castillo\nfor (let i = 0; i < ${s.arms}; i++) {\n  while (heroe.puedeAvanzar()) { heroe.avanzar(); }\n  heroe.girarDerecha();\n}\n`; })()),

  cfgLvl(7, 5, 'Las escaleras reales', buildPathMaze('derecha', [].concat(...Array.from({ length: 5 }, () => [['derecha', 1], ['abajo', 1]]))), W7_CMDS,
    { intro: 'Las escaleras del trono. Define una FUNCIÓN "escalon" y llámala en un bucle. Funciones + bucles: un equipo imbatible.', exito: '¡Funciones y bucles juntos! Cada herramienta hace su parte del algoritmo.' },
    [{ texto: 'Define "escalon": avanzar + girar... mejor usa mover Derecha + mover Abajo.' }, { texto: 'repite 5 { escalon() }.' }],
    { monedas: 36, gemas: 3 },
    '// Función + bucle para las escaleras\nfunction escalon() {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\nfor (let i = 0; i < 5; i++) {\n  escalon();\n}\n'),

  cfgLvl(7, 6, 'El patrón del rey', ring(4), W7_CMDS,
    { intro: 'Un cuadrado con joyas en las esquinas. Usa un bucle anidado para recorrerlo y recoge las joyas en el camino.', exito: '¡Recogiste las joyas reales con un bucle anidado! Tu algoritmo es elegante y eficiente.' },
    [{ texto: 'Bucle anidado de 3 lados × 4 pasos.' }, { texto: 'Las joyas están en las esquinas del recorrido.' }],
    { monedas: 38, gemas: 4 },
    '// Bucle anidado que recoge joyas en las esquinas\nfor (let lado = 0; lado < 3; lado++) {\n  for (let i = 0; i < 4; i++) {\n    heroe.avanzar();\n  }\n  heroe.girarDerecha();\n}\n',
    [[4, 0 + 1], [4, 4 + 1]]),

  cfgLvl(7, 7, 'La torre en espiral', genSpiral(8, 5), W7_CMDS,
    { intro: 'La torre más alta del castillo, enrollada en espiral. "mientras puede avanzar" sube hasta arriba sin que cuentes nada.', exito: '¡Subiste la torre en espiral! Elegir "mientras" para caminos desconocidos es de sabios.' },
    [{ texto: 'Misma idea de la Ciudad Robótica: mientras + girar por cada tramo.' }],
    { monedas: 40, gemas: 4 },
    (() => { const s = genSpiral(8, 5); return `// "mientras" sube la torre en espiral\nfor (let i = 0; i < ${s.arms}; i++) {\n  while (heroe.puedeAvanzar()) { heroe.avanzar(); }\n  heroe.girarDerecha();\n}\n`; })()),

  cfgLvl(7, 8, 'La doble montaña real', buildPathMaze('derecha', [].concat(...Array.from({ length: 4 }, () => [['derecha', 1], ['arriba', 1]]), ...Array.from({ length: 4 }, () => [['derecha', 1], ['abajo', 1]]))), W7_CMDS,
    { intro: 'Dos laderas reales: una sube y otra baja. Define DOS funciones, "subir" y "bajar", y úsalas en bucles. ¡Divide el problema en partes!', exito: '¡Dividiste el problema en funciones! Así resuelven los grandes algoritmos: por partes.' },
    [{ texto: 'Define "subir" (der+arriba) y "bajar" (der+abajo).' }, { texto: 'repite 4 {subir}, repite 4 {bajar}.' }],
    { monedas: 42, gemas: 4 },
    '// Dos funciones, dos laderas\nfunction subir() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfunction bajar() {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\nfor (let i = 0; i < 4; i++) { subir(); }\nfor (let i = 0; i < 4; i++) { bajar(); }\n'),

  cfgLvl(7, 9, 'El gran salón', ring(6), W7_CMDS,
    { intro: 'El gran salón cuadrado del castillo. Una variable para el lado y un bucle anidado. ¡Ya dominas este algoritmo!', exito: '¡El gran salón recorrido! Variables + bucles anidados: un combo que resuelve mucho.' },
    [{ texto: 'lado = 6, repite 3 { repite lado {avanzar}; girar }.' }],
    { monedas: 45, gemas: 4 },
    '// Variable + bucle anidado para el gran salón\nlet lado = 6;\nfor (let l = 0; l < 3; l++) {\n  for (let i = 0; i < lado; i++) {\n    heroe.avanzar();\n  }\n  heroe.girarDerecha();\n}\n'),

  cfgLvl(7, 10, 'El trono de Codexia', genSpiral(11, 6), W7_CMDS,
    { intro: '¡EL DESAFÍO FINAL! El camino al trono es la espiral más grande del castillo. Usa una función con tu mejor regla y un bucle. ¡Demuestra que eres maestro de los algoritmos de Codexia!', exito: '¡CONQUISTASTE EL CASTILLO DE LOS ALGORITMOS! Combinaste secuencias, bucles, condiciones, variables, funciones, "mientras" y bucles anidados. ¡Eres un verdadero programador de Codexia! 👑' },
    [{ texto: 'Define una función "recorrerCalle" con "mientras puede avanzar { avanzar }".' }, { texto: 'repite por cada tramo: recorrerCalle(); girar Derecha.' }],
    { monedas: 60, gemas: 6 },
    (() => { const s = genSpiral(11, 6); return `// Función + "mientras" + bucle: el algoritmo maestro\nfunction recorrerCalle() {\n  while (heroe.puedeAvanzar()) {\n    heroe.avanzar();\n  }\n}\nfor (let i = 0; i < ${s.arms}; i++) {\n  recorrerCalle();\n  heroe.girarDerecha();\n}\n`; })()),
];

async function main() {
  const niveles = [...buildWorld6(), ...world7];
  let fail = 0;
  for (const n of niveles) {
    const meta = n.config.objetivos.find((o) => o.obligatorio);
    try {
      const r = simulate(n.config);
      if (r.x !== meta.x || r.y !== meta.y) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": no llega (queda ${r.x},${r.y}, meta ${meta.x},${meta.y})`); fail++; }
      else {
        const coinsOk = n.config.objetivos.filter((o) => !o.obligatorio).every((o) => r.visited.has(`${o.x},${o.y}`));
        console.log(`✓ M${n.mundo}-${n.orden} "${n.nombre}": verificado${n.config.objetivos.length > 1 ? (coinsOk ? ' (+items)' : ' (¡items NO recogidos!)') : ''}`);
        if (!coinsOk) fail++;
      }
    } catch (e) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": CHOCA (${e.message})`); fail++; }
  }
  if (fail > 0) { console.log(`\n⛔ ${fail} problema(s). NO se insertó nada.`); process.exit(1); }

  await client.connect();
  for (const n of niveles) {
    await client.query(
      `INSERT INTO niveles (id, mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1, $2, $3, $4, $5, 'aventureros', ARRAY['bloques','bloques_texto','texto']::modalidad_codigo[], true)
       ON CONFLICT (id) DO UPDATE SET mundo_id = EXCLUDED.mundo_id, nombre = EXCLUDED.nombre, numero_orden = EXCLUDED.numero_orden, config = EXCLUDED.config`,
      [n.id, n.mundo, n.nombre, n.orden, n.config]
    );
  }
  await client.query('UPDATE mundos SET total_niveles = 10 WHERE id IN (6, 7)');
  console.log('\n✅ Mundos 6 y 7 sembrados (20 niveles, soluciones verificadas).');
  await client.end();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
