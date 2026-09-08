// Mundo 8 "El Espacio Infinito" (Funciones con parámetros),
// Mundo 9 "El Portal del Tiempo" (Listas/arrays),
// Mundo 10 "El Olimpo del Programador" (Maestría + recursión).
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

function buildPathMaze(startDir, segments) {
  let x = 0, y = 0; const cells = [[0, 0]];
  for (const [dir, count] of segments) for (let k = 0; k < count; k++) { x += DIRS[dir].dx; y += DIRS[dir].dy; cells.push([x, y]); }
  const minx = Math.min(...cells.map((c) => c[0])), miny = Math.min(...cells.map((c) => c[1]));
  const norm = cells.map(([cx, cy]) => [cx - minx + 1, cy - miny + 1]);
  const maxx = Math.max(...norm.map((c) => c[0])), maxy = Math.max(...norm.map((c) => c[1]));
  const tilemap = Array.from({ length: maxy + 2 }, () => Array.from({ length: maxx + 2 }, () => W));
  for (const [cx, cy] of norm) tilemap[cy][cx] = F;
  return { tilemap, spawn: { x: norm[0][0], y: norm[0][1], dir: startDir }, goal: norm[norm.length - 1] };
}

// Camino en sentido horario (derecha→abajo→izquierda→arriba) a partir de una lista de largos
const ORDER = ['derecha', 'abajo', 'izquierda', 'arriba'];
const clockwise = (lengths) => lengths.map((len, i) => [ORDER[i % 4], len]);
const cwMaze = (lengths) => buildPathMaze('derecha', clockwise(lengths));

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
      criterios_estrella: { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', ...opt] }, '3': { objetivos: ['salida', ...opt], max_bloques: 8 } },
      pistas, recompensa: rec, tope_ejecucion: 50000,
    },
  };
}

// --- Generadores de código ---
const TRAMO = 'function tramo(n) {\n  for (let i = 0; i < n; i++) { heroe.avanzar(); }\n}\n';
const w8Code = (lengths) => '// Una función con PARÁMETRO sirve para cualquier distancia\n' + TRAMO +
  lengths.map((L) => `tramo(${L});\nheroe.girarDerecha();`).join('\n') + '\n';
const w9Code = (lengths) => '// Guarda los tramos en una LISTA y recórrela\n' + TRAMO +
  `let ruta = [${lengths.join(', ')}];\nfor (const t of ruta) {\n  tramo(t);\n  heroe.girarDerecha();\n}\n`;
const recCode = (N) => '// RECURSIÓN: una función que se llama a sí misma\n' + TRAMO +
  `function espiral(n) {\n  if (n <= 0) return;\n  tramo(n);\n  heroe.girarDerecha();\n  espiral(n - 1);\n}\nespiral(${N});\n`;
const whileSpiralCode = (arms) => '// "mientras" recorre cada tramo de longitud desconocida\nfunction calle() {\n  while (heroe.puedeAvanzar()) { heroe.avanzar(); }\n}\n' +
  `for (let i = 0; i < ${arms}; i++) {\n  calle();\n  heroe.girarDerecha();\n}\n`;
const nestedRing = (side) => `// Bucle dentro de bucle\nfor (let lado = 0; lado < 3; lado++) {\n  for (let i = 0; i < ${side}; i++) { heroe.avanzar(); }\n  heroe.girarDerecha();\n}\n`;

const F_CMDS = ['avanzar', 'girarDerecha', 'girarIzquierda', 'repetir', 'funciones'];
const L_CMDS = ['avanzar', 'girarDerecha', 'girarIzquierda', 'repetir', 'funciones', 'variables', 'listas'];
const ALL_CMDS = ['avanzar', 'girarDerecha', 'girarIzquierda', 'moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha', 'repetir', 'si', 'mientras', 'variables', 'funciones', 'listas'];

