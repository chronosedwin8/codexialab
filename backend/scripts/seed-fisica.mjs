// Materia "Física Básica para Niños": 10 mundos × 10 actividades, enfocada en situaciones cotidianas.
// Bancos autorados de tipos mixtos (opción, V/F, completar, ordenar, relacionar, agrupar).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// Entrada de banco: tupla [q, correcta, [dist], exp] => opción; objeto => tipada
function build(r, entry) {
  if (Array.isArray(entry)) { const opts = shuffle(r, [entry[1], ...entry[2]]).slice(0, 4); if (!opts.includes(entry[1])) opts[0] = entry[1]; return { tipo: 'opcion', enunciado: entry[0], opciones: opts.map(String), correcta: opts.indexOf(entry[1]), explicacion: entry[3] }; }
  return entry;
}
const vf = (e, r, x) => ({ tipo: 'vf', enunciado: `¿Verdadero o Falso? "${e}"`, respuesta: r, explicacion: x });
const comp = (e, opciones, correcta, x) => ({ tipo: 'completar', enunciado: e, opciones, correcta, explicacion: x });
const ord = (e, items, x) => ({ tipo: 'ordenar', enunciado: e, items, explicacion: x });
const rel = (e, pares, x) => ({ tipo: 'relacionar', enunciado: e, pares, explicacion: x });
const agr = (e, grupos, x) => ({ tipo: 'agrupar', enunciado: e, grupos, explicacion: x });

