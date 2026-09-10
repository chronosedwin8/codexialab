// LECCIONES PREVIAS de Programación MD, HL y Python.
//
// Pedagogía: la TEORÍA pertenece al tema (el mundo), la APLICACIÓN al nivel.
//  · leccionMundo()  → diapositivas del tema: concepto, ejemplo general, ejemplo en
//    código, aplicación real, paso a paso y error común. Narradas con voz real.
//  · fichaNivel()    → ficha corta y específica del reto que el estudiante va a hacer.
//    Se arma con los datos del propio nivel, así los 310 niveles tienen su explicación
//    previa sin inventar 310 teorías de relleno.

export type TipoSlide = 'concepto' | 'ejemplo' | 'codigo' | 'aplicacion' | 'pasos' | 'aviso';

export interface Slide {
  readonly tipo: TipoSlide;
  readonly titulo: string;
  readonly texto: string;
  readonly codigo?: string;
  readonly lenguaje?: 'javascript' | 'python';
  readonly pasos?: readonly string[];
  readonly audio?: string | null;
}

export interface Leccion {
  readonly clave: string;
  readonly titulo: string;
  readonly subtitulo: string;
  readonly color: string;
  readonly slides: readonly Slide[];
}

/** Diapositivas de un tema, sin las rutas de audio (se añaden en leccionMundo). */
type SlidesTema = readonly Omit<Slide, 'audio'>[];

const COLOR: Record<string, string> = {
  programacion_md: '#7C3AED',
  programacion_hl: '#4338CA',
  python: '#2563EB',
};

// ────────────────────────────────────────────────────────────────────────────
// PROGRAMACIÓN MD — bloques y código a la vez, nivel intermedio
// ────────────────────────────────────────────────────────────────────────────

