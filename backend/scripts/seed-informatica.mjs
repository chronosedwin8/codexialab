// Materia "Introducción a la Informática": 10 unidades → 10 mundos × 10 actividades quiz.
// Sigue el temario provisto. Cada actividad: 3 preguntas de opción múltiple con explicación.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// q = [enunciado, correcta, [distractores], explicacion]
function toQuiz(r, q) {
  const opts = shuffle(r, [q[1], ...q[2]]).slice(0, 4);
  if (!opts.includes(q[1])) opts[0] = q[1];
  return { enunciado: q[0], opciones: opts.map(String), correcta: opts.indexOf(q[1]), explicacion: q[3] };
}

const UNIDADES = [
  { orden: 1, nombre: 'U1: Conceptos de Informática', icono: '💡', intro: '¡Bienvenido a Introducción a la Informática! Soy Astro. Empecemos por lo básico: ¿qué es la informática y para qué sirve?', banco: [
    ['¿Qué es la informática?', 'La ciencia que trata la información con computadoras', ['Un tipo de cocina', 'Un deporte', 'Un instrumento musical'], 'La informática estudia el tratamiento automático de la información usando computadoras.'],
    ['¿Qué máquina usamos principalmente en informática?', 'La computadora', ['La licuadora', 'La bicicleta', 'La lámpara'], 'La computadora es la herramienta principal de la informática.'],
    ['¿Qué significan las siglas TIC?', 'Tecnologías de la Información y la Comunicación', ['Tecnología de Internet y Cables', 'Trabajo en Computadora', 'Teléfonos Inteligentes y Cámaras'], 'TIC = Tecnologías de la Información y la Comunicación.'],
    ['¿Cuál es un uso de la informática?', 'Enviar un correo electrónico', ['Regar plantas con la mano', 'Cocinar un huevo', 'Caminar al parque'], 'Comunicarnos por correo es un uso típico de la informática.'],
    ['Otro nombre para la computadora es...', 'Ordenador', ['Refrigerador', 'Calculador de agua', 'Televisor'], 'En muchos países a la computadora se le llama ordenador.'],
    ['¿Cuál NO es informática?', 'Barrer el piso', ['Hacer una videollamada', 'Guardar fotos en el PC', 'Navegar en internet'], 'Barrer el piso no usa tecnología informática.'],
    ['La información es...', 'Datos que tienen significado', ['Cualquier ruido', 'Solo números sueltos', 'Un color'], 'La información son datos organizados que significan algo.'],
    ['¿Dónde se usa la informática?', 'En hospitales, bancos y escuelas', ['Solo en videojuegos', 'Solo en casas', 'En ningún lugar'], 'La informática se usa en casi todas las áreas de la sociedad.'],
    ['Con el tiempo, las computadoras se volvieron...', 'Más pequeñas y rápidas', ['Más grandes y lentas', 'Más pesadas', 'Iguales que antes'], 'La evolución hizo las computadoras más pequeñas, potentes y rápidas.'],
    ['Las TIC nos ayudan sobre todo a...', 'Comunicarnos a distancia', ['Dormir mejor', 'Correr más rápido', 'Cocinar'], 'Las TIC facilitan la comunicación y el acceso a la información.'],
    ['¿Quién procesa información muy rápido?', 'La computadora', ['El reloj de arena', 'Una regla', 'Un lápiz'], 'La computadora procesa grandes cantidades de datos rápidamente.'],
    ['La informática es importante porque...', 'Nos ayuda a guardar y procesar información', ['Hace ruido', 'Da calor', 'Pesa mucho'], 'Su importancia está en manejar la información de forma rápida y útil.'],
  ] },
  { orden: 2, nombre: 'U2: Hardware y Software', icono: '🖥️', intro: 'Toda computadora tiene dos partes: el hardware (lo que tocas) y el software (los programas). ¡Vamos a conocerlas!', banco: [
    ['El hardware es...', 'La parte física que puedes tocar', ['Los programas', 'Las ideas', 'La electricidad solamente'], 'El hardware es todo lo físico: teclado, pantalla, etc.'],
    ['El software es...', 'Los programas e instrucciones', ['El teclado', 'La pantalla', 'El cable'], 'El software son los programas que dicen a la computadora qué hacer.'],
    ['¿Cuál es un dispositivo de ENTRADA?', 'El teclado', ['El monitor', 'La impresora', 'El parlante'], 'El teclado mete información a la computadora: es de entrada.'],
    ['¿Cuál es un dispositivo de SALIDA?', 'El monitor', ['El teclado', 'El ratón', 'El micrófono'], 'El monitor muestra información: es de salida.'],
    ['¿Cuál es un dispositivo de ALMACENAMIENTO?', 'La memoria USB', ['El ratón', 'El parlante', 'La cámara'], 'La USB y el disco duro guardan información: son de almacenamiento.'],
    ['¿Cuál es el "cerebro" que procesa?', 'El procesador (CPU)', ['La pantalla', 'El teclado', 'El cable'], 'La CPU o procesador realiza los cálculos: es el cerebro.'],
    ['La impresora es un dispositivo de...', 'Salida', ['Entrada', 'Almacenamiento', 'Procesamiento'], 'La impresora saca la información en papel: es de salida.'],
    ['El micrófono es un dispositivo de...', 'Entrada', ['Salida', 'Almacenamiento', 'Pantalla'], 'El micrófono capta sonido hacia la computadora: es de entrada.'],
    ['¿Cuál de estos es hardware?', 'El teclado', ['Un videojuego', 'Windows', 'Una canción'], 'El teclado es físico, así que es hardware.'],
    ['¿Cuál de estos es software?', 'Un programa de dibujo', ['El monitor', 'La USB', 'El ratón'], 'Un programa es software; lo demás es hardware.'],
    ['Los altavoces o parlantes son de...', 'Salida', ['Entrada', 'Almacenamiento', 'Procesamiento'], 'Los parlantes producen sonido: son de salida.'],
    ['El disco duro sirve para...', 'Guardar archivos', ['Mostrar imágenes', 'Escribir letras', 'Hacer ruido'], 'El disco duro almacena los datos de la computadora.'],
  ] },
  { orden: 3, nombre: 'U3: Sistemas Operativos', icono: '🪟', intro: 'El sistema operativo es el programa jefe que controla toda la computadora. ¡Conozcamos los más famosos!', banco: [
    ['Un sistema operativo es...', 'El programa principal que controla la computadora', ['Un juego', 'Una impresora', 'Un cable'], 'El sistema operativo gestiona todo el equipo y los programas.'],
    ['¿Cuál es un sistema operativo?', 'Windows', ['Word', 'Chrome', 'YouTube'], 'Windows es un sistema operativo; los otros son aplicaciones.'],
    ['¿De qué empresa es macOS?', 'Apple', ['Microsoft', 'Google', 'Samsung'], 'macOS es el sistema operativo de Apple.'],
    ['¿De qué empresa es Windows?', 'Microsoft', ['Apple', 'Google', 'Sony'], 'Windows es de Microsoft.'],
    ['¿Para qué sirve el sistema operativo?', 'Para manejar archivos y programas', ['Para cocinar', 'Para hacer llamadas únicamente', 'Para nada'], 'Coordina el hardware, los archivos y los programas.'],
    ['Una carpeta sirve para...', 'Organizar archivos', ['Imprimir', 'Apagar el PC', 'Subir el volumen'], 'Las carpetas agrupan y ordenan los archivos.'],
    ['¿Cuál es un sistema operativo libre y gratuito?', 'Linux', ['Windows', 'macOS', 'Excel'], 'Linux es conocido por ser libre y gratuito.'],
    ['Para recuperar un archivo borrado lo buscas en...', 'La papelera', ['La impresora', 'El teclado', 'La nube de un amigo'], 'Los archivos borrados van a la papelera de reciclaje.'],
    ['El escritorio es...', 'La pantalla principal del sistema', ['Una mesa de madera', 'Un programa de dibujo', 'Un cable'], 'El escritorio es la primera pantalla que ves al encender.'],
    ['Guardar un archivo sirve para...', 'Conservarlo y usarlo después', ['Borrarlo', 'Apagar el PC', 'Imprimir siempre'], 'Guardar mantiene tu trabajo para más tarde.'],
    ['¿Qué administra los programas abiertos?', 'El sistema operativo', ['El monitor', 'El ratón', 'La impresora'], 'El sistema operativo controla qué programas se ejecutan.'],
    ['Una imagen suele guardarse con extensión...', '.jpg o .png', ['.exe', '.mp3', '.docx'], 'Las imágenes usan .jpg o .png; .exe es un programa.'],
  ] },
  { orden: 4, nombre: 'U4: Información Digital', icono: '🔢', intro: 'Las computadoras solo entienden ceros y unos. ¡Descubre cómo guardan la información en sistema binario!', banco: [
    ['¿Qué sistema usan las computadoras?', 'El binario (0 y 1)', ['El de letras', 'El de colores', 'El de dibujos'], 'Las computadoras trabajan con números binarios: 0 y 1.'],
    ['¿Cuántos dígitos usa el binario?', '2 (el 0 y el 1)', ['10', '5', '100'], 'El binario solo usa dos dígitos: 0 y 1.'],
    ['La unidad más pequeña de información es el...', 'Bit', ['Byte', 'Megabyte', 'Gigabyte'], 'El bit (0 o 1) es la unidad más pequeña.'],
    ['¿Cuántos bits tiene un byte?', '8 bits', ['2 bits', '10 bits', '100 bits'], 'Un byte está formado por 8 bits.'],
    ['¿Qué es más grande?', 'Megabyte (MB)', ['Kilobyte (KB)', 'Byte', 'Bit'], 'Orden: bit < byte < KB < MB.'],
    ['¿Qué es más grande, GB o MB?', 'Gigabyte (GB)', ['Megabyte (MB)', 'Son iguales', 'Kilobyte'], 'Un GB es mucho mayor que un MB.'],
    ['¿Qué es más grande, TB o GB?', 'Terabyte (TB)', ['Gigabyte (GB)', 'Son iguales', 'Megabyte'], 'Un TB es mayor que un GB.'],
    ['Ordena de menor a mayor:', 'Byte, KB, MB, GB', ['GB, MB, KB, Byte', 'KB, Byte, GB, MB', 'MB, GB, Byte, KB'], 'De menor a mayor: Byte < KB < MB < GB.'],
    ['El 0 y el 1 representan...', 'Apagado y encendido', ['Frío y caliente', 'Arriba y abajo', 'Rojo y azul'], 'En binario, 0 es apagado y 1 es encendido.'],
    ['Datos con significado forman...', 'Información', ['Ruido', 'Electricidad', 'Un color'], 'Cuando los datos tienen sentido, se convierten en información.'],
    ['1024 bytes son aproximadamente...', '1 kilobyte (KB)', ['1 megabyte', '1 bit', '1 gigabyte'], 'Aproximadamente 1024 bytes equivalen a 1 KB.'],
    ['Todo lo digital se basa en...', 'Números binarios', ['Dibujos', 'Sonidos', 'Colores'], 'Imágenes, textos y videos se guardan como binario.'],
  ] },
  { orden: 5, nombre: 'U5: Redes e Internet', icono: '🌐', intro: 'Internet conecta computadoras de todo el mundo. ¡Aprende cómo navegamos y nos comunicamos en la red!', banco: [
    ['Una red informática conecta...', 'Varias computadoras entre sí', ['Solo cables', 'Solo teléfonos viejos', 'Nada'], 'Una red une computadoras para compartir información.'],
    ['Internet es...', 'Una red mundial de computadoras', ['Un programa de dibujo', 'Una impresora', 'Un juego'], 'Internet es la red que conecta el mundo entero.'],
    ['Un navegador web sirve para...', 'Ver páginas de internet', ['Imprimir fotos', 'Cocinar', 'Guardar comida'], 'El navegador muestra las páginas web.'],
    ['¿Cuál es un navegador web?', 'Chrome', ['Excel', 'Word', 'Paint'], 'Chrome (o Firefox, Edge) son navegadores web.'],
    ['Un motor de búsqueda como Google sirve para...', 'Buscar información', ['Imprimir', 'Apagar el PC', 'Subir volumen'], 'Los buscadores ayudan a encontrar información en internet.'],
    ['El correo electrónico sirve para...', 'Enviar mensajes por internet', ['Hacer dibujos', 'Medir la temperatura', 'Cocinar'], 'El email permite enviar y recibir mensajes en línea.'],
    ['Guardar archivos "en la nube" es...', 'Guardarlos en internet', ['Guardarlos en el cielo', 'Borrarlos', 'Imprimirlos'], 'La nube guarda tus archivos en servidores de internet.'],
    ['Una videoconferencia es...', 'Una reunión por video a distancia', ['Una carta', 'Una foto', 'Un dibujo'], 'Permite ver y hablar con personas lejanas en tiempo real.'],
    ['La Web (WWW) es...', 'El conjunto de páginas de internet', ['Una marca de PC', 'Un tipo de cable', 'Un teclado'], 'La World Wide Web son las páginas que visitamos.'],
    ['Para entrar a una página escribes su...', 'Dirección (URL)', ['Color', 'Tamaño', 'Peso'], 'La URL es la dirección de una página web.'],
    ['Para conectarte a internet necesitas...', 'Una conexión de red', ['Una linterna', 'Una regla', 'Un lápiz'], 'Necesitas conexión (wifi o cable) para acceder a internet.'],
    ['Una plataforma colaborativa permite...', 'Trabajar juntos en línea', ['Dormir', 'Correr', 'Cocinar'], 'Permite que varias personas trabajen en lo mismo a la vez.'],
  ] },
  { orden: 6, nombre: 'U6: Seguridad Informática', icono: '🛡️', intro: 'En internet hay que cuidarse. ¡Aprende a crear contraseñas seguras y a protegerte de los peligros!', banco: [
    ['Una contraseña segura debe ser...', 'Larga y difícil de adivinar', ['Tu nombre', '1234', 'La palabra "hola"'], 'Una buena contraseña es larga y mezcla letras, números y símbolos.'],
    ['El phishing es...', 'Un engaño para robar tus datos', ['Un pez', 'Un juego', 'Un navegador'], 'El phishing engaña para que entregues información personal.'],
    ['Un virus informático es...', 'Un programa dañino', ['Un programa de dibujo', 'Una carpeta', 'Un cable'], 'Un virus es software malicioso que daña la computadora.'],
    ['¿Qué NO debes compartir nunca?', 'Tu contraseña', ['Tu color favorito', 'Tu comida favorita', 'Tu juego favorito'], 'La contraseña es secreta: no se comparte.'],
    ['El ransomware...', 'Secuestra tus archivos y pide dinero', ['Limpia el PC', 'Hace dibujos', 'Sube el volumen'], 'El ransomware bloquea tus archivos pidiendo un rescate.'],
    ['Si un correo desconocido pide tu contraseña...', 'No respondas y desconfía', ['Se la das rápido', 'La publicas', 'La gritas'], 'Nunca des tu contraseña a desconocidos.'],
    ['Un antivirus sirve para...', 'Proteger el PC de programas dañinos', ['Imprimir', 'Cocinar', 'Hacer música'], 'El antivirus detecta y elimina software malicioso.'],
    ['Una buena práctica de seguridad es...', 'No abrir enlaces sospechosos', ['Abrir todo lo que llega', 'Compartir tus claves', 'Apagar el antivirus'], 'Evitar enlaces sospechosos te protege de engaños.'],
    ['Un troyano se disfraza de...', 'Un programa bueno', ['Un animal', 'Una fruta', 'Un color'], 'El troyano parece útil pero hace daño escondido.'],
    ['¿Cuál es una contraseña MÁS segura?', 'Sol3#Luna9', ['1234', 'abcd', 'hola'], 'Mezclar mayúsculas, números y símbolos la hace más fuerte.'],
    ['La ciberseguridad protege...', 'La información y los equipos', ['Las plantas', 'La comida', 'La ropa'], 'La ciberseguridad cuida los datos y dispositivos.'],
    ['Si ves algo raro o peligroso en internet...', 'Avisa a un adulto de confianza', ['No dices nada', 'Lo compartes', 'Te enojas'], 'Siempre avisa a un adulto si algo te incomoda en línea.'],
  ] },
  { orden: 7, nombre: 'U7: Ofimática', icono: '📄', intro: 'Word, Excel, PowerPoint... ¡Conoce los programas que usamos para trabajar y estudiar en la computadora!', banco: [
    ['Un procesador de texto sirve para...', 'Escribir documentos', ['Editar videos', 'Medir el clima', 'Hacer llamadas'], 'Sirve para escribir cartas, informes y documentos.'],
    ['¿Cuál es un procesador de texto?', 'Word', ['Chrome', 'Paint', 'YouTube'], 'Microsoft Word es un procesador de texto.'],
    ['Una hoja de cálculo sirve para...', 'Hacer cuentas y tablas', ['Escribir cuentos', 'Editar fotos', 'Ver películas'], 'Las hojas de cálculo manejan números y tablas.'],
    ['¿Cuál es una hoja de cálculo?', 'Excel', ['Word', 'Chrome', 'Spotify'], 'Microsoft Excel es una hoja de cálculo.'],
    ['Una presentación digital sirve para...', 'Mostrar diapositivas', ['Hacer cuentas', 'Navegar internet', 'Imprimir fotos'], 'Sirve para exponer ideas con diapositivas.'],
    ['¿Cuál crea presentaciones?', 'PowerPoint', ['Excel', 'Word', 'Edge'], 'PowerPoint sirve para hacer presentaciones.'],
    ['Guardar un documento sirve para...', 'No perder tu trabajo', ['Borrarlo', 'Romperlo', 'Esconderlo'], 'Guardar conserva lo que hiciste.'],
    ['Trabajar en línea con otros se llama...', 'Trabajo colaborativo', ['Trabajo solitario', 'Juego', 'Descanso'], 'Es cuando varias personas trabajan juntas en línea.'],
    ['Para sumar muchos números rápido usas...', 'Una hoja de cálculo', ['Un procesador de texto', 'Un navegador', 'Una cámara'], 'Las hojas de cálculo suman automáticamente.'],
    ['Una diapositiva es parte de...', 'Una presentación', ['Una hoja de cálculo', 'Un correo', 'Un navegador'], 'Las diapositivas forman una presentación.'],
    ['Para escribir una carta usarías...', 'Un procesador de texto', ['Una hoja de cálculo', 'Un antivirus', 'Un navegador'], 'Las cartas se escriben en un procesador de texto.'],
    ['Las filas y columnas con datos están en...', 'La hoja de cálculo', ['La presentación', 'El navegador', 'El correo'], 'Las hojas de cálculo organizan datos en filas y columnas.'],
  ] },
  { orden: 8, nombre: 'U8: Ciudadanía Digital', icono: '🤝', intro: 'En internet también hay que portarse bien. ¡Aprende sobre tu huella digital y a respetar a los demás!', banco: [
    ['Tu identidad digital es...', 'Cómo te muestras en internet', ['Tu estatura', 'Tu peso', 'Tu color de ojos'], 'Es la imagen y datos que muestras de ti en línea.'],
    ['La huella digital es...', 'El rastro que dejas en internet', ['Una marca en el dedo', 'Un dibujo', 'Una contraseña'], 'Todo lo que haces en línea deja un rastro: tu huella digital.'],
    ['La netiqueta es...', 'Las normas de buen comportamiento en línea', ['Un programa', 'Un juego', 'Una red de pesca'], 'La netiqueta son las buenas maneras en internet.'],
    ['¿Está bien copiar el trabajo de otro sin permiso?', 'No, hay que respetar al autor', ['Sí, siempre', 'Solo los lunes', 'Si nadie ve'], 'Copiar sin permiso viola los derechos de autor.'],
    ['En internet debes tratar a los demás...', 'Con respeto', ['Con burlas', 'Con gritos', 'Ignorándolos'], 'El respeto es clave en la convivencia digital.'],
    ['Los derechos de autor protegen...', 'Las obras de sus creadores', ['Las contraseñas', 'Los cables', 'Las pantallas'], 'Protegen canciones, textos, dibujos, etc. de quien los creó.'],
    ['¿Debes publicar datos personales de otros?', 'No, sin su permiso', ['Sí, siempre', 'Solo fotos', 'Solo direcciones'], 'No se comparten datos de otros sin permiso.'],
    ['Usar la información de otros correctamente es...', 'Uso ético', ['Uso malo', 'Un virus', 'Un juego'], 'Dar crédito y pedir permiso es uso ético.'],
    ['Si alguien te molesta en línea debes...', 'Avisar a un adulto de confianza', ['Responder con insultos', 'No hacer nada', 'Apagar internet para siempre'], 'Ante el acoso, avisa a un adulto.'],
    ['Una licencia indica...', 'Cómo se puede usar una obra', ['El precio del PC', 'La marca del teclado', 'El color de la pantalla'], 'La licencia dice qué se permite hacer con una obra.'],
    ['Ser buen ciudadano digital es...', 'Respetar y cuidar a los demás en línea', ['Molestar a otros', 'Copiar todo', 'Compartir claves'], 'Implica respeto, responsabilidad y ética en línea.'],
    ['Lo que publicas en internet...', 'Puede quedar mucho tiempo', ['Desaparece al instante', 'Nunca se ve', 'Solo lo ves tú'], 'Tu huella digital puede permanecer por mucho tiempo.'],
  ] },
  { orden: 9, nombre: 'U9: Pensamiento Computacional', icono: '🧩', intro: 'Pensar como un programador: dividir problemas, buscar patrones y crear pasos. ¡El pensamiento computacional!', banco: [
    ['Descomponer un problema es...', 'Dividirlo en partes pequeñas', ['Hacerlo más grande', 'Ignorarlo', 'Borrarlo'], 'Descomponer = partir un problema grande en partes manejables.'],
    ['Reconocer patrones es...', 'Encontrar cosas que se repiten', ['Inventar colores', 'Borrar datos', 'Apagar el PC'], 'Los patrones son repeticiones que nos ayudan a resolver.'],
    ['La abstracción es...', 'Quedarse con lo importante e ignorar lo demás', ['Sumar todo', 'Copiar todo', 'Dibujar'], 'Abstraer = enfocarse en lo esencial.'],
    ['Un algoritmo es...', 'Una serie de pasos para resolver algo', ['Un dibujo', 'Un color', 'Un cable'], 'Un algoritmo es una secuencia de pasos ordenados.'],
    ['Un diagrama de flujo muestra...', 'Los pasos de un proceso con figuras', ['Una foto', 'Un mapa de calles', 'Una canción'], 'Los diagramas de flujo dibujan los pasos de un proceso.'],
    ['¿Qué haces primero con un problema grande?', 'Dividirlo en partes', ['Rendirte', 'Ignorarlo', 'Hacerlo más grande'], 'Primero se descompone en partes pequeñas.'],
    ['Una receta de cocina se parece a...', 'Un algoritmo', ['Un virus', 'Un cable', 'Una pantalla'], 'Una receta es una serie de pasos, como un algoritmo.'],
    ['Si el patrón es 2, 4, 6, 8... ¿qué sigue?', '10', ['9', '12', '7'], 'El patrón suma 2 cada vez: 8 + 2 = 10.'],
    ['El pensamiento computacional ayuda a...', 'Resolver problemas paso a paso', ['Dormir', 'Correr', 'Pintar paredes'], 'Es una forma ordenada de resolver problemas.'],
    ['En un diagrama de flujo, una decisión se dibuja como...', 'Un rombo', ['Un círculo', 'Una estrella', 'Un corazón'], 'El rombo representa una decisión (sí/no).'],
    ['Ordenar bien los pasos importa porque...', 'El orden cambia el resultado', ['No importa', 'Da igual siempre', 'Hace ruido'], 'Si cambias el orden, el resultado puede fallar.'],
    ['Abstraer un mapa es mostrar...', 'Solo las calles importantes', ['Cada piedra', 'Todos los colores', 'Cada hoja de árbol'], 'Abstraer un mapa = mostrar lo esencial, no cada detalle.'],
  ] },
  { orden: 10, nombre: 'U10: Tendencias Tecnológicas', icono: '🚀', intro: '¡El futuro ya está aquí! Inteligencia artificial, robots, realidad virtual... ¡Descubre las tecnologías que vienen!', banco: [
    ['La Inteligencia Artificial permite que las máquinas...', 'Aprendan y tomen decisiones', ['Se mojen', 'Duerman', 'Coman'], 'La IA hace que las máquinas aprendan y decidan.'],
    ['Un robot es...', 'Una máquina que puede hacer tareas', ['Un animal', 'Una fruta', 'Un color'], 'Un robot realiza tareas, a veces de forma automática.'],
    ['IoT (Internet de las Cosas) conecta...', 'Objetos cotidianos a internet', ['Solo computadoras viejas', 'Solo teléfonos', 'Nada'], 'El IoT conecta objetos como neveras o luces a internet.'],
    ['La computación en la nube guarda datos en...', 'Internet (servidores)', ['El cielo', 'Una caja', 'Un cuaderno'], 'La nube guarda datos en servidores accesibles por internet.'],
    ['La realidad virtual te sumerge en...', 'Un mundo digital con gafas', ['El mar', 'Un libro de papel', 'Una pintura'], 'Con gafas VR entras a mundos virtuales.'],
    ['La realidad aumentada...', 'Añade cosas digitales al mundo real', ['Borra el mundo real', 'Apaga la luz', 'Hace ruido'], 'La AR mezcla elementos digitales con lo que ves alrededor.'],
    ['Un asistente de voz como Alexa usa...', 'Inteligencia artificial', ['Un motor de gasolina', 'Magia', 'Pilas de reloj'], 'Los asistentes de voz funcionan con IA.'],
    ['Un carro que se maneja solo usa...', 'Inteligencia artificial', ['Un control remoto de TV', 'Una vela', 'Un imán'], 'Los autos autónomos usan IA para conducir.'],
    ['Una nevera conectada a internet es ejemplo de...', 'Internet de las Cosas (IoT)', ['Realidad virtual', 'Un virus', 'Una hoja de cálculo'], 'Es un objeto cotidiano conectado: IoT.'],
    ['Las tecnologías emergentes cambian...', 'La forma en que vivimos', ['El color del cielo', 'El sabor del agua', 'Nada'], 'Estas tecnologías transforman la sociedad.'],
    ['Guardar fotos en Google Fotos es usar...', 'La nube', ['Una impresora', 'Un robot', 'Una calculadora'], 'Google Fotos guarda tus imágenes en la nube.'],
    ['Las gafas de realidad virtual sirven para...', 'Ver mundos virtuales', ['Cocinar', 'Manejar un carro real', 'Imprimir'], 'Las gafas VR muestran entornos virtuales inmersivos.'],
  ] },
];

