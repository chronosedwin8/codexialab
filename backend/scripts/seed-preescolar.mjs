// Sección PREESCOLAR (niños que aún no leen/escriben). Dos materias:
//  - 'mate_preescolar'  : currículo de matemáticas (lista tipo IXL: contar, sumar, restar,
//                         clasificar, comparar, patrones, posiciones, medidas, figuras 2D/3D).
//  - 'lectoescritura'   : plan de 20 semanas (conciencia fonológica → decodificación → fluidez → comprensión).
// Cada actividad es de tipo 'preescolar' con instrucción por VOZ (texto que se lee en voz alta),
// gamificada y con gráficos simples (emojis grandes). Sub-tipos:
//   contar | elegir | operacion | ordenar | trazo
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const R = () => Math.random();
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(R() * a.length)];

const OBJ = ['🍎', '⭐', '🐶', '🌸', '🎈', '🐠', '🍌', '🚗', '🦋', '🐥', '🍓', '🐱', '🌼', '🐞'];
function opcionesNum(correcto, max = 20) {
  const set = new Set([correcto]);
  let guard = 0;
  while (set.size < 3 && guard++ < 50) { const d = correcto + (Math.floor(R() * 5) - 2); if (d >= 0 && d <= max) set.add(d); }
  while (set.size < 3) set.add(Math.floor(R() * (max + 1)));
  return shuffle([...set]);
}
const contar = (objeto, cantidad) => ({ sub: 'contar', objeto, cantidad, opciones: opcionesNum(cantidad) });
const operacion = (a, b, op, objeto) => ({ sub: 'operacion', a, b, op, objeto, opciones: opcionesNum(op === '+' ? a + b : a - b, 10) });
const ordenar = (items) => ({ sub: 'ordenar', items });
const trazo = (figura, trazoTipo) => ({ sub: 'trazo', figura, trazoTipo });
const elegir = (opciones) => ({ sub: 'elegir', opciones });

// elegir entre íconos: target correcto + distractores
function elegirDe(targetIcono, distractores, n = 2) {
  const ops = [{ icono: targetIcono, correcta: true }, ...shuffle(distractores).slice(0, n).map((i) => ({ icono: i, correcta: false }))];
  return elegir(shuffle(ops));
}

const FORMAS2D = [['🔵', 'círculo'], ['🟥', 'cuadrado'], ['🔺', 'triángulo'], ['⭐', 'estrella'], ['🔶', 'rombo'], ['❤️', 'corazón']];
const FORMAS3D = [['🧊', 'cubo'], ['⚽', 'esfera'], ['🍦', 'cono'], ['🥫', 'cilindro']];
const VOCALES = [['A', '🕷️', 'araña'], ['E', '🐘', 'elefante'], ['I', '🧊', 'iglú'], ['O', '🐻', 'oso'], ['U', '🍇', 'uvas']];

function lvl(sub_data, nombre, instruccion, rec = { monedas: 5, gemas: 0 }) {
  // tipo:'preescolar' va DESPUÉS del spread para que ningún dato del sub lo sobrescriba.
  return { version: 1, sub: sub_data.sub, nombre, instruccion, recompensa: rec, ...sub_data, tipo: 'preescolar' };
}

