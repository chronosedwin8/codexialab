// Migración: multi-materia (categoría en mundos) + asignaciones docente.
// Aprovecha tablas existentes: instituciones=sedes, aulas=grupos, inscripciones=membresía.
import pg from 'pg';
const c = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

await c.connect();

// 1) Categoría en mundos (multi-materia)
await c.query(`ALTER TABLE mundos ADD COLUMN IF NOT EXISTS categoria VARCHAR(40) NOT NULL DEFAULT 'programacion'`);
await c.query(`UPDATE mundos SET categoria = 'programacion' WHERE categoria IS NULL OR categoria = ''`);

// numero_orden debe ser único POR categoría, no global
await c.query(`ALTER TABLE mundos DROP CONSTRAINT IF EXISTS mundos_numero_orden_key`);
await c.query(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mundos_categoria_orden_key') THEN
    ALTER TABLE mundos ADD CONSTRAINT mundos_categoria_orden_key UNIQUE (categoria, numero_orden);
  END IF;
END $$;`);

// 2) Tabla de asignaciones (docente asigna un mundo o nivel a un grupo o estudiante)
await c.query(`CREATE TABLE IF NOT EXISTS asignaciones (
  id SERIAL PRIMARY KEY,
  docente_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  aula_id INT REFERENCES aulas(id) ON DELETE CASCADE,
  estudiante_id INT REFERENCES usuarios(id) ON DELETE CASCADE,
  mundo_id INT REFERENCES mundos(id) ON DELETE CASCADE,
  nivel_id INT REFERENCES niveles(id) ON DELETE CASCADE,
  titulo VARCHAR(200),
  instrucciones TEXT,
  fecha_limite DATE,
  creado_en TIMESTAMPTZ DEFAULT now(),
  CHECK (aula_id IS NOT NULL OR estudiante_id IS NOT NULL),
  CHECK (mundo_id IS NOT NULL OR nivel_id IS NOT NULL)
)`);
await c.query(`CREATE INDEX IF NOT EXISTS idx_asignaciones_aula ON asignaciones(aula_id)`);
await c.query(`CREATE INDEX IF NOT EXISTS idx_asignaciones_estudiante ON asignaciones(estudiante_id)`);

// 3) Crear las 10 sedes/materias-categoría como referencia (no tabla; las categorías son fijas en código)

console.log('✅ Migración multi-materia + asignaciones aplicada.');
const r = await c.query(`SELECT categoria, COUNT(*) FROM mundos GROUP BY categoria`);
console.table(r.rows);
await c.end();
