/**
 * Cliente de la API REST de Phidias (Colegio Alemán de Barranquilla).
 * Se usa desde el backend, así que no hay CORS ni proxies de por medio.
 */

const BASE_URL = process.env.PHIDIAS_BASE_URL ?? 'https://ds-barranquilla.phidias.co/rest';
const TOKEN = process.env.PHIDIAS_TOKEN ?? '';

export interface PhidiasStudent {
  id: number;
  firstname?: string;
  lastname?: string;
  email?: string;
  code?: number;
  enrollment?: { status?: string };
}

interface PhidiasSection { id: number; name: string; students?: PhidiasStudent[] }
interface PhidiasCourse { id: number; name: string; sections?: PhidiasSection[] }
interface PhidiasLevel { id: number; name: string; courses?: PhidiasCourse[] }

export interface KlasseResumen {
  id: number;
  nombre: string;
  curso: string;
  nivel: string;
  totalEstudiantes: number;
  bandaSugerida: 'exploradores' | 'aventureros' | 'heroes';
}

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { key: string; at: number; data: PhidiasLevel[] } | null = null;

export function phidiasConfigurado(): boolean {
  return TOKEN.length > 0;
}

async function consolidate(year?: number): Promise<PhidiasLevel[]> {
  if (!TOKEN) throw new Error('PHIDIAS_TOKEN no está configurado en el servidor');

  const key = String(year ?? '');
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;

  const url = new URL(`${BASE_URL}/1/course/consolidate`);
  if (year) url.searchParams.set('year', String(year));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Phidias respondió ${res.status}`);

  const data = (await res.json()) as PhidiasLevel[];
  if (!Array.isArray(data)) throw new Error('Respuesta inesperada de Phidias');

  cache = { key, at: Date.now(), data };
  return data;
}

/** Deduce la banda de edad a partir del nombre del curso (KLASSE 1, PREKINDER, …). */
function bandaDesdeCurso(curso: string): 'exploradores' | 'aventureros' | 'heroes' {
  const grado = Number(curso.match(/\d+/)?.[0]);
  if (!Number.isFinite(grado)) return 'exploradores'; // KINDERKRIPPE / PREKINDER / KINDER
  if (grado <= 2) return 'exploradores';
  if (grado <= 5) return 'aventureros';
  return 'heroes';
}

/**
 * Normaliza los estudiantes de una sección: descarta matrículas retiradas y sin nombre,
 * arma el nombre completo y deriva un correo estable cuando falta.
 * Se usa tanto para CONTAR (listarKlassen) como para IMPORTAR (obtenerKlassen),
 * así el número que ve el docente coincide exactamente con lo que se crea.
 */
interface EstudianteNorm { phidiasId: number; nombre: string; apellido: string; firstname: string; email: string }

function normalizarEstudiantes(sec: PhidiasSection): EstudianteNorm[] {
  return (sec.students ?? [])
    .filter((s) => s.enrollment?.status !== 'retirado')
    .map((s) => {
      const firstname = (s.firstname ?? '').replace(/\s+/g, ' ').trim();
      const apellido = (s.lastname ?? '').replace(/\s+/g, ' ').trim();
      const nombre = `${firstname} ${apellido}`.replace(/\s+/g, ' ').trim();
      const email = (s.email ?? '').trim().toLowerCase() || `phidias${s.id}@codexia.edu`;
      return { phidiasId: s.id, nombre, apellido, firstname, email };
    })
    .filter((s) => s.nombre.length > 0);
}

// Estudiante en lista plana (para armar grupos mixtos eligiendo individuos).
export interface EstudiantePlano extends EstudianteNorm {
  curso: string;
  nivel: string;
  klasse: string;
  banda: 'exploradores' | 'aventureros' | 'heroes';
}

/** TODOS los estudiantes activos, aplanados y ORDENADOS por apellido (luego nombre). */
export async function listarEstudiantesPlano(year?: number): Promise<EstudiantePlano[]> {
  const data = await consolidate(year);
  const out: EstudiantePlano[] = [];
  const vistos = new Set<number>();
  for (const nivel of data) {
    for (const curso of nivel.courses ?? []) {
      for (const sec of curso.sections ?? []) {
        for (const e of normalizarEstudiantes(sec)) {
          if (vistos.has(e.phidiasId)) continue; // un estudiante podría repetirse: se toma una vez
          vistos.add(e.phidiasId);
          out.push({ ...e, curso: curso.name, nivel: nivel.name, klasse: sec.name, banda: bandaDesdeCurso(curso.name) });
        }
      }
    }
  }
  out.sort(
    (a, b) =>
      a.apellido.localeCompare(b.apellido, 'es', { sensitivity: 'base' }) ||
      a.firstname.localeCompare(b.firstname, 'es', { sensitivity: 'base' }),
  );
  return out;
}

/** Estudiantes concretos por sus ids de Phidias (para el grupo mixto). */
export async function obtenerEstudiantesPorIds(ids: number[], year?: number): Promise<EstudiantePlano[]> {
  const set = new Set(ids);
  return (await listarEstudiantesPlano(year)).filter((e) => set.has(e.phidiasId));
}

/** Árbol Nivel → Curso → Klasse (sección) con el número de estudiantes de cada una. */
export async function listarKlassen(year?: number) {
  const data = await consolidate(year);
  return data.map((nivel) => ({
    id: nivel.id,
    nombre: nivel.name,
    cursos: (nivel.courses ?? []).map((curso) => ({
      id: curso.id,
      nombre: curso.name,
      klassen: (curso.sections ?? []).map((sec): KlasseResumen => ({
        id: sec.id,
        nombre: sec.name,
        curso: curso.name,
        nivel: nivel.name,
        // Cuenta solo estudiantes activos (mismo criterio que la importación).
        totalEstudiantes: normalizarEstudiantes(sec).length,
        bandaSugerida: bandaDesdeCurso(curso.name),
      })),
    })),
  }));
}

export interface KlasseConEstudiantes extends KlasseResumen {
  estudiantes: Array<{ phidiasId: number; nombre: string; email: string }>;
}

/** Devuelve las secciones pedidas con sus estudiantes ya normalizados (nombre completo + correo). */
export async function obtenerKlassen(seccionIds: number[], year?: number): Promise<KlasseConEstudiantes[]> {
  const data = await consolidate(year);
  const buscadas = new Set(seccionIds);
  const salida: KlasseConEstudiantes[] = [];

  for (const nivel of data) {
    for (const curso of nivel.courses ?? []) {
      for (const sec of curso.sections ?? []) {
        if (!buscadas.has(sec.id)) continue;

        const estudiantes = normalizarEstudiantes(sec);

        salida.push({
          id: sec.id,
          nombre: sec.name,
          curso: curso.name,
          nivel: nivel.name,
          totalEstudiantes: estudiantes.length,
          bandaSugerida: bandaDesdeCurso(curso.name),
          estudiantes,
        });
      }
    }
  }

  return salida;
}
