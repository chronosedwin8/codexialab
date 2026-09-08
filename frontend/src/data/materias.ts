// Catálogo de materias/categorías de Codexia (multi-materia).
// `disponible` marca si ya tiene contenido sembrado; el resto se muestra como "Próximamente".
export interface Materia {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  descripcion: string;
}

export const MATERIAS: Materia[] = [
  { id: 'programacion', nombre: 'Programación', icono: '🧑‍💻', color: '#6B46C1', descripcion: 'Secuencias, bucles, condicionales y más.' },
  { id: 'programacion_md', nombre: 'Programación MD', icono: '⚙️', color: '#7C3AED', descripcion: 'Nivel intermedio: combina bloques y escritura de código (bucles, condicionales y variables).' },
  { id: 'programacion_hl', nombre: 'Programación HL', icono: '⌨️', color: '#4338CA', descripcion: 'Nivel avanzado (High Level): solo escritura de código, con retos de alto pensamiento.' },
  { id: 'python', nombre: 'Python', icono: '🐍', color: '#2563EB', descripcion: 'Programa en Python real, desde lo más básico hasta retos de estudiantes de programación.' },
  { id: 'piensa3d', nombre: 'Piensa en 3D', icono: '🧊', color: '#4F46E5', descripcion: 'Programa un robot en mundos 3D: pasos, giros, saltos y funciones.' },
  { id: 'logica', nombre: 'Lógica', icono: '🧠', color: '#0EA5E9', descripcion: 'Patrones, series, analogías y razonamiento.' },
  { id: 'aritmetica', nombre: 'Aritmética', icono: '➕', color: '#16A34A', descripcion: 'Números y operaciones básicas.' },
  { id: 'geometria', nombre: 'Geometría', icono: '📐', color: '#F59E0B', descripcion: 'Formas, figuras y espacio.' },
  { id: 'informatica', nombre: 'Introducción a la Informática', icono: '💻', color: '#0891B2', descripcion: 'Hardware, software, redes y más.' },
  { id: 'seguridad', nombre: 'Seguridad en Internet', icono: '🛡️', color: '#DC2626', descripcion: 'Ciberseguridad y ciudadanía digital.' },
  { id: 'ia', nombre: 'Inteligencia Artificial', icono: '🤖', color: '#7C3AED', descripcion: 'Cómo piensan las máquinas.' },
  { id: 'fisica', nombre: 'Física Básica', icono: '🔬', color: '#DB2777', descripcion: 'Fuerzas, energía y movimiento.' },
  { id: 'lenguaje', nombre: 'Lenguaje', icono: '✍️', color: '#D97706', descripcion: 'Ortografía, acentos, lectura y escritura.' },
  { id: 'ciencias', nombre: 'Ciencias Naturales', icono: '🧪', color: '#0D9488', descripcion: 'Seres vivos, naturaleza y experimentos.' },
];

// Mega-categorías: agrupan las materias en 4 grandes áreas para el mapa.
export interface MegaCategoria {
  id: string;
  nombre: string;
  icono: string;
  color: string;
  materias: string[]; // ids de MATERIAS, en orden
}

export const MEGA_CATEGORIAS: MegaCategoria[] = [
  { id: 'programacion', nombre: 'Programación', icono: '💻', color: '#6B46C1', materias: ['programacion', 'programacion_md', 'programacion_hl', 'python'] },
  { id: 'logico', nombre: 'Pensamiento Lógico', icono: '🧠', color: '#0EA5E9', materias: ['piensa3d', 'logica', 'aritmetica', 'geometria'] },
  { id: 'computacional', nombre: 'Pensamiento Computacional', icono: '🖥️', color: '#0891B2', materias: ['informatica', 'seguridad', 'ia'] },
  { id: 'stem', nombre: 'Materias STEM', icono: '🔬', color: '#DB2777', materias: ['fisica', 'lenguaje', 'ciencias'] },
];
