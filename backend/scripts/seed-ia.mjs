// Materia "Inteligencia Artificial": progresión desde conceptos/ética (quiz) hasta
// CONSTRUIR UNA NEURONA (laboratorio interactivo). 10 mundos × 10 actividades.
// Mundos 1-7: quiz. Mundos 8-10: laboratorio de neurona (perceptrón).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function toQuiz(r, q) { const opts = shuffle(r, [q[1], ...q[2]]).slice(0, 4); if (!opts.includes(q[1])) opts[0] = q[1]; return { enunciado: q[0], opciones: opts.map(String), correcta: opts.indexOf(q[1]), explicacion: q[3] }; }

// ---------- Mundos 1-7: QUIZ ----------
const QUIZ_WORLDS = [
  { orden: 1, nombre: '¿Qué es la IA?', icono: '🤖', intro: '¡Bienvenido al mundo de la Inteligencia Artificial! Soy Astro. La IA es cuando las máquinas imitan algunas capacidades de pensar de las personas. ¡Vamos a descubrirla!', banco: [
    ['La Inteligencia Artificial (IA) es...', 'Cuando las máquinas imitan la inteligencia humana', ['Solo un robot de metal', 'Una persona', 'Un juego de mesa'], 'La IA hace que las máquinas imiten capacidades como aprender o decidir.'],
    ['¿Cuál es un ejemplo de IA?', 'Un asistente de voz como Alexa', ['Una silla', 'Un lápiz', 'Una piedra'], 'Los asistentes de voz usan IA para entenderte.'],
    ['La IA puede...', 'Aprender de ejemplos', ['Comer', 'Dormir', 'Respirar'], 'La IA aprende a partir de datos y ejemplos.'],
    ['¿La IA piensa EXACTAMENTE igual que un humano?', 'No, solo imita algunas capacidades', ['Sí, igualito', 'Mejor en todo', 'Tiene sentimientos'], 'La IA imita, pero no piensa ni siente como las personas.'],
    ['La IA necesita... para aprender', 'Datos (ejemplos)', ['Agua', 'Comida', 'Sol'], 'Sin datos, la IA no puede aprender.'],
    ['Un programa que reconoce tu cara usa...', 'Inteligencia Artificial', ['Magia', 'Un imán', 'Pilas de reloj'], 'El reconocimiento facial es una aplicación de la IA.'],
    ['¿La IA tiene sentimientos?', 'No, no siente como las personas', ['Sí, llora', 'Se enamora', 'Se enoja de verdad'], 'La IA no tiene emociones reales.'],
    ['¿Quién crea la IA?', 'Las personas (programadores)', ['Aparece sola', 'Los animales', 'Las plantas'], 'Las personas diseñan y entrenan la IA.'],
    ['La IA sirve para...', 'Resolver problemas y ayudar', ['Romper cosas', 'Nada', 'Hacer ruido'], 'La IA ayuda en muchas tareas útiles.'],
    ['Un robot que aprende a caminar usa...', 'IA', ['Una receta de cocina', 'Un cuento', 'Una canción'], 'Aprender a caminar es una tarea de IA.'],
    ['La IA está en...', 'Teléfonos, juegos y autos', ['Solo en laboratorios secretos', 'Solo en el espacio', 'En ningún lugar'], 'La IA está en muchísimos dispositivos cotidianos.'],
    ['La IA imita la inteligencia para...', 'Tomar decisiones y aprender', ['Crecer como planta', 'Volar como pájaro', 'Nadar'], 'Imita capacidades como decidir y aprender.'],
  ] },
  { orden: 2, nombre: 'La IA a tu Alrededor', icono: '🔎', intro: 'La IA está en muchos lugares que usas todos los días. ¡Vamos a descubrir dónde se esconde!', banco: [
    ['Cuando un app te recomienda un video usa...', 'IA', ['Suerte', 'Magia', 'Un dado'], 'Las recomendaciones se basan en IA que aprende tus gustos.'],
    ['Un filtro de cara en una app usa...', 'IA (reconoce tu cara)', ['Pintura', 'Un espejo', 'Una linterna'], 'Los filtros detectan tu rostro con IA.'],
    ['El teclado que adivina la palabra usa...', 'IA', ['Un diccionario de papel', 'Magia', 'Nada'], 'El texto predictivo usa IA.'],
    ['Un auto que se maneja solo usa...', 'IA', ['Un control de TV', 'Una vela', 'Un imán'], 'Los autos autónomos usan IA para conducir.'],
    ['Alexa y Siri son...', 'Asistentes con IA', ['Personas reales', 'Robots de juguete', 'Animales'], 'Son asistentes virtuales con IA.'],
    ['Un videojuego con enemigos "listos" usa...', 'IA', ['Pilas mágicas', 'Un control remoto', 'Nada'], 'Los enemigos inteligentes se programan con IA.'],
    ['Cuando el correo detecta spam usa...', 'IA', ['Una lupa', 'Un filtro de agua', 'Magia'], 'La IA aprende a reconocer correo basura.'],
    ['Una app que traduce idiomas usa...', 'IA', ['Un loro', 'Un libro', 'Nada'], 'Los traductores modernos usan IA.'],
    ['La IA que reconoce tu voz...', 'Convierte tu voz en texto o acciones', ['Te canta', 'Te dibuja', 'Te abraza'], 'El reconocimiento de voz transforma audio en información.'],
    ['¿La IA está SOLO en robots?', 'No, también en apps y webs', ['Sí, solo en robots', 'Solo en el cine', 'En ningún lado'], 'La IA está en software de todo tipo.'],
    ['Un mapa que predice el tráfico usa...', 'IA', ['Adivinanza', 'Un cuento', 'Suerte'], 'Predecir el tráfico es una tarea de IA.'],
    ['Las fotos que se ordenan por personas usan...', 'IA (reconoce caras)', ['Un álbum de papel', 'Tijeras', 'Pegamento'], 'La IA agrupa fotos reconociendo rostros.'],
  ] },
  { orden: 3, nombre: 'Ética de la IA', icono: '⚖️', intro: 'La IA es muy poderosa, por eso hay que usarla con responsabilidad y respeto. ¡Aprendamos a usarla para el bien!', banco: [
    ['La IA debe usarse para...', 'Ayudar y hacer el bien', ['Engañar a la gente', 'Hacer daño', 'Copiar en exámenes'], 'La IA debe usarse de forma responsable y buena.'],
    ['Si una IA aprende de datos injustos, puede ser...', 'Injusta (sesgada)', ['Siempre perfecta', 'Más rápida', 'Más bonita'], 'Datos injustos hacen que la IA tome decisiones injustas.'],
    ['¿Debe la IA respetar tu privacidad?', 'Sí', ['No', 'Solo a veces', 'Da igual'], 'La IA debe proteger tus datos personales.'],
    ['Usar IA para copiar en un examen es...', 'Deshonesto', ['Inteligente', 'Buena idea', 'Permitido'], 'Hacer trampa con IA no es ético.'],
    ['¿Quién es responsable de lo que hace una IA?', 'Las personas que la crean y usan', ['Nadie', 'La IA sola', 'Los animales'], 'Las personas somos responsables del uso de la IA.'],
    ['Una IA justa trata a todos...', 'Por igual', ['Distinto según el color', 'Mejor a unos', 'Con burlas'], 'La equidad es clave en una IA ética.'],
    ['¿Debemos creer TODO lo que dice una IA?', 'No, puede equivocarse', ['Sí, siempre acierta', 'Es perfecta', 'Nunca falla'], 'La IA puede cometer errores: hay que verificar.'],
    ['Crear imágenes falsas para engañar con IA es...', 'Poco ético', ['Divertido y bueno', 'Recomendable', 'Obligatorio'], 'Usar IA para engañar está mal.'],
    ['La IA debe ser...', 'Transparente y segura', ['Secreta y peligrosa', 'Tramposa', 'Injusta'], 'Una buena IA es clara, segura y justa.'],
    ['Si una IA te da una respuesta, debes...', 'Pensar y verificar', ['Creerla sin pensar', 'Copiarla siempre', 'Ignorar todo lo demás'], 'Siempre usa tu propio criterio.'],
    ['Compartir datos de otros con una IA sin permiso es...', 'Incorrecto', ['Buena idea', 'Normal', 'Obligatorio'], 'No se comparten datos ajenos sin permiso.'],
    ['La tecnología debe respetar...', 'A las personas', ['A nadie', 'Solo a las máquinas', 'Al dinero'], 'La IA debe estar al servicio de las personas.'],
  ] },
  { orden: 4, nombre: 'Datos: el Alimento de la IA', icono: '🍎', intro: 'La IA aprende de los datos, como tú aprendes de los ejemplos. ¡Mientras mejores los datos, mejor aprende!', banco: [
    ['La IA aprende a partir de...', 'Datos (ejemplos)', ['Sueños', 'Magia', 'Adivinanzas'], 'Los datos son los ejemplos con los que aprende la IA.'],
    ['Para reconocer gatos, la IA necesita...', 'Muchas fotos de gatos', ['Una sola foto', 'Ningún ejemplo', 'Un dibujo de perro'], 'Cuantos más ejemplos, mejor aprende.'],
    ['Si los datos son malos, la IA aprende...', 'Mal', ['Perfecto', 'Más rápido', 'Mejor'], 'Datos malos = aprendizaje malo.'],
    ['Más y mejores ejemplos hacen una IA...', 'Mejor', ['Peor', 'Más lenta siempre', 'Inútil'], 'Buenos datos mejoran a la IA.'],
    ['Los datos son...', 'Información que usa la IA', ['Comida real', 'Juguetes', 'Agua'], 'Los datos son la información de entrada.'],
    ['Etiquetar datos significa...', 'Decirle a la IA qué es cada cosa', ['Romperlos', 'Esconderlos', 'Borrarlos'], 'Etiquetar = marcar qué representa cada ejemplo.'],
    ['¿La IA puede aprender SIN datos?', 'No, los necesita', ['Sí, sin nada', 'Con magia', 'Durmiendo'], 'Sin datos no hay aprendizaje.'],
    ['Un ejemplo para enseñar "perro" sería...', 'Una foto de un perro', ['Una foto de un carro', 'Un número', 'Un sonido de gato'], 'Los ejemplos deben representar lo que se enseña.'],
    ['Si solo le muestras gatos negros, podría no reconocer...', 'Gatos de otros colores', ['Ningún gato', 'Perros negros', 'Nada'], 'Datos poco variados limitan lo que la IA aprende.'],
    ['Entrenar una IA es...', 'Enseñarle con datos', ['Pasearla', 'Alimentarla con comida', 'Dormirla'], 'Entrenar = enseñar con muchos ejemplos.'],
    ['La calidad de los datos afecta...', 'Lo que la IA aprende', ['El clima', 'Tu altura', 'Nada'], 'Mejores datos, mejor IA.'],
    ['Los datos personales deben usarse...', 'Con cuidado y permiso', ['Sin permiso', 'Para engañar', 'Como sea'], 'Respetar la privacidad es esencial.'],
  ] },
  { orden: 5, nombre: 'Patrones y Predicciones', icono: '📈', intro: 'La IA es experta en encontrar patrones y predecir lo que sigue. ¡Como un detective de los datos!', banco: [
    ['La IA es muy buena para...', 'Encontrar patrones', ['Cocinar', 'Dormir', 'Cantar'], 'La IA detecta patrones en los datos.'],
    ['Predecir es...', 'Adivinar lo que viene según ejemplos', ['Inventar sin razón', 'Borrar datos', 'Copiar'], 'Predecir usa lo aprendido para anticipar.'],
    ['Si ve 2, 4, 6, 8... la IA predice...', '10', ['9', '12', '7'], 'El patrón suma 2: el siguiente es 10.'],
    ['Reconocer un patrón ayuda a...', 'Predecir', ['Olvidar', 'Romper', 'Esconder'], 'Los patrones permiten anticipar lo que sigue.'],
    ['Una IA del clima predice...', 'Si lloverá', ['Tu nombre', 'Tu edad', 'Tu comida'], 'Predice el tiempo a partir de datos.'],
    ['La IA encuentra patrones en...', 'Muchos datos', ['Una sola foto', 'El vacío', 'Nada'], 'Necesita muchos datos para hallar patrones.'],
    ['Si siempre que llueve llevas paraguas, la IA aprende ese...', 'Patrón', ['Color', 'Ruido', 'Sabor'], 'Detecta la relación lluvia → paraguas.'],
    ['Predecir NO es...', 'Estar 100% seguro siempre', ['Anticipar', 'Usar patrones', 'Adivinar con datos'], 'Las predicciones pueden fallar.'],
    ['Las recomendaciones se basan en...', 'Tus patrones (lo que te gusta)', ['El azar', 'Tu altura', 'El clima'], 'Recomiendan según lo que sueles ver o hacer.'],
    ['Un patrón es algo que...', 'Se repite', ['Nunca pasa', 'Es secreto', 'No existe'], 'Un patrón es una repetición reconocible.'],
    ['¿La IA puede equivocarse al predecir?', 'Sí, no es perfecta', ['No, nunca', 'Es mágica', 'Siempre acierta'], 'Las predicciones no son seguras al 100%.'],
    ['Más ejemplos mejoran las...', 'Predicciones', ['Mentiras', 'Fallas', 'Esperas'], 'Con más datos, predice mejor.'],
  ] },
  { orden: 6, nombre: 'Decisiones de una Máquina', icono: '🎚️', intro: '¿Cómo decide una máquina? Suma sus entradas según su importancia (peso) y elige sí o no. ¡Pronto construirás una!', banco: [
    ['Para decidir, una neurona suma...', 'Las entradas con sus pesos', ['Colores', 'Sonidos', 'Nombres'], 'Multiplica cada entrada por su peso y las suma.'],
    ['Un "peso" indica...', 'Qué tan importante es una entrada', ['El color', 'El tamaño de la pantalla', 'La hora'], 'El peso da importancia a cada entrada.'],
    ['Si una entrada es muy importante, su peso es...', 'Grande', ['Cero', 'Negativo siempre', 'Invisible'], 'Mayor importancia = mayor peso.'],
    ['Una máquina decide "sí" o "no" según...', 'Un cálculo (umbral)', ['Su humor', 'El clima', 'La suerte'], 'Compara la suma con un límite para decidir.'],
    ['Sumar las entradas importantes ayuda a...', 'Tomar una decisión', ['Dormir', 'Cantar', 'Correr'], 'La suma ponderada lleva a la decisión.'],
    ['Si la suma supera el límite, la salida es...', 'Sí (1)', ['No (0) siempre', 'Un color', 'Una letra'], 'Si supera el umbral, se activa (1).'],
    ['El "sesgo" (bias) ayuda a...', 'Ajustar la decisión', ['Romper la neurona', 'Borrar datos', 'Nada'], 'El sesgo mueve el límite de decisión.'],
    ['Cambiar los pesos cambia...', 'La decisión', ['El color', 'El idioma', 'Nada'], 'Los pesos determinan el resultado.'],
    ['Una decisión simple puede ser...', 'Encender o no una luz', ['Pintar un cuadro completo', 'Escribir un libro', 'Cocinar'], 'Las neuronas dan decisiones sí/no.'],
    ['Más peso a una entrada significa...', 'Que cuenta más', ['Que no importa', 'Que desaparece', 'Que es un error'], 'Más peso = más influencia en la decisión.'],
    ['La activación decide la...', 'Salida final (0 o 1)', ['Entrada', 'El color', 'El peso'], 'La función de activación produce la salida.'],
    ['Ajustar pesos para acertar se llama...', 'Entrenar', ['Romper', 'Borrar', 'Esconder'], 'Entrenar = ajustar pesos hasta acertar.'],
  ] },
  { orden: 7, nombre: '¿Qué es una Neurona Artificial?', icono: '🧠', intro: 'Una neurona artificial imita a las del cerebro: recibe entradas, las pesa, suma y decide. ¡En el próximo mundo construirás una!', banco: [
    ['Una neurona artificial imita a...', 'Una neurona del cerebro', ['Un músculo', 'Un hueso', 'Un diente'], 'Se inspira en las neuronas biológicas.'],
    ['Las partes de una neurona son...', 'Entradas, pesos, suma, activación y salida', ['Ruedas y motor', 'Patas y cola', 'Hojas y raíces'], 'Esos son los componentes de una neurona artificial.'],
    ['Las entradas son...', 'Los datos que recibe', ['Las salidas', 'Los colores', 'Los pesos'], 'Las entradas son la información que entra.'],
    ['Los pesos...', 'Dan importancia a cada entrada', ['Pintan la neurona', 'La apagan', 'No sirven'], 'Cada peso indica cuánto importa su entrada.'],
    ['La neurona suma...', 'Entradas × pesos + sesgo', ['Solo colores', 'Letras', 'Nada'], 'Calcula la suma ponderada más el sesgo.'],
    ['La activación decide...', 'Si la salida es 0 o 1', ['El color', 'El tamaño', 'El idioma'], 'La activación produce la salida final.'],
    ['El sesgo (bias) es...', 'Un número que ajusta la decisión', ['Un color', 'Una letra', 'Un dibujo'], 'El sesgo desplaza el umbral de decisión.'],
    ['La salida de una neurona simple es...', '0 o 1', ['Un párrafo', 'Una canción', 'Un color cualquiera'], 'Una neurona escalón da 0 o 1.'],
    ['Muchas neuronas juntas forman...', 'Una red neuronal', ['Un robot de metal', 'Un cable', 'Una pantalla'], 'Las redes neuronales son muchas neuronas conectadas.'],
    ['Entrenar una neurona es...', 'Ajustar sus pesos', ['Pintarla', 'Romperla', 'Esconderla'], 'Se ajustan los pesos hasta que acierte.'],
    ['Si la suma es mayor o igual a 0, la neurona escalón da...', '1', ['0', 'un color', 'una letra'], 'La función escalón da 1 cuando la suma ≥ 0.'],
    ['La neurona artificial es la base de...', 'La IA moderna', ['Las bicicletas', 'Los relojes de arena', 'Los lápices'], 'Las neuronas son la base de las redes de IA.'],
  ] },
];