const MD: Record<number, { titulo: string; subtitulo: string; slides: SlidesTema }> = {
  1: {
    titulo: 'Secuencias',
    subtitulo: 'El orden lo es todo',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es una secuencia?',
        texto: 'Una secuencia es una lista de instrucciones que la computadora ejecuta una tras otra, de arriba hacia abajo. Nunca se salta ninguna y nunca cambia el orden: hace exactamente lo que escribiste, en el orden en que lo escribiste.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Preparar una arepa es una secuencia: amasar, moldear, poner en el budare, voltear, servir. Si cambias el orden y sirves antes de cocinar, el resultado es otro. La computadora es igual de literal, pero mucho menos comprensiva.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Cada línea es un paso. El héroe avanza dos casillas y luego baja una. Si intercambias las líneas, termina en otro lugar.',
        codigo: 'moverDerecha();\nmoverDerecha();\nmoverAbajo();',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Toda app que usas es una secuencia gigante: abrir la cámara, capturar la imagen, aplicar el filtro, guardar. Los robots de una fábrica siguen secuencias, y también las instrucciones de un ascensor.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Antes de escribir una sola línea, recorre el camino con el dedo. Programar es primero pensar y después teclear.',
        pasos: [
          'Mira dónde está el héroe y dónde está la estrella ⭐.',
          'Recorre el camino con el dedo y cuenta las casillas.',
          'Anota los movimientos en orden: derecha, derecha, abajo…',
          'Escribe una instrucción por cada casilla contada.',
          'Ejecuta y observa: si se detiene, mira en qué paso falló.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Contar mal las casillas y quedarse a una de la meta. Cuenta siempre los espacios entre celdas, no las celdas. Si te pasas, el héroe choca con el muro y se detiene.',
      },
    ],
  },
  2: {
    titulo: 'Bucles for',
    subtitulo: 'Repetir sin repetirte',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un bucle for?',
        texto: 'Un bucle for repite un bloque de instrucciones una cantidad exacta de veces. En lugar de escribir lo mismo cinco veces, le dices a la computadora: haz esto cinco veces. Menos código, menos errores y mucho más fácil de cambiar.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Cuando subes una escalera no piensas "subo un escalón, subo un escalón, subo un escalón". Piensas "subo doce escalones". Eso es un bucle: una acción y un número de repeticiones.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Las dos versiones hacen exactamente lo mismo. La segunda es más corta y, si mañana necesitas diez pasos, solo cambias un número.',
        codigo: '// Sin bucle: repetido y frágil\nmoverDerecha();\nmoverDerecha();\nmoverDerecha();\n\n// Con bucle: claro y fácil de cambiar\nfor (let i = 0; i < 3; i++) {\n  moverDerecha();\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Cuando una app carga tu lista de mensajes, recorre uno por uno con un bucle. Un videojuego dibuja 60 cuadros por segundo con un bucle. Enviar 500 correos usa el mismo for que estás por aprender.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'La clave está en detectar qué se repite y cuántas veces. Todo lo demás es escribirlo.',
        pasos: [
          'Recorre el camino e identifica el tramo que se repite.',
          'Cuenta cuántas veces se repite ese tramo exacto.',
          'Escribe for (let i = 0; i < N; i++) con esa N.',
          'Pon dentro de las llaves { } lo que se repite.',
          'Ejecuta y ajusta la N si el héroe se queda corto o se pasa.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Confundirse por uno: i < 3 repite 3 veces (i vale 0, 1 y 2), no cuatro. Empezar a contar en cero se siente raro al principio, pero es la norma en casi todos los lenguajes.',
      },
    ],
  },
  3: {
    titulo: 'Bucles anidados',
    subtitulo: 'Un bucle dentro de otro',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un bucle anidado?',
        texto: 'Es un bucle que vive dentro de otro bucle. El de afuera manda una vuelta y el de adentro completa todas las suyas antes de que el de afuera avance. Sirve para todo lo que tiene filas y columnas.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Un reloj es un bucle anidado: por cada vuelta del minutero, el segundero da sesenta vueltas completas. Una hora son 60 minutos y cada minuto son 60 segundos: 3600 pasos en total.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Este código ejecuta moverDerecha nueve veces: tres filas por tres columnas. El bucle interno termina completo antes de que el externo pase a su siguiente vuelta.',
        codigo: 'for (let fila = 0; fila < 3; fila++) {\n  for (let col = 0; col < 3; col++) {\n    moverDerecha();\n  }\n  moverAbajo();\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Cada foto de tu celular se procesa con bucles anidados: uno recorre las filas de píxeles y otro las columnas. Las hojas de cálculo, los tableros de ajedrez y los mapas de videojuegos funcionan igual.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Piensa siempre en dos preguntas separadas: qué se repite adentro y cuántas veces se repite todo eso.',
        pasos: [
          'Identifica el patrón pequeño que se repite (el interno).',
          'Cuenta cuántas veces se repite ese patrón completo (el externo).',
          'Escribe primero el bucle externo.',
          'Dentro de él escribe el bucle interno con el patrón pequeño.',
          'Revisa qué instrucción va DESPUÉS del bucle interno pero DENTRO del externo.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Poner una instrucción dentro del bucle interno cuando debía ir solo en el externo. Fíjate muy bien en las llaves: lo que está adentro se repite muchas más veces de lo que crees.',
      },
    ],
  },
  4: {
    titulo: 'Condicionales if / else',
    subtitulo: 'Programar decisiones',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un condicional?',
        texto: 'Un condicional deja que el programa elija entre dos caminos según lo que esté pasando. Si la condición es verdadera hace una cosa; si es falsa, hace otra. Es lo que convierte un programa rígido en uno que reacciona.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Sales de casa y miras el cielo: si está lloviendo, llevas paraguas; si no, lo dejas. No decides antes de mirar. El programa hace lo mismo: primero evalúa, después actúa.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Aquí el héroe pregunta si puede seguir derecho. Solo si la respuesta es verdadera avanza; en caso contrario gira. El mismo código sirve en laberintos distintos.',
        codigo: 'if (puedeAvanzar()) {\n  avanzar();\n} else {\n  girarDerecha();\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Si la contraseña es correcta entras, si no te rebota. Si hay saldo se aprueba el pago. Si el semáforo está en rojo el carro autónomo frena. Todo sistema que decide algo usa condicionales.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Un condicional bien escrito empieza por una pregunta clara de sí o no.',
        pasos: [
          'Escribe con tus palabras la pregunta: ¿hay muro adelante?',
          'Tradúcela a una condición: puedeAvanzar().',
          'Define qué pasa si es VERDADERA y ponlo en el if.',
          'Define qué pasa si es FALSA y ponlo en el else.',
          'Prueba los dos casos: que se cumpla y que no se cumpla.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Escribir un solo igual (=) en vez de doble (==) al comparar. Un igual ASIGNA un valor, dos iguales COMPARAN. Es el error más frecuente de quien empieza y no siempre avisa con un mensaje.',
      },
    ],
  },
  5: {
    titulo: 'Bucle while',
    subtitulo: 'Repetir hasta lograrlo',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un while?',
        texto: 'El while repite mientras una condición siga siendo verdadera. A diferencia del for, no sabes de antemano cuántas vueltas dará: se detiene cuando la condición deja de cumplirse.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Llenas un vaso mientras no esté lleno. No cuentas los segundos: miras el vaso y decides seguir o parar. Un for sería "sirve 5 segundos"; un while es "sirve hasta que se llene".',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'El héroe avanza mientras el camino esté libre. Funciona igual en un pasillo de tres casillas que en uno de treinta, sin cambiar una sola letra.',
        codigo: 'while (puedeAvanzar()) {\n  avanzar();\n}\ngirarDerecha();',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un videojuego repite su ciclo mientras no pierdas. Una descarga sigue mientras queden datos. Un termostato calienta mientras la temperatura esté por debajo de la deseada.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Un while siempre necesita una salida: algo que cambie y termine haciendo falsa la condición.',
        pasos: [
          'Pregúntate: ¿hasta cuándo debe repetirse?',
          'Escribe esa condición en positivo: mientras SE PUEDA avanzar.',
          'Pon dentro la acción que se repite.',
          'Verifica que la acción acerque el final de la condición.',
          'Si el programa se queda pegado, revisa qué debía cambiar y no cambia.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'El bucle infinito: si nada dentro del while cambia la condición, se repite para siempre y el programa se congela. Antes de ejecutar, pregúntate siempre qué hará que esto termine.',
      },
    ],
  },
  6: {
    titulo: 'Sensores',
    subtitulo: 'Que el programa mire antes de actuar',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un sensor?',
        texto: 'Un sensor es una función que le pregunta al mundo cómo está y devuelve verdadero o falso. No mueve nada: solo informa. Con esa información, tus condicionales y bucles pueden decidir bien.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Cuando caminas de noche estiras la mano antes de dar el paso. La mano no camina: solo detecta si hay pared. Tus ojos, oídos y tacto son los sensores de tu propio programa.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'detectarObstaculo() devuelve verdadero si hay un muro. Fíjate en el signo de admiración: significa "no". Se lee: si NO hay obstáculo, avanza.',
        codigo: 'if (!detectarObstaculo()) {\n  avanzar();\n} else {\n  girarIzquierda();\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un carro se estaciona solo leyendo sensores de distancia. Tu celular apaga la pantalla cuando el sensor detecta tu oreja. Un dron mide altura muchas veces por segundo para no caerse.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'La regla de oro es: primero preguntar, después moverse. Nunca al revés.',
        pasos: [
          'Identifica qué necesita saber el héroe antes de decidir.',
          'Elige el sensor correcto: puedeAvanzar() o detectarObstaculo().',
          'Úsalo dentro de un if o de un while.',
          'Recuerda que ! invierte la respuesta del sensor.',
          'Comprueba que consultas el sensor ANTES de cada movimiento.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Consultar el sensor una sola vez y confiar en esa respuesta todo el recorrido. El mundo cambia con cada paso: hay que volver a preguntar en cada vuelta del bucle.',
      },
    ],
  },
  7: {
    titulo: 'Variables',
    subtitulo: 'Guardar y recordar datos',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es una variable?',
        texto: 'Una variable es una caja con nombre donde guardas un dato para usarlo después. Puedes leer lo que hay dentro y también cambiarlo. Sin variables, un programa no puede recordar nada.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'El marcador de un partido es una variable: empieza en cero y cambia con cada gol. El nombre "marcador local" no cambia; lo que cambia es el número que guarda.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Aquí pasos es un contador: nace en cero y crece de uno en uno. El += suma y guarda el resultado en la misma variable.',
        codigo: 'let pasos = 0;\n\nwhile (puedeAvanzar()) {\n  avanzar();\n  pasos += 1;\n}\n// pasos guarda cuántas casillas recorriste',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Tus monedas en Codexia son una variable. Los seguidores de una cuenta, el nivel de batería, el carrito de compras: todo dato que se muestra y cambia vive en una variable.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Toda variable necesita tres decisiones: cómo se llama, con qué valor empieza y cuándo cambia.',
        pasos: [
          'Decide qué dato necesitas recordar.',
          'Dale un nombre que se explique solo: pasos, gemas, intentos.',
          'Créala con un valor inicial: let pasos = 0.',
          'Actualízala en el momento exacto en que el dato cambia.',
          'Úsala para decidir o para calcular el resultado.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Crear la variable dentro del bucle: entonces vuelve a cero en cada vuelta y nunca acumula. Las variables que deben recordar algo se declaran ANTES de entrar al bucle.',
      },
    ],
  },
  8: {
    titulo: 'Combinar bucles y decisiones',
    subtitulo: 'Cuando las piezas trabajan juntas',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Bucle + condicional',
        texto: 'Un bucle que contiene un condicional repite una decisión muchas veces. Es el patrón más poderoso que vas a usar: en cada vuelta el programa mira, decide y actúa según lo que encontró.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Revisas una fila de casilleros: en cada uno miras si está abierto y decides si entras o sigues. Repites (bucle) y decides en cada repetición (condicional). Es lo mismo que hará tu héroe.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Este pequeño programa recorre casi cualquier laberinto: mientras no llegue a la meta, avanza si puede y gira si no puede.',
        codigo: 'while (!enMeta()) {\n  if (puedeAvanzar()) {\n    avanzar();\n  } else {\n    girarDerecha();\n  }\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un filtro de spam recorre tus correos y decide uno por uno. Un robot aspiradora repite: mira, decide, avanza. Un buscador revisa millones de páginas con este mismo esquema.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Separa las dos preguntas y el problema se vuelve la mitad de difícil.',
        pasos: [
          'Pregunta 1: ¿hasta cuándo repito? Esa es la condición del while.',
          'Pregunta 2: ¿qué decido en cada vuelta? Ese es el if.',
          'Escribe primero el bucle vacío.',
          'Mete adentro el condicional con sus dos caminos.',
          'Ejecuta paso a paso y sigue al héroe con la mirada.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Que ninguna de las dos ramas del if acerque al héroe a la meta: el bucle gira eternamente. Asegúrate de que al menos una rama produzca avance real.',
      },
    ],
  },
  9: {
    titulo: 'Optimización',
    subtitulo: 'La solución más corta',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es optimizar?',
        texto: 'Optimizar es lograr el mismo resultado con menos: menos instrucciones, menos repeticiones, menos tiempo. Un programa que funciona está bien; uno que funciona y es corto y claro está mucho mejor.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Dos personas llegan al mismo destino: una da vueltas de más y la otra toma la ruta directa. Llegan igual, pero una gastó el doble de gasolina. En programación esa gasolina es tiempo y memoria.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Las dos versiones producen el mismo movimiento. La segunda dice lo mismo con la mitad de líneas y se entiende de un vistazo.',
        codigo: '// 6 líneas\nmoverDerecha(); moverDerecha(); moverDerecha();\nmoverAbajo();  moverAbajo();  moverAbajo();\n\n// 6 movimientos en 2 bucles\nfor (let i = 0; i < 3; i++) moverDerecha();\nfor (let i = 0; i < 3; i++) moverAbajo();',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un buscador responde en milisegundos porque su código está optimizado. Un juego corre suave porque no desperdicia cálculos. Una app optimizada gasta menos batería de tu celular.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Primero haz que funcione. Después hazlo corto. Nunca al revés.',
        pasos: [
          'Resuelve el nivel como sea, aunque quede largo.',
          'Cuenta cuántas instrucciones usaste.',
          'Busca líneas repetidas y conviértelas en un bucle.',
          'Pregúntate si alguna instrucción sobra.',
          'Vuelve a ejecutar: debe seguir funcionando igual.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Optimizar tanto que el código se vuelve imposible de entender. El objetivo no es escribir menos letras: es que otra persona (o tú en un mes) entienda qué hace.',
      },
    ],
  },
  10: {
    titulo: 'Integración',
    subtitulo: 'Todo lo aprendido, junto',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Descomponer problemas',
        texto: 'Los retos grandes no se resuelven de un golpe: se parten en pedazos pequeños que ya sabes resolver. Secuencias, bucles, condicionales, sensores y variables son tus piezas; ahora toca combinarlas.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Nadie construye una casa "de una". Se hacen los cimientos, luego las paredes, luego el techo. Cada parte se termina y se revisa antes de seguir con la siguiente.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Este programa usa las cinco herramientas a la vez: variable, bucle, sensor y condicional, cada una haciendo su trabajo.',
        codigo: 'let giros = 0;\n\nwhile (!enMeta()) {\n  if (puedeAvanzar()) {\n    avanzar();\n  } else {\n    girarDerecha();\n    giros += 1;\n  }\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Así se construye software de verdad. Un equipo divide la app en partes, cada quien resuelve la suya y al final todo encaja. Se llama pensamiento computacional y sirve mucho más allá del código.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Divide, resuelve una parte, pruébala y sigue. Esa disciplina vale más que cualquier truco.',
        pasos: [
          'Lee el reto completo antes de escribir nada.',
          'Divídelo en dos o tres partes más pequeñas.',
          'Resuelve la primera parte y ejecútala.',
          'Solo cuando funcione, agrega la siguiente.',
          'Al final, revisa si puedes acortar el resultado.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Escribir todo el programa completo y recién entonces ejecutarlo. Si algo falla no sabrás dónde. Ejecuta seguido, en pedazos pequeños: encontrar un error en tres líneas es fácil, en treinta es un suplicio.',
      },
    ],
  },
  11: {
    titulo: 'Funciones y algoritmos',
    subtitulo: 'Tu primer código con retorno',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es una función?',
        texto: 'Una función es un pedazo de código con nombre que recibe datos, hace un trabajo y devuelve un resultado. Se escribe una vez y se usa mil. En estos retos tú escribes la función y el sistema la prueba con varios casos.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Una licuadora recibe frutas (entrada), hace su trabajo y devuelve jugo (salida). No te importa cómo funciona por dentro: te importa qué le metes y qué te da.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'La palabra return es la que entrega el resultado. Sin return, la función hace el trabajo pero no devuelve nada y las pruebas fallan.',
        codigo: 'function sumar(a, b) {\n  return a + b;\n}\n\nsumar(2, 3);  // devuelve 5',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Absolutamente todo el software está hecho de funciones. Calcular un descuento, validar un correo, convertir monedas: cada tarea vive en su función, se prueba por separado y se reutiliza.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Los retos de código se ganan leyendo bien los casos de prueba antes de programar.',
        pasos: [
          'Lee el enunciado y mira los casos de prueba.',
          'Pregúntate qué ENTRA y qué debe SALIR exactamente.',
          'Resuelve primero el caso más simple.',
          'Escribe el código y no olvides el return.',
          'Ejecuta: las pruebas te dirán exactamente qué falló.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Imprimir el resultado en vez de devolverlo. Mostrar en pantalla y devolver son cosas distintas: las pruebas solo miran lo que retornas.',
      },
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// PROGRAMACIÓN HL — solo escritura de código, alto nivel
// ────────────────────────────────────────────────────────────────────────────

const HL: Record<number, { titulo: string; subtitulo: string; slides: SlidesTema }> = {
  1: {
    titulo: 'Escribir código',
    subtitulo: 'Sin bloques, solo teclado',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'De los bloques al texto',
        texto: 'En HL desaparecen los bloques: escribes el código completo. Lo que antes arrastrabas ahora lo tecleas, con su sintaxis exacta. Es más exigente, pero también mucho más poderoso y es como se programa de verdad.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Es la diferencia entre armar una frase con imanes de nevera y escribirla a mano. Con imanes no puedes equivocarte de ortografía; escribiendo sí, pero puedes decir cualquier cosa.',
      },
      {
        tipo: 'codigo',
        titulo: 'La sintaxis importa',
        texto: 'Tres reglas que te ahorrarán muchos errores: los paréntesis van siempre, las llaves abren y cierran en pares, y el punto y coma cierra cada instrucción.',
        codigo: 'avanzar();        // ✅ correcto\navanzar;          // ❌ falta ()\n\nif (puedeAvanzar()) {\n  avanzar();      // ✅ dentro de las llaves\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Todo el software profesional se escribe así. El editor te avisa de algunos errores, pero la mayoría los encuentras ejecutando y leyendo el mensaje con calma.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Cuando algo falle, no borres todo: lee el mensaje de error, que casi siempre te dice la línea.',
        pasos: [
          'Escribe una instrucción y ejecuta.',
          'Si hay error, lee el mensaje y busca esa línea.',
          'Revisa paréntesis, llaves y punto y coma.',
          'Corrige y vuelve a ejecutar.',
          'Recién entonces escribe la siguiente instrucción.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Olvidar cerrar una llave. El programa entero deja de funcionar y el error aparece en una línea muy lejana. Indenta bien tu código: la sangría te muestra a simple vista qué está abierto.',
      },
    ],
  },
  2: {
    titulo: 'Bucles con acumuladores',
    subtitulo: 'for de alto nivel',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'La variable del bucle',
        texto: 'En un for, la variable i no solo cuenta vueltas: puedes usarla dentro del bucle. Eso permite que cada repetición haga algo ligeramente distinto, en lugar de repetir siempre lo mismo.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Repartes cartas a cuatro jugadores. La acción es la misma, pero en cada vuelta cambia a quién le toca. Ese "a quién" es la variable del bucle.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Un acumulador es una variable que va sumando dentro del bucle. Nace afuera, crece adentro y se usa al final.',
        codigo: 'let total = 0;\n\nfor (let i = 1; i <= 5; i++) {\n  total += i;      // 1+2+3+4+5\n}\n// total vale 15',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Calcular el total de un carrito de compras, el promedio de tus notas o cuántos kilómetros corriste este mes: todos son acumuladores dentro de un bucle.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'El acumulador tiene tres momentos y hay que respetarlos en orden.',
        pasos: [
          'Declara el acumulador ANTES del bucle con su valor inicial.',
          'Decide cuántas vueltas dará el for.',
          'Dentro del bucle, actualiza el acumulador.',
          'Después del bucle, usa o devuelve el resultado.',
          'Verifica el valor inicial: 0 para sumar, 1 para multiplicar.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Declarar el acumulador dentro del bucle. Se reinicia en cada vuelta y al final solo conserva el último valor. Si tu suma da un número raro, revisa primero dónde declaraste la variable.',
      },
    ],
  },
  3: {
    titulo: 'While con condición de parada',
    subtitulo: 'Repetir sin saber cuántas veces',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Cuándo usar while y no for',
        texto: 'Usa for cuando sabes el número de repeticiones. Usa while cuando dependes de algo que descubres sobre la marcha. Elegir mal no rompe el programa, pero lo vuelve mucho más enredado.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Buscar tu llave en el bolso es un while: no sabes cuántas cosas vas a sacar, solo que paras cuando la encuentras. Contar diez sentadillas es un for.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Este patrón combina un while con un límite de seguridad. Si algo sale mal, el programa termina en vez de congelarse.',
        codigo: 'let intentos = 0;\n\nwhile (!enMeta() && intentos < 100) {\n  if (puedeAvanzar()) avanzar();\n  else girarDerecha();\n  intentos += 1;\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un servidor atiende peticiones mientras esté encendido. Una app reintenta la conexión mientras falle, pero con un límite para no intentarlo eternamente.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Un while seguro se diseña pensando primero en cómo termina.',
        pasos: [
          'Escribe la condición de parada antes que el cuerpo.',
          'Confirma que algo dentro del bucle la puede volver falsa.',
          'Agrega un contador de seguridad si hay riesgo de infinito.',
          'Ejecuta y observa cuántas vueltas dio realmente.',
          'Ajusta la condición si terminó antes o después de lo esperado.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Poner la condición al revés y que el bucle no entre nunca. Si tu código parece no hacer nada, comprueba si la condición era falsa desde la primera vuelta.',
      },
    ],
  },
  4: {
    titulo: 'Anidamiento avanzado',
    subtitulo: 'Bucles dentro de bucles, con criterio',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Anidar con cabeza',
        texto: 'Cada nivel de anidamiento multiplica el trabajo: dos bucles de 10 son 100 pasos, tres son 1000. Anidar es potente, pero cada capa que agregas cuesta caro. Úsalo cuando el problema realmente tenga esa forma.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Buscar un nombre revisando página por página y línea por línea es anidamiento. Si el libro tiene 300 páginas de 40 líneas, son 12.000 miradas. Por eso existen los índices.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Fíjate en dónde va cada instrucción. Lo que está en el bucle interno se ejecuta filas × columnas veces; lo que está solo en el externo, apenas una vez por fila.',
        codigo: 'for (let fila = 0; fila < 4; fila++) {\n  for (let col = 0; col < 4; col++) {\n    avanzar();          // 16 veces\n  }\n  girarDerecha();       // 4 veces\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Editar una imagen, comparar dos listas, dibujar un tablero o renderizar un mapa. También es la razón por la que algunos programas se vuelven lentísimos con muchos datos.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Dibuja el recorrido antes de escribirlo. Un anidamiento mal pensado es dificilísimo de depurar.',
        pasos: [
          'Dibuja la cuadrícula y marca el recorrido con flechas.',
          'Identifica qué se repite en cada fila (bucle interno).',
          'Identifica qué pasa al terminar cada fila (bucle externo).',
          'Escribe el externo, luego el interno.',
          'Cuenta mentalmente las ejecuciones antes de correrlo.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Reutilizar la misma variable i en los dos bucles. El interno pisa el valor del externo y el recorrido se descontrola. Usa nombres distintos: fila y col se leen mucho mejor.',
      },
    ],
  },
  5: {
    titulo: 'Lógica booleana',
    subtitulo: 'Y, O, NO',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Los tres operadores',
        texto: 'Con && (y), || (o) y ! (no) puedes construir cualquier condición imaginable. && exige que todo se cumpla, || se conforma con que se cumpla una cosa, y ! da vuelta la respuesta.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Sales si terminaste la tarea Y hay permiso: fallan las dos y no sales. Llevas abrigo si hace frío O está lloviendo: basta una. No sales si NO hay permiso.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Combinar condiciones evita anidar tres if seguidos y hace el código mucho más legible.',
        codigo: 'if (puedeAvanzar() && !enMeta()) {\n  avanzar();\n}\n\nif (hayGema() || hayLlave()) {\n  recoger();\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Los filtros de una tienda en línea son lógica booleana pura: talla M Y color azul Y precio menor a cien mil. Cada casilla que marcas agrega una condición.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Escribe la condición en español primero. Si no la puedes decir claro, tampoco la vas a programar bien.',
        pasos: [
          'Escribe la regla con palabras: "avanzo si puedo Y no llegué".',
          'Reemplaza "y" por &&, "o" por ||, "no" por !.',
          'Agrupa con paréntesis lo que va junto.',
          'Prueba mentalmente los casos verdadero y falso.',
          'Ejecuta y comprueba que decide bien en ambos.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Confundir && con ||. Con && deben cumplirse TODAS; con || basta UNA. Si tu condición se cumple demasiado seguido, probablemente pusiste || donde iba &&.',
      },
    ],
  },
  6: {
    titulo: 'Algoritmos de recorrido',
    subtitulo: 'Estrategias para no perderse',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un algoritmo?',
        texto: 'Un algoritmo es una receta que resuelve un tipo de problema, no un caso particular. La regla de la mano derecha resuelve cualquier laberinto conectado, sin importar su forma.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Si entras a un laberinto y siempre mantienes la mano derecha tocando la pared, tarde o temprano llegas a la salida. No necesitas ver el mapa: la regla se encarga.',
      },
      {
        tipo: 'codigo',
        titulo: 'La regla de la mano derecha',
        texto: 'En cada paso: intenta girar a la derecha; si no puedes, sigue derecho; si tampoco, gira a la izquierda. Repite hasta llegar.',
        codigo: 'while (!enMeta()) {\n  girarDerecha();\n  if (puedeAvanzar()) { avanzar(); continue; }\n  girarIzquierda();\n  if (puedeAvanzar()) { avanzar(); continue; }\n  girarIzquierda();\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Los robots de rescate exploran edificios así. Un GPS usa algoritmos de recorrido más avanzados para hallar la ruta más corta entre millones de calles.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Un buen algoritmo se prueba primero en papel, con el caso más pequeño posible.',
        pasos: [
          'Entiende la regla general antes de escribirla.',
          'Pruébala con el dedo en un laberinto pequeño.',
          'Tradúcela a código, una regla por línea.',
          'Agrega un límite de vueltas por seguridad.',
          'Prueba en un laberinto distinto: debe funcionar igual.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Programar la solución de ESTE laberinto en lugar del algoritmo general. Funciona una vez y falla en el siguiente nivel. Un algoritmo bueno no conoce el mapa.',
      },
    ],
  },
  7: {
    titulo: 'Optimización extrema',
    subtitulo: 'Cada instrucción cuenta',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Eficiencia',
        texto: 'Dos programas correctos pueden costar muy distinto. Aquí no basta con llegar a la meta: hay que llegar con el mínimo de instrucciones. Ese límite es el que te da la tercera estrella.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Buscar una palabra en el diccionario hoja por hoja funciona, pero abrir por la mitad y descartar media guía es incomparablemente más rápido. El resultado es el mismo; el costo, no.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Girar tres veces a la derecha equivale a girar una vez a la izquierda. Detectar estas equivalencias es la esencia de optimizar.',
        codigo: '// 3 instrucciones\ngirarDerecha(); girarDerecha(); girarDerecha();\n\n// 1 instrucción, mismo resultado\ngirarIzquierda();',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Las empresas ahorran millones optimizando código que corre miles de millones de veces al día. En tu celular, un código eficiente significa que la batería dura más.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Se optimiza midiendo, no adivinando.',
        pasos: [
          'Resuelve el nivel y anota cuántas instrucciones usaste.',
          'Compara con el máximo que pide la tercera estrella.',
          'Busca movimientos que se cancelan entre sí.',
          'Convierte repeticiones en bucles.',
          'Vuelve a medir: si no bajó, prueba otra estrategia.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Romper una solución que ya funcionaba por optimizar sin probar. Cambia una cosa, ejecuta, confirma. Después la siguiente.',
      },
    ],
  },
  8: {
    titulo: 'Descomposición en funciones',
    subtitulo: 'Divide y vencerás',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Crear tus propias funciones',
        texto: 'Cuando un programa crece, agrupar instrucciones en funciones con nombre lo vuelve legible. En vez de cuarenta líneas seguidas, tienes tres funciones que se llaman entre sí y se leen como un texto.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Una receta no dice "bate el huevo, agrega harina, revuelve…" en cada paso: dice "prepara la mezcla". Ese nombre resume veinte acciones y todos entienden.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Se define una vez y se usa cuantas veces quieras. Si mañana quieres cambiar cómo gira, lo cambias en un solo lugar.',
        codigo: 'function girarYAvanzar() {\n  girarDerecha();\n  avanzar();\n}\n\ngirarYAvanzar();\ngirarYAvanzar();',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un programa profesional tiene miles de funciones pequeñas. Cada una hace una cosa, se prueba sola y se reutiliza. Así trabajan los equipos: cada quien su función.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Si te descubres copiando y pegando código, ahí hay una función esperando nacer.',
        pasos: [
          'Detecta un grupo de instrucciones que se repite.',
          'Dale un nombre que diga qué hace, no cómo.',
          'Enciérralo en function nombre() { … }.',
          'Reemplaza cada repetición por una llamada.',
          'Ejecuta: el comportamiento debe ser idéntico.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Definir la función y olvidar llamarla. Definir es escribir la receta; llamar es cocinarla. Sin los paréntesis de la llamada, no pasa absolutamente nada.',
      },
    ],
  },
  9: {
    titulo: 'Patrones de código',
    subtitulo: 'Soluciones que se repiten',
    slides: [
      {
        tipo: 'concepto',
        titulo: '¿Qué es un patrón?',
        texto: 'Un patrón es una forma de resolver que aparece una y otra vez en problemas distintos. Reconocerlos es lo que separa a quien pelea con cada reto de quien dice "ah, esto ya lo sé hacer".',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'En ajedrez existen aperturas conocidas. No memorizas cada partida: reconoces la posición y sabes qué familia de jugadas funciona. En programación pasa lo mismo.',
      },
      {
        tipo: 'codigo',
        titulo: 'Tres patrones que ya conoces',
        texto: 'Acumulador, buscador y contador. Con estos tres resuelves una cantidad enorme de problemas.',
        codigo: '// Acumulador: sumar todo\nlet suma = 0;\nfor (const n of lista) suma += n;\n\n// Buscador: el mayor\nlet mayor = lista[0];\nfor (const n of lista) if (n > mayor) mayor = n;\n\n// Contador: cuántos cumplen\nlet pares = 0;\nfor (const n of lista) if (n % 2 === 0) pares += 1;',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'El total de una factura es un acumulador. El producto más caro es un buscador. Cuántos estudiantes aprobaron es un contador. Los verás en todos lados una vez que sepas mirarlos.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Antes de inventar, pregúntate a cuál patrón conocido se parece este problema.',
        pasos: [
          'Lee el problema y busca el verbo: sumar, contar, buscar, filtrar.',
          'Identifica el patrón que corresponde a ese verbo.',
          'Adapta el esqueleto del patrón a tus datos.',
          'Ajusta el valor inicial de la variable.',
          'Prueba con un caso pequeño que puedas verificar a mano.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Inicializar el buscador del mayor en 0. Si todos los números son negativos, el resultado será 0, que ni siquiera está en la lista. Empieza siempre con el primer elemento real.',
      },
    ],
  },
  10: {
    titulo: 'Retos combinados',
    subtitulo: 'Varias técnicas a la vez',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Problemas de varias capas',
        texto: 'Los retos reales rara vez piden una sola técnica. Piden recorrer y decidir y contar, todo junto. La habilidad clave es separar el problema en capas y atacar una a la vez.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Organizar un viaje combina presupuesto, fechas, transporte y hospedaje. Nadie lo resuelve de un tirón: se avanza por partes y cada decisión condiciona la siguiente.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Recorrido, decisión y conteo trabajando juntos en un mismo bucle, cada uno en su línea.',
        codigo: 'let gemas = 0;\nlet pasos = 0;\n\nwhile (!enMeta() && pasos < 200) {\n  if (hayGema()) { recoger(); gemas += 1; }\n  if (puedeAvanzar()) avanzar();\n  else girarDerecha();\n  pasos += 1;\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un sistema de entregas calcula rutas, revisa inventario y cuenta tiempos a la vez. Cada parte es sencilla; el mérito está en hacerlas convivir sin estorbarse.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Una capa a la vez, probando entre capa y capa.',
        pasos: [
          'Lista las cosas distintas que pide el reto.',
          'Ordénalas de la más simple a la más compleja.',
          'Resuelve y prueba la primera sola.',
          'Agrega la segunda sin romper la primera.',
          'Al final revisa que ninguna capa interfiera con otra.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Intentar todo a la vez y quedar con un código imposible de depurar. Si llevas veinte minutos sin que nada funcione, borra y vuelve a empezar por la parte más pequeña.',
      },
    ],
  },
  11: {
    titulo: 'Estrategia de examen',
    subtitulo: 'Repaso y método',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Todo lo aprendido',
        texto: 'Este mundo reúne secuencias, bucles, condicionales, sensores, variables, funciones y algoritmos. No hay técnica nueva: hay que elegir bien cuál usar en cada caso.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Un mecánico experto no conoce herramientas secretas: conoce las mismas que todos, pero sabe exactamente cuál tomar en cada momento. Eso es lo que se evalúa aquí.',
      },
      {
        tipo: 'codigo',
        titulo: 'Guía rápida de decisión',
        texto: 'Cuando dudes qué usar, esta tabla mental resuelve casi todo.',
        codigo: '// ¿Sé cuántas veces?      → for\n// ¿Depende de algo?       → while\n// ¿Hay que elegir?        → if / else\n// ¿Necesito recordar?     → variable\n// ¿Se repite el código?   → función',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'En cualquier entrevista técnica o examen de programación evalúan exactamente esto: si puedes elegir la herramienta correcta y explicar por qué.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Método antes que velocidad. Los que van más rápido son los que primero piensan.',
        pasos: [
          'Lee el reto dos veces antes de tocar el teclado.',
          'Decide qué herramientas necesitas.',
          'Escribe el esqueleto sin detalles.',
          'Rellena y ejecuta por partes.',
          'Al terminar, revisa si puedes acortarlo.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Ir directo al teclado por los nervios. Dos minutos de lectura ahorran veinte de corrección. Si te bloqueas, vuelve al enunciado: la pista casi siempre está ahí.',
      },
    ],
  },
  12: {
    titulo: 'Algoritmos clásicos',
    subtitulo: 'Buscar, ordenar, comparar',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Los algoritmos de siempre',
        texto: 'Buscar un elemento, hallar el máximo, ordenar una lista, invertir datos. Son problemas resueltos hace décadas y todo programador los conoce. Aprenderlos te da un repertorio que sirve para siempre.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Ordenar cartas en la mano es un algoritmo: tomas una y la insertas donde corresponde. Lo haces sin pensar, pero es exactamente el algoritmo de inserción.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Buscar el máximo recorriendo una sola vez. Fíjate en el valor inicial: el primer elemento, no cero.',
        codigo: 'function maximo(lista) {\n  let mayor = lista[0];\n  for (const n of lista) {\n    if (n > mayor) mayor = n;\n  }\n  return mayor;\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Ordenar productos por precio, buscar un contacto, encontrar la nota más alta del curso. Detrás de cada botón de "ordenar por" hay uno de estos algoritmos.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Los casos borde son los que separan una solución que pasa de una que falla.',
        pasos: [
          'Lee los casos de prueba con atención.',
          'Resuelve primero el caso normal.',
          'Piensa en los bordes: lista vacía, un solo elemento, negativos.',
          'Escribe la función y devuelve con return.',
          'Ejecuta y revisa qué caso falló exactamente.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'No contemplar la lista vacía. Acceder a lista[0] cuando no hay elementos rompe el programa. Pregúntate siempre qué pasa si no viene nada.',
      },
    ],
  },
  13: {
    titulo: 'Retos de programador',
    subtitulo: 'Problemas tipo entrevista',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Pensar antes de codear',
        texto: 'En estos retos el enunciado es corto pero la solución exige pensar. Se evalúa cómo razonas, no cuánto código escribes. Muchas veces la solución son cuatro líneas bien pensadas.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Un acertijo de lógica no se resuelve escribiendo más: se resuelve encontrando la idea. Una vez la tienes, escribirla toma un minuto.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Contar vocales parece pedir un if enorme. Con includes queda en tres líneas.',
        codigo: 'function contarVocales(s) {\n  let n = 0;\n  for (const c of s.toLowerCase()) {\n    if ("aeiou".includes(c)) n += 1;\n  }\n  return n;\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Así son las entrevistas técnicas de las empresas de tecnología. Te dan un problema pequeño y observan cómo lo desarmas, qué preguntas haces y cómo pruebas tu solución.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Resuélvelo primero a mano. Si no lo puedes hacer en papel, tampoco lo vas a programar.',
        pasos: [
          'Resuelve el primer caso de prueba con lápiz y papel.',
          'Escribe con palabras los pasos que seguiste.',
          'Traduce esos pasos a código, uno por uno.',
          'Ejecuta con el caso más simple.',
          'Solo entonces prueba los casos difíciles.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Empezar a escribir sin entender el problema. Si no puedes explicar con tus palabras qué se te pide, todavía no estás listo para programarlo.',
      },
    ],
  },
  14: {
    titulo: 'Cadenas y listas',
    subtitulo: 'Trabajar con datos',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Texto y colecciones',
        texto: 'Una cadena es una secuencia de caracteres; una lista, una secuencia de elementos. Ambas se recorren, se cortan y se transforman. Es el tipo de dato que más vas a manipular en tu vida.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Un nombre completo es una cadena que puedes partir en nombre y apellido. Una lista de compras es un arreglo al que agregas, quitas y ordenas elementos.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'split parte, reverse invierte, join une. Encadenar tres operaciones simples resuelve algo que parecía complicado.',
        codigo: 'function invertirPalabras(frase) {\n  return frase.split(" ").reverse().join(" ");\n}\n\ninvertirPalabras("hola mundo feliz");\n// "feliz mundo hola"',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Un buscador parte tu frase en palabras. Un corrector compara cadenas. Toda lista que ves en una app (mensajes, canciones, productos) es un arreglo recorrido con un bucle.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Divide la transformación en pasos pequeños y verifica cada uno.',
        pasos: [
          'Escribe qué entra y qué debe salir, con un ejemplo real.',
          'Piensa la transformación en pasos: partir, cambiar, unir.',
          'Aplica un paso y comprueba el resultado intermedio.',
          'Encadena los pasos cuando cada uno funcione.',
          'Prueba con texto vacío y con una sola palabra.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Olvidar que los índices empiezan en 0. El primer carácter es la posición 0 y el último es longitud menos 1. Pedir la posición igual a la longitud siempre da error.',
      },
    ],
  },
  15: {
    titulo: 'Retos avanzados',
    subtitulo: 'Eficiencia y casos borde',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Correcto no siempre basta',
        texto: 'En este nivel una solución debe ser correcta, eficiente y resistente. Correcta: da el resultado bueno. Eficiente: no desperdicia trabajo. Resistente: no se rompe con entradas raras.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Un puente que aguanta un carro está bien. Uno que aguanta un camión, la lluvia y un temblor está bien diseñado. El software serio se juzga igual.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'La primera versión hace el trabajo dos veces. La segunda resuelve todo en un solo recorrido.',
        codigo: '// Dos recorridos\nfunction promedioA(l) {\n  let s = 0;\n  for (const n of l) s += n;\n  return s / l.length;\n}\n\n// Uno solo, y protegido\nfunction promedioB(l) {\n  if (l.length === 0) return 0;\n  let s = 0;\n  for (const n of l) s += n;\n  return s / l.length;\n}',
        lenguaje: 'javascript',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Los sistemas que procesan millones de datos por segundo viven de esto. Un algoritmo lento no es un detalle: es la diferencia entre que el servicio funcione o se caiga.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Primero correcto, después rápido, siempre protegido.',
        pasos: [
          'Haz que funcione con el caso normal.',
          'Agrega las protecciones: vacío, uno solo, negativos.',
          'Cuenta cuántas veces recorres los datos.',
          'Busca si puedes hacerlo en un solo recorrido.',
          'Vuelve a ejecutar todas las pruebas.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Optimizar antes de que funcione. Un código rápido que da mal resultado no sirve para nada. El orden es: correcto, protegido, y solo al final eficiente.',
      },
    ],
  },
};