// ---------- Preguntas tipadas (variedad) por unidad ----------
const vf = (e, r, x) => ({ tipo: 'vf', enunciado: `¿Verdadero o Falso? "${e}"`, respuesta: r, explicacion: x });
const comp = (e, opciones, correcta, x) => ({ tipo: 'completar', enunciado: e, opciones, correcta, explicacion: x });
const ord = (e, items, x) => ({ tipo: 'ordenar', enunciado: e, items, explicacion: x });
const rel = (e, pares, x) => ({ tipo: 'relacionar', enunciado: e, pares, explicacion: x });
const agr = (e, grupos, x) => ({ tipo: 'agrupar', enunciado: e, grupos, explicacion: x });

const TYPED = {
  1: [
    vf('La computadora también se llama ordenador.', true, 'Sí, "ordenador" es otro nombre de la computadora.'),
    comp('Las TIC son Tecnologías de la ___ y la Comunicación.', ['Información', 'Imaginación', 'Industria'], 0, 'TIC = Tecnologías de la Información y la Comunicación.'),
    agr('Clasifica: ¿es informática o no?', { 'Es informática': ['enviar un correo', 'navegar en internet'], 'No es informática': ['barrer el piso', 'regar plantas'] }, 'La informática usa computadoras para tratar información.'),
    rel('Relaciona cada cosa con lo que hace', [['Computadora', 'Procesa datos'], ['Internet', 'Conecta el mundo'], ['TIC', 'Comunican información']], 'Cada elemento cumple su función.'),
  ],
  2: [
    agr('Clasifica en Hardware o Software', { Hardware: ['teclado', 'monitor', 'ratón'], Software: ['Windows', 'un juego', 'Word'] }, 'Hardware = físico; Software = programas.'),
    vf('El software es la parte física que puedes tocar.', false, 'No: el software son los programas; lo físico es el hardware.'),
    rel('Relaciona el dispositivo con su tipo', [['Teclado', 'Entrada'], ['Monitor', 'Salida'], ['USB', 'Almacenamiento']], 'Cada dispositivo tiene su función.'),
    comp('El ___ es el cerebro que procesa la información.', ['procesador', 'monitor', 'teclado'], 0, 'El procesador (CPU) realiza los cálculos.'),
  ],
  3: [
    rel('Relaciona el sistema con su empresa', [['Windows', 'Microsoft'], ['macOS', 'Apple'], ['Linux', 'Libre/gratuito']], 'Cada sistema operativo tiene su origen.'),
    vf('Word es un sistema operativo.', false, 'No, Word es una aplicación; Windows es el sistema operativo.'),
    agr('Clasifica', { 'Sistemas operativos': ['Windows', 'Linux', 'macOS'], Aplicaciones: ['Word', 'Chrome', 'Excel'] }, 'Los sistemas operativos controlan el equipo; las apps son programas.'),
    comp('Para recuperar un archivo borrado lo buscas en la ___.', ['papelera', 'impresora', 'pantalla'], 0, 'Los archivos borrados van a la papelera.'),
  ],
  4: [
    ord('Ordena de MENOR a MAYOR', ['Bit', 'Byte', 'Kilobyte', 'Megabyte'], 'Orden: Bit < Byte < KB < MB.'),
    vf('Un byte tiene 8 bits.', true, 'Correcto, 1 byte = 8 bits.'),
    comp('Las computadoras usan el sistema ___ (0 y 1).', ['binario', 'decimal', 'romano'], 0, 'El binario solo usa 0 y 1.'),
    ord('Ordena las unidades de menor a mayor', ['Megabyte', 'Gigabyte', 'Terabyte'], 'MB < GB < TB.'),
  ],
  5: [
    rel('Relaciona', [['Chrome', 'Navegador'], ['Google', 'Buscador'], ['Gmail', 'Correo']], 'Cada herramienta tiene su uso.'),
    vf('Internet es una red mundial de computadoras.', true, 'Sí, conecta computadoras de todo el mundo.'),
    agr('Clasifica', { Navegadores: ['Chrome', 'Firefox', 'Edge'], Buscadores: ['Google', 'Bing', 'Yahoo'] }, 'Los navegadores muestran webs; los buscadores encuentran información.'),
    comp('Para entrar a una página escribes su ___.', ['dirección (URL)', 'color', 'tamaño'], 0, 'La URL es la dirección de la página.'),
  ],
  6: [
    vf('Debes compartir tu contraseña con desconocidos.', false, 'Nunca compartas tu contraseña.'),
    comp('El ___ es un engaño para robar tus datos.', ['phishing', 'byte', 'navegador'], 0, 'El phishing engaña para robar información.'),
    agr('Clasifica el comportamiento', { Seguro: ['Usar antivirus', 'Contraseña larga'], Peligroso: ['Abrir enlaces raros', 'Dar tu clave'] }, 'Protege tu seguridad evitando lo peligroso.'),
    rel('Relaciona la amenaza', [['Virus', 'Programa dañino'], ['Phishing', 'Engaño'], ['Ransomware', 'Secuestra archivos']], 'Cada amenaza actúa diferente.'),
  ],
  7: [
    rel('Relaciona el programa con su uso', [['Word', 'Escribir textos'], ['Excel', 'Hacer cuentas'], ['PowerPoint', 'Presentaciones']], 'Cada programa de ofimática tiene su función.'),
    vf('Excel sirve para hacer cuentas y tablas.', true, 'Correcto, Excel es una hoja de cálculo.'),
    agr('Clasifica el programa', { 'Para escribir': ['Word', 'documentos'], 'Para calcular': ['Excel', 'tablas'] }, 'Word para texto, Excel para cálculos.'),
    comp('Una ___ sirve para mostrar diapositivas.', ['presentación', 'hoja de cálculo', 'carta'], 0, 'Las presentaciones muestran diapositivas.'),
  ],
  8: [
    vf('Está bien copiar el trabajo de otro sin permiso.', false, 'No, hay que respetar los derechos de autor.'),
    comp('La ___ digital es el rastro que dejas en internet.', ['huella', 'firma', 'imagen'], 0, 'La huella digital es tu rastro en línea.'),
    agr('Clasifica el comportamiento en línea', { Correcto: ['Respetar a otros', 'Pedir permiso'], Incorrecto: ['Insultar', 'Copiar sin permiso'] }, 'Sé un buen ciudadano digital.'),
    rel('Relaciona el concepto', [['Netiqueta', 'Normas en línea'], ['Huella digital', 'Rastro en internet'], ['Identidad digital', 'Cómo te ven']], 'Cada concepto de ciudadanía digital.'),
  ],
  9: [
    rel('Relaciona el concepto', [['Descomponer', 'Dividir en partes'], ['Patrón', 'Algo que se repite'], ['Algoritmo', 'Pasos para resolver']], 'Conceptos del pensamiento computacional.'),
    ord('Ordena los pasos para resolver un problema', ['Entender el problema', 'Dividirlo en partes', 'Crear los pasos', 'Probar la solución'], 'Así se resuelve un problema paso a paso.'),
    vf('Un algoritmo es una serie de pasos para resolver algo.', true, 'Correcto, es una secuencia de pasos.'),
    comp('En un diagrama de flujo, una decisión se dibuja como un ___.', ['rombo', 'círculo', 'corazón'], 0, 'El rombo representa una decisión.'),
  ],
  10: [
    rel('Relaciona la tecnología', [['IA', 'Máquinas que aprenden'], ['IoT', 'Objetos conectados'], ['Nube', 'Datos en internet']], 'Cada tecnología emergente.'),
    agr('Clasifica los ejemplos', { 'Inteligencia Artificial': ['Asistente de voz', 'Auto autónomo'], 'Internet de las Cosas': ['Nevera conectada', 'Luz inteligente'] }, 'IA = aprende; IoT = objetos conectados.'),
    vf('La realidad virtual te sumerge en un mundo digital.', true, 'Sí, con gafas de realidad virtual.'),
    comp('Guardar fotos en internet es usar la ___.', ['nube', 'tijera', 'vela'], 0, 'La nube guarda datos en internet.'),
  ],
};

