-- Precios de los planes administrables y registro de notificaciones de pago.
--
-- IDEMPOTENTE: se ejecuta en cada arranque del contenedor. Solo AÑADE tablas e
-- índices; no modifica licencias, cuentas ni progreso existentes.

-- Planes a la venta. Antes los precios vivían en variables de entorno: cambiarlos
-- exigía editar Coolify y redesplegar. Ahora los cambia un administrador desde el
-- panel y el checkout los lee de aquí (el monto se sigue decidiendo SIEMPRE en el
-- servidor, nunca se confía en el del navegador).
CREATE TABLE IF NOT EXISTS planes (
  clave           VARCHAR(20)  PRIMARY KEY,           -- prueba | individual | escuela
  nombre          VARCHAR(80)  NOT NULL,
  precio_cop      INTEGER      NOT NULL CHECK (precio_cop >= 1000),
  activo          BOOLEAN      NOT NULL DEFAULT TRUE,  -- false = no se puede comprar
  actualizado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  actualizado_por INTEGER      REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Valores iniciales = los precios vigentes. ON CONFLICT DO NOTHING es clave: en
-- los siguientes despliegues NO pisa los precios que el administrador ya cambió.
INSERT INTO planes (clave, nombre, precio_cop) VALUES
  ('prueba',     'Prueba 24 horas',     10000),
  ('individual', 'Licencia Individual', 2000000),
  ('escuela',    'Licencia Escuela',    12000000)
ON CONFLICT (clave) DO NOTHING;

-- Cada notificación que llega de Mercado Pago queda anotada con lo que se hizo.
-- Existe para poder CONFIRMAR el primer pago real (y diagnosticar cualquier otro)
-- sin tener que leer los logs del contenedor.
CREATE TABLE IF NOT EXISTS pagos_eventos (
  id           SERIAL       PRIMARY KEY,
  recibido_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  origen       VARCHAR(20)  NOT NULL,          -- webhook | checkout
  tipo         VARCHAR(40),                    -- payment, merchant_order...
  payment_id   VARCHAR(60),
  licencia_id  INTEGER,
  mp_status    VARCHAR(40),
  firma        VARCHAR(20),                    -- valida | invalida | sin_secreto | ausente
  resultado    VARCHAR(60)  NOT NULL,          -- activada, rechazada, ignorado...
  detalle      VARCHAR(300)
);
CREATE INDEX IF NOT EXISTS pagos_eventos_recibido_idx ON pagos_eventos (recibido_en DESC);
CREATE INDEX IF NOT EXISTS pagos_eventos_payment_idx  ON pagos_eventos (payment_id);

-- La verificación de acceso consulta las licencias de un usuario en cada
-- petición autenticada: sin índice sería un recorrido completo de la tabla.
CREATE INDEX IF NOT EXISTS licencias_usuario_idx ON licencias (usuario_id);
CREATE INDEX IF NOT EXISTS licencias_mp_payment_idx ON licencias (mp_payment_id);
