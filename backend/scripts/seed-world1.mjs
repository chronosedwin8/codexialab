// Siembra el Mundo 1 "Valle de las Secuencias" — 10 niveles, unidad de Estructuras Secuenciales.
// Historia: Astro y el héroe cruzan el Valle aprendiendo que las instrucciones se ejecutan EN ORDEN.
// Solo comandos secuenciales (mover direccional + avanzar). Sin bucles ni condicionales (esos son Mundo 2 y 3).
import pg from 'pg';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const MOVE = ['moverArriba', 'moverAbajo', 'moverIzquierda', 'moverDerecha'];
const COMMON = {
  version: 2,
  mundo_id: 1,
  banda_recomendada: 'aventureros',
  modalidades: ['bloques', 'bloques_texto', 'texto'],
  comandos_permitidos: [...MOVE, 'avanzar'],
  bloques_disponibles: [...MOVE, 'avanzar'],
  tope_ejecucion: 50000,
};

// Helper para construir un nivel de forma compacta
function lvl(orden, id, nombre, tilemap, spawn, objetivos, criterios, narracion, pistas, recompensa, codigoInicial) {
  return {
    orden,
    id,
    nombre,
    config: {
      ...COMMON,
      id: `m1-n${orden}`,
      nombre,
      tilemap,
      spawn,
      objetivos,
      criterios_estrella: criterios,
      narracion: {
        ...narracion,
        url_audio_intro: `/audio/narracion/m1-n${orden}-intro.mp3`,
      },
      pistas,
      recompensa,
      codigo_inicial: {
        javascript: codigoInicial,
        python: codigoInicial.replace(/heroe\.(\w+)\(\);/g, 'heroe.$1()').replace(/\/\//g, '#'),
      },
    },
  };
}

const W = 1, F = 0; // Wall / Floor

const niveles = [
  lvl(1, 1, 'El primer paso',
    [[W,W,W,W,W],[W,F,F,F,W],[W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 3, y: 1, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'] }, '3': { objetivos: ['salida'], max_instrucciones: 2 } },
    {
      intro: '¡Bienvenido al Valle de las Secuencias, aventurero! Soy Astro, tu guía. Aquí todo funciona en ORDEN: una instrucción tras otra. Empecemos fácil: lleva al héroe hasta la estrella con el bloque mover Derecha.',
      exito: '¡Tu primer paso como programador! Las computadoras siguen tus órdenes una por una, igual que tú diste cada paso.',
    },
    [{ texto: 'Arrastra el bloque "mover Derecha" al área de trabajo.' }, { texto: 'Necesitas mover a la derecha 2 veces.' }],
    { monedas: 10, gemas: 0 },
    '// Lleva al héroe hasta la estrella\nheroe.moverDerecha();\n'),

  lvl(2, 2, 'Cambiar de rumbo',
    [[W,W,W,W,W],[W,F,F,F,W],[W,W,W,F,W],[W,W,W,F,W],[W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 3, y: 3, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'], max_instrucciones: 6 }, '3': { objetivos: ['salida'], max_instrucciones: 4 } },
    {
      intro: 'El camino dobla hacia abajo. ¡No hay problema! Primero ve a la derecha y luego baja. El orden de los pasos importa: si los cambias, el héroe se pierde.',
      exito: '¡Excelente! Combinaste dos direcciones en el orden correcto. Eso es una secuencia.',
    },
    [{ texto: 'Primero muévete a la derecha hasta la esquina.' }, { texto: 'Luego baja hasta la estrella: derecha, derecha, abajo, abajo.' }],
    { monedas: 10, gemas: 0 },
    '// Ve a la derecha y luego baja\nheroe.moverDerecha();\n'),

  lvl(3, 3, 'La esquina',
    [[W,W,W,W,W],[W,F,W,W,W],[W,F,W,W,W],[W,F,F,F,W],[W,W,W,W,W]],
    { x: 1, y: 1, dir: 'abajo' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 3, y: 3, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'], max_instrucciones: 6 }, '3': { objetivos: ['salida'], max_instrucciones: 4 } },
    {
      intro: 'Esta vez el héroe empieza mirando hacia abajo. Baja por el sendero y dobla en la esquina hacia la derecha. ¡Sigue el camino azul!',
      exito: '¡Doblar esquinas se te da genial! Cada giro del camino es solo otra instrucción en tu secuencia.',
    },
    [{ texto: 'Baja primero por el sendero.' }, { texto: 'Al llegar abajo, muévete a la derecha: abajo, abajo, derecha, derecha.' }],
    { monedas: 12, gemas: 0 },
    '// Baja y dobla a la derecha\nheroe.moverAbajo();\n'),

  lvl(4, 4, 'El zigzag',
    [[W,W,W,W,W],[W,F,F,F,W],[W,W,W,F,W],[W,F,F,F,W],[W,F,W,W,W],[W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 1, y: 4, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'], max_instrucciones: 9 }, '3': { objetivos: ['salida'], max_instrucciones: 7 } },
    {
      intro: 'El sendero zigzaguea como una serpiente. Derecha, abajo, izquierda, abajo... ¡lee bien el camino antes de programar todos los pasos!',
      exito: '¡Un zigzag perfecto! Planeaste toda la secuencia desde el inicio. Así piensan los programadores.',
    },
    [{ texto: 'El camino va: derecha, abajo, izquierda, abajo.' }, { texto: 'Cuenta las casillas: 2 derecha, 2 abajo, 2 izquierda, 1 abajo.' }],
    { monedas: 12, gemas: 1 },
    '// Sigue el zigzag hasta la estrella\nheroe.moverDerecha();\n'),

  lvl(5, 5, 'La moneda perdida',
    [[W,W,W,W,W,W],[W,F,F,F,F,W],[W,W,W,W,F,W],[W,F,F,F,F,W],[W,W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [
      { id: 'salida', tipo: 'alcanzar_celda', x: 1, y: 3, obligatorio: true },
      { id: 'moneda', tipo: 'recoger_item', x: 4, y: 1, obligatorio: false },
    ],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', 'moneda'] }, '3': { objetivos: ['salida', 'moneda'], max_instrucciones: 8 } },
    {
      intro: 'Un viajero perdió una moneda dorada en el valle. ¡Recógela de camino a la salida! Pasa por la moneda antes de bajar.',
      exito: '¡Encontraste el tesoro Y llegaste a la salida! Recoger objetos en el camino es parte de planear una buena secuencia.',
    },
    [{ texto: 'Primero ve a la derecha hasta la moneda dorada.' }, { texto: 'Luego baja y regresa a la izquierda hasta la estrella.' }],
    { monedas: 15, gemas: 1 },
    '// Recoge la moneda y llega a la estrella\nheroe.moverDerecha();\n'),

  lvl(6, 6, 'El puente largo',
    [[W,W,W,W,W,W,W,W],[W,F,F,F,F,F,F,W],[W,W,W,W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 6, y: 1, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'], max_instrucciones: 7 }, '3': { objetivos: ['salida'], max_instrucciones: 5 } },
    {
      intro: 'Un puente larguísimo cruza el río. Tendrás que escribir mover Derecha varias veces. Más adelante aprenderás un truco mágico para no repetir tanto... ¡pero por ahora, paso a paso!',
      exito: '¡Cruzaste el gran puente! ¿No sería genial poder repetir un paso muchas veces con una sola orden? Eso lo verás en el Bosque de los Bucles.',
    },
    [{ texto: 'Solo necesitas mover a la derecha, varias veces.' }, { texto: 'Son 5 pasos a la derecha hasta la estrella.' }],
    { monedas: 15, gemas: 1 },
    '// Cruza el puente hasta la estrella\nheroe.moverDerecha();\n'),

  lvl(7, 7, 'Sube y baja',
    [[W,W,W,W,W],[W,F,W,F,W],[W,F,W,F,W],[W,F,W,F,W],[W,F,F,F,W],[W,W,W,W,W]],
    { x: 1, y: 1, dir: 'abajo' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 3, y: 1, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'], max_instrucciones: 10 }, '3': { objetivos: ['salida'], max_instrucciones: 8 } },
    {
      intro: 'Dos torres unidas por abajo. Baja por la primera, cruza por el suelo y sube por la segunda hasta la cima. ¡Usa mover Arriba para escalar!',
      exito: '¡Subiste y bajaste como un explorador experto! Ya dominas las cuatro direcciones.',
    },
    [{ texto: 'Baja por la torre izquierda hasta el suelo.' }, { texto: 'Cruza a la derecha y sube por la otra torre: abajo x3, derecha x2, arriba x3.' }],
    { monedas: 18, gemas: 1 },
    '// Baja, cruza y sube hasta la estrella\nheroe.moverAbajo();\n'),

  lvl(8, 8, 'La serpiente',
    [[W,W,W,W,W,W],[W,F,F,F,F,W],[W,W,W,W,F,W],[W,F,F,F,F,W],[W,F,W,W,W,W],[W,W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [{ id: 'salida', tipo: 'alcanzar_celda', x: 1, y: 4, obligatorio: true }],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida'], max_instrucciones: 11 }, '3': { objetivos: ['salida'], max_instrucciones: 9 } },
    {
      intro: 'El sendero serpentea de un lado a otro. Derecha, abajo, izquierda, abajo... como una verdadera serpiente. ¡Lee todo el camino y arma tu secuencia completa!',
      exito: '¡Domaste la serpiente del valle! Secuencias largas no te asustan: solo son muchos pasos en orden.',
    },
    [{ texto: 'Ve a la derecha por arriba, baja, regresa a la izquierda.' }, { texto: 'derecha x3, abajo x2, izquierda x3, abajo x1.' }],
    { monedas: 18, gemas: 2 },
    '// Sigue a la serpiente hasta la estrella\nheroe.moverDerecha();\n'),

  lvl(9, 9, 'Doble tesoro',
    [[W,W,W,W,W,W,W],[W,F,F,F,F,F,W],[W,F,W,W,W,F,W],[W,F,F,F,F,F,W],[W,W,W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [
      { id: 'salida', tipo: 'alcanzar_celda', x: 1, y: 3, obligatorio: true },
      { id: 'moneda1', tipo: 'recoger_item', x: 5, y: 1, obligatorio: false },
      { id: 'moneda2', tipo: 'recoger_item', x: 5, y: 3, obligatorio: false },
    ],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', 'moneda1', 'moneda2'] }, '3': { objetivos: ['salida', 'moneda1', 'moneda2'], max_instrucciones: 10 } },
    {
      intro: '¡Dos monedas doradas brillan en las esquinas! Da la vuelta completa al sendero para recoger ambas antes de llegar a la salida. ¡Planea la ruta entera!',
      exito: '¡Dos tesoros en una sola secuencia! Eres todo un cazador de monedas del Valle de las Secuencias.',
    },
    [{ texto: 'Recorre el anillo: derecha por arriba, baja, izquierda por abajo.' }, { texto: 'derecha x4 (moneda 1), abajo x2 (moneda 2), izquierda x4 hasta la estrella.' }],
    { monedas: 22, gemas: 2 },
    '// Recoge las dos monedas y llega a la estrella\nheroe.moverDerecha();\n'),

  lvl(10, 10, 'El corazón del valle',
    [[W,W,W,W,W,W,W],[W,F,F,F,F,F,W],[W,W,W,W,W,F,W],[W,F,F,F,F,F,W],[W,F,W,W,W,W,W],[W,F,F,F,F,F,W],[W,W,W,W,W,W,W]],
    { x: 1, y: 1, dir: 'derecha' },
    [
      { id: 'salida', tipo: 'alcanzar_celda', x: 5, y: 5, obligatorio: true },
      { id: 'gema', tipo: 'recoger_item', x: 1, y: 3, obligatorio: false },
    ],
    { '1': { objetivos: ['salida'] }, '2': { objetivos: ['salida', 'gema'] }, '3': { objetivos: ['salida', 'gema'], max_instrucciones: 16 } },
    {
      intro: '¡El desafío final del Valle! En el corazón del valle hay una gema mágica. Recórrelo entero, recoge la gema y llega a la salida. Esta es la secuencia más larga: ¡tú puedes!',
      exito: '¡INCREÍBLE! Completaste el Valle de las Secuencias. Has aprendido que un programa es una lista de instrucciones en orden. Astro está orgulloso. ¡El Bosque de los Bucles te espera!',
    },
    [{ texto: 'Sigue el sendero en forma de S: arriba, baja, izquierda, baja, derecha.' }, { texto: 'derecha x4, abajo x2, izquierda x4 (gema), abajo x2, derecha x4.' }],
    { monedas: 30, gemas: 3 },
    '// El gran desafío: recoge la gema y llega a la estrella\nheroe.moverDerecha();\n'),
];

async function main() {
  await client.connect();
  for (const n of niveles) {
    await client.query(
      `INSERT INTO niveles (id, mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
       VALUES ($1, 1, $2, $3, $4, 'aventureros', ARRAY['bloques','bloques_texto','texto']::modalidad_codigo[], true)
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, numero_orden = EXCLUDED.numero_orden, config = EXCLUDED.config`,
      [n.id, n.nombre, n.orden, n.config]
    );
    console.log(`✓ Nivel ${n.orden}: "${n.nombre}"`);
  }
  await client.query('UPDATE mundos SET total_niveles = 10 WHERE id = 1');
  console.log('\n✅ Mundo 1 sembrado con 10 niveles (Estructuras Secuenciales).');
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