// ---------- Mundos 8-10: LABORATORIO DE NEURONA ----------
const GATES = {
  id1: { nombre: 'El Eco', desc: 'Tu neurona debe COPIAR la entrada: si entra 1, sale 1; si entra 0, sale 0.', entradas: ['Señal'], n: 1, fn: (x) => x[0] },
  not1: { nombre: 'Al Contrario', desc: 'Tu neurona debe dar lo OPUESTO: si entra 1, sale 0; si entra 0, sale 1.', entradas: ['Señal'], n: 1, fn: (x) => 1 - x[0] },
  or2: { nombre: 'Alguno Encendido', desc: 'La salida es 1 si AL MENOS UNA entrada es 1.', entradas: ['A', 'B'], n: 2, fn: (x) => x[0] | x[1] },
  and2: { nombre: 'Los Dos a la Vez', desc: 'La salida es 1 SOLO si AMBAS entradas son 1.', entradas: ['A', 'B'], n: 2, fn: (x) => x[0] & x[1] },
  nand2: { nombre: 'No Ambos', desc: 'La salida es 0 solo cuando las dos entradas son 1; en los demás casos, 1.', entradas: ['A', 'B'], n: 2, fn: (x) => 1 - (x[0] & x[1]) },
  nor2: { nombre: 'Ninguno', desc: 'La salida es 1 SOLO cuando las dos entradas son 0.', entradas: ['A', 'B'], n: 2, fn: (x) => 1 - (x[0] | x[1]) },
  x1: { nombre: 'Solo la Primera', desc: 'La salida debe ser igual a la PRIMERA entrada (ignora la segunda).', entradas: ['A', 'B'], n: 2, fn: (x) => x[0] },
  x2: { nombre: 'Solo la Segunda', desc: 'La salida debe ser igual a la SEGUNDA entrada (ignora la primera).', entradas: ['A', 'B'], n: 2, fn: (x) => x[1] },
  const1: { nombre: 'Siempre Sí', desc: 'La salida debe ser 1 SIEMPRE, pase lo que pase.', entradas: ['A', 'B'], n: 2, fn: () => 1 },
  const0: { nombre: 'Siempre No', desc: 'La salida debe ser 0 SIEMPRE.', entradas: ['A', 'B'], n: 2, fn: () => 0 },
  or3: { nombre: 'Alguno de Tres', desc: 'La salida es 1 si AL MENOS UNA de las tres entradas es 1.', entradas: ['A', 'B', 'C'], n: 3, fn: (x) => x[0] | x[1] | x[2] },
  and3: { nombre: 'Los Tres', desc: 'La salida es 1 SOLO si las TRES entradas son 1.', entradas: ['A', 'B', 'C'], n: 3, fn: (x) => x[0] & x[1] & x[2] },
  maj3: { nombre: 'La Mayoría', desc: 'La salida es 1 si la MAYORÍA (2 o 3) de las entradas son 1.', entradas: ['A', 'B', 'C'], n: 3, fn: (x) => ((x[0] + x[1] + x[2]) >= 2 ? 1 : 0) },
};

