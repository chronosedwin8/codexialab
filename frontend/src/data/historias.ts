// Genera la HISTORIA narrada de entrada de cada mundo (cinemática).
// Sin arte por mundo: se arma con los datos del mundo + frases temáticas por materia,
// así los 199 mundos tienen su cuento sin trabajo manual. El texto se muestra y se narra.

export type ExpresionFuzz = 'normal' | 'feliz' | 'confundido' | 'celebrando' | 'dormido';

export interface BeatHistoria {
  readonly texto: string;
  readonly expresion: ExpresionFuzz;
  readonly duracion: number; // ms (fallback si no hay voz que marque el ritmo)
  readonly audio?: string | null;
}

// Frase temática por materia: qué se aprende y con qué ánimo.
const TEMA: Record<string, { reto: string; guino: string }> = {
  programacion: { reto: 'Aquí las computadoras siguen tus órdenes en ORDEN, una tras otra.', guino: 'Ordena los pasos y verás la magia.' },
  programacion_md: { reto: 'Ahora mezclas bloques y código de verdad: bucles, decisiones y variables.', guino: 'Piensa como un programador.' },
  programacion_hl: { reto: 'Solo código. Retos de alto nivel para mentes que ya volaron lejos.', guino: '¡Demuestra tu poder!' },
  python: { reto: 'Escribirás Python real, el lenguaje de los grandes proyectos.', guino: 'Cada línea te acerca a crear lo que imagines.' },
  piensa3d: { reto: 'Un robot te espera en un mundo 3D: pasos, giros y saltos.', guino: 'Guíalo con inteligencia.' },
  logica: { reto: 'Patrones, series y acertijos que despiertan tu pensamiento.', guino: 'Confía en tu lógica.' },
  aritmetica: { reto: 'Números y operaciones que se vuelven un juego.', guino: '¡A sumar aventuras!' },
  geometria: { reto: 'Formas, figuras y espacio para construir con precisión.', guino: 'Dibuja con la mente.' },
  informatica: { reto: 'Cómo funcionan por dentro las máquinas que usamos.', guino: 'Descubre sus secretos.' },
  seguridad: { reto: 'Aprende a cuidarte en internet como un verdadero guardián.', guino: '¡Protege tu mundo digital!' },
  ia: { reto: 'Entra a la mente de las máquinas que aprenden.', guino: 'Enséñales a pensar.' },
  fisica: { reto: 'Fuerzas, energía y movimiento que mueven el universo.', guino: 'Experimenta sin miedo.' },
  lenguaje: { reto: 'Palabras, letras y sonidos para contar historias.', guino: 'Tu voz tiene poder.' },
  ciencias: { reto: 'Seres vivos, naturaleza y experimentos por descubrir.', guino: '¡A explorar!' },
  mate_preescolar: { reto: 'Tus primeros números y cantidades, paso a pasito.', guino: '¡Tú puedes!' },
  lectoescritura: { reto: 'Tus primeras letras y sonidos, jugando.', guino: '¡A descubrir las letras!' },
  prog_preescolar: { reto: 'Da órdenes con flechas y mira lo que pasa.', guino: '¡Juega y aprende!' },
  mundos_preescolar: { reto: 'Mundos mágicos llenos de sorpresas para explorar.', guino: '¡Vamos juntos!' },
};

function limpiar(s?: string | null): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

/** Duración estimada de lectura/narración de un texto (para el auto-avance). */
function duracion(texto: string): number {
  return Math.min(9000, Math.max(3000, texto.length * 65));
}

export interface Historia {
  readonly beats: readonly BeatHistoria[];
  readonly color: string;
}

/** Construye la historia de entrada de un mundo a partir de sus datos. */
export function historiaMundo(world: any): Historia {
  const nombre = limpiar(world?.nombre) || 'este mundo';
  const icono = world?.icono ?? '🌟';
  const categoria: string = world?.categoria ?? 'programacion';
  const color: string = world?.colorPrimario ?? world?.color ?? '#7C3AED';
  const desc = limpiar(world?.descripcion);
  const tema = TEMA[categoria] ?? { reto: 'Aventuras y retos te esperan.', guino: '¡A jugar!' };

  const id = world?.id;
  // Audio real (ElevenLabs, voz de Codi). b1/b2 por mundo; b3 (guiño) compartido por
  // materia. Si un archivo falta, la historia se LEE (el texto siempre se muestra).
  const audioB1 = id ? `/audio/historias/mundo-${id}-b1.mp3` : null;
  const audioB2 = id ? `/audio/historias/mundo-${id}-b2.mp3` : null;
  const audioB3 = `/audio/historias/guino-${categoria}.mp3`;

  const beats: BeatHistoria[] = [
    { texto: `¡Llegamos a ${icono} ${nombre}! Soy Codi, tu compañero. Prepárate para una nueva aventura.`, expresion: 'feliz', duracion: 7500, audio: audioB1 },
    { texto: desc ? `${desc} ${tema.reto}` : tema.reto, expresion: 'normal', duracion: Math.max(6500, duracion(desc + tema.reto)), audio: audioB2 },
    { texto: `${tema.guino} Resuelve los retos, gana estrellas ⭐ y yo estaré contigo. ¿List@? ¡Vamos!`, expresion: 'celebrando', duracion: 8500, audio: audioB3 },
  ];

  return { beats, color };
}