// ────────────────────────────────────────────────────────────────────────────
// PYTHON — lenguaje real
// ────────────────────────────────────────────────────────────────────────────

const PY: Record<number, { titulo: string; subtitulo: string; slides: SlidesTema }> = {
  1: {
    titulo: 'Python: primeros pasos',
    subtitulo: 'def, return e indentación',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Python de verdad',
        texto: 'Aquí escribes Python real, el mismo que se usa en inteligencia artificial, ciencia de datos y páginas web. Se ejecuta de verdad en tu navegador: no es una simulación.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Lo que lo hace distinto',
        texto: 'Python no usa llaves ni punto y coma. Usa la sangría: lo que está indentado hacia adentro pertenece al bloque. Eso lo hace muy legible, pero exige cuidado con los espacios.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'def crea la función, los dos puntos abren el bloque y la sangría de cuatro espacios marca qué está adentro. return entrega el resultado.',
        codigo: 'def sumar(a, b):\n    return a + b\n\nsumar(2, 3)   # 5',
        lenguaje: 'python',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Python mueve buena parte de la inteligencia artificial del mundo, analiza datos científicos y automatiza tareas. Es de los lenguajes más pedidos en el mercado laboral.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'La estructura de una función en Python siempre es la misma. Apréndela y el resto es contenido.',
        pasos: [
          'Escribe def, el nombre y los paréntesis con los parámetros.',
          'Termina la línea con dos puntos.',
          'Indenta el cuerpo con cuatro espacios.',
          'Calcula el resultado dentro del cuerpo.',
          'Devuélvelo con return.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Mezclar espacios y tabulaciones, o indentar de forma despareja. Python es estricto: usa siempre cuatro espacios y sé consistente en todo el archivo.',
      },
    ],
  },
  2: {
    titulo: 'Python: lógica y números',
    subtitulo: 'Operadores y condicionales',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Operar y decidir',
        texto: 'Python trae operadores muy útiles: % da el residuo de una división y // da la división entera. Con ellos resuelves pares, impares, múltiplos y conversiones sin complicarte.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Repartir 17 dulces entre 5 niños: cada uno recibe 3 (eso es //) y sobran 2 (eso es %). Lo haces mentalmente desde niño; Python le pone nombre.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'El residuo cero significa división exacta. Es la forma estándar de saber si un número es par.',
        codigo: 'def es_par(n):\n    return n % 2 == 0\n\ndef clasificar(n):\n    if n > 0:\n        return "positivo"\n    elif n < 0:\n        return "negativo"\n    return "cero"',
        lenguaje: 'python',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'El residuo sirve para alternar colores de filas, repartir turnos, validar números de identificación y convertir segundos en minutos y horas.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'En Python, una condición que devuelve verdadero o falso se puede retornar directamente.',
        pasos: [
          'Escribe la regla con palabras.',
          'Elige el operador: %, //, >, <, ==.',
          'Si la respuesta es sí o no, retorna la comparación directa.',
          'Si hay varios casos, usa if / elif / else.',
          'Prueba con un positivo, un negativo y el cero.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Escribir if n = 0 en lugar de if n == 0. Un igual asigna, dos comparan. Python te avisará con un error de sintaxis, pero conviene tenerlo claro desde el principio.',
      },
    ],
  },
  3: {
    titulo: 'Python: cadenas y listas',
    subtitulo: 'split, join y rebanadas',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Manipular texto y listas',
        texto: 'Python destaca por lo cómodo que resulta trabajar con texto y listas. Operaciones que en otros lenguajes toman diez líneas, aquí toman una.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Tomar una frase, separarla en palabras, reordenarlas y volver a unirlas es como recortar palabras de un periódico y pegarlas en otro orden.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'La rebanada [::-1] invierte cualquier secuencia. Es uno de los trucos más queridos de Python.',
        codigo: 'def invertir_frase(s):\n    return " ".join(s.split()[::-1])\n\ninvertir_frase("hola mundo feliz")\n# "feliz mundo hola"',
        lenguaje: 'python',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Procesar textos, limpiar datos de una encuesta, leer archivos CSV o analizar comentarios de redes sociales. Es el pan de cada día de la ciencia de datos.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Prueba cada transformación por separado antes de encadenarlas.',
        pasos: [
          'Escribe la entrada y la salida esperada con un ejemplo.',
          'Separa con split() si necesitas palabras.',
          'Transforma la lista resultante.',
          'Une de nuevo con join() si la salida es texto.',
          'Prueba con una sola palabra y con texto vacío.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Escribir s.split(" ") cuando hay espacios dobles: aparecen elementos vacíos. Usar split() sin argumentos maneja cualquier cantidad de espacios sin problema.',
      },
    ],
  },
  4: {
    titulo: 'Python: algoritmos',
    subtitulo: 'Bucles y acumuladores',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Recorrer en Python',
        texto: 'El for de Python recorre directamente los elementos, sin índices ni contadores. Se lee casi como una frase en inglés y hace mucho más difícil equivocarse.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'En vez de decir "toma el elemento en la posición 0, luego el 1, luego el 2", Python dice "para cada elemento de la lista". Mucho más natural.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Un acumulador clásico, con su protección para la lista vacía.',
        codigo: 'def promedio(lista):\n    if len(lista) == 0:\n        return 0\n    total = 0\n    for n in lista:\n        total += n\n    return total / len(lista)',
        lenguaje: 'python',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Calcular promedios de notas, totales de ventas, estadísticas de un experimento. Cualquier análisis de datos empieza recorriendo y acumulando.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Acumulador afuera, actualización adentro, resultado al final.',
        pasos: [
          'Declara el acumulador antes del for.',
          'Recorre con for elemento in lista.',
          'Actualiza el acumulador dentro del bucle.',
          'Retorna el resultado después del bucle.',
          'Protege el caso de la lista vacía.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Poner el return dentro del bucle: la función termina en la primera vuelta y solo procesa un elemento. Revisa la sangría del return con mucho cuidado.',
      },
    ],
  },
  5: {
    titulo: 'Python: retos reales',
    subtitulo: 'Problemas aplicados',
    slides: [
      {
        tipo: 'concepto',
        titulo: 'Programar para resolver',
        texto: 'Estos retos vienen de situaciones reales: validar datos, calcular precios, procesar información. Ya no se trata de aprender sintaxis, sino de usarla para resolver algo que importa.',
      },
      {
        tipo: 'ejemplo',
        titulo: 'Ejemplo general',
        texto: 'Calcular el precio final con descuento e impuesto es un problema real. Tiene reglas, casos especiales y un resultado que debe ser exacto: si te equivocas, alguien paga de más.',
      },
      {
        tipo: 'codigo',
        titulo: 'Ejemplo en código',
        texto: 'Fíjate en la validación al inicio: los datos reales vienen sucios y hay que protegerse.',
        codigo: 'def precio_final(precio, descuento):\n    if precio < 0 or descuento < 0 or descuento > 100:\n        return 0\n    return round(precio * (1 - descuento / 100), 2)\n\nprecio_final(50000, 20)   # 40000.0',
        lenguaje: 'python',
      },
      {
        tipo: 'aplicacion',
        titulo: '¿Dónde se usa?',
        texto: 'Esto es literalmente lo que hace un programador todos los días: traducir reglas del negocio a código que funcione siempre, incluso cuando le llegan datos inesperados.',
      },
      {
        tipo: 'pasos',
        titulo: 'Paso a paso para resolver',
        texto: 'Entiende la regla completa antes de programar, incluidas sus excepciones.',
        pasos: [
          'Lee el enunciado e identifica la regla principal.',
          'Anota las excepciones y los límites.',
          'Programa primero la regla principal.',
          'Agrega las validaciones al inicio de la función.',
          'Prueba con datos normales y con datos absurdos.',
        ],
      },
      {
        tipo: 'aviso',
        titulo: 'Error común',
        texto: 'Confiar en que los datos siempre llegan bien. En el mundo real llegan vacíos, negativos o con texto donde iba un número. Un buen programa lo prevé.',
      },
    ],
  },
};