function casosDe(gateKey) {
  const g = GATES[gateKey];
  const casos = [];
  for (let m = 0; m < (1 << g.n); m++) {
    const e = [];
    for (let i = 0; i < g.n; i++) e.push((m >> i) & 1);
    casos.push({ e, s: g.fn(e) });
  }
  return casos;
}

// Verifica que el perceptrón pueda resolver el gate con la rejilla de pesos/sesgo
function esResoluble(gateKey, min = -3, max = 3, paso = 0.5) {
  const g = GATES[gateKey];
  const casos = casosDe(gateKey);
  const vals = []; for (let v = min; v <= max + 1e-9; v += paso) vals.push(Math.round(v * 2) / 2);
  const combos = (k) => k === 0 ? [[]] : combos(k - 1).flatMap((c) => vals.map((v) => [...c, v]));
  for (const w of combos(g.n)) {
    for (const b of vals) {
      if (casos.every((c) => { let s = b; for (let i = 0; i < g.n; i++) s += c.e[i] * w[i]; return (s >= 0 ? 1 : 0) === c.s; })) return true;
    }
  }
  return false;
}

const NEURON_WORLDS = [
  { orden: 8, nombre: 'Mi Primera Neurona', icono: '🔬', intro: '¡Llegó el momento de CONSTRUIR tu primera neurona! Mueve los pesos y el sesgo hasta que tu neurona acierte en todos los casos. ¡Tú puedes!',
    gates: ['id1', 'not1', 'or2', 'x1', 'or2', 'x2', 'const1', 'const0', 'not1', 'id1'] },
  { orden: 9, nombre: 'Entrena tu Neurona', icono: '⚙️', intro: 'Ahora retos más difíciles. Recuerda: el peso dice cuánto importa cada entrada, y el sesgo ajusta la decisión. ¡Entrena tu neurona!',
    gates: ['and2', 'nand2', 'nor2', 'and2', 'or2', 'x1', 'nand2', 'nor2', 'and2', 'not1'] },
  { orden: 10, nombre: 'Maestro de Neuronas', icono: '👑', intro: '¡El desafío final de la IA! Neuronas de hasta tres entradas. Demuestra que eres un maestro construyendo neuronas. ¡Mucha suerte!',
    gates: ['or3', 'maj3', 'and3', 'or3', 'maj3', 'nand2', 'nor2', 'and3', 'maj3', 'or3'] },
];

