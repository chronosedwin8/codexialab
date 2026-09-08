// Crea un MUNDO ARCADE (bonus, numero_orden 11) por materia: juegos donde el héroe
// avanza superando obstáculos al responder preguntas y leyendo datos curiosos.
// Reutiliza preguntas tipo opción de cada materia + datos curiosos autorados.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const OBST = ['muro', 'pozo', 'enemigo', 'fuego', 'roca', 'cono'];

const NOMBRES = {
  programacion: '🎮 Arcade del Código', logica: '🎮 Arcade de la Lógica', informatica: '🎮 Arcade Informático',
  seguridad: '🎮 Arcade Ciberseguro', ia: '🎮 Arcade de la IA', aritmetica: '🎮 Arcade Numérico',
  geometria: '🎮 Arcade Geométrico', fisica: '🎮 Arcade de la Física',
};
const COLORES = { programacion: ['#6B46C1', '#A78BFA'], logica: ['#0EA5E9', '#22D3EE'], informatica: ['#0891B2', '#06B6D4'], seguridad: ['#DC2626', '#F87171'], ia: ['#7C3AED', '#C4B5FD'], aritmetica: ['#16A34A', '#4ADE80'], geometria: ['#F59E0B', '#FCD34D'], fisica: ['#DB2777', '#F472B6'] };

const FACTS = {
  programacion: ['Programar es darle instrucciones a la computadora, ¡paso a paso!', 'Un "bucle" repite acciones sin escribirlas muchas veces.', 'Una "condición" (si...) deja que el programa tome decisiones.', 'Las "variables" son cajitas con nombre que guardan información.', 'Una "función" es un grupo de pasos con nombre que puedes reutilizar.', 'Los algoritmos son recetas: una serie de pasos para lograr algo.', 'Hasta los videojuegos y las apps se hacen programando.', 'Cuando un programa falla, buscar el error se llama "depurar".'],
  logica: ['Tu cerebro reconoce un patrón en menos de un segundo.', 'La lógica te ayuda a tomar buenas decisiones cada día.', 'Los detectives resuelven misterios usando la lógica.', 'Ordenar de menor a mayor se llama hacer una secuencia.', 'Cuando algo se repite con orden, es un patrón.', 'Comparar (mayor, menor, igual) es un paso clave de las matemáticas.', 'Agrupar cosas parecidas se llama clasificar.', 'Una analogía conecta ideas: perro es a ladrar como gato es a maullar.'],
  informatica: ['La primera computadora pesaba ¡27 toneladas!', 'Un "bit" es la pieza más pequeña de información: 0 o 1.', '"Software" es la parte blanda (programas); "hardware", la parte física.', 'Internet conecta más de 5 mil millones de personas.', 'El primer mouse era de madera, ¡inventado en 1964!', 'Una contraseña fuerte mezcla letras, números y símbolos.', 'La "s" de "https" significa que la página es más segura.', 'Los emojis también son información digital.'],
  seguridad: ['Nunca compartas tu contraseña, ¡es como la llave de tu casa!', 'Si un mensaje te apura mucho, desconfía: puede ser una trampa.', 'Un antivirus protege tu computadora de programas dañinos.', 'Todo lo que publicas deja una "huella digital".', 'Si algo te incomoda en internet, avisa a un adulto.', 'Las ofertas "demasiado buenas" casi siempre son estafas.', 'Tratar a los demás con respeto evita el ciberacoso.', 'Un sitio seguro muestra un candado 🔒 en el navegador.'],
  ia: ['La Inteligencia Artificial aprende de ejemplos, ¡como tú!', 'Una "neurona artificial" se inspira en tu cerebro.', 'La IA está en recomendaciones, asistentes de voz y traductores.', 'La IA imita la inteligencia, pero no siente como las personas.', 'Para reconocer gatos, la IA necesita ver miles de fotos.', 'Usar la IA con respeto se llama "ética de la IA".', 'Una red neuronal son muchas neuronas trabajando juntas.', 'La IA puede equivocarse: siempre hay que verificar.'],
  aritmetica: ['El número cero fue un gran invento: ¡no siempre existió!', 'Multiplicar es sumar lo mismo muchas veces, más rápido.', '"Cálculo" viene de "piedrita": antes se contaba con piedras.', 'Un millón tiene seis ceros: 1.000.000.', 'El símbolo "+" se usa desde hace más de 500 años.', 'Las fracciones son trozos de un todo, como rebanadas de pizza 🍕.', 'El 50% es la mitad; el 100% es todo.', 'Los números negativos están a la izquierda del cero.'],
  geometria: ['El triángulo es la figura más fuerte: se usa en puentes.', 'El perímetro es la distancia alrededor de una figura.', 'El área se mide en unidades cuadradas; el volumen, en cúbicas.', 'Una pelota tiene forma de esfera: ¡no tiene esquinas!', 'Los panales de abejas son hexágonos perfectos.', 'Un cubo tiene 6 caras, 8 vértices y 12 aristas.', 'Un ángulo recto mide 90°, como la esquina de una hoja.', 'Las pirámides de Egipto tienen base cuadrada.'],
  fisica: ['La gravedad jala todo hacia el suelo: ¡por eso las cosas caen!', 'El sonido viaja por el aire en forma de vibraciones.', 'Sin luz no hay sombra: la sombra aparece cuando algo tapa la luz.', 'Un barco de metal flota gracias a su forma.', 'Los imanes atraen el hierro, pero no la madera ni el plástico.', 'El Sol nos da luz y calor: ¡es nuestra estrella!', 'Empujar y jalar son fuerzas de cada día.', 'El hielo es agua que se congeló por el frío.'],
};

