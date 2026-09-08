// Materia "Seguridad en Internet": 10 mundos × 10 actividades quiz. Para 6–12 años.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function toQuiz(r, q) { const opts = shuffle(r, [q[1], ...q[2]]).slice(0, 4); if (!opts.includes(q[1])) opts[0] = q[1]; return { enunciado: q[0], opciones: opts.map(String), correcta: opts.indexOf(q[1]), explicacion: q[3] }; }

const UNIDADES = [
  { orden: 1, nombre: 'Contraseñas Seguras', icono: '🔑', intro: '¡Bienvenido a Seguridad en Internet! Soy Astro. Tu primera defensa es una buena contraseña. ¡Aprendamos a crearlas!', banco: [
    ['Una contraseña segura tiene...', 'Letras, números y símbolos', ['Solo tu nombre', 'Solo "1234"', 'Solo tu edad'], 'Mezclar letras, números y símbolos la hace fuerte.'],
    ['¿Cuál es la contraseña MÁS segura?', 'Tigre#2024!', ['1234', 'hola', 'abc'], 'La que mezcla mayúsculas, números y símbolos es la más segura.'],
    ['¿Debes usar la misma contraseña en todos los sitios?', 'No, una distinta para cada uno', ['Sí, siempre la misma', 'Solo los lunes', 'Da igual'], 'Si roban una, las demás siguen seguras.'],
    ['¿Con quién compartes tu contraseña?', 'Con nadie (quizá tus papás)', ['Con tus amigos', 'En redes sociales', 'Con desconocidos'], 'La contraseña es secreta.'],
    ['Una buena contraseña debe ser...', 'Larga (8 o más caracteres)', ['Muy corta', 'De una sola letra', 'Tu inicial'], 'Cuanto más larga, más difícil de adivinar.'],
    ['Si crees que adivinaron tu contraseña debes...', 'Cambiarla enseguida', ['No hacer nada', 'Contarla a todos', 'Apagar el PC para siempre'], 'Cambiarla evita que entren a tu cuenta.'],
    ['¿Está bien pegar tu contraseña en la pantalla?', 'No, cualquiera podría verla', ['Sí, para no olvidarla', 'Solo si es bonita', 'Siempre'], 'Anotarla a la vista la hace insegura.'],
    ['La verificación en dos pasos sirve para...', 'Proteger más tu cuenta', ['Hacerla más lenta', 'Borrar datos', 'Subir el volumen'], 'Añade una segunda comprobación de seguridad.'],
    ['¿Cuál NO es una buena contraseña?', 'Tu fecha de cumpleaños', ['Una frase con símbolos', 'Letras y números mezclados', 'Algo largo y secreto'], 'Datos fáciles de saber (como tu cumpleaños) son inseguros.'],
    ['Un gestor de contraseñas sirve para...', 'Guardar tus claves de forma segura', ['Borrar tus claves', 'Compartirlas', 'Imprimir fotos'], 'Guarda y protege tus contraseñas.'],
    ['Si un correo te pide tu contraseña, es...', 'Sospechoso: no la des', ['Confiable siempre', 'Obligatorio responder', 'Un premio'], 'Los sitios serios no piden tu contraseña por correo.'],
    ['¿Cada cuánto conviene cambiar claves importantes?', 'De vez en cuando', ['Nunca', 'Cada minuto', 'Solo en año nuevo'], 'Cambiarlas ocasionalmente mejora la seguridad.'],
  ] },
  { orden: 2, nombre: 'Phishing y Engaños', icono: '🎣', intro: 'El phishing es como un anzuelo: te engaña para robar tus datos. ¡Aprende a no morder el anzuelo!', banco: [
    ['El phishing es...', 'Un engaño para robar tus datos', ['Un pez de colores', 'Un juego nuevo', 'Un navegador'], 'El phishing engaña para que entregues información.'],
    ['"¡Ganaste un premio, da tus datos!" probablemente es...', 'Phishing (un engaño)', ['Verdad segura', 'Un regalo real', 'Una tarea'], 'Premios que no buscaste suelen ser engaños.'],
    ['Antes de hacer clic en un enlace debes...', 'Revisar que sea de confianza', ['Hacer clic rápido', 'Cerrar los ojos', 'Compartirlo'], 'Verifica el origen antes de hacer clic.'],
    ['Un mensaje con errores raros y mucha urgencia puede ser...', 'Un engaño (phishing)', ['Siempre real', 'Una buena noticia', 'Un juego'], 'La urgencia y los errores son señales de phishing.'],
    ['Si un correo pide tu contraseña, debes...', 'No darla', ['Darla rápido', 'Publicarla', 'Gritarla'], 'Nunca des tu contraseña por correo.'],
    ['Un enlace falso puede llevarte a...', 'Una página que roba datos', ['Tu casa', 'Un parque', 'La luna'], 'Los enlaces falsos imitan webs para robar información.'],
    ['Si dudas de un correo de "tu banco" debes...', 'No hacer clic y preguntar a un adulto', ['Hacer clic ya', 'Dar tus datos', 'Reenviarlo a todos'], 'Ante la duda, consulta a un adulto.'],
    ['El phishing suele llegar por...', 'Correo o mensajes', ['El refrigerador', 'La ventana', 'Un libro'], 'Llega por email, SMS o mensajería.'],
    ['Un premio en el que no participaste seguramente es...', 'Falso', ['Verdadero', 'Tuyo seguro', 'Un regalo del colegio'], 'Si no participaste, desconfía.'],
    ['A veces una web falsa se ve...', 'Casi igual a la real', ['Totalmente distinta', 'En blanco', 'Sin texto'], 'Las webs falsas imitan a las reales: ¡cuidado!'],
    ['Ante un mensaje sospechoso, lo mejor es...', 'No responder y avisar a un adulto', ['Responder con tus datos', 'Reenviarlo', 'Hacer clic en todo'], 'No interactúes y pide ayuda.'],
    ['"Tu cuenta será cerrada, haz clic YA" es una táctica de...', 'Urgencia falsa (phishing)', ['Ayuda real', 'Un juego', 'Una clase'], 'Te apuran para que no pienses: es phishing.'],
  ] },
  { orden: 3, nombre: 'Virus y Malware', icono: '🦠', intro: 'El malware son programas dañinos. ¡Aprende a reconocerlos y a proteger tu computadora!', banco: [
    ['Malware significa...', 'Software malicioso (dañino)', ['Software bueno', 'Un dibujo', 'Un cable'], 'Malware = programas hechos para dañar.'],
    ['Un virus informático...', 'Daña o se copia en tu equipo', ['Lo limpia', 'Lo decora', 'Lo apaga con cariño'], 'El virus daña y se propaga.'],
    ['Un troyano se disfraza de...', 'Un programa útil', ['Un animal', 'Una fruta', 'Un color'], 'Parece bueno pero hace daño escondido.'],
    ['El ransomware...', 'Bloquea tus archivos y pide dinero', ['Te da dinero', 'Hace dibujos', 'Limpia el PC'], 'Secuestra tus archivos pidiendo rescate.'],
    ['Para protegerte usas un...', 'Antivirus', ['Martillo', 'Lápiz', 'Vaso'], 'El antivirus detecta y elimina malware.'],
    ['¿De dónde puede venir un virus?', 'De descargas o enlaces inseguros', ['Del sol', 'De la lluvia', 'De un libro de papel'], 'Suelen venir de descargas y enlaces dudosos.'],
    ['¿Debes abrir archivos de desconocidos?', 'No', ['Sí, siempre', 'Solo los grandes', 'Solo fotos'], 'Pueden contener malware.'],
    ['Mantener el sistema actualizado...', 'Te hace más seguro', ['Te hace más lento siempre', 'No sirve', 'Borra todo'], 'Las actualizaciones corrigen fallos de seguridad.'],
    ['Un spyware...', 'Espía lo que haces', ['Te ayuda a estudiar', 'Limpia el teclado', 'Sube el volumen'], 'El spyware vigila tu actividad en secreto.'],
    ['Si tu PC va muy raro y lento, puede tener...', 'Un virus o malware', ['Hambre', 'Sueño', 'Frío'], 'El malware puede ralentizar el equipo.'],
    ['¿Dónde descargas apps con más seguridad?', 'En tiendas oficiales', ['En sitios raros', 'En cualquier enlace', 'En anuncios'], 'Las tiendas oficiales revisan las apps.'],
    ['Un antivirus debe estar...', 'Actualizado', ['Apagado', 'Borrado', 'Escondido'], 'Un antivirus al día protege mejor.'],
  ] },
  { orden: 4, nombre: 'Privacidad y Datos', icono: '🔒', intro: 'Tus datos personales son valiosos. ¡Aprende a cuidarlos y a no compartirlos con cualquiera!', banco: [
    ['Tus datos personales son...', 'Tu nombre, dirección, teléfono...', ['El clima', 'Los colores', 'Las nubes'], 'Son datos que te identifican.'],
    ['¿Debes publicar tu dirección en internet?', 'No', ['Sí, siempre', 'Solo los domingos', 'Para todos'], 'Tu dirección es privada.'],
    ['La información privada se comparte con...', 'Personas de confianza, no extraños', ['Cualquiera', 'Todo internet', 'Desconocidos'], 'Solo con quien confías.'],
    ['Antes de aceptar permisos de una app debes...', 'Revisarlos', ['Aceptar todo sin mirar', 'Cerrar los ojos', 'Ignorarlos'], 'Algunos permisos piden demasiados datos.'],
    ['¿Está bien dar tu ubicación a desconocidos?', 'No', ['Sí', 'Solo de noche', 'Siempre'], 'Tu ubicación es información sensible.'],
    ['Poner tu perfil en privado ayuda a...', 'Proteger tu información', ['Perder amigos', 'Ir más lento', 'Nada'], 'Limita quién ve tus datos.'],
    ['Una foto puede revelar...', 'Dónde estás', ['Tu futuro', 'Tu peso exacto', 'Nada'], 'Las fotos pueden mostrar tu ubicación: cuidado.'],
    ['¿Quién debe saber tu colegio y horario?', 'Solo gente de confianza', ['Todo internet', 'Desconocidos', 'Cualquiera'], 'Esa info solo para personas de confianza.'],
    ['Aceptar "cookies" significa...', 'Que el sitio guarda información tuya', ['Que te dan galletas', 'Que ganas un premio', 'Que se apaga el PC'], 'Las cookies guardan datos de tu navegación.'],
    ['Compartir menos datos personales te hace...', 'Más seguro', ['Más famoso', 'Más rápido', 'Más alto'], 'Menos datos expuestos = más seguridad.'],
    ['En un juego con extraños, ¿usas tu nombre real completo?', 'No', ['Sí, siempre', 'Y tu dirección', 'Y tu teléfono'], 'Mejor un apodo, no datos reales.'],
    ['Proteger la privacidad es...', 'Cuidar tu información personal', ['Compartir todo', 'Publicar tu casa', 'Dar tu clave'], 'Es controlar quién ve tus datos.'],
  ] },
  { orden: 5, nombre: 'Redes Sociales Seguras', icono: '📱', intro: 'Las redes sociales son divertidas, pero hay que usarlas con cabeza. ¡Aprende a estar seguro en ellas!', banco: [
    ['¿Aceptas solicitudes de personas que no conoces?', 'No', ['Sí, todas', 'Solo con foto', 'Siempre'], 'No agregues a desconocidos.'],
    ['Antes de publicar una foto piensa en...', 'Quién puede verla', ['El clima', 'Tu altura', 'Nada'], 'Una vez publicada, otros pueden verla y guardarla.'],
    ['Si alguien te incomoda en una red debes...', 'Bloquearlo y avisar a un adulto', ['Responder con insultos', 'No hacer nada', 'Darle tus datos'], 'Bloquear y avisar es lo correcto.'],
    ['¿Todo lo que ves en redes es verdad?', 'No', ['Sí, todo', 'Solo las fotos', 'Siempre'], 'En redes hay mucha información falsa.'],
    ['Compartir tu ubicación en vivo puede ser...', 'Peligroso', ['Divertidísimo y seguro', 'Obligatorio', 'Necesario'], 'Revela dónde estás en tiempo real.'],
    ['Un perfil falso es...', 'Alguien que finge ser otro', ['Un perfil bonito', 'Un robot amigable', 'Una foto'], 'Cuidado con quienes fingen ser otra persona.'],
    ['Si ves contenido violento o feo debes...', 'No compartirlo y avisar', ['Compartirlo a todos', 'Reírte', 'Guardarlo'], 'Repórtalo y no lo difundas.'],
    ['Pensar antes de publicar evita...', 'Arrepentirte después', ['Ganar premios', 'Tener amigos', 'Aprender'], 'Lo publicado es difícil de borrar.'],
    ['¿Te reúnes en persona con un desconocido de internet?', 'No, nunca sin un adulto', ['Sí, solo', 'De noche', 'Siempre'], 'Nunca quedes a solas con desconocidos de internet.'],
    ['Reportar contenido malo ayuda a...', 'Mantener la red más segura', ['Romper internet', 'Perder la cuenta', 'Nada'], 'Reportar protege a todos.'],
    ['¿La edad mínima de muchas redes es...?', '13 años o más', ['3 años', '1 año', 'Sin edad'], 'Muchas redes piden 13+ por seguridad.'],
    ['Tu reputación en línea depende de...', 'Lo que publicas y cómo tratas a otros', ['Tu ropa', 'Tu estatura', 'El clima'], 'Tus acciones en línea construyen tu reputación.'],
  ] },
  { orden: 6, nombre: 'Ciberacoso', icono: '🚫', intro: 'El ciberacoso es molestar a alguien por internet, y está mal. ¡Aprende a prevenirlo y a pedir ayuda!', banco: [
    ['El ciberacoso es...', 'Molestar o herir a alguien por internet', ['Un juego', 'Un emoji', 'Una app'], 'Es acoso usando medios digitales.'],
    ['Si te hacen ciberacoso debes...', 'Guardar pruebas y avisar a un adulto', ['Responder con insultos', 'Callar para siempre', 'Vengarte'], 'Guarda evidencia y pide ayuda.'],
    ['¿Respondes con insultos al que te molesta?', 'No', ['Sí', 'Con más fuerza', 'Siempre'], 'Responder con insultos empeora las cosas.'],
    ['Burlarse de alguien en línea es...', 'Ciberacoso (está mal)', ['Divertido y bueno', 'Normal', 'Obligatorio'], 'Burlarse hiere: es ciberacoso.'],
    ['Si ves que acosan a un compañero debes...', 'Apoyarlo y avisar', ['Reírte', 'Unirte', 'Ignorar siempre'], 'Apoyar a la víctima y avisar ayuda mucho.'],
    ['Bloquear al acosador sirve para...', 'Que no te siga molestando', ['Hacerlo enojar', 'Nada', 'Darle premios'], 'Bloquear corta el contacto.'],
    ['Las capturas de pantalla sirven para...', 'Mostrar lo que pasó (pruebas)', ['Decorar', 'Borrar todo', 'Jugar'], 'Las pruebas ayudan a resolver el problema.'],
    ['El ciberacoso puede hacer sentir a la víctima...', 'Triste o asustada', ['Feliz', 'Con sueño', 'Con hambre'], 'Causa daño emocional real.'],
    ['¿Está bien compartir rumores de alguien?', 'No', ['Sí, si son graciosos', 'Siempre', 'Solo a tus amigos'], 'Los rumores hacen daño.'],
    ['La mejor reacción ante el acoso es...', 'Pedir ayuda a un adulto', ['Esconderlo', 'Vengarte', 'Borrar tu cuenta sin avisar'], 'Un adulto puede ayudarte a resolverlo.'],
    ['Tratar a otros con respeto evita...', 'El ciberacoso', ['La diversión', 'Los amigos', 'Aprender'], 'El respeto previene el acoso.'],
    ['Si heriste a alguien en línea, debes...', 'Disculparte', ['Reírte', 'Seguir', 'Borrar pruebas'], 'Reconocer el error y disculparse es lo correcto.'],
  ] },
  { orden: 7, nombre: 'Descargas y Sitios Seguros', icono: '⬇️', intro: '¿De dónde es seguro descargar? ¿Qué sitio es confiable? ¡Aprende a reconocer lo seguro de lo peligroso!', banco: [
    ['Descargas apps más seguras desde...', 'Tiendas oficiales', ['Sitios raros', 'Anuncios que parpadean', 'Cualquier enlace'], 'Las tiendas oficiales revisan las apps.'],
    ['Un sitio seguro suele empezar con...', 'https', ['htttp', 'www-raro', 'nada'], 'La "s" de https indica conexión segura.'],
    ['El candado en la barra del navegador indica...', 'Conexión más segura', ['Que está roto', 'Que es lento', 'Que hay un juego'], 'El candado señala una conexión cifrada.'],
    ['¿Descargas programas "gratis" de sitios raros?', 'No', ['Sí, todos', 'Solo los grandes', 'Siempre'], 'Pueden traer malware.'],
    ['Un archivo .exe de un desconocido puede ser...', 'Peligroso', ['Un regalo seguro', 'Una foto', 'Una canción'], 'Los .exe pueden instalar programas dañinos.'],
    ['Antes de instalar algo debes...', 'Asegurarte de que es de confianza', ['Instalar a ciegas', 'Cerrar los ojos', 'Apurarte'], 'Verifica el origen antes de instalar.'],
    ['Las ventanas "¡Ganaste un premio!" suelen ser...', 'Falsas o peligrosas', ['Premios reales', 'Tareas', 'Juegos buenos'], 'Son anuncios engañosos.'],
    ['Si una web te llena de anuncios y descargas, debes...', 'Salir de ella', ['Quedarte', 'Hacer clic en todo', 'Descargar todo'], 'Demasiados anuncios y descargas = peligro.'],
    ['Leer opiniones de una app ayuda a...', 'Saber si es confiable', ['Nada', 'Perder tiempo', 'Romperla'], 'Las reseñas indican si es segura.'],
    ['Actualizar tus apps sirve para...', 'Corregir fallos de seguridad', ['Gastar batería', 'Nada', 'Hacerlas feas'], 'Las actualizaciones tapan agujeros de seguridad.'],
    ['¿Confías en cualquier enlace acortado?', 'No necesariamente', ['Sí, todos', 'Siempre', 'Si es corto, sí'], 'Un enlace corto puede esconder un sitio malo.'],
    ['Poner contraseñas en un sitio SIN https es...', 'Menos seguro', ['Más seguro', 'Obligatorio', 'Divertido'], 'Sin https, tus datos viajan sin protección.'],
  ] },
  { orden: 8, nombre: 'Compras y Estafas', icono: '🛒', intro: 'En internet también hay estafas. ¡Aprende a comprar con cuidado y a no caer en trampas!', banco: [
    ['Una oferta "demasiado buena para ser verdad" suele ser...', 'Una estafa', ['Un regalo seguro', 'Tu suerte', 'Verdad siempre'], 'Si es increíblemente barato, sospecha.'],
    ['Para comprar en línea pides ayuda a...', 'Un adulto', ['Un desconocido', 'Nadie', 'Un robot'], 'Un adulto debe acompañar las compras.'],
    ['¿Das los datos de la tarjeta en cualquier sitio?', 'No, solo en sitios confiables', ['Sí, en todos', 'En el chat', 'Por correo'], 'Solo en sitios seguros y conocidos.'],
    ['Un sitio de compras seguro tiene...', 'https y buena reputación', ['Muchos anuncios', 'Errores por todos lados', 'Sin información'], 'Busca https y opiniones reales.'],
    ['Si te piden pagar por adelantado a un desconocido...', 'Desconfía', ['Paga rápido', 'Da más datos', 'Comparte tu clave'], 'Pagar por adelantado a extraños es arriesgado.'],
    ['Las estafas buscan...', 'Tu dinero o tus datos', ['Ayudarte', 'Regalarte cosas', 'Enseñarte'], 'El objetivo de la estafa es engañarte.'],
    ['¿Crees en premios que piden dinero para "liberarlos"?', 'No', ['Sí', 'A veces', 'Siempre'], 'Un premio real no pide dinero.'],
    ['Guardar el comprobante de compra sirve para...', 'Tener una prueba', ['Decorar', 'Nada', 'Borrarlo'], 'El comprobante te protege como cliente.'],
    ['Un vendedor sin información ni opiniones es...', 'Sospechoso', ['Confiable', 'El mejor', 'Famoso'], 'La falta de información es señal de alerta.'],
    ['Compartir datos de pago por chat es...', 'Inseguro', ['Seguro', 'Lo normal', 'Obligatorio'], 'Nunca envíes datos de pago por chat.'],
    ['Ante una compra dudosa, lo mejor es...', 'No comprar y consultar a un adulto', ['Comprar ya', 'Dar todos tus datos', 'Apurarte'], 'Ante la duda, consulta y no compres.'],
    ['Las "rifas" que piden tus datos personales pueden ser...', 'Trampas', ['Regalos seguros', 'Tareas', 'Juegos del colegio'], 'Desconfía de rifas que piden muchos datos.'],
  ] },
  { orden: 9, nombre: 'Huella Digital', icono: '👣', intro: 'Todo lo que haces en internet deja un rastro: tu huella digital. ¡Aprende a cuidarla para tu futuro!', banco: [
    ['La huella digital es...', 'El rastro que dejas en internet', ['Una marca en el dedo', 'Un dibujo', 'Una clave'], 'Todo lo que haces en línea deja rastro.'],
    ['Lo que publicas hoy...', 'Puede verse en el futuro', ['Desaparece al instante', 'Nadie lo ve', 'Se borra solo'], 'Lo publicado puede quedar mucho tiempo.'],
    ['¿Se puede borrar fácilmente todo de internet?', 'No siempre', ['Sí, con un botón', 'Claro que sí', 'En un segundo'], 'Borrar del todo es muy difícil.'],
    ['Cuidar tu huella digital significa...', 'Pensar antes de publicar', ['Publicar todo', 'No usar internet', 'Insultar'], 'Piensa antes de compartir.'],
    ['Una buena huella digital ayuda en...', 'Tu futuro (estudios, trabajo)', ['Nada', 'Solo hoy', 'Los juegos'], 'En el futuro pueden ver tu rastro digital.'],
    ['Publicar insultos afecta...', 'Tu reputación', ['A nadie', 'El clima', 'Tu altura'], 'Lo negativo daña tu imagen.'],
    ['Las fotos que subes pueden ser...', 'Compartidas por otros', ['Solo tuyas para siempre', 'Invisibles', 'Imposibles de copiar'], 'Otros pueden guardarlas y compartirlas.'],
    ['Antes de publicar pregúntate...', '¿Me gustaría que lo vea todo el mundo?', ['¿Es viernes?', '¿Tengo hambre?', '¿Qué hora es?'], 'Si no quieres que todos lo vean, no lo publiques.'],
    ['Tu identidad digital es...', 'Cómo te ven en internet', ['Tu peso', 'Tu estatura', 'Tu color favorito'], 'Es la imagen que proyectas en línea.'],
    ['Buscar tu propio nombre en internet sirve para...', 'Ver tu huella digital', ['Perder tiempo', 'Nada', 'Romper internet'], 'Te muestra qué hay sobre ti en línea.'],
    ['Compartir logros positivos mejora...', 'Tu reputación digital', ['Nada', 'El clima', 'Tu sueño'], 'Lo positivo construye buena reputación.'],
    ['Lo que escribes en línea...', 'Habla de ti', ['No importa', 'Es invisible', 'Se borra solo'], 'Tus palabras reflejan quién eres.'],
  ] },
  { orden: 10, nombre: 'Gran Reto de Ciberseguridad', icono: '🏆', intro: '¡El desafío final! Aquí se mezcla todo lo que aprendiste sobre seguridad. ¡Demuestra que eres un experto!', banco: [
    ['¿Cuál es la contraseña más segura?', 'Luna#7Estrella!', ['1234', 'tu nombre', 'abcd'], 'La que mezcla mayúsculas, números y símbolos.'],
    ['Un correo con un premio que no buscaste es...', 'Probablemente phishing', ['Siempre real', 'Un regalo', 'Una tarea'], 'Desconfía de premios inesperados.'],
    ['Para protegerte del malware usas...', 'Un antivirus actualizado', ['Un martillo', 'Una vela', 'Nada'], 'El antivirus al día te protege.'],
    ['¿Publicas tu dirección y horario en internet?', 'No', ['Sí, para todos', 'Solo a extraños', 'Siempre'], 'Esos datos son privados.'],
    ['Si alguien te acosa en línea debes...', 'Bloquear, guardar pruebas y avisar', ['Insultar', 'Callar', 'Vengarte'], 'Bloquea, documenta y pide ayuda.'],
    ['Descargas apps seguras desde...', 'Tiendas oficiales', ['Sitios raros', 'Anuncios', 'Enlaces extraños'], 'Las tiendas oficiales son más seguras.'],
    ['Una oferta increíblemente barata suele ser...', 'Una estafa', ['Tu suerte', 'Un regalo', 'Verdad'], 'Si es demasiado bueno, sospecha.'],
    ['Un sitio seguro para datos usa...', 'https (candado)', ['http sin s', 'colores bonitos', 'muchos anuncios'], 'El candado y https indican seguridad.'],
    ['Tu huella digital es...', 'El rastro que dejas en internet', ['Una pisada', 'Una clave', 'Un emoji'], 'Todo lo que haces en línea deja rastro.'],
    ['Ante cualquier duda en internet, lo mejor es...', 'Preguntar a un adulto de confianza', ['Hacer clic en todo', 'Dar tus datos', 'Apurarte'], 'Un adulto puede orientarte y protegerte.'],
    ['Compartir tu contraseña con un amigo es...', 'Una mala idea', ['Genial', 'Obligatorio', 'Divertido'], 'La contraseña es solo tuya.'],
    ['Pensar antes de publicar ayuda a...', 'Cuidar tu reputación y seguridad', ['Perder amigos', 'Ir más lento', 'Nada'], 'Evita arrepentimientos y riesgos.'],
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
    vf('Una buena contraseña es "1234".', false, 'No, es muy fácil de adivinar.'),
    comp('Una contraseña segura mezcla letras, números y ___.', ['símbolos', 'colores', 'dibujos'], 0, 'Los símbolos la hacen más fuerte.'),
    agr('Clasifica las contraseñas', { Seguras: ['Tigre#2024!', 'Sol3$Luna'], Inseguras: ['1234', 'hola'] }, 'Las seguras son largas y mezclan caracteres.'),
    ord('Ordena de MENOS a MÁS segura', ['1234', 'casa', 'Casa12', 'Casa#12!'], 'Cuanto más larga y variada, más segura.'),
  ],
  2: [
    vf('Si un correo pide tu contraseña, debes dársela.', false, 'Nunca des tu contraseña por correo.'),
    comp('El ___ es un engaño para robar tus datos.', ['phishing', 'byte', 'wifi'], 0, 'El phishing engaña para robar información.'),
    rel('Relaciona la señal de phishing', [['Urgencia falsa', '"Haz clic YA"'], ['Premio falso', '"Ganaste sin participar"'], ['Piden datos', '"Envía tu contraseña"']], 'Son trucos típicos del phishing.'),
    agr('Clasifica el correo', { Confiable: ['De alguien que conoces', 'Sin pedir datos'], Sospechoso: ['"Ganaste un premio"', 'Pide tu clave urgente'] }, 'Desconfía de premios y urgencias.'),
  ],
  3: [
    rel('Relaciona la amenaza', [['Virus', 'Se copia y daña'], ['Troyano', 'Se disfraza'], ['Ransomware', 'Secuestra archivos']], 'Cada malware actúa diferente.'),
    vf('Un antivirus protege tu computadora.', true, 'Sí, detecta y elimina malware.'),
    agr('Clasifica', { Bueno: ['Antivirus', 'Actualizar el sistema'], 'Malo (malware)': ['Virus', 'Spyware'] }, 'Protege con lo bueno, evita el malware.'),
    comp('Para protegerte de virus usas un ___.', ['antivirus', 'navegador', 'teclado'], 0, 'El antivirus te protege del malware.'),
  ],
  4: [
    vf('Está bien publicar tu dirección de casa en internet.', false, 'No, tu dirección es privada.'),
    agr('Clasifica el dato', { 'Privado (no compartir)': ['Tu dirección', 'Tu contraseña'], 'Puedes compartir': ['Tu color favorito', 'Tu juego favorito'] }, 'Cuida tus datos personales.'),
    comp('Configurar tu perfil como ___ protege tu información.', ['privado', 'público', 'abierto'], 0, 'Un perfil privado limita quién te ve.'),
    rel('Relaciona', [['Cookies', 'Guardan datos tuyos'], ['Perfil privado', 'Protege tu info'], ['Ubicación', 'No darla a extraños']], 'Conceptos de privacidad.'),
  ],
  5: [
    vf('Debes aceptar solicitudes de personas que no conoces.', false, 'No agregues a desconocidos.'),
    agr('Clasifica la acción', { Segura: ['Bloquear a quien molesta', 'Perfil privado'], Riesgosa: ['Aceptar desconocidos', 'Compartir tu ubicación en vivo'] }, 'Elige siempre lo seguro.'),
    comp('Si alguien te incomoda, debes ___ y avisar a un adulto.', ['bloquearlo', 'seguirlo', 'imitarlo'], 0, 'Bloquear y avisar es lo correcto.'),
    vf('Todo lo que ves en redes sociales es verdad.', false, 'No, hay mucha información falsa.'),
  ],
  6: [
    vf('Si te acosan en línea, debes guardar pruebas y avisar a un adulto.', true, 'Correcto, guarda evidencia y pide ayuda.'),
    agr('Clasifica la reacción ante el acoso', { Correcta: ['Avisar a un adulto', 'Bloquear al acosador'], Incorrecta: ['Responder con insultos', 'Vengarte'] }, 'Reacciona con cabeza y pide ayuda.'),
    comp('Burlarse de alguien en línea es ___.', ['ciberacoso', 'divertido', 'correcto'], 0, 'Burlarse hiere: es ciberacoso.'),
    rel('Relaciona', [['Bloquear', 'Cortar el contacto'], ['Capturas', 'Guardar pruebas'], ['Avisar', 'Pedir ayuda']], 'Pasos ante el ciberacoso.'),
  ],
  7: [
    vf('Un sitio que empieza con https es más seguro.', true, 'La "s" indica conexión segura.'),
    comp('Descargas apps más seguras desde las ___ oficiales.', ['tiendas', 'calles', 'nubes'], 0, 'Las tiendas oficiales revisan las apps.'),
    agr('Clasifica el sitio', { Seguro: ['Con https y candado', 'Tienda oficial'], Peligroso: ['Lleno de anuncios raros', 'Pide un .exe extraño'] }, 'Reconoce lo seguro de lo peligroso.'),
    rel('Relaciona', [['Candado', 'Conexión segura'], ['https', 'Sitio más seguro'], ['.exe desconocido', 'Posible peligro']], 'Señales de seguridad en la web.'),
  ],
  8: [
    vf('Una oferta "demasiado buena para ser verdad" suele ser una estafa.', true, 'Desconfía de ofertas increíbles.'),
    comp('Para comprar en línea pides ayuda a un ___.', ['adulto', 'desconocido', 'robot'], 0, 'Un adulto debe acompañar las compras.'),
    agr('Clasifica', { Confiable: ['Sitio con https', 'Buenas opiniones'], Sospechoso: ['Pide pago adelantado a un extraño', 'Sin información'] }, 'Compra solo en sitios confiables.'),
    vf('Puedes dar los datos de la tarjeta en cualquier sitio.', false, 'Solo en sitios confiables y con un adulto.'),
  ],
  9: [
    vf('Lo que publicas hoy puede verse en el futuro.', true, 'Tu huella digital puede permanecer mucho tiempo.'),
    comp('La huella digital es el ___ que dejas en internet.', ['rastro', 'dibujo', 'color'], 0, 'Es el rastro de tu actividad en línea.'),
    agr('Clasifica para tu reputación', { 'Construye buena reputación': ['Compartir logros', 'Tratar con respeto'], 'Daña tu reputación': ['Insultar', 'Publicar cosas feas'] }, 'Cuida tu huella digital.'),
    vf('Es muy fácil borrar TODO de internet.', false, 'No siempre se puede borrar del todo.'),
  ],
  10: [
    vf('Compartir tu contraseña con un amigo es buena idea.', false, 'La contraseña es solo tuya.'),
    agr('Clasifica seguro vs peligroso', { Seguro: ['Antivirus actualizado', 'Contraseña fuerte'], Peligroso: ['Abrir enlaces raros', 'Dar datos a extraños'] }, 'Repasa lo aprendido.'),
    rel('Relaciona la amenaza con su defensa', [['Virus', 'Antivirus'], ['Phishing', 'Desconfiar'], ['Contraseña débil', 'Clave larga']], 'A cada amenaza, su defensa.'),
    comp('Ante cualquier duda en internet, pregunta a un ___ de confianza.', ['adulto', 'desconocido', 'robot'], 0, 'Un adulto puede orientarte.'),
  ],
};

function construirPreguntas(u, a) {
  const bank = u.banco, typed = TYPED[u.orden] || [];
  const nb = bank.length, nt = typed.length;
  const i0 = ((a - 1) * 2) % nb;
  const oq = (slot) => toQuiz(rng(u.orden * 100000 + a * 1000 + slot * 17), bank[(i0 + slot) % nb]);
  if (!nt) return [0, 1, 2].map((i) => toQuiz(rng(u.orden * 100000 + a * 1000 + i * 17), bank[((a - 1) * 3 + i) % nb]));
  return (a % 2 === 1) ? [typed[(a - 1) % nt], oq(0), oq(1)] : [oq(0), typed[(a - 1) % nt], typed[a % nt]];
}

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const u of UNIDADES) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#DC2626','#F87171','seguridad',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10
       RETURNING id`,
      [u.nombre, `Seguridad en Internet — ${u.nombre}`, u.orden, u.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const preguntas = construirPreguntas(u, a);
      const nombre = `${u.nombre} — Reto ${a}`;
      const config = { version: 1, tipo: 'quiz', id: `seguridad-m${u.orden}-n${a}`, nombre, categoria: 'seguridad',
        narracion: { intro: a === 1 ? u.intro : `Reto ${a} de ${u.nombre}. ¡Mantente alerta y seguro!`, url_audio_intro: null },
        preguntas, recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) } };
      await client.query(
        `INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
         VALUES ($1,$2,$3,$4,'aventureros', ARRAY['bloques']::modalidad_codigo[], true)
         ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`,
        [mundoId, nombre, a, config]
      );
    }
    console.log(`✓ ${u.nombre}: 10 actividades`);
  }
  console.log('\n✅ Seguridad en Internet sembrada: 10 mundos × 10 actividades.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