// ===================== MUNDO 8: EL ESPACIO INFINITO (parámetros) =====================
const W8 = [
  [1, 'Despegue', [5], { intro: '¡Bienvenido al Espacio Infinito! Soy Astro. Aquí las funciones tienen PARÁMETROS: un número que les dices al llamarlas. Define "tramo(n)" que avanza n casillas, y llámalo con la distancia que quieras.', exito: '¡Tu función ahora acepta un número! "tramo(5)" avanza 5. El parámetro la hace servir para cualquier distancia.' }, ['Define "tramo" con un parámetro "n".', 'Llama tramo(5).'], { monedas: 25, gemas: 2 }],
  [2, 'Dos saltos', [4, 3], { intro: 'Dos tramos de DISTINTA longitud. ¡La misma función "tramo" sirve para ambos! Solo cámbiale el número: tramo(4), luego tramo(3).', exito: '¡Una función, distintos números! No necesitas una función para cada distancia.' }, ['tramo(4); girar; tramo(3).'], { monedas: 26, gemas: 2 }],
  [3, 'Salto largo y corto', [6, 2], { intro: 'Un tramo largo y otro corto. Tu función con parámetro se adapta a los dos. ¡Eso es reutilizar de verdad!', exito: '¡Largo o corto, la misma función! Los parámetros hacen tu código flexible.' }, ['tramo(6); girar; tramo(2).'], { monedas: 28, gemas: 2 }],
  [4, 'La curva estelar', [5, 3, 2], { intro: 'Tres tramos diferentes en el espacio. Llama "tramo" tres veces con tres números distintos. ¡Una función, infinitas distancias!', exito: '¡Tres llamadas, tres distancias! Ya dominas los parámetros.' }, ['tramo(5); girar; tramo(3); girar; tramo(2).'], { monedas: 30, gemas: 3 }],
  [5, 'El triángulo cósmico', [4, 4, 3], { intro: 'Tres lados casi iguales. Usa tu función con parámetro para cada uno. El número decide la longitud.', exito: '¡Lo resolviste con una sola función! El parámetro hace todo el trabajo.' }, ['tramo(4); girar; tramo(4); girar; tramo(3).'], { monedas: 30, gemas: 3 }],
  [6, 'La órbita ancha', [6, 3, 5], { intro: 'Una órbita con tramos variados. Tu función "tramo(n)" se adapta a cada uno. ¡Cambia solo el número!', exito: '¡Órbita completada con parámetros! Una función bien hecha vale por muchas.' }, ['tramo(6); girar; tramo(3); girar; tramo(5).'], { monedas: 32, gemas: 3 }],
  [7, 'El cometa', [3, 5, 2], { intro: 'La cola de un cometa con tres tramos. La misma función, distintos parámetros. ¡Ya casi eres astronauta del código!', exito: '¡Volaste con el cometa! Los parámetros son la clave de las funciones potentes.' }, ['tramo(3); girar; tramo(5); girar; tramo(2).'], { monedas: 33, gemas: 3 }],
  [8, 'La nebulosa', [7, 2, 6], { intro: 'Una nebulosa enorme. Tramos muy distintos, una sola función con parámetro. ¡El número manda!', exito: '¡Cruzaste la nebulosa! Una función + un parámetro = poder infinito.' }, ['tramo(7); girar; tramo(2); girar; tramo(6).'], { monedas: 35, gemas: 4 }],
  [9, 'El anillo planetario', [5, 4, 4], { intro: 'Un anillo alrededor de un planeta. Tres tramos, tu función con parámetro para cada uno.', exito: '¡Rodeaste el planeta! Reutilizar una función con parámetros es elegante y poderoso.' }, ['tramo(5); girar; tramo(4); girar; tramo(4).'], { monedas: 38, gemas: 4 }],
  [10, 'El corazón del espacio', [6, 5, 4], { intro: '¡El desafío final del espacio! Tres tramos grandes. Demuestra que dominas las funciones con parámetros: una sola función para todo.', exito: '¡COMPLETASTE EL ESPACIO INFINITO! Las funciones con parámetros se adaptan a cualquier dato. ¡El Portal del Tiempo te espera!' }, ['tramo(6); girar; tramo(5); girar; tramo(4).'], { monedas: 45, gemas: 5 }],
].map(([o, n, lengths, narr, p, rec]) => cfgLvl(8, o, n, cwMaze(lengths), F_CMDS, narr, p.map((t) => ({ texto: t })), rec, w8Code(lengths)));