// Preguntas autoradas para programación (sus niveles no tienen preguntas)
const PROG_Q = [
  ['¿Qué hace un bucle (repetir)?', 0, ['Repite acciones varias veces', 'Borra el código', 'Apaga el PC', 'Cambia el color']],
  ['Una condición "si..." sirve para...', 0, ['Tomar decisiones', 'Sumar siempre', 'Dibujar', 'Cantar']],
  ['Una variable es...', 0, ['Una cajita que guarda información', 'Un dibujo', 'Un sonido', 'Un cable']],
  ['Una función sirve para...', 0, ['Reutilizar un grupo de pasos', 'Borrar todo', 'Apagar', 'Comer']],
  ['Un algoritmo es...', 0, ['Una serie de pasos para resolver algo', 'Un color', 'Una canción', 'Un cable']],
  ['¿Qué comando mueve al héroe un paso adelante?', 0, ['avanzar()', 'borrar()', 'dormir()', 'comer()']],
  ['Para no repetir código muchas veces usas un...', 0, ['bucle', 'error', 'color', 'sonido']],
  ['Buscar y arreglar errores en un programa se llama...', 0, ['depurar', 'pintar', 'saltar', 'borrar']],
];

async function poolPreguntas(cat) {
  if (cat === 'programacion') return PROG_Q.map(([e, c, ops]) => ({ enunciado: e, opciones: ops, correcta: c, explicacion: 'Repasa el concepto. ¡Tú puedes!' }));
  const r = await client.query("SELECT config FROM niveles n JOIN mundos m ON n.mundo_id=m.id WHERE m.categoria=$1 AND (n.config->>'tipo')='quiz'", [cat]);
  const pool = [];
  for (const row of r.rows) for (const p of (row.config.preguntas || [])) {
    if ((p.tipo === 'opcion' || p.tipo === 'completar') && Array.isArray(p.opciones) && typeof p.correcta === 'number') {
      pool.push({ enunciado: p.enunciado.replace(/^¿/, '').slice(0, 110), opciones: p.opciones, correcta: p.correcta, explicacion: p.explicacion || '' });
    }
  }
  return pool;
}

function construirSegmentos(facts, pool, r, n = 6) {
  const segs = [];
  let fi = Math.floor(r() * facts.length), qi = Math.floor(r() * Math.max(1, pool.length));
  for (let k = 0; k < n; k++) {
    if (k % 2 === 0) { segs.push({ tipo: 'info', icono: '💡', titulo: '¿Sabías que...?', texto: facts[fi % facts.length] }); fi++; }
    else if (pool.length) { const p = pool[qi % pool.length]; qi++; segs.push({ tipo: 'reto', obstaculo: OBST[k % OBST.length], enunciado: p.enunciado, opciones: p.opciones, correcta: p.correcta, explicacion: p.explicacion }); }
  }
  return segs;
}

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const cat of Object.keys(NOMBRES)) {
    const pool = await poolPreguntas(cat);
    const facts = FACTS[cat];
    const [c1, c2] = COLORES[cat];
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,11,'🎮',$3,$4,$5,false,5)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, color_primario=EXCLUDED.color_primario, color_secundario=EXCLUDED.color_secundario, total_niveles=5 RETURNING id`,
      [NOMBRES[cat], `Juego arcade: supera obstáculos respondiendo y aprendiendo.`, c1, c2, cat]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 5; a++) {
      const segmentos = construirSegmentos(facts, pool, rng(cat.length * 1000 + a * 97 + 13), 6);
      const config = { version: 1, tipo: 'arcade', id: `arcade-${cat}-n${a}`, nombre: `${NOMBRES[cat]} — Partida ${a}`, categoria: cat,
        narracion: { intro: a === 1 ? '¡Bienvenido al modo Arcade! Avanza superando obstáculos: lee los datos curiosos y responde bien para saltar cada obstáculo. ¡Cuida tus vidas y llega a la meta!' : `Partida ${a}. ¡Corre, aprende y supera los obstáculos!`, url_audio_intro: null },
        vidas: 3, segmentos, recompensa: { monedas: 25, gemas: a === 5 ? 2 : 1 } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, `Partida ${a}`, a, config]);
    }
    console.log(`✓ ${NOMBRES[cat]} (${pool.length} preguntas en pool)`);
  }
  console.log('\n✅ Mundos Arcade creados: 8 materias × 5 partidas.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
