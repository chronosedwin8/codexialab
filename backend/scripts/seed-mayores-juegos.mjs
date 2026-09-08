// NIÑOS 7-12 — Juegos del "Sitio Miguel" integrados en las materias mayores de Codexia
// con el flujo quiz (LevelView + QuizActivity): fase "Aprende" (slides) + preguntas de
// varios tipos (opción, V/F, completar, ordenar, relacionar, agrupar).
// Audio 100% ElevenLabs vía banco /audio/quiz-bank/ (QuizActivity narra; LevelView narra
// la intro). Marca config.fuente='miguel' para que el generador de audio solo toque estos.
// Materias destino: aritmetica, informatica, logica, lenguaje (NUEVA), ciencias (NUEVA).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}
const bankUrl = (f) => `/audio/quiz-bank/${slugFrase(f)}.mp3`;

// Builders de pregunta
const op = (e, ops, c, x) => ({ tipo: 'opcion', enunciado: e, opciones: ops, correcta: c, explicacion: x });
const comp = (e, ops, c, x) => ({ tipo: 'completar', enunciado: e, opciones: ops, correcta: c, explicacion: x });
const vf = (e, r, x) => ({ tipo: 'vf', enunciado: e, respuesta: r, explicacion: x });
const ord = (e, items, x) => ({ tipo: 'ordenar', enunciado: e, items, explicacion: x });
const rel = (e, pares, x) => ({ tipo: 'relacionar', enunciado: e, pares, explicacion: x });
const agr = (e, grupos, x) => ({ tipo: 'agrupar', enunciado: e, grupos, explicacion: x });
const sl = (emoji, titulo, texto) => ({ emoji, titulo, texto });