// ---------- Preguntas tipadas (variedad) para los mundos quiz 1-7 ----------
const vf = (e, r, x) => ({ tipo: 'vf', enunciado: `¿Verdadero o Falso? "${e}"`, respuesta: r, explicacion: x });
const comp = (e, opciones, correcta, x) => ({ tipo: 'completar', enunciado: e, opciones, correcta, explicacion: x });
const ord = (e, items, x) => ({ tipo: 'ordenar', enunciado: e, items, explicacion: x });
const rel = (e, pares, x) => ({ tipo: 'relacionar', enunciado: e, pares, explicacion: x });
const agr = (e, grupos, x) => ({ tipo: 'agrupar', enunciado: e, grupos, explicacion: x });

const TYPED = {
  1: [
    vf('La IA puede aprender de ejemplos.', true, 'Sí, la IA aprende a partir de datos.'),
    comp('La IA necesita ___ para aprender.', ['datos', 'agua', 'comida'], 0, 'Sin datos, la IA no aprende.'),
    agr('Clasifica: ¿usa IA?', { 'Usa IA': ['Asistente de voz', 'Recomendación de videos'], 'No usa IA': ['Una silla', 'Un lápiz'] }, 'La IA está en apps inteligentes, no en objetos simples.'),
    vf('La IA tiene sentimientos como las personas.', false, 'No, la IA no siente como las personas.'),
  ],
  2: [
    agr('Clasifica', { 'Usa IA': ['Filtro de cara', 'Traductor de idiomas', 'Auto autónomo'], 'No usa IA': ['Una mesa', 'Una vela'] }, 'Muchas apps cotidianas usan IA.'),
    vf('Cuando un app te recomienda un video, usa IA.', true, 'Correcto, las recomendaciones usan IA.'),
    rel('Relaciona', [['Alexa', 'Asistente de voz'], ['Traductor', 'Cambia idiomas'], ['Filtro de cara', 'Reconoce tu rostro']], 'Cada herramienta de IA tiene su tarea.'),
    comp('Un auto que se maneja solo usa ___.', ['IA', 'una vela', 'un imán'], 0, 'Los autos autónomos usan IA.'),
  ],
  3: [
    vf('Está bien usar IA para copiar en un examen.', false, 'Eso es deshonesto.'),
    agr('Clasifica el uso de la IA', { Ético: ['Ayudar a aprender', 'Respetar la privacidad'], 'No ético': ['Engañar con imágenes falsas', 'Copiar en exámenes'] }, 'Usa la IA para el bien.'),
    comp('Si una IA aprende de datos injustos, puede ser ___.', ['injusta', 'perfecta', 'rápida'], 0, 'Datos injustos crean una IA sesgada.'),
    vf('Debemos creer TODO lo que dice una IA sin pensar.', false, 'No, la IA puede equivocarse: verifica.'),
  ],
  4: [
    vf('La IA puede aprender sin datos.', false, 'No, necesita datos para aprender.'),
    comp('Para reconocer gatos, la IA necesita muchas ___ de gatos.', ['fotos', 'sillas', 'letras'], 0, 'Más ejemplos, mejor aprende.'),
    agr('Clasifica el dato para enseñar "perro"', { 'Buen dato': ['Foto de un perro', 'Sonido de un perro'], 'Mal dato': ['Foto de un carro', 'Un número'] }, 'Los datos deben representar lo que se enseña.'),
    vf('Si los datos son malos, la IA aprende mal.', true, 'Correcto: datos malos = mal aprendizaje.'),
  ],
  5: [
    comp('Si ve 2, 4, 6, 8 la IA predice ___.', ['10', '9', '12'], 0, 'El patrón sube de 2 en 2.'),
    vf('La IA SIEMPRE acierta al predecir.', false, 'No, las predicciones pueden fallar.'),
    ord('Ordena la serie que predeciría la IA', ['2', '4', '6', '8'], 'La serie sube de 2 en 2.'),
    rel('Relaciona', [['Patrón', 'Algo que se repite'], ['Predecir', 'Adivinar lo que sigue'], ['Recomendación', 'Según tus gustos']], 'Conceptos de patrones y predicción.'),
  ],
  6: [
    comp('Un ___ indica qué tan importante es una entrada.', ['peso', 'color', 'sonido'], 0, 'El peso da importancia a cada entrada.'),
    vf('Cambiar los pesos cambia la decisión de la neurona.', true, 'Correcto.'),
    rel('Relaciona', [['Peso', 'Importancia de una entrada'], ['Sesgo', 'Ajusta la decisión'], ['Activación', 'Da la salida 0 o 1']], 'Partes de la decisión de una neurona.'),
    vf('Si la suma supera el límite, la salida es "sí" (1).', true, 'Correcto: supera el umbral → 1.'),
  ],
  7: [
    ord('Ordena las partes de una neurona (de la entrada a la salida)', ['Entradas', 'Pesos', 'Suma', 'Activación', 'Salida'], 'Ese es el flujo dentro de una neurona.'),
    rel('Relaciona la parte', [['Entradas', 'Datos que recibe'], ['Pesos', 'Importancia'], ['Salida', 'Resultado 0 o 1']], 'Cada parte de la neurona.'),
    vf('Muchas neuronas juntas forman una red neuronal.', true, 'Correcto.'),
    comp('El ___ es un número que ajusta la decisión de la neurona.', ['sesgo', 'color', 'sonido'], 0, 'El sesgo (bias) ajusta el umbral.'),
  ],
};

