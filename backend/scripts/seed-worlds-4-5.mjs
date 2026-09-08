// Mundo 4 "El Océano de Datos" (Variables) y Mundo 5 "Las Montañas del Código" (Funciones).
// Construye laberintos por segmentos (camino garantizado) y AUTO-VERIFICA el codigo_inicial
// (que usa variables / funciones) ejecutándolo con la lógica del worker antes de insertar.
import pg from 'pg';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
const DIRS = { derecha: { dx: 1, dy: 0 }, izquierda: { dx: -1, dy: 0 }, abajo: { dx: 0, dy: 1 }, arriba: { dx: 0, dy: -1 } };
const TURN_R = { derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha' };
const TURN_L = { derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha' };

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
    detectarObstaculo: () => !ok(x + DIRS[dir].dx, y + DIRS[dir].dy), leerSensor: () => 'libre',
  };
  // eslint-disable-next-line no-new-func
  new Function('heroe', cfg.codigo_inicial.javascript)(heroe);
  return { x, y, visited };
}

// Construye un laberinto-corredor siguiendo segmentos [dir, n] desde un origen.
function buildPathMaze(startDir, segments) {
  let x = 0, y = 0; const cells = [[0, 0]];
  for (const [dir, count] of segments) for (let k = 0; k < count; k++) { x += DIRS[dir].dx; y += DIRS[dir].dy; cells.push([x, y]); }
  const minx = Math.min(...cells.map((c) => c[0])), miny = Math.min(...cells.map((c) => c[1]));
  const norm = cells.map(([cx, cy]) => [cx - minx + 1, cy - miny + 1]);
  const maxx = Math.max(...norm.map((c) => c[0])), maxy = Math.max(...norm.map((c) => c[1]));
  const tilemap = Array.from({ length: maxy + 2 }, () => Array.from({ length: maxx + 2 }, () => 1));
  for (const [cx, cy] of norm) tilemap[cy][cx] = 0;
  return { tilemap, spawn: { x: norm[0][0], y: norm[0][1], dir: startDir }, goal: norm[norm.length - 1], cells: norm };
}