// ───────────────────────── MATEMÁTICA ─────────────────────────
const MATE = [
  ['Cuenta hasta el 3', '🍎', ['#16A34A', '#4ADE80'], [
    lvl(contar('🍎', 3), 'Aprender a contar hasta 3', 'Cuenta las manzanas. ¿Cuántas hay? Toca el número correcto.'),
    lvl(contar('⭐', 2), 'Contar hasta 3', 'Cuenta las estrellas y toca cuántas son.'),
    lvl(contar('🐶', 3), 'Mostrar números hasta 3', 'Mira los perritos. Toca el número que dice cuántos hay.'),
  ]],
  ['Cuenta hasta el 5', '⭐', ['#0EA5E9', '#38BDF8'], [
    lvl(contar('🎈', 5), 'Aprender a contar hasta 5', 'Cuenta los globos. ¿Cuántos hay? Toca el número.'),
    lvl(contar('🐠', 4), 'Contar hasta 5', 'Cuenta los pececitos y toca el número.'),
    lvl(contar('🌸', 5), 'Mostrar números hasta 5', 'Cuenta las flores y toca cuántas son.'),
  ]],
  ['Cuenta hasta el 10', '🔟', ['#6B46C1', '#A78BFA'], [
    lvl(contar('🍓', 7), 'Aprender a contar hasta 10', 'Cuenta las fresas. Toca el número.'),
    lvl(contar('🐥', 10), 'Contar hasta 10', 'Cuenta los pollitos y toca cuántos hay.'),
    lvl(contar('🚗', 8), 'Números hasta 10', 'Cuenta los carros y toca el número.'),
    lvl(contar('🦋', 9), 'Contar hasta 10 con números', 'Cuenta las mariposas. ¿Cuántas son? Toca el número.'),
    lvl(elegir(shuffle([{ icono: '🐢', correcta: true }, { icono: '🐰', correcta: false }, { icono: '🦊', correcta: false }])), 'Números ordinales', 'Toca el animal que va PRIMERO en la fila.'),
  ]],
  ['Cuenta hasta el 20', '🎈', ['#F59E0B', '#FCD34D'], [
    lvl(contar('🍌', 12), 'Números hasta 20', 'Cuenta los plátanos y toca el número.'),
    lvl(contar('🌼', 15), 'Contar hasta 20', 'Cuenta las flores. Toca cuántas hay.'),
    lvl(ordenar([{ icono: '1️⃣', orden: 1 }, { icono: '2️⃣', orden: 2 }, { icono: '3️⃣', orden: 3 }, { icono: '4️⃣', orden: 4 }]), 'Completar una secuencia hasta 20', 'Toca los números en orden: 1, 2, 3, 4.'),
    lvl(contar('🐞', 14), 'Contar hacia delante hasta 20', 'Cuenta las mariquitas y toca el número.'),
    lvl(ordenar([{ icono: '🔟', orden: 1 }, { icono: '9️⃣', orden: 2 }, { icono: '8️⃣', orden: 3 }]), 'Contar hacia atrás desde el 20', 'Toca los números del más grande al más pequeño: 10, 9, 8.'),
    lvl(contar('⭐', 16), 'Decenas y unidades', 'Cuenta las estrellas y toca cuántas son.'),
  ]],
  ['Números grandes', '🔢', ['#DC2626', '#F87171'], [
    lvl(ordenar([{ icono: '🔟', orden: 1 }, { icono: '2️⃣0️⃣', orden: 2 }, { icono: '3️⃣0️⃣', orden: 3 }]), 'Contar de diez en diez', 'Toca en orden: 10, 20, 30.'),
    lvl(contar('🍎', 18), 'Contar con rectas numéricas', 'Cuenta las manzanas y toca el número.'),
    lvl(ordenar([{ icono: '5️⃣', orden: 1 }, { icono: '6️⃣', orden: 2 }, { icono: '7️⃣', orden: 3 }]), 'Completar la recta numérica', 'Toca los números en orden: 5, 6, 7.'),
    lvl(elegir(shuffle([{ icono: '8', correcta: true }, { icono: '6', correcta: false }, { icono: '10', correcta: false }])), 'Contar hacia delante', 'Contamos: 5, 6, 7... ¿qué número sigue? Toca el número.'),
  ]],
  ['Contar de tanto en tanto', '👣', ['#0891B2', '#22D3EE'], [
    lvl(elegir(shuffle([{ icono: '8', correcta: true }, { icono: '7', correcta: false }, { icono: '9', correcta: false }])), 'Contar de dos en dos', 'Contamos de dos en dos: 2, 4, 6... ¿qué sigue? Toca el número.'),
    lvl(elegir(shuffle([{ icono: '10', correcta: true }, { icono: '12', correcta: false }, { icono: '8', correcta: false }])), 'Contar de cinco en cinco', 'Contamos de cinco en cinco: 5... ¿qué sigue? Toca el número.'),
    lvl(elegir(shuffle([{ icono: '20', correcta: true }, { icono: '15', correcta: false }, { icono: '30', correcta: false }])), 'Contar de diez en diez', 'Contamos de diez en diez: 10... ¿qué sigue? Toca el número.'),
    lvl(ordenar([{ icono: '2️⃣', orden: 1 }, { icono: '4️⃣', orden: 2 }, { icono: '6️⃣', orden: 3 }]), 'Aprender a contar de dos en dos', 'Toca en orden: 2, 4, 6.'),
  ]],
  ['Clasificar', '🎨', ['#7C3AED', '#C4B5FD'], [
    lvl(elegirDe('🔴', ['🟢', '🔵', '🟡']), 'Clasificar por color', 'Toca el círculo de color ROJO.'),
    lvl(elegirDe('🔺', ['🔵', '🟥', '⭐']), 'Clasificar por forma', 'Toca el TRIÁNGULO.'),
    lvl(elegirDe('🍎', ['🚗', '🎈', '⚽']), 'Clasificar y ordenar', 'Toca la FRUTA.'),
  ]],
  ['Comparar y ordenar', '⚖️', ['#DB2777', '#F472B6'], [
    lvl(elegir(shuffle([{ icono: '🍎', correcta: true }, { icono: '🍎🍎🍎', correcta: false }])), 'Menos', 'Toca el grupo que tiene MENOS manzanas.'),
    lvl(elegir(shuffle([{ icono: '⭐⭐⭐⭐', correcta: true }, { icono: '⭐⭐', correcta: false }])), 'Más', 'Toca el grupo que tiene MÁS estrellas.'),
    lvl(elegir(shuffle([{ icono: '🐶🐶🐶', correcta: true }, { icono: '🐶', correcta: false }])), 'Menos y más', 'Toca el grupo que tiene MÁS perritos.'),
    lvl(elegir(shuffle([{ icono: '5', correcta: true }, { icono: '3', correcta: false }, { icono: '1', correcta: false }])), 'Comparar dos números: hasta 10', 'Toca el número MÁS GRANDE.'),
    lvl(elegir(shuffle([{ icono: '9', correcta: true }, { icono: '4', correcta: false }, { icono: '7', correcta: false }])), 'Comparar tres números: hasta 10', 'Toca el número MÁS GRANDE de todos.'),
    lvl(ordenar([{ icono: '1️⃣', orden: 1 }, { icono: '3️⃣', orden: 2 }, { icono: '5️⃣', orden: 3 }]), 'Ordenar números: hasta 10', 'Toca los números del más pequeño al más grande.'),
  ]],
  ['Patrones', '🔁', ['#16A34A', '#86EFAC'], [
    lvl(elegir(shuffle([{ icono: '🔴', correcta: true }, { icono: '🔵', correcta: false }])), 'Completar un patrón', 'Mira el patrón: 🔴 🔵 🔴 🔵 🔴 ... ¿qué sigue? Toca la figura.'),
    lvl(elegir(shuffle([{ icono: '⭐', correcta: true }, { icono: '❤️', correcta: false }])), 'Crear un patrón', 'Mira: ⭐ ❤️ ⭐ ❤️ ... ¿qué sigue? Toca la figura.'),
  ]],
  ['Sumar hasta 5', '➕', ['#0EA5E9', '#7DD3FC'], [
    lvl(operacion(1, 1, '+', '🍎'), 'Seleccionar la suma: hasta 5', 'Una manzana más una manzana. ¿Cuántas hay? Toca el número.'),
    lvl(operacion(2, 1, '+', '⭐'), 'Operaciones de suma: hasta 5', 'Dos estrellas más una estrella. ¿Cuántas en total?'),
    lvl(operacion(2, 2, '+', '🎈'), 'Conseguir un número con sumas: hasta 5', 'Suma los globos y toca el total.'),
    lvl(operacion(3, 2, '+', '🐠'), 'Completar sumas: hasta 5', 'Suma los pececitos. ¿Cuántos hay? Toca el número.'),
  ]],
  ['Sumar hasta 10', '➕', ['#6B46C1', '#C4B5FD'], [
    lvl(operacion(4, 2, '+', '🍓'), 'Seleccionar la suma: hasta 10', 'Suma las fresas y toca el total.'),
    lvl(operacion(5, 3, '+', '🚗'), 'Operaciones de suma: hasta 10', 'Suma los carros. ¿Cuántos en total?'),
    lvl(operacion(6, 2, '+', '🐥'), 'Conseguir un número con sumas: hasta 10', 'Suma los pollitos y toca el número.'),
    lvl(operacion(4, 4, '+', '🌸'), 'Completar sumas: hasta 10', 'Suma las flores. Toca cuántas hay.'),
  ]],
  ['Restar hasta 5', '➖', ['#F59E0B', '#FDE68A'], [
    lvl(operacion(3, 1, '-', '🍎'), 'Seleccionar la resta: hasta 5', 'Hay 3 manzanas y se va 1. ¿Cuántas quedan?'),
    lvl(operacion(4, 2, '-', '⭐'), 'Operaciones de resta: hasta 5', 'Quita 2 estrellas. ¿Cuántas quedan? Toca el número.'),
    lvl(operacion(5, 1, '-', '🎈'), 'Conseguir un número con restas: hasta 5', 'Resta los globos y toca el resultado.'),
    lvl(operacion(5, 3, '-', '🐠'), 'Completar la resta: hasta 5', 'Quita los pececitos y toca cuántos quedan.'),
  ]],
  ['Restar hasta 10', '➖', ['#DC2626', '#FCA5A5'], [
    lvl(operacion(7, 2, '-', '🍓'), 'Seleccionar la resta: hasta 10', 'Resta las fresas y toca cuántas quedan.'),
    lvl(operacion(8, 3, '-', '🚗'), 'Operaciones de resta: hasta 10', 'Quita 3 carros. ¿Cuántos quedan?'),
    lvl(operacion(9, 4, '-', '🐥'), 'Conseguir un número con restas: hasta 10', 'Resta los pollitos y toca el número.'),
    lvl(operacion(10, 5, '-', '🌸'), 'Completar la resta: hasta 10', 'Quita las flores y toca cuántas quedan.'),
  ]],
  ['Posiciones', '📍', ['#0891B2', '#67E8F9'], [
    lvl(elegir(shuffle([{ icono: '🐦', correcta: true }, { icono: '🐛', correcta: false }])), 'Ubicación en una cuadrícula', 'Toca el animal que vuela ARRIBA, en el cielo.'),
    lvl(elegir(shuffle([{ icono: '☁️', correcta: true }, { icono: '🌱', correcta: false }])), 'Encima y debajo', 'Toca lo que está ENCIMA (arriba).'),
  ]],
  ['Medidas', '📏', ['#16A34A', '#4ADE80'], [
    lvl(elegir(shuffle([{ icono: '🦒', correcta: true }, { icono: '🐭', correcta: false }])), 'Medir con objetos', 'Toca el animal MÁS ALTO.'),
    lvl(elegir(shuffle([{ icono: '🐍', correcta: true }, { icono: '🐛', correcta: false }])), 'Medir con una regla', 'Toca el animal MÁS LARGO.'),
    lvl(elegir(shuffle([{ icono: '🔥', correcta: true }, { icono: '❄️', correcta: false }])), 'Leer un termómetro', 'Toca lo que está CALIENTE.'),
    lvl(elegir(shuffle([{ icono: '🚂', correcta: true }, { icono: '🚗', correcta: false }])), 'Comparar longitudes', 'Toca el que es MÁS LARGO.'),
    lvl(elegir(shuffle([{ icono: '🌙', correcta: true }, { icono: '☀️', correcta: false }])), 'Relacionar unidades de tiempo', 'Toca lo que vemos de NOCHE.'),
  ]],
  ['Figuras de dos dimensiones', '🔺', ['#7C3AED', '#A78BFA'], [
    lvl(elegirDe('🔵', ['🟥', '🔺', '⭐']), 'Identificar figuras de dos dimensiones', 'Toca el CÍRCULO.'),
    lvl(elegirDe('🟥', ['🔵', '🔺', '🔶']), 'Comparar lados y esquinas', 'Toca el CUADRADO (tiene 4 esquinas).'),
    lvl(elegirDe('⭐', ['🔵', '🟥', '🔺']), 'Ordenar figuras en un diagrama de Venn', 'Toca la ESTRELLA.'),
  ]],
  ['Figuras tridimensionales', '🧊', ['#0EA5E9', '#38BDF8'], [
    lvl(elegirDe('🧊', ['⚽', '🍦', '🥫']), 'Identificar figuras tridimensionales', 'Toca el CUBO.'),
    lvl(elegirDe('⚽', ['🧊', '🍦', '🥫']), 'Figuras de objetos de la vida cotidiana', 'Toca lo que tiene forma de ESFERA (pelota).'),
    lvl(elegirDe('🍦', ['🧊', '⚽', '🥫']), 'Comparar aristas, esquinas y caras', 'Toca el CONO.'),
    lvl(elegirDe('🥫', ['🧊', '⚽', '🍦']), 'Identificar figuras de cuerpos sólidos', 'Toca el CILINDRO (como una lata).'),
    lvl(elegirDe('🧊', ['⚽', '🍦', '🥫']), 'Identificar las caras de figuras', 'Toca el cuerpo que tiene caras planas: el CUBO.'),
  ]],
];