const WORLDS = [
  // ───────────── ARITMÉTICA ─────────────
  {
    cat: 'aritmetica', nombre: 'Estadio de la Multiplicación', icono: '⚽', c1: '#16A34A', c2: '#4ADE80',
    intro: '¡Estadio de la Multiplicación! Anota goles respondiendo las tablas.',
    niveles: [
      {
        nombre: 'Tablas del 2 y del 3',
        contenido: [sl('🔢', '¿Qué es multiplicar?', 'Multiplicar es sumar el mismo número varias veces. Por ejemplo, 3 por 2 es 3 más 3.'), sl('⚽', 'La tabla del 2', 'Dos por uno es dos. Dos por dos es cuatro. Dos por tres es seis. Dos por cuatro es ocho.')],
        aplicacion: sl('🎯', 'A marcar goles', 'Responde la multiplicación correcta para anotar un gol.'),
        preguntas: [
          op('¿Cuánto es 2 por 3?', ['5', '6', '8', '4'], 1, 'Dos por tres es dos más dos más dos, igual a seis.'),
          op('¿Cuánto es 3 por 2?', ['6', '9', '5', '7'], 0, 'Tres por dos es seis.'),
          op('¿Cuánto es 2 por 5?', ['8', '12', '10', '7'], 2, 'Dos por cinco es diez.'),
          vf('Tres por tres es igual a nueve.', true, 'Sí, tres más tres más tres es nueve.'),
          op('¿Cuánto es 3 por 4?', ['12', '10', '7', '14'], 0, 'Tres por cuatro es doce.'),
        ],
      },
      {
        nombre: 'Tablas del 4 y del 5',
        contenido: [sl('🏆', 'La tabla del 5', 'Cinco por uno es cinco. Cinco por dos es diez. Cinco por tres es quince.'), sl('🥅', 'La tabla del 4', 'Cuatro por dos es ocho. Cuatro por tres es doce.')],
        aplicacion: sl('🎯', 'Penal decisivo', 'Una multiplicación más para ganar el partido.'),
        preguntas: [
          op('¿Cuánto es 5 por 2?', ['10', '7', '12', '15'], 0, 'Cinco por dos es diez.'),
          op('¿Cuánto es 4 por 3?', ['7', '12', '10', '9'], 1, 'Cuatro por tres es doce.'),
          op('¿Cuánto es 5 por 5?', ['10', '20', '25', '15'], 2, 'Cinco por cinco es veinticinco.'),
          vf('Cuatro por cuatro es dieciséis.', true, 'Sí, es dieciséis.'),
          op('¿Cuánto es 5 por 4?', ['20', '15', '25', '9'], 0, 'Cinco por cuatro es veinte.'),
        ],
      },
    ],
  },
  {
    cat: 'aritmetica', nombre: 'Torre de la División', icono: '➗', c1: '#0EA5E9', c2: '#7DD3FC',
    intro: '¡Torre de la División! Reparte en partes iguales para subir la torre.',
    niveles: [{
      nombre: 'Repartir en partes iguales',
      contenido: [sl('➗', '¿Qué es dividir?', 'Dividir es repartir en partes iguales. Si tienes seis galletas y dos amigos, le tocan tres a cada uno.'), sl('🍪', 'Reparte parejo', 'Diez dulces entre cinco niños son dos para cada uno.')],
      aplicacion: sl('🎯', 'Sube la torre', 'Reparte bien para subir un piso.'),
      preguntas: [
        op('Si repartes 6 galletas entre 2 niños, ¿cuántas le tocan a cada uno?', ['2', '3', '4', '6'], 1, 'Seis dividido dos es tres.'),
        op('¿Cuánto es 10 dividido 5?', ['5', '2', '3', '15'], 1, 'Diez dividido cinco es dos.'),
        vf('Ocho dividido dos es igual a cuatro.', true, 'Sí, es cuatro.'),
        op('¿Cuánto es 12 dividido 3?', ['3', '4', '5', '6'], 1, 'Doce dividido tres es cuatro.'),
        op('¿Cuánto es 9 dividido 3?', ['2', '3', '4', '6'], 1, 'Nueve dividido tres es tres.'),
      ],
    }],
  },
  {
    cat: 'aritmetica', nombre: 'Reloj del Tiempo', icono: '⏰', c1: '#F59E0B', c2: '#FCD34D',
    intro: '¡Reloj del Tiempo! Aprende a leer las horas y el día.',
    niveles: [{
      nombre: 'Las horas del día',
      contenido: [sl('🕒', 'El reloj', 'El reloj tiene una aguja grande y una pequeña. La pequeña marca la hora.'), sl('🌞', 'Las partes del día', 'El día tiene mañana, tarde y noche.')],
      aplicacion: sl('🎯', '¿Qué hora es?', 'Lee el reloj y elige la hora correcta.'),
      preguntas: [
        op('La aguja pequeña está en el 3 y la grande en el 12. ¿Qué hora es?', ['3:00', '3:30', '12:00', '6:00'], 0, 'Son las tres en punto.'),
        vf('Un día completo tiene veinticuatro horas.', true, 'Sí, veinticuatro horas.'),
        ord('Ordena los momentos del día:', ['Mañana', 'Tarde', 'Noche'], 'Primero la mañana, luego la tarde y al final la noche.'),
        op('¿Cuántos minutos tiene una hora?', ['30', '60', '100', '24'], 1, 'Una hora tiene sesenta minutos.'),
        rel('Relaciona la comida con su momento:', [['Desayuno', 'Mañana'], ['Almuerzo', 'Tarde'], ['Cena', 'Noche']], 'Cada comida tiene su momento.'),
      ],
    }],
  },
  {
    cat: 'aritmetica', nombre: 'Mercado de Monedas', icono: '🛒', c1: '#7C3AED', c2: '#C4B5FD',
    intro: '¡Mercado de Monedas! Cuenta el dinero y calcula el vuelto.',
    niveles: [{
      nombre: 'Contar dinero y dar el vuelto',
      contenido: [sl('🪙', 'Las monedas', 'Sumamos las monedas para saber cuánto dinero tenemos.'), sl('💵', 'El vuelto', 'El vuelto es lo que te devuelven: lo que pagas menos lo que cuesta.')],
      aplicacion: sl('🎯', 'En la tienda', 'Calcula cuánto pagas o cuánto te devuelven.'),
      preguntas: [
        op('Tienes una moneda de 500 y una de 200. ¿Cuánto tienes?', ['700', '500', '200', '900'], 0, 'Quinientos más doscientos es setecientos.'),
        op('Un dulce cuesta 300 y pagas con 500. ¿Cuánto te devuelven?', ['100', '200', '300', '500'], 1, 'Quinientos menos trescientos es doscientos.'),
        vf('Dos monedas de 500 son 1000.', true, 'Sí, mil pesos.'),
        op('¿Cuánto es 100 más 100 más 100?', ['200', '300', '400', '100'], 1, 'Son trescientos.'),
        op('Pagas un jugo de 800 con un billete de 1000. ¿Cuál es el vuelto?', ['100', '200', '300', '800'], 1, 'Mil menos ochocientos es doscientos.'),
      ],
    }],
  },
  // ───────────── INFORMÁTICA ─────────────
  {
    cat: 'informatica', nombre: 'La Neo-Computadora', icono: '💻', c1: '#0891B2', c2: '#22D3EE',
    intro: '¡La Neo-Computadora! Conoce las partes del computador y cuídate en internet.',
    niveles: [{
      nombre: 'Partes del computador y seguridad',
      contenido: [sl('💻', 'Las partes', 'El computador tiene pantalla, teclado y mouse. Cada uno sirve para algo.'), sl('🔒', 'Seguridad', 'Nunca compartas tu contraseña con extraños. Pide ayuda a un adulto.')],
      aplicacion: sl('🎯', 'Eres experto', 'Demuestra lo que sabes del computador.'),
      preguntas: [
        op('¿Con qué escribimos en el computador?', ['El teclado', 'El mouse', 'La pantalla', 'La impresora'], 0, 'Con el teclado.'),
        rel('Relaciona la parte con su uso:', [['Teclado', 'Escribir'], ['Mouse', 'Señalar'], ['Pantalla', 'Ver']], 'Cada parte tiene su función.'),
        vf('Debemos compartir nuestra contraseña con desconocidos.', false, 'Nunca compartas tu contraseña.'),
        op('¿Para qué sirve el mouse?', ['Mover el puntero', 'Sonar música', 'Imprimir hojas', 'Dar electricidad'], 0, 'Mueve el puntero en la pantalla.'),
        agr('Clasifica las partes:', { 'Se ve': ['Pantalla', 'Teclado'], 'Se escucha': ['Parlante', 'Audífonos'] }, 'Unas se ven y otras se escuchan.'),
      ],
    }],
  },
  {
    cat: 'informatica', nombre: 'Carrera de Palabras', icono: '⌨️', c1: '#DC2626', c2: '#FCA5A5',
    intro: '¡Carrera de Palabras! Conoce el teclado y escribe rapidísimo.',
    niveles: [{
      nombre: 'Conoce el teclado',
      contenido: [sl('⌨️', 'El teclado', 'El teclado tiene letras, números y teclas especiales. Escribimos con las dos manos.'), sl('✋', 'Teclas especiales', 'La barra espaciadora separa palabras y Enter baja de línea.')],
      aplicacion: sl('🎯', 'A teclear', 'Responde sobre el teclado para ganar la carrera.'),
      preguntas: [
        op('¿Dónde está la barra espaciadora?', ['Abajo, es la más larga', 'Arriba a la izquierda', 'A la derecha', 'No existe'], 0, 'Está abajo y es la tecla más larga.'),
        op('¿Qué tecla borra una letra?', ['Borrar (Backspace)', 'Enter', 'Mayús', 'Espacio'], 0, 'La tecla Borrar o Backspace.'),
        vf('Para escribir bien usamos las dos manos.', true, 'Sí, con los diez dedos.'),
        op('¿Qué tecla baja a una línea nueva?', ['Enter', 'Espacio', 'Tab', 'Escape'], 0, 'La tecla Enter.'),
        ord('Ordena las teclas para escribir la palabra "sol":', ['s', 'o', 'l'], 'Primero la s, luego la o y al final la l.'),
      ],
    }],
  },
  // ───────────── LÓGICA ─────────────
  {
    cat: 'logica', nombre: 'Ruleta de la Fortuna', icono: '🎡', c1: '#9333EA', c2: '#D8B4FE',
    intro: '¡Ruleta de la Fortuna! Gira y responde trivias divertidas.',
    niveles: [{
      nombre: 'Trivia divertida',
      contenido: [sl('🎡', 'La ruleta', 'Gira la ruleta y responde preguntas de todo tipo. ¡A pensar!'), sl('🧠', 'Usa tu cabeza', 'Lee con calma y elige la mejor respuesta.')],
      aplicacion: sl('🎯', 'Gana premios', 'Cada respuesta correcta te da puntos.'),
      preguntas: [
        op('¿Cuántas patas tiene una araña?', ['6', '8', '4', '10'], 1, 'La araña tiene ocho patas.'),
        op('¿De qué color es el cielo en un día soleado?', ['Azul', 'Verde', 'Rojo', 'Negro'], 0, 'El cielo se ve azul.'),
        vf('Los peces viven en el agua.', true, 'Sí, viven en el agua.'),
        op('¿Cuántos días tiene una semana?', ['5', '6', '7', '10'], 2, 'La semana tiene siete días.'),
        op('¿Qué animal dice "muu"?', ['La vaca', 'El perro', 'El gato', 'El pato'], 0, 'La vaca dice muu.'),
      ],
    }],
  },
  // ───────────── LENGUAJE (NUEVA) ─────────────
  {
    cat: 'lenguaje', nombre: 'Mar de la Ortografía', icono: '🌊', c1: '#0D9488', c2: '#5EEAD4',
    intro: '¡Mar de la Ortografía! Pesca las palabras bien escritas.',
    niveles: [{
      nombre: 'Letras y acentos',
      contenido: [sl('✍️', 'La tilde', 'Algunas palabras llevan tilde, una rayita sobre una vocal, como en árbol.'), sl('🔤', 'La b y la v', 'Hay palabras con b y palabras con v. Hay que aprenderlas.')],
      aplicacion: sl('🎯', 'Buena letra', 'Elige siempre la palabra bien escrita.'),
      preguntas: [
        op('¿Cuál palabra lleva tilde?', ['árbol', 'arbol', 'arboles', 'arbolito'], 0, 'Árbol lleva tilde en la a.'),
        op('¿Cuál palabra está bien escrita?', ['vaca', 'baca', 'váca', 'baka'], 0, 'Vaca se escribe con v.'),
        vf('La palabra "casa" se escribe con c.', true, 'Sí, casa con c.'),
        comp('Completa: la _asa donde vivo. ¿Qué letra falta?', ['c', 's', 'z', 'k'], 0, 'Casa con c.'),
        op('¿Cuál palabra está bien escrita?', ['feliz', 'felis', 'felíz', 'felizz'], 0, 'Feliz termina en z.'),
      ],
    }],
  },
  // ───────────── CIENCIAS (NUEVA) ─────────────
  {
    cat: 'ciencias', nombre: 'Laboratorio de Ciencias', icono: '🧪', c1: '#16A34A', c2: '#86EFAC',
    intro: '¡Laboratorio de Ciencias! Descubre los seres vivos y la naturaleza.',
    niveles: [{
      nombre: 'Los seres vivos',
      contenido: [sl('🌱', 'Seres vivos', 'Los animales y las plantas son seres vivos: nacen, crecen y necesitan cuidados.'), sl('💧', 'Qué necesitan', 'Las plantas necesitan agua, sol y tierra para crecer.')],
      aplicacion: sl('🎯', 'Pequeño científico', 'Clasifica y responde como un científico.'),
      preguntas: [
        agr('Clasifica los animales:', { 'Vuela': ['Pájaro', 'Mariposa'], 'Nada': ['Pez', 'Delfín'] }, 'Unos vuelan y otros nadan.'),
        op('¿Qué necesitan las plantas para vivir?', ['Agua y sol', 'Solo piedras', 'Nada', 'Chocolate'], 0, 'Agua, sol y tierra.'),
        vf('Los peces respiran bajo el agua.', true, 'Sí, respiran con branquias.'),
        agr('Clasifica:', { 'Animal': ['Perro', 'Gato'], 'Planta': ['Árbol', 'Flor'] }, 'Animales y plantas son seres vivos.'),
        op('¿Cuál de estos es un mamífero?', ['El perro', 'El pez', 'La rana', 'El pájaro'], 0, 'El perro es un mamífero.'),
      ],
    }],
  },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  const ordenPorCat = {};
  let totalNiv = 0;
  for (const w of WORLDS) {
    if (ordenPorCat[w.cat] === undefined) {
      ordenPorCat[w.cat] = (await client.query('SELECT COALESCE(MAX(numero_orden),0)::int m FROM mundos WHERE categoria=$1', [w.cat])).rows[0].m;
    }
    const orden = ++ordenPorCat[w.cat];
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=EXCLUDED.total_niveles, bloqueado=false
       RETURNING id`,
      [w.nombre, `${w.nombre} (Sitio Miguel)`, orden, w.icono, w.c1, w.c2, w.cat, w.niveles.length]
    );
    const mundoId = res.rows[0].id;
    for (let a = 0; a < w.niveles.length; a++) {
      const n = w.niveles[a];
      const cfg = {
        version: 1, tipo: 'quiz', categoria: w.cat, fuente: 'miguel',
        id: `${w.cat}-miguel-${orden}-${a + 1}`, nombre: n.nombre,
        contenido: n.contenido, aplicacion: n.aplicacion, preguntas: n.preguntas,
        narracion: { intro: w.intro, url_audio_intro: bankUrl(w.intro) },
        recompensa: { monedas: 10, gemas: 1 },
      };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, n.nombre, a + 1, cfg]
      );
      totalNiv++;
    }
    console.log(`  ✓ [${w.cat}] ${w.nombre} (${w.niveles.length} niveles)`);
  }
  console.log(`\n✅ Juegos 7-12: ${WORLDS.length} mundos, ${totalNiv} niveles en ${[...new Set(WORLDS.map((w) => w.cat))].join(', ')}.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
