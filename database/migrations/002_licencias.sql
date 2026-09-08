-- Migración 002: Licencias y pagos (Mercado Pago)
-- Codexia — licencia Individual ($2.000.000/año) y Escuela ($12.000.000/año)

DO $$ BEGIN
  CREATE TYPE tipo_licencia AS ENUM ('individual', 'escuela');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE estado_licencia AS ENUM ('pendiente', 'activa', 'vencida', 'cancelada');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS licencias (
  id                SERIAL PRIMARY KEY,
  tipo              tipo_licencia   NOT NULL,
  estado            estado_licencia NOT NULL DEFAULT 'pendiente',
  usuario_id        INTEGER         REFERENCES usuarios(id) ON DELETE SET NULL,
  institucion_id    INTEGER         REFERENCES instituciones(id) ON DELETE SET NULL,
  precio_cop        INTEGER         NOT NULL,
  -- Datos de Mercado Pago
  mp_payment_id     VARCHAR(60),
  mp_status         VARCHAR(40),
  mp_status_detail  VARCHAR(80),
  mp_preference_id  VARCHAR(80),
  email_comprador   VARCHAR(255),
  -- Vigencia (renovación anual)
  inicio_vigencia   TIMESTAMPTZ,
  fin_vigencia      TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  actualizado_en    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licencias_mp_payment ON licencias(mp_payment_id) WHERE mp_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_licencias_usuario ON licencias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_licencias_institucion ON licencias(institucion_id);
CREATE INDEX IF NOT EXISTS idx_licencias_estado ON licencias(estado);