// ===================== MUNDO 9: EL PORTAL DEL TIEMPO (listas) =====================
const W9 = [
  [1, 'La primera línea de tiempo', [4, 3, 2], { intro: '¡Bienvenido al Portal del Tiempo! Soy Astro. Aquí guardamos una secuencia de distancias en una LISTA: [4, 3, 2]. Luego, "para cada" número de la lista, avanzamos ese tramo y giramos. ¡La lista recuerda todo el viaje!', exito: '¡Tu primera lista! Guardaste varios números juntos y los recorriste uno por uno. Así se manejan muchos datos.' }, ['Crea una lista [4, 3, 2].', 'Para cada número, tramo(número) y gira.'], { monedas: 30, gemas: 2 }],
  [2, 'El eco del pasado', [5, 4, 3], { intro: 'Tres tramos guardados en una lista. En vez de escribirlos uno por uno, ¡la lista los recuerda y un bucle "para cada" los recorre!', exito: '¡La lista hizo el trabajo! Recorrer una lista con "para cada" es comodísimo.' }, ['ruta = [5, 4, 3]; para cada t: tramo(t); gira.'], { monedas: 32, gemas: 2 }],
  [3, 'Cuatro recuerdos', [5, 4, 3, 2], { intro: 'Cuatro tramos en la lista. ¡Imagina escribir cuatro llamadas a mano! Con una lista y "para cada", es facilísimo.', exito: '¡Cuatro tramos, un solo bucle! Las listas brillan cuando hay muchos datos.' }, ['ruta = [5, 4, 3, 2].'], { monedas: 34, gemas: 3 }],
  [4, 'El reloj de arena', [6, 5, 4, 3], { intro: 'El reloj marca cuatro tramos decrecientes. Guárdalos en una lista y recórrela. ¡La lista es tu memoria del tiempo!', exito: '¡El reloj de arena vencido! Una lista guarda la secuencia exacta de tu viaje.' }, ['ruta = [6, 5, 4, 3].'], { monedas: 36, gemas: 3 }],
  [5, 'La espiral temporal', [6, 5, 4, 3, 2], { intro: 'Cinco tramos en espiral. Con una lista de cinco números y "para cada", el héroe recorre todo. ¡Cuantos más datos, más útil la lista!', exito: '¡Espiral temporal completada! Las listas hacen fácil lo que sería muy largo de escribir.' }, ['ruta = [6, 5, 4, 3, 2].'], { monedas: 38, gemas: 4 }],
  [6, 'El laberinto del ayer', [5, 4, 3, 2, 1], { intro: 'Cinco tramos hasta el centro del tiempo. Tu lista los guarda todos. Solo escribe la lista y deja que "para cada" haga la magia.', exito: '¡Llegaste al centro del ayer! Listas + "para cada" = código corto y poderoso.' }, ['ruta = [5, 4, 3, 2, 1].'], { monedas: 40, gemas: 4 }],
  [7, 'Las eras perdidas', [7, 6, 5, 4, 3], { intro: 'Cinco eras, cinco tramos largos. La lista guarda la secuencia completa. ¡Imposible perderse con una buena lista!', exito: '¡Recuperaste las eras perdidas! Una lista es la memoria de tu programa.' }, ['ruta = [7, 6, 5, 4, 3].'], { monedas: 42, gemas: 4 }],
  [8, 'El gran ciclo', [6, 5, 4, 3, 2, 1], { intro: 'Seis tramos hasta el corazón del tiempo. ¿Escribirías seis llamadas? ¡No! Una lista de seis números y listo.', exito: '¡El gran ciclo cerrado! Mientras más datos, más vale la pena una lista.' }, ['ruta = [6, 5, 4, 3, 2, 1].'], { monedas: 45, gemas: 5 }],
  [9, 'El meandro del tiempo', [7, 6, 5, 4, 3, 2], { intro: 'Seis tramos serpenteantes. La lista los recuerda en orden y "para cada" los recorre sin que te confundas.', exito: '¡Domaste el meandro del tiempo! Las listas mantienen tus datos ordenados.' }, ['ruta = [7, 6, 5, 4, 3, 2].'], { monedas: 48, gemas: 5 }],
  [10, 'El corazón del tiempo', [8, 7, 6, 5, 4, 3], { intro: '¡El desafío final del Portal! Seis tramos enormes. Una sola lista guarda todo el viaje en el tiempo. ¡Demuestra que dominas las listas!', exito: '¡COMPLETASTE EL PORTAL DEL TIEMPO! Las listas guardan muchos datos juntos y los recorres con "para cada". ¡El Olimpo del Programador te espera!' }, ['ruta = [8, 7, 6, 5, 4, 3].'], { monedas: 55, gemas: 6 }],
].map(([o, n, lengths, narr, p, rec]) => cfgLvl(9, o, n, cwMaze(lengths), L_CMDS, narr, p.map((t) => ({ texto: t })), rec, w9Code(lengths)));

