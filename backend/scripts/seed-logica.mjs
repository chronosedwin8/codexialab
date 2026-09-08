// Materia "Matemáticas — Lógica": 10 mundos × 10 actividades quiz CON VARIEDAD de tipos:
// opción, verdadero/falso, completar, ordenar, relacionar y agrupar (arrastrar y soltar).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function opcion(r, enunciado, correcta, distractores, explicacion, tipo = 'opcion') {
  const opts = shuffle(r, [correcta, ...distractores]).slice(0, 4);
  if (!opts.includes(correcta)) opts[0] = correcta;
  return { tipo, enunciado, opciones: opts.map(String), correcta: opts.indexOf(correcta), explicacion };
}

// ---------- Generadores por tipo ----------
function gSerieCompletar(r) {
  const start = 1 + Math.floor(r() * 8), step = 1 + Math.floor(r() * 4);
  const s = [start, start + step, start + step * 2, start + step * 3], next = start + step * 4;
  return opcion(r, `Completa la serie: ${s.join(', ')}, ___`, next, [next + step, next - 1, next + 1], `La serie sube de ${step} en ${step}: ${s[3]} + ${step} = ${next}.`, 'completar');
}
const EMOJIS = [['🔴', '🔵'], ['🟢', '🟡'], ['⭐', '🌙'], ['🍎', '🍌'], ['🔺', '🔵'], ['🐶', '🐱']];
function gPatronCompletar(r) {
  const [x, y] = pick(r, EMOJIS);
  return opcion(r, `Completa el patrón: ${[x, y, x, y, x].join(' ')} ___`, y, [x], `El patrón alterna ${x} y ${y}, sigue ${y}.`, 'completar');
}
function gComparar(r) {
  const a = 1 + Math.floor(r() * 50), b = 1 + Math.floor(r() * 50);
  const correcta = a > b ? 'mayor que' : a < b ? 'menor que' : 'igual a';
  return opcion(r, `${a} es ___ ${b}`, correcta, ['mayor que', 'menor que', 'igual a'].filter((x) => x !== correcta), `${a} es ${correcta} ${b}.`);
}
function gOrdenarNum(r) {
  const nums = shuffle(r, [2, 5, 9, 14, 21, 33, 47, 58].slice()).slice(0, 4);
  const ordenados = [...nums].sort((p, q) => p - q).map(String);
  return { tipo: 'ordenar', enunciado: 'Ordena estos números de MENOR a MAYOR.', items: ordenados, explicacion: `De menor a mayor: ${ordenados.join(', ')}.` };
}
const VF = [
  ['El número 4 es mayor que el 9.', false, 'No: 4 es menor que 9.'],
  ['2 + 2 es igual a 4.', true, 'Correcto, 2 + 2 = 4.'],
  ['Un triángulo tiene 3 lados.', true, 'Sí, el triángulo tiene 3 lados.'],
  ['La semana tiene 5 días.', false, 'No, la semana tiene 7 días.'],
  ['Todos los gatos son animales.', true, 'Sí, los gatos son animales.'],
  ['Un número par se divide en dos partes iguales.', true, 'Correcto, eso define a un par.'],
  ['Si hoy es lunes, mañana es domingo.', false, 'No, mañana sería martes.'],
  ['El 10 es menor que el 7.', false, 'No, 10 es mayor que 7.'],
  ['Un círculo no tiene esquinas.', true, 'Correcto, el círculo no tiene esquinas.'],
  ['5 es un número impar.', true, 'Sí, 5 es impar.'],
];
function gVF(r) { const [e, v, x] = pick(r, VF); return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "${e}"`, respuesta: v, explicacion: x }; }
const INTRUSO = [
  ['animales', ['perro', 'gato', 'vaca', 'caballo'], 'manzana'],
  ['frutas', ['manzana', 'banano', 'pera', 'uva'], 'silla'],
  ['números pares', ['2', '4', '6', '8'], '7'],
  ['números impares', ['1', '3', '5', '9'], '4'],
  ['colores', ['rojo', 'azul', 'verde'], 'perro'],
  ['formas', ['círculo', 'cuadrado', 'triángulo'], 'lunes'],
];
function gIntruso(r) { const [tema, ms, intr] = pick(r, INTRUSO); return opcion(r, `¿Cuál NO pertenece al grupo de ${tema}?`, intr, shuffle(r, ms).slice(0, 3), `${intr} no es del grupo de ${tema}.`); }
const AGRUPAR = [
  { e: 'Arrastra cada cosa a su grupo', g: { Animales: ['perro', 'gato', 'vaca'], Frutas: ['manzana', 'banano', 'pera'] } },
  { e: 'Clasifica los números', g: { Pares: ['2', '4', '6'], Impares: ['1', '3', '5'] } },
  { e: 'Agrupa según corresponda', g: { Vuelan: ['pájaro', 'avión', 'mariposa'], Nadan: ['pez', 'tiburón', 'delfín'] } },
  { e: 'Clasifica por tamaño', g: { Grandes: ['elefante', 'ballena', 'camión'], Pequeños: ['hormiga', 'moneda', 'botón'] } },
  { e: 'Agrupa colores y formas', g: { Colores: ['rojo', 'azul', 'verde'], Formas: ['círculo', 'cuadrado', 'rombo'] } },
];
function gAgrupar(r) { const it = pick(r, AGRUPAR); return { tipo: 'agrupar', enunciado: it.e, grupos: it.g, explicacion: 'Cada elemento va en el grupo al que pertenece por su característica.' }; }
const RELACIONAR = [
  { e: 'Relaciona cada animal con su sonido', p: [['perro', 'ladra'], ['gato', 'maúlla'], ['vaca', 'muge']] },
  { e: 'Relaciona cada cosa con su pareja', p: [['mano', 'guante'], ['pie', 'zapato'], ['cabeza', 'gorra']] },
  { e: 'Relaciona el animal con lo que produce', p: [['abeja', 'miel'], ['vaca', 'leche'], ['gallina', 'huevo']] },
  { e: 'Relaciona con su opuesto', p: [['grande', 'pequeño'], ['alto', 'bajo'], ['frío', 'caliente']] },
  { e: 'Relaciona cada día con el siguiente', p: [['lunes', 'martes'], ['jueves', 'viernes'], ['sábado', 'domingo']] },
];
function gRelacionar(r) { const it = pick(r, RELACIONAR); return { tipo: 'relacionar', enunciado: it.e, pares: it.p, explicacion: 'Cada elemento se relaciona con su pareja correcta.' }; }
const ORDEN_EVENTOS = [
  { e: 'Ordena los pasos para hacer un sándwich', items: ['Tomar el pan', 'Poner el relleno', 'Cerrar el pan', 'Comerlo'] },
  { e: 'Ordena el ciclo de una planta', items: ['Semilla', 'Brote', 'Planta', 'Flor'] },
  { e: 'Ordena los momentos del día', items: ['Amanecer', 'Mediodía', 'Atardecer', 'Noche'] },
  { e: 'Ordena de más pequeño a más grande', items: ['Hormiga', 'Gato', 'Caballo', 'Elefante'] },
  { e: 'Ordena para salir de casa', items: ['Despertar', 'Vestirse', 'Desayunar', 'Salir'] },
];
function gOrdenEventos(r) { const it = pick(r, ORDEN_EVENTOS); return { tipo: 'ordenar', enunciado: it.e, items: it.items, explicacion: `El orden correcto es: ${it.items.join(' → ')}.` }; }
const RIDDLES = [
  ['Ana es más alta que Beto. Beto más alto que Caro. ¿Quién es la MÁS alta?', 'Ana', ['Beto', 'Caro'], 'Ana > Beto > Caro, así que Ana es la más alta.'],
  ['Tengo 3 manzanas y como 1. ¿Cuántas quedan?', '2', ['3', '1', '4'], '3 - 1 = 2.'],
  ['Hay 5 pájaros y vuelan 2. ¿Cuántos quedan?', '3', ['2', '5', '4'], '5 - 2 = 3.'],
  ['Si A es mayor que B y B mayor que C, ¿quién es el MENOR?', 'C', ['A', 'B'], 'C es el menor de los tres.'],
];
function gRiddle(r) { const [e, c, d, x] = pick(r, RIDDLES); return opcion(r, e, c, d, x); }

const MUNDOS = [
  { orden: 1, nombre: 'Patrones Mágicos', icono: '🔮', gens: [gPatronCompletar, gSerieCompletar, gOrdenarNum], intro: '¡Bienvenido a Patrones Mágicos! Soy Astro. Descubre qué sigue en cada patrón. ¡Observa bien!' },
  { orden: 2, nombre: 'El Club de los Iguales', icono: '🧩', gens: [gAgrupar, gVF, gIntruso], intro: 'En el Club de los Iguales agrupamos lo que se parece. ¡Arrastra cada cosa a su grupo!' },
  { orden: 3, nombre: 'Mayor, Menor o Igual', icono: '⚖️', gens: [gComparar, gSerieCompletar, gOrdenarNum], intro: '¿Qué número es más grande? ¡Compara y ordena usando tu lógica!' },
  { orden: 4, nombre: '¿Verdadero o Falso?', icono: '✅', gens: [gVF, gRiddle, gComparar], intro: 'Decide si cada frase es verdadera o falsa. ¡Piensa bien antes de responder!' },
  { orden: 5, nombre: 'Antes y Después', icono: '⏳', gens: [gOrdenEventos, gOrdenarNum, gVF], intro: '¿Qué pasa primero y qué después? ¡Ordena los pasos en el orden correcto!' },
  { orden: 6, nombre: 'Encuentra al Intruso', icono: '🔍', gens: [gIntruso, gAgrupar, gPatronCompletar], intro: 'Un elemento no encaja. ¡Encuéntralo con tu mirada de detective!' },
  { orden: 7, nombre: 'Parejas y Analogías', icono: '🔗', gens: [gRelacionar, gVF, gIntruso], intro: 'Descubre cómo se relacionan las cosas. ¡Relaciona cada pareja correctamente!' },
  { orden: 8, nombre: 'Series Numéricas', icono: '🔢', gens: [gSerieCompletar, gOrdenarNum, gComparar], intro: 'Números con un orden secreto. ¡Descubre la regla y completa la serie!' },
  { orden: 9, nombre: 'Detectives de la Lógica', icono: '🕵️', gens: [gRiddle, gOrdenEventos, gVF], intro: '¡Acertijos para detectives! Usa las pistas y razona cada misterio.' },
  { orden: 10, nombre: 'El Gran Reto Lógico', icono: '🏆', gens: [gSerieCompletar, gAgrupar, gRelacionar, gVF, gOrdenEventos, gComparar, gIntruso], intro: '¡El desafío final! Aquí se mezclan TODOS los tipos de reto. ¡Demuestra que eres un maestro!' },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const m of MUNDOS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#0EA5E9','#22D3EE','logica',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10 RETURNING id`,
      [m.nombre, `Lógica: ${m.nombre}`, m.orden, m.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const preguntas = [];
      for (let i = 0; i < 3; i++) {
        const gen = m.gens[(a - 1 + i) % m.gens.length];
        preguntas.push(gen(rng(m.orden * 100000 + a * 1000 + i * 131 + 7)));
      }
      const nombre = `${m.nombre} — Reto ${a}`;
      const config = { version: 2, tipo: 'quiz', id: `logica-m${m.orden}-n${a}`, nombre, categoria: 'logica',
        narracion: { intro: a === 1 ? m.intro : `Reto ${a} de ${m.nombre}. ¡Tú puedes!`, url_audio_intro: null },
        preguntas, recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, nombre, a, config]);
    }
    console.log(`✓ Lógica ${m.orden} "${m.nombre}": 10 actividades variadas`);
  }
  console.log('\n✅ Lógica re-sembrada con variedad de tipos (opción, V/F, completar, ordenar, relacionar, agrupar).');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