// Construye las 3 preguntas de una actividad mezclando opción + tipadas
function construirPreguntas(u, a) {
  const bank = u.banco, typed = TYPED[u.orden] || [];
  const nb = bank.length, nt = typed.length;
  const i0 = ((a - 1) * 2) % nb;
  const oq = (slot) => toQuiz(rng(u.orden * 100000 + a * 1000 + slot * 17), bank[(i0 + slot) % nb]);
  if (!nt) return [0, 1, 2].map((i) => toQuiz(rng(u.orden * 100000 + a * 1000 + i * 17), bank[((a - 1) * 3 + i) % nb]));
  return (a % 2 === 1)
    ? [typed[(a - 1) % nt], oq(0), oq(1)]
    : [oq(0), typed[(a - 1) % nt], typed[a % nt]];
}

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);

  for (const u of UNIDADES) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#0891B2','#06B6D4','informatica',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10
       RETURNING id`,
      [u.nombre, `Introducción a la Informática — ${u.nombre}`, u.orden, u.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const preguntas = construirPreguntas(u, a);
      const nombre = `${u.nombre.replace(/^U\d+: /, '')} — Reto ${a}`;
      const config = {
        version: 1, tipo: 'quiz', id: `informatica-m${u.orden}-n${a}`, nombre, categoria: 'informatica',
        narracion: { intro: a === 1 ? u.intro : `Reto ${a}. ¡Sigue aprendiendo sobre ${u.nombre.replace(/^U\d+: /, '')}!`, url_audio_intro: null },
        preguntas,
        recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) },
      };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, nombre, a, config]
      );
    }
    console.log(`✓ ${u.nombre}: 10 actividades`);
  }
  console.log('\n✅ Introducción a la Informática sembrada: 10 unidades × 10 actividades.');
  await client.end();
}

main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