// ───────────────────────── LECTOESCRITURA (20 semanas) ─────────────────────────
// Datos de fonemas: letra → [[emoji, palabra], ...] (palabra empieza por esa letra)
const FON = {
  A: [['🕷️', 'araña'], ['🐝', 'abeja'], ['🌳', 'árbol']],
  E: [['🐘', 'elefante'], ['⭐', 'estrella']],
  I: [['🧊', 'iglú'], ['🏝️', 'isla']],
  O: [['🐻', 'oso'], ['👁️', 'ojo'], ['🐑', 'oveja']],
  U: [['🍇', 'uvas'], ['🦄', 'unicornio']],
  M: [['🍎', 'manzana'], ['🖐️', 'mano'], ['🐵', 'mono']],
  P: [['🐶', 'perro'], ['🍐', 'pera'], ['🦆', 'pato']],
  S: [['☀️', 'sol'], ['🐍', 'serpiente'], ['🍉', 'sandía']],
  L: [['🌙', 'luna'], ['🦁', 'león'], ['🍋', 'limón']],
  T: [['🐢', 'tortuga'], ['🍅', 'tomate'], ['🚂', 'tren']],
  N: [['👃', 'nariz'], ['❄️', 'nieve']],
  D: [['🎲', 'dado'], ['🐬', 'delfín']],
  F: [['🔥', 'fuego'], ['🍓', 'fresa']],
  C: [['🏠', 'casa'], ['🥥', 'coco'], ['🚗', 'carro']],
  Q: [['🧀', 'queso']],
  B: [['🚢', 'barco'], ['👢', 'bota'], ['🍌', 'banana']],
  Rr: [['🐀', 'rata'], ['🌹', 'rosa'], ['🤖', 'robot']],
  J: [['🦒', 'jirafa'], ['🧃', 'jugo']],
  G: [['🐈', 'gato'], ['🎈', 'globo']],
  H: [['🍳', 'huevo'], ['🧊', 'hielo']],
};
const todasPalabras = Object.values(FON).flat().map((x) => x[0]);
function fonElegir(letra, instr) {
  const items = FON[letra] || [];
  const target = pick(items);
  const distract = shuffle(todasPalabras.filter((e) => !items.some((it) => it[0] === e))).slice(0, 2);
  return lvl(elegirDe(target[0], distract), `Sonido inicial: ${letra}`, instr);
}