// ===================== MUNDO 10: EL OLIMPO DEL PROGRAMADOR (maestría + recursión) =====================
const sp10a = genSpiral(7, 4), sp10b = genSpiral(9, 5);
const W10 = [
  cfgLvl(10, 1, 'La prueba del héroe', cwMaze([5, 4, 3, 2]), ALL_CMDS,
    { intro: '¡Bienvenido al Olimpo del Programador! Soy Astro. Aquí demuestras todo tu poder. Empieza combinando una LISTA con una FUNCIÓN: guarda los tramos y recórrelos.', exito: '¡Pasaste la primera prueba del Olimpo! Combinar listas y funciones es de héroes.' },
    [{ texto: 'ruta = [5, 4, 3, 2]; para cada t: tramo(t); gira.' }], { monedas: 40, gemas: 4 }, w9Code([5, 4, 3, 2])),
  cfgLvl(10, 2, 'El cuadrado de los dioses', buildPathMaze('derecha', [['derecha', 5], ['abajo', 5], ['izquierda', 5]]), ALL_CMDS,
    { intro: 'Un cuadrado perfecto. Demuestra tu dominio de los BUCLES ANIDADOS: un bucle para los lados, otro para avanzar cada lado.', exito: '¡Bucles anidados impecables! Un bucle dentro de otro es una herramienta de dioses.' },
    [{ texto: 'repite 3 { repite 5 {avanzar}; girar }.' }], { monedas: 42, gemas: 4 }, nestedRing(5)),
  cfgLvl(10, 3, 'El oráculo silencioso', sp10a, ALL_CMDS,
    { intro: 'Un camino de longitud desconocida. Usa "mientras puede avanzar" dentro de una función para recorrer cada tramo sin contar.', exito: '¡Escuchaste al oráculo! "mientras" + función es perfecto para lo desconocido.' },
    [{ texto: 'función calle() { mientras puede avanzar { avanzar } }; repite por tramo: calle(); girar.' }], { monedas: 44, gemas: 4 }, whileSpiralCode(sp10a.arms)),
  cfgLvl(10, 4, 'La fórmula de Codexia', cwMaze([6, 5, 4, 3]), ALL_CMDS,
    { intro: 'Cuatro tramos guardados en una lista, recorridos con tu función. Listas + funciones + bucles: la fórmula maestra de Codexia.', exito: '¡Dominas la fórmula maestra! Combinar herramientas es la verdadera programación.' },
    [{ texto: 'ruta = [6, 5, 4, 3]; para cada t: tramo(t); gira.' }], { monedas: 46, gemas: 5 }, w9Code([6, 5, 4, 3])),
  cfgLvl(10, 5, 'El primer eco recursivo', cwMaze([3, 2, 1]), ALL_CMDS,
    { intro: '¡Llega la magia suprema: la RECURSIÓN! Una función que se llama A SÍ MISMA. "espiral(3)" hace un tramo y luego llama a "espiral(2)", que llama a "espiral(1)"... ¡como un eco que se hace pequeño!', exito: '¡Tu primera recursión! Una función que se llama a sí misma. Magia pura del Olimpo.' },
    [{ texto: 'espiral(n): si n>0, tramo(n); girar; espiral(n-1).' }], { monedas: 50, gemas: 5 }, recCode(3)),
  cfgLvl(10, 6, 'El espejo del tiempo', cwMaze([4, 3, 2, 1]), ALL_CMDS,
    { intro: 'La recursión es como un espejo frente a otro: se repite haciéndose menor. "espiral(4)" se reduce hasta cero. ¡Obsérvala trabajar!', exito: '¡La recursión reflejó tu poder! Cada llamada es un poco más pequeña hasta terminar.' },
    [{ texto: 'espiral(4) llama a espiral(3), luego espiral(2)...' }], { monedas: 52, gemas: 5 }, recCode(4)),
  cfgLvl(10, 7, 'La torre recursiva', cwMaze([5, 4, 3, 2, 1]), ALL_CMDS,
    { intro: 'Una torre que se construye sola con recursión. "espiral(5)" baja hasta espiral(0) y se detiene. ¡La condición "si n<=0" es el freno!', exito: '¡La torre recursiva se alzó sola! La condición de parada evita que la recursión sea infinita.' },
    [{ texto: 'No olvides el freno: si n<=0, return.' }], { monedas: 55, gemas: 6 }, recCode(5)),
  cfgLvl(10, 8, 'El abismo recursivo', cwMaze([6, 5, 4, 3, 2, 1]), ALL_CMDS,
    { intro: 'Un abismo profundo que la recursión recorre entero. Seis tramos, una sola función recursiva. ¡El código más corto para el camino más largo!', exito: '¡Cruzaste el abismo con recursión! Poco código, gran poder. Eso es elegancia.' },
    [{ texto: 'espiral(6), con su freno en n<=0.' }], { monedas: 58, gemas: 6 }, recCode(6)),
  cfgLvl(10, 9, 'El infinito controlado', cwMaze([7, 6, 5, 4, 3, 2, 1]), ALL_CMDS,
    { intro: 'Siete tramos hasta el cielo. La recursión parece infinita, pero TÚ la controlas con la condición de parada. ¡Domina el infinito!', exito: '¡Controlaste el infinito! La recursión es poderosa porque tú decides cuándo para.' },
    [{ texto: 'espiral(7). El freno hace toda la diferencia.' }], { monedas: 62, gemas: 7 }, recCode(7)),
  cfgLvl(10, 10, 'El Olimpo', cwMaze([8, 7, 6, 5, 4, 3, 2, 1]), ALL_CMDS,
    { intro: '¡EL DESAFÍO FINAL DE CODEXIA! El ascenso al Olimpo es la espiral recursiva más grande. Una función que se llama a sí misma ocho veces, haciéndose menor. ¡Demuestra que eres un MAESTRO del código!', exito: '¡HAS CONQUISTADO EL OLIMPO DEL PROGRAMADOR! 👑 Dominaste secuencias, bucles, condiciones, variables, funciones, mientras, listas, bucles anidados Y recursión. Eres, oficialmente, un MAESTRO de Codexia. ¡Astro está orgulloso de ti!' },
    [{ texto: 'espiral(8). Tramo, gira, y llámate con n-1.' }], { monedas: 100, gemas: 10 }, recCode(8)),
];

async function main() {
  const niveles = [...W8, ...W9, ...W10];
  let fail = 0;
  for (const n of niveles) {
    const meta = n.config.objetivos.find((o) => o.obligatorio);
    try {
      const r = simulate(n.config);
      if (r.x !== meta.x || r.y !== meta.y) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": no llega (queda ${r.x},${r.y}, meta ${meta.x},${meta.y})`); fail++; }
      else console.log(`✓ M${n.mundo}-${n.orden} "${n.nombre}": verificado`);
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
  await client.query('UPDATE mundos SET total_niveles = 10 WHERE id IN (8, 9, 10)');
  console.log('\n✅ Mundos 8, 9 y 10 sembrados (30 niveles, soluciones verificadas). ¡Currículo completo!');
  await client.end();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
