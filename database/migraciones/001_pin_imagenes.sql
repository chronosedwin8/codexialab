-- Acceso por PIN de imagenes para los mas pequenos (prelectores).
--
-- IDEMPOTENTE a proposito: se ejecuta en cada arranque del contenedor, asi que
-- debe poder correr muchas veces sin romper nada ni tocar datos existentes.
-- Todo lo que hace es ANADIR columnas opcionales y una tabla nueva: ninguna
-- cuenta, progreso ni grupo se modifica.

-- Nombre de acceso del nino. Los prelectores no tienen correo y no saben
-- escribirlo: entran con un usuario corto ("sofia.r") y cuatro dibujos.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS usuario VARCHAR(60);

-- Hash del PIN (bcrypt). Es lo unico contra lo que se valida el acceso.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- Copia del PIN cifrada con AES-256-GCM, para que el docente pueda volver a
-- verlo cuando un nino lo olvida. No sirve para entrar: el acceso se comprueba
-- siempre contra pin_hash, y sin PIN_SECRET esta columna es ilegible.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS pin_cifrado VARCHAR(255);

-- El usuario identifica la cuenta al entrar, asi que no puede repetirse.
-- Indice UNIQUE parcial: las cuentas sin usuario (todas las actuales) no chocan
-- entre si porque NULL nunca es igual a NULL, pero asi queda explicito.
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_usuario_key
  ON usuarios (usuario) WHERE usuario IS NOT NULL;

-- Quien mira las credenciales de un menor queda anotado. Son datos de ninos:
-- el registro es lo que sostiene que exista una copia recuperable del PIN.
CREATE TABLE IF NOT EXISTS auditoria_accesos (
  id          SERIAL PRIMARY KEY,
  actor_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  alumno_id   INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  accion      VARCHAR(60)  NOT NULL,
  recurso     VARCHAR(200) NOT NULL,
  ip          VARCHAR(60),
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auditoria_accesos_creado_en_idx ON auditoria_accesos (creado_en DESC);
CREATE INDEX IF NOT EXISTS auditoria_accesos_actor_idx ON auditoria_accesos (actor_id);