const LECTO = [];
// Etapa 1 — Conciencia y preparación (semanas 1-4)
LECTO.push(['Semana 1: Sonidos a mi alrededor', '👂', ['#16A34A', '#4ADE80'], [
  lvl(elegirDe('🐄', ['🐶', '🐱', '🐔']), 'Onomatopeyas: la vaca', 'Escucha: MUUU. ¿Qué animal hace ese sonido? Toca la vaca.'),
  lvl(elegirDe('🐶', ['🐄', '🐸', '🐤']), 'Onomatopeyas: el perro', 'Escucha: GUAU GUAU. Toca el animal que hace ese sonido.'),
  lvl(elegirDe('🚂', ['🐦', '🌧️', '🔔']), 'La caja de los sonidos', 'Escucha: CHU CHU. Toca lo que hace ese sonido.'),
]]);
LECTO.push(['Semana 2: Sílabas y rimas', '🎵', ['#0EA5E9', '#38BDF8'], [
  lvl(elegir(shuffle([{ icono: '👞', correcta: true }, { icono: '🍌', correcta: false }, { icono: '🚗', correcta: false }])), 'Cesta de rimas: gato', 'GATO rima con za-PATO. Toca lo que rima con gato.'),
  lvl(elegir(shuffle([{ icono: '🐻', correcta: true }, { icono: '🌳', correcta: false }])), 'Palabras cortas y largas', 'OSO es una palabra CORTA. Toca el dibujo de la palabra corta.'),
  lvl(elegir(shuffle([{ icono: '🦋', correcta: true }, { icono: '☀️', correcta: false }])), 'Sílabas: palabra larga', 'MA-RI-PO-SA tiene muchas sílabas: es LARGA. Toca la palabra larga.'),
]]);
LECTO.push(['Semana 3: Mi mano dibuja', '✏️', ['#F59E0B', '#FCD34D'], [
  lvl(trazo('|', 'linea'), 'Trazos: líneas de arriba a abajo', 'Con tu dedo, traza la línea de arriba hacia abajo.'),
  lvl(trazo('—', 'linea'), 'Trazos: líneas acostadas', 'Traza la línea acostada, de un lado al otro.'),
  lvl(trazo('〰️', 'linea'), 'Trazos: líneas curvas', 'Traza la línea curva, como una olita.'),
]]);
LECTO.push(['Semana 4: Las vocales', '🅰️', ['#DC2626', '#F87171'],
  VOCALES.flatMap(([v, img, pal]) => ([
    lvl(trazo(v, 'letra'), `Traza la vocal ${v}`, `Esta es la ${v} de ${pal}. Traza la letra ${v} con tu dedo.`),
  ])).concat([
    fonElegir('A', 'Toca el dibujo que empieza con el sonido A, como araña.'),
    fonElegir('O', 'Toca el dibujo que empieza con el sonido O, como oso.'),
  ]),
]);