function construirQuiz(u, a) {
  const bank = u.banco, typed = TYPED[u.orden] || [];
  const nb = bank.length, nt = typed.length;
  const i0 = ((a - 1) * 2) % nb;
  const oq = (slot) => toQuiz(rng(u.orden * 100000 + a * 1000 + slot * 17), bank[(i0 + slot) % nb]);
  if (!nt) return [0, 1, 2].map((i) => toQuiz(rng(u.orden * 100000 + a * 1000 + i * 17), bank[((a - 1) * 3 + i) % nb]));
  return (a % 2 === 1) ? [typed[(a - 1) % nt], oq(0), oq(1)] : [oq(0), typed[(a - 1) % nt], typed[a % nt]];
}

async function main() {
  // Verificar resolubilidad de todos los gates usados
  const usados = new Set(NEURON_WORLDS.flatMap((w) => w.gates));
  for (const g of usados) if (!esResoluble(g)) { console.error(`⛔ Gate NO resoluble: ${g}`); process.exit(1); }
  console.log('✓ Todos los retos de neurona son resolubles con la rejilla de pesos.');

  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  // Mundos quiz 1-7
  for (const u of QUIZ_WORLDS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#7C3AED','#A78BFA','ia',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10 RETURNING id`,
      [u.nombre, `Inteligencia Artificial — ${u.nombre}`, u.orden, u.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const preguntas = construirQuiz(u, a);
      const nombre = `${u.nombre} — Reto ${a}`;
      const config = { version: 1, tipo: 'quiz', id: `ia-m${u.orden}-n${a}`, nombre, categoria: 'ia',
        narracion: { intro: a === 1 ? u.intro : `Reto ${a} de ${u.nombre}.`, url_audio_intro: null },
        preguntas, recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, nombre, a, config]);
    }
    console.log(`✓ IA Mundo ${u.orden} (quiz): ${u.nombre}`);
  }

  // Mundos neurona 8-10
  for (const w of NEURON_WORLDS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#7C3AED','#C4B5FD','ia',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10 RETURNING id`,
      [w.nombre, `Inteligencia Artificial — ${w.nombre}`, w.orden, w.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const gateKey = w.gates[a - 1];
      const g = GATES[gateKey];
      const config = { version: 1, tipo: 'neurona', id: `ia-m${w.orden}-n${a}`, nombre: `${g.nombre}`, categoria: 'ia',
        objetivo: g.nombre, descripcion: g.desc, entradas: g.entradas, casos: casosDe(gateKey),
        rango: { min: -3, max: 3, paso: 0.5 },
        narracion: { intro: a === 1 ? w.intro : `Reto ${a}: construye la neurona "${g.nombre}". ${g.desc}`, url_audio_intro: null },
        recompensa: { monedas: 12 + a, gemas: a === 10 ? 3 : (a % 3 === 0 ? 1 : 0) } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,'heroes', ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, `${g.nombre} — Reto ${a}`, a, config]);
    }
    console.log(`✓ IA Mundo ${w.orden} (neurona): ${w.nombre}`);
  }
  console.log('\n✅ Inteligencia Artificial sembrada: 7 mundos quiz + 3 mundos de laboratorio de neurona.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