const MUNDOS = [
  { orden: 1, nombre: 'Empujar y Jalar (Fuerzas)', icono: '💪', banda: 'exploradores', intro: '¡Bienvenido a Física! Soy Astro. Empujar y jalar son fuerzas que usamos todos los días. ¡Descubrámoslas!', banco: [
    ['Para abrir hacia ti una puerta, la...', 'jalas', ['empujas', 'soplas', 'pintas'], 'Jalar es traer hacia ti.'],
    ['Empujar un carrito de compras es aplicar una...', 'fuerza', ['luz', 'sombra', 'canción'], 'Empujar y jalar son fuerzas.'],
    vf('Para mover algo que está quieto necesitas una fuerza.', true, 'Sí, una fuerza lo pone en movimiento.'),
    agr('Clasifica la acción', { Empujar: ['Patear un balón', 'Empujar una caja'], Jalar: ['Halar una cuerda', 'Abrir un cajón'] }, 'Empujar aleja; jalar acerca.'),
    ['Si pateas MÁS fuerte un balón, irá...', 'más lejos', ['más cerca', 'igual', 'hacia atrás'], 'Más fuerza, más movimiento.'],
    vf('Una fuerza puede cambiar la forma de la plastilina al aplastarla.', true, 'Sí, las fuerzas deforman objetos.'),
    rel('Relaciona la acción con su fuerza', [['Abrir un cajón', 'Jalar'], ['Cerrar una puerta', 'Empujar'], ['Levantar una caja', 'Hacia arriba']], 'Cada acción usa una fuerza.'),
    comp('Empujar y jalar son ejemplos de una ___.', ['fuerza', 'luz', 'sombra'], 0, 'Son fuerzas.'),
    ['Cuesta MÁS fuerza mover algo...', 'pesado', ['liviano', 'pequeño', 'colorido'], 'Lo pesado necesita más fuerza.'],
    vf('Una pelota quieta empieza a moverse sola, sin que nadie la toque.', false, 'No, necesita una fuerza.'),
    ['Frenar una bicicleta usa una fuerza para...', 'detenerla', ['acelerarla', 'pintarla', 'agrandarla'], 'El freno la detiene.'],
    ['En el juego de la cuerda, los dos equipos...', 'jalan', ['empujan', 'soplan', 'saltan'], 'Ambos jalan la cuerda.'],
  ] },
  { orden: 2, nombre: 'Moverse y Detenerse', icono: '🏃', banda: 'exploradores', intro: 'Las cosas se mueven y se detienen. ¡Hablemos de velocidad: qué tan rápido va algo!', banco: [
    ['Un auto que va muy rápido tiene mucha...', 'velocidad', ['sombra', 'sed', 'luz'], 'La velocidad es qué tan rápido se mueve.'],
    vf('Algo que no se mueve está en reposo.', true, 'Reposo = quieto.'),
    ['¿Qué se mueve normalmente MÁS rápido?', 'Un avión', ['Una tortuga', 'Un caracol', 'Una persona caminando'], 'El avión es el más veloz.'],
    agr('Clasifica por rapidez', { 'Rápido': ['Avión', 'Auto de carreras'], 'Lento': ['Tortuga', 'Caracol'] }, 'Unos van rápido, otros lento.'),
    vf('Un objeto en movimiento puede detenerse si algo lo frena.', true, 'Una fuerza de freno lo detiene.'),
    comp('Lo contrario de moverse es estar en ___.', ['reposo', 'color', 'sonido'], 0, 'Reposo = quieto.'),
    ord('Ordena del MÁS LENTO al MÁS RÁPIDO', ['Caracol', 'Persona caminando', 'Bicicleta', 'Auto'], 'De lento a rápido.'),
    rel('Relaciona', [['Avión', 'Muy rápido'], ['Tortuga', 'Muy lento'], ['Bicicleta', 'Velocidad media']], 'Cada uno con su rapidez.'),
    ['Para que un patín empiece a moverse, necesita una...', 'fuerza', ['sombra', 'foto', 'canción'], 'Una fuerza lo mueve.'],
    vf('Cuanto más empujas algo, más rápido se mueve.', true, 'Más fuerza, más rapidez.'),
    ['Una pelota rueda cuesta abajo empujada por la...', 'gravedad', ['luz', 'música', 'sombra'], 'La gravedad la jala hacia abajo.'],
    ['Si caminas y luego corres, aumentas tu...', 'velocidad', ['peso', 'sombra', 'color'], 'Correr es ir más rápido.'],
  ] },
  { orden: 3, nombre: 'La Gravedad', icono: '🍎', banda: 'exploradores', intro: 'La gravedad es la fuerza que jala todo hacia abajo. ¡Por eso las cosas caen al suelo!', banco: [
    ['Si sueltas una pelota, cae hacia...', 'abajo', ['arriba', 'un lado', 'el techo'], 'La gravedad jala hacia abajo.'],
    vf('La gravedad nos mantiene pegados al suelo.', true, 'Por eso no flotamos.'),
    ['¿Qué hace caer una manzana del árbol?', 'La gravedad', ['La luz', 'El sonido', 'El color'], 'La gravedad la jala al suelo.'],
    vf('En el espacio, sin gravedad, las cosas flotan.', true, 'Como los astronautas.'),
    ['Los astronautas flotan porque en el espacio hay muy poca...', 'gravedad', ['comida', 'luz', 'agua'], 'Casi no hay gravedad.'],
    comp('La gravedad jala las cosas hacia ___.', ['abajo', 'arriba', 'los lados'], 0, 'Hacia abajo (el suelo).'),
    ['Cuando saltas, vuelves al suelo por la...', 'gravedad', ['suerte', 'magia', 'música'], 'La gravedad te trae de vuelta.'],
    vf('Una pluma y una piedra caen igual de rápido en el aire.', false, 'No, el aire frena más a la pluma.'),
    agr('¿Cae rápido o flota un rato en el aire?', { 'Cae rápido': ['Piedra', 'Pelota'], 'Flota un rato': ['Pluma', 'Globo con helio'] }, 'El aire afecta a los livianos.'),
    ['El agua de una cascada cae por la...', 'gravedad', ['electricidad', 'luz', 'sombra'], 'La gravedad la jala hacia abajo.'],
    vf('La gravedad solo existe en la Tierra.', false, 'La Luna y otros planetas también tienen gravedad.'),
    rel('Relaciona con la gravedad', [['Manzana que cae', 'Gravedad'], ['Astronauta flotando', 'Poca gravedad'], ['Saltar y bajar', 'Gravedad']], 'Todo cae por la gravedad.'),
  ] },
  { orden: 4, nombre: 'Pesado y Liviano', icono: '⚖️', banda: 'exploradores', intro: 'Algunas cosas son pesadas y otras livianas. ¡Aprende a compararlas y a medir el peso!', banco: [
    ['¿Qué es MÁS pesado?', 'Un elefante', ['Una pluma', 'Una hoja', 'Un globo'], 'El elefante pesa muchísimo.'],
    agr('Clasifica por peso', { Pesado: ['Refrigerador', 'Carro', 'Roca grande'], Liviano: ['Pluma', 'Globo', 'Hoja'] }, 'Unos pesan mucho, otros poco.'),
    vf('Una roca es más pesada que una pluma.', true, 'Claramente sí.'),
    ['Para medir el peso usamos una...', 'balanza', ['regla', 'linterna', 'lupa'], 'La balanza mide el peso.'],
    rel('Relaciona con su peso', [['Elefante', 'Muy pesado'], ['Pluma', 'Muy liviano'], ['Perro', 'Peso medio']], 'Cada cosa con su peso.'),
    comp('El peso se mide con una ___.', ['balanza', 'regla', 'vela'], 0, 'La balanza.'),
    ['Cuesta más cargar algo...', 'pesado', ['liviano', 'colorido', 'pequeño'], 'Lo pesado requiere más esfuerzo.'],
    vf('Un camión es más liviano que una bicicleta.', false, 'No, el camión es mucho más pesado.'),
    ord('Ordena del MÁS LIVIANO al MÁS PESADO', ['Pluma', 'Manzana', 'Perro', 'Elefante'], 'De liviano a pesado.'),
    ['Un globo con helio es muy...', 'liviano', ['pesado', 'duro', 'caliente'], 'Por eso sube y flota.'],
    vf('Dos cajas del mismo tamaño siempre pesan igual.', false, 'Depende de lo que tengan dentro.'),
    ['¿Qué pesa más, un kilo de piedras o un gramo de plumas?', 'Un kilo de piedras', ['Un gramo de plumas', 'Pesan igual', 'Ninguno pesa'], 'Un kilo es mucho más que un gramo.'],
  ] },
  { orden: 5, nombre: 'Luz y Sombra', icono: '🔦', banda: 'aventureros', intro: 'La luz nos deja ver, y cuando algo la bloquea, ¡aparece una sombra! Exploremos la luz.', banco: [
    ['La principal fuente de luz natural es el...', 'Sol', ['agua', 'viento', 'suelo'], 'El Sol nos da luz de día.'],
    vf('Sin luz no podemos ver.', true, 'La luz nos permite ver.'),
    ['Una sombra se forma cuando un objeto bloquea la...', 'luz', ['música', 'el agua', 'el viento'], 'La sombra es donde no llega la luz.'],
    agr('¿Da luz o no?', { 'Da luz': ['Sol', 'Lámpara', 'Vela'], 'No da luz': ['Piedra', 'Mesa', 'Zapato'] }, 'Solo algunas cosas iluminan.'),
    comp('Una ___ se forma cuando algo bloquea la luz.', ['sombra', 'canción', 'fuerza'], 0, 'La sombra.'),
    ['De día, ¿quién ilumina la calle?', 'El Sol', ['La Luna', 'Una vela', 'La sombra'], 'El Sol ilumina de día.'],
    vf('La Luna tiene luz propia muy brillante.', false, 'La Luna refleja la luz del Sol.'),
    rel('Relaciona', [['Sol', 'Luz de día'], ['Lámpara', 'Luz en casa'], ['Sombra', 'Falta de luz']], 'Luz y sombra.'),
    ['Si pones la mano frente a una linterna, aparece una...', 'sombra', ['canción', 'pelota', 'fuerza'], 'Tu mano bloquea la luz.'],
    vf('El vidrio transparente deja pasar la luz.', true, 'Por eso ves a través de él.'),
    ['Tu sombra es más larga cuando el Sol está...', 'bajo (mañana o tarde)', ['justo arriba', 'de noche', 'apagado'], 'Con el Sol bajo, la sombra se alarga.'],
    vf('Una sombra necesita luz para existir.', true, 'Sin luz no hay sombra.'),
  ] },
  { orden: 6, nombre: 'El Sonido', icono: '🔊', banda: 'aventureros', intro: 'El sonido nace de las vibraciones y lo oímos con los oídos. ¡Escuchemos cómo funciona!', banco: [
    ['El sonido se produce cuando algo...', 'vibra', ['brilla', 'flota', 'se enfría'], 'Las vibraciones crean sonido.'],
    vf('Sin nada que vibre, no hay sonido.', true, 'El sonido viene de vibraciones.'),
    ['Un sonido muy fuerte tiene mucho...', 'volumen', ['color', 'peso', 'sabor'], 'El volumen es qué tan fuerte suena.'],
    agr('Clasifica el sonido', { Fuerte: ['Trueno', 'Avión despegando'], Suave: ['Susurro', 'Hojas moviéndose'] }, 'Unos suenan fuerte, otros suave.'),
    vf('Oímos los sonidos con los oídos.', true, 'Sí, con los oídos.'),
    comp('El sonido se produce cuando un objeto ___.', ['vibra', 'brilla', 'flota'], 0, 'Vibra.'),
    ['¿Cuál suena MÁS fuerte?', 'Un trueno', ['Un susurro', 'Una pluma cayendo', 'El silencio'], 'El trueno es muy fuerte.'],
    rel('Relaciona', [['Trueno', 'Muy fuerte'], ['Susurro', 'Muy suave'], ['Tambor', 'Vibra y suena']], 'Cada sonido es distinto.'),
    vf('En el espacio vacío no hay sonido porque no hay aire.', true, 'El sonido necesita un medio.'),
    ['Tocar un tambor produce sonido porque su superficie...', 'vibra', ['se moja', 'se enfría', 'brilla'], 'La membrana vibra.'],
    ['Si te alejas de una bocina, el sonido se oye más...', 'bajo', ['fuerte', 'colorido', 'pesado'], 'Más lejos, más débil.'],
    vf('Todos los sonidos son exactamente iguales.', false, 'Hay agudos, graves, fuertes y suaves.'),
  ] },
  { orden: 7, nombre: 'Calor y Frío', icono: '🌡️', banda: 'aventureros', intro: 'El calor y el frío están en todas partes. ¡Aprende a medir la temperatura y qué pasa con el calor!', banco: [
    ['Para medir la temperatura usamos un...', 'termómetro', ['regla', 'reloj', 'balanza'], 'El termómetro mide temperatura.'],
    vf('El hielo está frío.', true, 'El hielo es frío.'),
    ['El Sol nos da luz y...', 'calor', ['frío', 'sonido', 'sombra'], 'El Sol también calienta.'],
    agr('Clasifica', { Caliente: ['Sopa hirviendo', 'Fuego', 'Café caliente'], Frío: ['Hielo', 'Helado', 'Nieve'] }, 'Unas cosas calientan, otras enfrían.'),
    vf('El agua se vuelve hielo cuando hace mucho frío.', true, 'Al congelarse forma hielo.'),
    comp('La temperatura se mide con un ___.', ['termómetro', 'regla', 'imán'], 0, 'Termómetro.'),
    ['Si dejas un helado al Sol, se...', 'derrite', ['congela', 'endurece', 'agranda'], 'El calor lo derrite.'],
    vf('El fuego es frío.', false, 'El fuego es muy caliente.'),
    rel('Relaciona', [['Hielo', 'Frío'], ['Fuego', 'Caliente'], ['Termómetro', 'Mide temperatura']], 'Calor y frío.'),
    ['En invierno hace ___ que en verano.', 'más frío', ['más calor', 'igual', 'siempre sol'], 'El invierno es más frío.'],
    vf('El agua hirviendo está caliente.', true, 'Está muy caliente.'),
    ['Para calentar la comida usamos el calor de la...', 'estufa', ['nevera', 'linterna', 'regla'], 'La estufa da calor.'],
  ] },
  { orden: 8, nombre: 'Flota o se Hunde', icono: '🛟', banda: 'aventureros', intro: '¿Por qué un barco flota y una piedra se hunde? ¡Descubramos qué flota en el agua!', banco: [
    ['Una piedra en el agua normalmente se...', 'hunde', ['flota', 'vuela', 'derrite'], 'La piedra es densa y se hunde.'],
    vf('Un barco grande de metal puede flotar.', true, 'Por su forma flota.'),
    agr('¿Flota o se hunde en el agua?', { Flota: ['Corcho', 'Pelota', 'Hoja'], 'Se hunde': ['Piedra', 'Moneda', 'Clavo'] }, 'Unos flotan, otros se hunden.'),
    ['¿Qué flota en el agua?', 'Un corcho', ['Una piedra', 'Un clavo', 'Una moneda'], 'El corcho flota.'],
    vf('Todas las cosas se hunden en el agua.', false, 'Algunas flotan.'),
    comp('Un ___ flota en el agua.', ['corcho', 'clavo', 'piedra'], 0, 'El corcho flota.'),
    ['Un patito de hule en la tina...', 'flota', ['se hunde', 'desaparece', 'se quema'], 'Flota por ser ligero y hueco.'],
    rel('Relaciona', [['Piedra', 'Se hunde'], ['Corcho', 'Flota'], ['Barco', 'Flota']], 'Flotar o hundirse.'),
    vf('Una moneda flota fácilmente en el agua.', false, 'La moneda se hunde.'),
    ['Saber nadar te ayuda a ___ en el agua.', 'flotar', ['hundirte', 'volar', 'correr'], 'Nadar te mantiene a flote.'],
    ['¿Qué se hunde?', 'Una llave de metal', ['Una hoja', 'Un globo', 'Un corcho'], 'El metal se hunde.'],
    vf('La forma de un objeto puede ayudarlo a flotar, como un barco.', true, 'La forma importa.'),
  ] },
  { orden: 9, nombre: 'Imanes y Electricidad', icono: '🧲', banda: 'heroes', intro: 'Los imanes atraen metales y la electricidad enciende las cosas. ¡Pero ojo: la electricidad se respeta!', banco: [
    ['Un imán atrae objetos de...', 'metal (hierro)', ['madera', 'plástico', 'papel'], 'Los imanes atraen hierro.'],
    vf('Un imán se pega en la nevera de metal.', true, 'Por el metal.'),
    agr('¿El imán lo atrae?', { 'Sí (metal)': ['Clavo', 'Llave', 'Tijera'], No: ['Madera', 'Plástico', 'Papel'] }, 'Solo atrae metales como el hierro.'),
    ['¿Qué NO atrae un imán?', 'Un vaso de plástico', ['Un clavo', 'Una llave', 'Una moneda de metal'], 'El plástico no es atraído.'],
    vf('Jugar con los enchufes de electricidad es peligroso.', true, 'Nunca metas cosas en los enchufes.'),
    comp('Un imán atrae objetos de ___.', ['metal', 'madera', 'tela'], 0, 'Metal (hierro).'),
    ['Para encender una lámpara necesitas...', 'electricidad', ['un imán', 'agua', 'viento'], 'La electricidad la enciende.'],
    vf('Debes tocar cables pelados con las manos mojadas.', false, '¡Nunca! Es muy peligroso.'),
    rel('Relaciona', [['Imán', 'Atrae metal'], ['Enchufe', 'Da electricidad'], ['Pila', 'Guarda energía']], 'Imanes y electricidad.'),
    ['Las pilas guardan...', 'energía', ['agua', 'sombra', 'sonido'], 'Las pilas almacenan energía.'],
    vf('Dos imanes a veces se atraen y a veces se repelen.', true, 'Según sus polos.'),
    ['Un control remoto funciona con...', 'pilas', ['agua', 'arena', 'sombra'], 'Usa pilas (energía).'],
  ] },
  { orden: 10, nombre: 'La Física en mi Día', icono: '🏆', banda: 'heroes', intro: '¡El desafío final! La física está en todo lo que haces. ¡Reconócela en tu día a día!', banco: [
    ['Cuando frenas tu bicicleta, usas una fuerza para...', 'detenerte', ['acelerar', 'volar', 'crecer'], 'El freno es una fuerza.'],
    ['Una pelota cae al suelo por la...', 'gravedad', ['luz', 'música', 'sombra'], 'La gravedad la jala.'],
    vf('Una sombra aparece cuando algo bloquea la luz.', true, 'Correcto.'),
    ['El termómetro mide la...', 'temperatura', ['velocidad', 'luz', 'sonido'], 'Mide la temperatura.'],
    agr('Clasifica el fenómeno', { 'Necesita fuerza': ['Empujar un carro', 'Patear un balón'], 'Es por la gravedad': ['Una manzana que cae', 'Saltar y bajar'] }, 'Fuerzas y gravedad en acción.'),
    ['Un corcho en el agua...', 'flota', ['se hunde', 'vuela', 'se quema'], 'El corcho flota.'],
    vf('El Sol nos da luz y calor.', true, 'Ambas cosas.'),
    rel('Relaciona el fenómeno', [['Caer al suelo', 'Gravedad'], ['Oír música', 'Sonido'], ['Ver de día', 'Luz']], 'Física cotidiana.'),
    ['El sonido se produce cuando algo...', 'vibra', ['brilla', 'flota', 'se enfría'], 'Las vibraciones hacen sonido.'],
    comp('Para medir el peso usamos una ___.', ['balanza', 'regla', 'vela'], 0, 'La balanza.'),
    vf('Un imán atrae el plástico.', false, 'No, atrae metal.'),
    ['Si dejas un helado al Sol se derrite por el...', 'calor', ['frío', 'sonido', 'viento'], 'El calor lo derrite.'],
  ] },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const m of MUNDOS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#DB2777','#F472B6','fisica',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10 RETURNING id`,
      [m.nombre, `Física básica: ${m.nombre}`, m.orden, m.icono]
    );
    const mundoId = res.rows[0].id;
    const nb = m.banco.length;
    for (let a = 1; a <= 10; a++) {
      const preguntas = [];
      for (let i = 0; i < 3; i++) { const entry = m.banco[((a - 1) * 3 + i) % nb]; preguntas.push(build(rng(m.orden * 100000 + a * 1000 + i * 131 + 7), entry)); }
      const nombre = `${m.nombre} — Reto ${a}`;
      const config = { version: 2, tipo: 'quiz', id: `fisica-m${m.orden}-n${a}`, nombre, categoria: 'fisica',
        narracion: { intro: a === 1 ? m.intro : `Reto ${a} de ${m.nombre}. ¡La física está en todo!`, url_audio_intro: null },
        preguntas, recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,$5, ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, nombre, a, config, m.banda]);
    }
    console.log(`✓ Física ${m.orden} "${m.nombre}"`);
  }
  console.log('\n✅ Física básica sembrada: 10 mundos × 10 actividades.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