// Etapa 2 — Consonantes (semanas 5-12). letras por su SONIDO.
const SEMANAS_CONSO = [
  [5, 'Sonidos M y P', '🅼', ['M', 'P']],
  [6, 'Sonidos S y L', '🆂', ['S', 'L']],
  [7, 'Sonidos T y N', '🆃', ['T', 'N']],
  [8, 'Sonidos D y F', '🅳', ['D', 'F']],
  [9, 'Sonidos C, Q y B', '🅲', ['C', 'Q', 'B']],
  [10, 'Sonidos R y J', '🆁', ['Rr', 'J']],
  [11, 'Sonidos G y H', '🅶', ['G', 'H']],
  [12, 'Repaso de letras', '🔤', ['M', 'S', 'P', 'L']],
];
const NOMBRE_LETRA = { Rr: 'R' };
for (const [sem, nombre, icono, letras] of SEMANAS_CONSO) {
  const acts = [];
  for (const L of letras) {
    const nl = NOMBRE_LETRA[L] || L;
    acts.push(lvl(trazo(nl, 'letra'), `Traza la letra ${nl}`, `Esta letra suena "${nl.toLowerCase()}". Traza la letra ${nl} con tu dedo.`));
    acts.push(fonElegir(L, `Toca el dibujo que empieza con el sonido "${nl.toLowerCase()}".`));
  }
  LECTO.push([`Semana ${sem}: ${nombre}`, icono, ['#7C3AED', '#A78BFA'], acts.slice(0, 5)]);
}