const TEMAS: Record<string, Record<number, { titulo: string; subtitulo: string; slides: SlidesTema }>> = {
  programacion_md: MD,
  programacion_hl: HL,
  python: PY,
};

/** ¿Esta categoría tiene lecciones? */
export function tieneLeccion(categoria?: string | null): boolean {
  return !!categoria && categoria in TEMAS;
}

/**
 * Lección del mundo: las diapositivas del tema, con la ruta de audio de cada una.
 * Si un audio falta, la diapositiva se LEE (el texto siempre está en pantalla).
 */
export function leccionMundo(categoria: string, numeroOrden: number): Leccion | null {
  const tema = TEMAS[categoria]?.[numeroOrden];
  if (!tema) return null;

  const clave = `${categoria}-m${numeroOrden}`;
  return {
    clave,
    titulo: tema.titulo,
    subtitulo: tema.subtitulo,
    color: COLOR[categoria] ?? '#7C3AED',
    slides: tema.slides.map((s, i) => ({ ...s, audio: `/audio/lecciones/${clave}-s${i + 1}.mp3` })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// FICHA DEL NIVEL — explicación específica del reto, armada con sus propios datos
// ────────────────────────────────────────────────────────────────────────────

function contarCeldas(tilemap?: number[][]): number {
  if (!Array.isArray(tilemap)) return 0;
  return tilemap.reduce((n, fila) => n + fila.filter((c) => c === 0).length, 0);
}

/**
 * Ficha del reto concreto: qué hay que lograr aquí y con qué plan.
 * Se arma leyendo la config del nivel, así cada uno de los 310 niveles tiene su
 * explicación previa sin texto de relleno. Sin voz: la voz vive en la lección del tema.
 */
export function fichaNivel(config: any, mundoNombre: string): readonly Slide[] {
  const esCodigo = config?.tipo === 'codigo';
  const nombre = config?.nombre ?? 'este reto';

  if (esCodigo) {
    const tests = Array.isArray(config?.tests) ? config.tests : [];
    const ejemplo = tests[0];
    const firma = (config?.firma ?? '').trim();
    const lenguaje: 'javascript' | 'python' = config?.lenguaje === 'python' ? 'python' : 'javascript';

    const slides: Slide[] = [
      {
        tipo: 'concepto',
        titulo: `Tu reto: ${nombre}`,
        texto: config?.enunciado ?? 'Escribe la función y haz que pase todas las pruebas.',
        audio: null,
      },
    ];

    if (firma) {
      slides.push({
        tipo: 'codigo',
        titulo: 'Punto de partida',
        texto: `Escribe tu solución dentro de esta función y devuélvela con ${lenguaje === 'python' ? 'return' : 'return'}. El nombre y los parámetros no se cambian.`,
        codigo: firma,
        lenguaje,
        audio: null,
      });
    }

    if (ejemplo) {
      const args = Array.isArray(ejemplo.args) ? ejemplo.args : [];
      slides.push({
        tipo: 'ejemplo',
        titulo: 'Caso de prueba',
        texto: `Con esta entrada tu función debe devolver exactamente ese valor. Hay ${tests.length} ${tests.length === 1 ? 'prueba' : 'pruebas'} en total.`,
        codigo: `${config?.funcion ?? 'funcion'}(${args.map((a: unknown) => JSON.stringify(a)).join(', ')})\n// → ${JSON.stringify(ejemplo.esperado)}`,
        lenguaje,
        audio: null,
      });
    }

    slides.push({
      tipo: 'pasos',
      titulo: 'Tu plan',
      texto: 'Un método que funciona siempre: resolver a mano, escribir los pasos y recién entonces programar.',
      pasos: [
        'Resuelve el primer caso de prueba en papel.',
        'Escribe con palabras los pasos que seguiste.',
        'Tradúcelos a código dentro de la función.',
        'No olvides el return con el resultado.',
        'Ejecuta: las pruebas te dirán qué caso falla.',
      ],
      audio: null,
    });

    return slides;
  }

  // Reto de laberinto
  const celdas = contarCeldas(config?.tilemap);
  const objetivos = Array.isArray(config?.objetivos) ? config.objetivos : [];
  const opcionales = objetivos.filter((o: any) => o?.obligatorio === false);
  const comandos: string[] = Array.isArray(config?.comandos_permitidos) ? config.comandos_permitidos : [];
  const tresEstrellas = config?.criterios_estrella?.['3']?.max_instrucciones;

  const slides: Slide[] = [
    {
      tipo: 'concepto',
      titulo: `Tu reto: ${nombre}`,
      texto:
        config?.narracion?.intro ??
        `Lleva al héroe hasta la estrella ⭐ de ${mundoNombre} usando el código que escribas.`,
      audio: null,
    },
  ];

  const detalles: string[] = [];
  if (celdas > 0) detalles.push(`El camino tiene ${celdas} casillas libres.`);
  if (opcionales.length) detalles.push(`Hay ${opcionales.length} objetivo${opcionales.length > 1 ? 's' : ''} opcional${opcionales.length > 1 ? 'es' : ''} (💎) que suma${opcionales.length > 1 ? 'n' : ''} estrellas.`);
  if (tresEstrellas) detalles.push(`Para 3 estrellas necesitas ${tresEstrellas} instrucciones o menos.`);

  if (detalles.length) {
    slides.push({
      tipo: 'ejemplo',
      titulo: 'Qué tienes enfrente',
      texto: detalles.join(' '),
      audio: null,
    });
  }

  if (comandos.length) {
    slides.push({
      tipo: 'codigo',
      titulo: 'Comandos disponibles',
      texto: 'Estas son las instrucciones que puedes usar en este nivel. Las que terminan en pregunta te informan; las demás mueven al héroe.',
      codigo: comandos.map((c) => `${c}()`).join('\n'),
      lenguaje: 'javascript',
      audio: null,
    });
  }

  slides.push({
    tipo: 'pasos',
    titulo: 'Tu plan',
    texto: 'Piensa el recorrido completo antes de escribir. Programar es 80% pensar y 20% teclear.',
    pasos: [
      'Observa el mapa y ubica al héroe y la meta ⭐.',
      'Recorre el camino con el dedo y cuenta las casillas.',
      'Detecta si hay tramos que se repiten (ahí va un bucle).',
      'Escribe el código y ejecútalo.',
      'Si se detiene, mira en qué paso falló y ajusta.',
    ],
    audio: null,
  });

  return slides;
}