function cfg(mundo, orden, nombre, maze, comandos, narr, pistas, rec, codigo, coins = []) {
  const objetivos = [{ id: 'salida', tipo: 'alcanzar_celda', x: maze.goal[0], y: maze.goal[1], obligatorio: true },
    ...coins.map((c, k) => ({ id: `item${k + 1}`, tipo: 'recoger_item', x: c[0], y: c[1], obligatorio: false }))];
  const opt = coins.map((_, k) => `item${k + 1}`);
  return {
    mundo, orden, id: mundo * 100 + orden, nombre,
    config: {
      version: 2, id: `m${mundo}-n${orden}`, nombre, mundo_id: mundo, banda_recomendada: 'aventureros',
      modalidades: ['bloques', 'bloques_texto', 'texto'], tilemap: maze.tilemap, spawn: maze.spawn,
      comandos_permitidos: comandos, bloques_disponibles: comandos,
      codigo_inicial: { javascript: codigo, python: codigo.replace(/heroe\.(\w+)\(\)/g, 'heroe.$1()').replace(/\/\//g, '#').replace(/let /g, '').replace(/function (\w+)\(\) \{/g, 'def $1():').replace(/\}/g, '') },
      narracion: { intro: narr.intro, exito: narr.exito, url_audio_intro: `/audio/narracion/m${mundo}-n${orden}-intro.mp3` },
      objetivos,
      criterios_estrella: { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', ...opt] }, '3': { objetivos: ['salida', ...opt], max_bloques: 6 } },
      pistas, recompensa: rec, tope_ejecucion: 50000,
    },
  };
}

const V_CMDS = ['moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha', 'repetir', 'variables'];
const F_CMDS = ['moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha', 'repetir', 'funciones'];
const seg = (...s) => s; // azúcar

// ===================== MUNDO 4: EL OCÉANO DE DATOS (Variables) =====================
const world4 = [
  cfg(4, 1, 'El primer dato', buildPathMaze('derecha', seg(['derecha', 5])), V_CMDS,
    { intro: '¡Bienvenido al Océano de Datos! Soy Astro. Aquí guardamos información en VARIABLES: cajitas con nombre que recuerdan un número. Guarda cuántos pasos dar en una variable y úsala.', exito: '¡Tu primera variable! Una caja con nombre que recuerda un valor. Si cambias el número, cambia todo.' },
    [{ texto: 'Crea una variable "pasos" y ponle 5.' }, { texto: 'Usa la variable como número de repeticiones del bucle.' }],
    { monedas: 20, gemas: 1 },
    '// Guarda los pasos en una variable y reúsala\nlet pasos = 5;\nfor (let i = 0; i < pasos; i++) {\n  heroe.moverDerecha();\n}\n'),

  cfg(4, 2, 'Dos corrientes iguales', buildPathMaze('derecha', seg(['derecha', 4], ['abajo', 4])), V_CMDS,
    { intro: 'Dos corrientes de la MISMA longitud. ¡Aquí brillan las variables! Guarda la longitud en UNA variable y úsala para las dos corrientes. Si cambia, solo cambias un número.', exito: '¡Una variable, dos usos! Cambiar el valor en un solo lugar cambia todo. Eso ahorra muchísimo trabajo.' },
    [{ texto: 'Crea "n" con valor 4.' }, { texto: 'Repite n veces mover Derecha, luego n veces mover Abajo.' }],
    { monedas: 22, gemas: 1 },
    '// Una variable para las dos corrientes iguales\nlet n = 4;\nfor (let i = 0; i < n; i++) { heroe.moverDerecha(); }\nfor (let i = 0; i < n; i++) { heroe.moverAbajo(); }\n'),

  cfg(4, 3, 'El cuadrado de datos', buildPathMaze('derecha', seg(['derecha', 3], ['abajo', 3], ['izquierda', 3])), V_CMDS,
    { intro: 'Un recorrido en forma de U con tres lados iguales. La misma variable "lado" sirve para los tres. ¡Cámbiala una vez y los tres lados cambian juntos!', exito: '¡Tres lados con una sola variable! Ya ves por qué los programadores aman las variables.' },
    [{ texto: 'Crea "lado" con valor 3.' }, { texto: 'Repite lado veces: derecha, luego abajo, luego izquierda.' }],
    { monedas: 24, gemas: 2 },
    '// La misma variable para los tres lados\nlet lado = 3;\nfor (let i = 0; i < lado; i++) { heroe.moverDerecha(); }\nfor (let i = 0; i < lado; i++) { heroe.moverAbajo(); }\nfor (let i = 0; i < lado; i++) { heroe.moverIzquierda(); }\n'),

  cfg(4, 4, 'La escalera de datos', buildPathMaze('derecha', seg(['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1])), V_CMDS,
    { intro: 'Una escalera de escalones. Guarda el NÚMERO de escalones en una variable. Así, si la escalera crece, solo cambias ese número.', exito: '¡La variable controla cuántos escalones bajar! Un número, todo el control.' },
    [{ texto: 'Crea "escalones" con valor 4.' }, { texto: 'Repite escalones veces { mover Derecha; mover Abajo }.' }],
    { monedas: 26, gemas: 2 },
    '// La variable controla cuántos escalones\nlet escalones = 4;\nfor (let i = 0; i < escalones; i++) {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\n'),

  cfg(4, 5, 'Cristales en fila', buildPathMaze('derecha', seg(['derecha', 6])), V_CMDS,
    { intro: 'Cristales de datos por toda la corriente. Guarda la distancia en una variable y recógelos todos. ¡Las variables hacen tu código fácil de cambiar!', exito: '¡Recogiste todos los cristales con una variable! Cambiar el valor cambia el viaje entero.' },
    [{ texto: 'Crea "distancia" con valor 6.' }, { texto: 'Repite distancia veces mover Derecha.' }],
    { monedas: 28, gemas: 2 },
    '// Usa una variable para la distancia\nlet distancia = 6;\nfor (let i = 0; i < distancia; i++) {\n  heroe.moverDerecha();\n}\n',
    [[2, 1], [4, 1], [6, 1]]),

  cfg(4, 6, 'El gran cuadrado', buildPathMaze('derecha', seg(['derecha', 4], ['abajo', 4], ['izquierda', 4])), V_CMDS,
    { intro: 'Otro recorrido de lados iguales, pero más grande. ¡No reescribas nada! Solo cambia el valor de tu variable "lado". Esa es la magia de las variables.', exito: '¡Solo cambiaste un número y resolviste un recorrido más grande! Reutilizar es pensar como programador.' },
    [{ texto: 'Es como "El cuadrado de datos" pero con lado = 4.' }],
    { monedas: 30, gemas: 2 },
    '// El mismo programa, solo cambia el valor de la variable\nlet lado = 4;\nfor (let i = 0; i < lado; i++) { heroe.moverDerecha(); }\nfor (let i = 0; i < lado; i++) { heroe.moverAbajo(); }\nfor (let i = 0; i < lado; i++) { heroe.moverIzquierda(); }\n'),

  cfg(4, 7, 'Profundo y largo', buildPathMaze('abajo', seg(['abajo', 5], ['derecha', 5])), V_CMDS,
    { intro: 'Baja a las profundidades y luego avanza, ambas la misma distancia. Una variable "d" para las dos partes del viaje. ¡Cámbiala y prueba!', exito: '¡Las profundidades no te asustan con variables! Un valor para todo el recorrido.' },
    [{ texto: 'Crea "d" con valor 5.' }, { texto: 'Repite d veces abajo, luego d veces derecha.' }],
    { monedas: 30, gemas: 3 },
    '// Una variable para bajar y avanzar la misma distancia\nlet d = 5;\nfor (let i = 0; i < d; i++) { heroe.moverAbajo(); }\nfor (let i = 0; i < d; i++) { heroe.moverDerecha(); }\n'),

  cfg(4, 8, 'La escalera profunda', buildPathMaze('derecha', seg(['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1], ['derecha', 1], ['abajo', 1])), V_CMDS,
    { intro: 'Una escalera aún más profunda. Pero tu programa de escalera no cambia: solo el valor de "escalones". ¡Pruébalo!', exito: '¡La misma idea, más escalones! Las variables hacen que tu código crezca sin reescribirlo.' },
    [{ texto: 'escalones = 5, y repite { derecha; abajo }.' }],
    { monedas: 32, gemas: 3 },
    '// Solo cambia el valor de escalones\nlet escalones = 5;\nfor (let i = 0; i < escalones; i++) {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\n'),

  cfg(4, 9, 'Doble recorrido', buildPathMaze('derecha', seg(['derecha', 3], ['abajo', 3], ['derecha', 3], ['abajo', 3])), V_CMDS,
    { intro: 'Un recorrido que repite el patrón "avanza n, baja n" DOS veces. Usa una variable para n y un bucle para el patrón. ¡Combinas variables y bucles!', exito: '¡Variables Y bucles juntos! Estás combinando todo lo que aprendiste.' },
    [{ texto: 'Crea "n" = 3.' }, { texto: 'Repite 2 veces { repite n {derecha}; repite n {abajo} }.' }],
    { monedas: 35, gemas: 3 },
    '// Variable + bucles para el patrón doble\nlet n = 3;\nfor (let v = 0; v < 2; v++) {\n  for (let i = 0; i < n; i++) { heroe.moverDerecha(); }\n  for (let i = 0; i < n; i++) { heroe.moverAbajo(); }\n}\n'),

  cfg(4, 10, 'El corazón del océano', buildPathMaze('derecha', seg(['derecha', 4], ['abajo', 4], ['izquierda', 4], ['abajo', 4])), V_CMDS,
    { intro: '¡El desafío final del océano! Un recorrido de varios tramos iguales. Una sola variable "lado" controla todo. ¡Demuestra que dominas los datos!', exito: '¡COMPLETASTE EL OCÉANO DE DATOS! Las variables guardan información y hacen tu código flexible. ¡Las Montañas del Código te esperan!' },
    [{ texto: 'lado = 4, recorre: derecha, abajo, izquierda, abajo.' }],
    { monedas: 45, gemas: 4 },
    '// Una variable controla todos los tramos\nlet lado = 4;\nfor (let i = 0; i < lado; i++) { heroe.moverDerecha(); }\nfor (let i = 0; i < lado; i++) { heroe.moverAbajo(); }\nfor (let i = 0; i < lado; i++) { heroe.moverIzquierda(); }\nfor (let i = 0; i < lado; i++) { heroe.moverAbajo(); }\n'),
];

// ===================== MUNDO 5: LAS MONTAÑAS DEL CÓDIGO (Funciones) =====================
// escalon() = mover Derecha + mover Arriba (subir la montaña en diagonal)
const upStairs = (n) => buildPathMaze('derecha', [].concat(...Array.from({ length: n }, () => [['derecha', 1], ['arriba', 1]])));
const downStairs = (n) => buildPathMaze('derecha', [].concat(...Array.from({ length: n }, () => [['derecha', 1], ['abajo', 1]])));

const world5 = [
  cfg(5, 1, 'El primer escalón', upStairs(4), F_CMDS,
    { intro: '¡Bienvenido a las Montañas del Código! Soy Astro. Para escalar usamos FUNCIONES: le pones nombre a un grupo de pasos y lo llamas cuando quieras. Define "escalon" y llámalo para subir.', exito: '¡Tu primera función! Le diste un nombre a un grupo de acciones y lo reutilizaste. Genial.' },
    [{ texto: 'Define una función "escalon" con: mover Derecha, mover Arriba.' }, { texto: 'Llama a escalon() 4 veces para llegar a la cima.' }],
    { monedas: 25, gemas: 1 },
    '// Define una función para un escalón y reúsala\nfunction escalon() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nescalon();\nescalon();\nescalon();\nescalon();\n'),

  cfg(5, 2, 'Escalar con función', upStairs(6), F_CMDS,
    { intro: 'Una montaña más alta. En vez de escribir "escalon" muchas veces, ¡llama a tu función DENTRO de un bucle! Función + bucle = súper poder.', exito: '¡Una función dentro de un bucle! Repetiste tu grupo de pasos muchas veces con muy poco código.' },
    [{ texto: 'Define "escalon" igual que antes.' }, { texto: 'repite 6 veces { escalon(); }.' }],
    { monedas: 28, gemas: 1 },
    '// Llama tu función dentro de un bucle\nfunction escalon() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfor (let i = 0; i < 6; i++) {\n  escalon();\n}\n'),

  cfg(5, 3, 'El sendero del doble paso', buildPathMaze('derecha', seg(['derecha', 8])), F_CMDS,
    { intro: 'Un sendero llano pero largo. Define una función "doblePaso" que avance dos casillas y llámala varias veces. Las funciones agrupan acciones que repites.', exito: '¡Una función para un grupo de pasos! Las funciones hacen tu código corto y claro.' },
    [{ texto: 'Define "doblePaso": mover Derecha, mover Derecha.' }, { texto: 'Llama doblePaso() 4 veces.' }],
    { monedas: 28, gemas: 2 },
    '// Una función que agrupa dos pasos\nfunction doblePaso() {\n  heroe.moverDerecha();\n  heroe.moverDerecha();\n}\nfor (let i = 0; i < 4; i++) {\n  doblePaso();\n}\n'),

  cfg(5, 4, 'Bajar la ladera', downStairs(5), F_CMDS,
    { intro: 'Esta montaña baja en escalones. Define "bajar" (derecha + abajo) y llámala con un bucle. ¡La misma idea sirve para subir o bajar!', exito: '¡Funciones para bajar también! Una función es útil en cualquier dirección.' },
    [{ texto: 'Define "bajar": mover Derecha, mover Abajo.' }, { texto: 'repite 5 veces { bajar(); }.' }],
    { monedas: 30, gemas: 2 },
    '// Función para bajar, llamada en un bucle\nfunction bajar() {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\nfor (let i = 0; i < 5; i++) {\n  bajar();\n}\n'),

  cfg(5, 5, 'La cima lejana', upStairs(7), F_CMDS,
    { intro: 'La cima está muy alta. ¡Pero tu función "escalon" no se cansa! Solo aumenta las repeticiones del bucle. El código casi no cambia.', exito: '¡Llegaste a la cima lejana! Funciones más bucles vencen cualquier montaña.' },
    [{ texto: 'Misma función "escalon", repite 7 veces.' }],
    { monedas: 32, gemas: 3 },
    '// Solo aumenta las repeticiones\nfunction escalon() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfor (let i = 0; i < 7; i++) {\n  escalon();\n}\n'),

  cfg(5, 6, 'Sube y avanza', buildPathMaze('derecha', seg(['arriba', 3], ['derecha', 3])), F_CMDS,
    { intro: 'Primero sube, luego avanza. Define DOS funciones: "subir" y "avanzar3". Llama cada una. Puedes tener muchas funciones, cada una con su tarea.', exito: '¡Dos funciones, dos tareas! Dividir el problema en funciones lo hace más fácil.' },
    [{ texto: 'Define "subir3" (3 veces arriba) y "avanzar3" (3 veces derecha).' }, { texto: 'Llama subir3() y luego avanzar3().' }],
    { monedas: 33, gemas: 3 },
    '// Dos funciones, cada una con su tarea\nfunction subir3() {\n  for (let i = 0; i < 3; i++) { heroe.moverArriba(); }\n}\nfunction avanzar3() {\n  for (let i = 0; i < 3; i++) { heroe.moverDerecha(); }\n}\nsubir3();\navanzar3();\n'),

  cfg(5, 7, 'El gran ascenso', upStairs(8), F_CMDS,
    { intro: 'El ascenso más largo hasta ahora. Con tu función "escalon" y un bucle, da igual cuán alta sea la montaña. ¡Solo el número cambia!', exito: '¡Conquistaste el gran ascenso! Las funciones hacen que lo grande parezca pequeño.' },
    [{ texto: 'escalon() repetido 8 veces.' }],
    { monedas: 35, gemas: 3 },
    '// El gran ascenso con función + bucle\nfunction escalon() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfor (let i = 0; i < 8; i++) {\n  escalon();\n}\n'),

  cfg(5, 8, 'La montaña doble', buildPathMaze('derecha', [].concat(...Array.from({ length: 3 }, () => [['derecha', 1], ['arriba', 1]]), ...Array.from({ length: 3 }, () => [['derecha', 1], ['abajo', 1]]))), F_CMDS,
    { intro: 'Una montaña con dos laderas: subes una y bajas la otra. Define "subir" y "bajar" y úsalas en orden. ¡Cada función resuelve una parte!', exito: '¡Subiste y bajaste con tus propias funciones! Combinar funciones resuelve montañas complicadas.' },
    [{ texto: 'Define "subir" (der+arriba) y "bajar" (der+abajo).' }, { texto: 'repite 3 {subir()}, luego repite 3 {bajar()}.' }],
    { monedas: 38, gemas: 4 },
    '// Una función para cada ladera\nfunction subir() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfunction bajar() {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\nfor (let i = 0; i < 3; i++) { subir(); }\nfor (let i = 0; i < 3; i++) { bajar(); }\n'),

  cfg(5, 9, 'El pico nevado', upStairs(6), F_CMDS,
    { intro: 'El pico nevado brilla en lo alto. Usa tu función "escalon" dentro de un bucle. ¡Ya eres un experto escalador del código!', exito: '¡Alcanzaste el pico nevado! Funciones bien hechas se reutilizan una y otra vez.' },
    [{ texto: 'escalon() en un bucle de 6.' }],
    { monedas: 40, gemas: 4 },
    '// Al pico con tu función de siempre\nfunction escalon() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfor (let i = 0; i < 6; i++) {\n  escalon();\n}\n'),

  cfg(5, 10, 'El corazón de la montaña', buildPathMaze('derecha', [].concat(...Array.from({ length: 4 }, () => [['derecha', 1], ['arriba', 1]]), [['derecha', 3]], ...Array.from({ length: 4 }, () => [['derecha', 1], ['abajo', 1]]))), F_CMDS,
    { intro: '¡El desafío final de las montañas! Sube, cruza la cima y baja. Usa funciones para cada tramo: "subir", "cruzar", "bajar". ¡Demuestra todo lo aprendido!', exito: '¡COMPLETASTE LAS MONTAÑAS DEL CÓDIGO! Las funciones agrupan acciones con un nombre y las reutilizas. ¡Ya programas con secuencias, bucles, condiciones, variables Y funciones!' },
    [{ texto: 'Define "subir" (der+arriba) y "bajar" (der+abajo).' }, { texto: 'repite 4 {subir}, avanza 3 a la derecha, repite 4 {bajar}.' }],
    { monedas: 55, gemas: 5 },
    '// Funciones para cada tramo de la montaña final\nfunction subir() {\n  heroe.moverDerecha();\n  heroe.moverArriba();\n}\nfunction bajar() {\n  heroe.moverDerecha();\n  heroe.moverAbajo();\n}\nfor (let i = 0; i < 4; i++) { subir(); }\nfor (let i = 0; i < 3; i++) { heroe.moverDerecha(); }\nfor (let i = 0; i < 4; i++) { bajar(); }\n'),
];

async function main() {
  const niveles = [...world4, ...world5];
  let fail = 0;
  for (const n of niveles) {
    const meta = n.config.objetivos.find((o) => o.obligatorio);
    try {
      const r = simulate(n.config);
      if (r.x !== meta.x || r.y !== meta.y) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": no llega (queda ${r.x},${r.y}, meta ${meta.x},${meta.y})`); fail++; }
      else {
        const coinsOk = n.config.objetivos.filter((o) => !o.obligatorio).every((o) => r.visited.has(`${o.x},${o.y}`));
        console.log(`✓ M${n.mundo}-${n.orden} "${n.nombre}": verificado${n.config.objetivos.length > 1 ? (coinsOk ? ' (+items)' : ' (¡items no recogidos!)') : ''}`);
      }
    } catch (e) { console.log(`✗ M${n.mundo}-${n.orden} "${n.nombre}": CHOCA (${e.message})`); fail++; }
  }
  if (fail > 0) { console.log(`\n⛔ ${fail} nivel(es) inválidos. NO se insertó nada.`); process.exit(1); }

  await client.connect();
  for (const n of niveles) {
    await client.query(
      `INSERT INTO niveles (id, mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1, $2, $3, $4, $5, 'aventureros', ARRAY['bloques','bloques_texto','texto']::modalidad_codigo[], true)
       ON CONFLICT (id) DO UPDATE SET mundo_id = EXCLUDED.mundo_id, nombre = EXCLUDED.nombre, numero_orden = EXCLUDED.numero_orden, config = EXCLUDED.config`,
      [n.id, n.mundo, n.nombre, n.orden, n.config]
    );
  }
  await client.query('UPDATE mundos SET total_niveles = 10 WHERE id IN (4, 5)');
  console.log('\n✅ Mundos 4 y 5 sembrados (20 niveles, soluciones verificadas).');
  await client.end();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