// Etapa 3 — Fluidez (semanas 13-16)
LECTO.push(['Semana 13: Leo palabras', '📖', ['#0891B2', '#22D3EE'], [
  lvl(ordenar([{ icono: '🅼', orden: 1 }, { icono: '🅰️', orden: 2 }]), 'Formo la palabra MA', 'Toca las letras en orden para formar MA: primero la M, después la A.'),
  lvl(elegirDe('🐱', ['🐶', '🐮']), 'Leo y encuentro: gato', 'La palabra dice GATO. Toca el dibujo del gato.'),
  lvl(elegirDe('☀️', ['🌙', '⭐']), 'Leo y encuentro: sol', 'La palabra dice SOL. Toca el dibujo del sol.'),
]]);
LECTO.push(['Semana 14: Armo oraciones', '🧩', ['#DB2777', '#F472B6'], [
  lvl(ordenar([{ icono: '🐶', orden: 1 }, { icono: '🏃', orden: 2 }]), 'El perro corre', 'Arma la oración: primero EL PERRO, después CORRE.'),
  lvl(ordenar([{ icono: '🐱', orden: 1 }, { icono: '😴', orden: 2 }]), 'El gato duerme', 'Arma la oración: primero EL GATO, después DUERME.'),
]]);
LECTO.push(['Semana 15: Mayúsculas y puntos', '🔎', ['#16A34A', '#86EFAC'], [
  lvl(elegirDe('🅰️', ['🔵', '🔺']), 'Detective de mayúsculas', 'Las oraciones empiezan con letra grande. Toca la LETRA.'),
  lvl(elegir(shuffle([{ icono: '🟦 el gato', correcta: true }, { icono: '🟥 corre', correcta: false }])), 'El sujeto', 'Toca lo que dice DE QUIÉN hablamos (el sujeto).'),
]]);
LECTO.push(['Semana 16: Sigo instrucciones', '🎯', ['#F59E0B', '#FDE68A'], [
  lvl(elegirDe('✏️', ['📕', '✂️']), 'Lee y haz: el lápiz', 'La instrucción dice: toca el LÁPIZ.'),
  lvl(elegirDe('📕', ['✏️', '🍎']), 'Lee y haz: el libro', 'La instrucción dice: toca el LIBRO.'),
]]);

// Etapa 4 — Comprensión y expresión (semanas 17-20)
LECTO.push(['Semana 17: Personajes del cuento', '🧸', ['#7C3AED', '#C4B5FD'], [
  lvl(elegirDe('👧', ['🌳', '🏠']), 'El personaje principal', 'En el cuento, la niña juega. ¿Quién es el personaje? Toca la niña.'),
  lvl(elegirDe('🏠', ['👧', '🐶']), '¿Dónde está?', 'La niña está en su CASA. Toca el lugar.'),
]]);
LECTO.push(['Semana 18: Principio, medio y fin', '⏳', ['#0EA5E9', '#7DD3FC'], [
  lvl(ordenar([{ icono: '🥚', orden: 1 }, { icono: '🐣', orden: 2 }, { icono: '🐔', orden: 3 }]), 'Ordena la historia: el pollito', 'Ordena la historia: primero el huevo, luego el pollito, al final la gallina.'),
  lvl(ordenar([{ icono: '🌱', orden: 1 }, { icono: '🌿', orden: 2 }, { icono: '🌳', orden: 3 }]), 'Ordena la historia: la planta', 'Ordena: primero la semilla, luego la plantita, al final el árbol.'),
]]);
LECTO.push(['Semana 19: Escribo lo que veo', '🖍️', ['#DC2626', '#FCA5A5'], [
  lvl(elegirDe('🎡', ['🛒', '🛏️']), 'En el parque de diversiones', 'Mira el dibujo del parque. Toca la rueda de la fortuna.'),
  lvl(elegirDe('🐄', ['🐳', '🦒']), 'En la granja', 'Mira la granja. Toca el animal que vive en la granja: la vaca.'),
]]);
LECTO.push(['Semana 20: Mi librito de autor', '📚', ['#16A34A', '#4ADE80'], [
  lvl(trazo('A', 'letra'), 'Escribo mi inicial', 'Traza la primera letra de tu nombre con tu dedo.'),
  lvl(ordenar([{ icono: '1️⃣', orden: 1 }, { icono: '2️⃣', orden: 2 }, { icono: '3️⃣', orden: 3 }, { icono: '4️⃣', orden: 4 }]), 'Ordeno las páginas', 'Ordena las páginas de tu librito: 1, 2, 3, 4.'),
]]);

async function sembrarMateria(categoria, worlds) {
  for (let w = 0; w < worlds.length; w++) {
    const [nombre, icono, [c1, c2], skills] = worlds[w];
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
       RETURNING id`,
      [nombre, `Preescolar — ${nombre}`, w + 1, icono, c1, c2, categoria, skills.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 0; a < skills.length; a++) {
      const cfg = { ...skills[a], id: `${categoria}-m${w + 1}-n${a + 1}`, categoria };
      cfg.narracion = { intro: cfg.instruccion, url_audio_intro: null };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'exploradores', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, cfg.nombre, a + 1, cfg]
      );
    }
    console.log(`  ✓ ${categoria} M${w + 1} "${nombre}" (${skills.length} actividades)`);
  }
}

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  console.log('Matemática (preescolar):');
  await sembrarMateria('mate_preescolar', MATE);
  console.log('Lectoescritura (preescolar):');
  await sembrarMateria('lectoescritura', LECTO);
  const m = (await client.query("SELECT COUNT(*)::int c FROM niveles n JOIN mundos mu ON mu.id=n.mundo_id WHERE mu.categoria IN ('mate_preescolar','lectoescritura')")).rows[0].c;
  console.log(`\n✅ Preescolar sembrado: ${MATE.length + LECTO.length} mundos, ${m} actividades.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
