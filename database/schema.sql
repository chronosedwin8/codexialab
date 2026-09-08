-- BeSmart Database Schema
-- PostgreSQL 15+

CREATE DATABASE codexia_db;
\c codexia_db;

-- ENUMs
CREATE TYPE modalidad_codigo AS ENUM ('bloques', 'bloques_texto', 'texto');
CREATE TYPE banda_edad AS ENUM ('exploradores', 'aventureros', 'heroes');
CREATE TYPE rol_usuario AS ENUM ('estudiante', 'docente', 'admin');

-- Instituciones educativas
CREATE TABLE instituciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100),
    pais VARCHAR(100) DEFAULT 'Colombia',
    codigo_acceso VARCHAR(20) UNIQUE,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(150) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'estudiante',
    banda_edad banda_edad,
    modalidad_pref modalidad_codigo DEFAULT 'bloques',
    avatar_config JSONB DEFAULT '{"color": "azul", "sombrero": null, "accesorio": null}'::jsonb,
    monedas INTEGER DEFAULT 0,
    gemas INTEGER DEFAULT 0,
    racha_dias INTEGER DEFAULT 0,
    ultima_actividad DATE,
    fecha_nacimiento DATE,
    nombre_tutor VARCHAR(150),
    email_tutor VARCHAR(255),
    consentimiento_tutor BOOLEAN DEFAULT FALSE,
    fecha_consentimiento TIMESTAMP WITH TIME ZONE,
    institucion_id INTEGER REFERENCES instituciones(id) ON DELETE SET NULL,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aulas
CREATE TABLE aulas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    codigo_acceso VARCHAR(20) UNIQUE NOT NULL,
    docente_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    institucion_id INTEGER REFERENCES instituciones(id) ON DELETE SET NULL,
    activa BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inscripciones estudiantes en aulas
CREATE TABLE inscripciones (
    id SERIAL PRIMARY KEY,
    estudiante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    aula_id INTEGER NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    inscrito_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(estudiante_id, aula_id)
);

-- Cursos
CREATE TABLE cursos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    banda_objetivo banda_edad,
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mundos del mapa
CREATE TABLE mundos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    numero_orden INTEGER NOT NULL UNIQUE,
    icono VARCHAR(100),
    color_primario VARCHAR(20) DEFAULT '#6B46C1',
    color_secundario VARCHAR(20) DEFAULT '#4299E1',
    bloqueado BOOLEAN DEFAULT TRUE,
    total_niveles INTEGER DEFAULT 0,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Niveles dentro de mundos
CREATE TABLE niveles (
    id SERIAL PRIMARY KEY,
    mundo_id INTEGER NOT NULL REFERENCES mundos(id) ON DELETE CASCADE,
    nombre VARCHAR(200) NOT NULL,
    numero_orden INTEGER NOT NULL,
    config JSONB NOT NULL,
    banda_recomendada banda_edad,
    modalidades modalidad_codigo[] DEFAULT '{bloques,bloques_texto,texto}',
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mundo_id, numero_orden)
);

-- Sesiones de juego por nivel
CREATE TABLE sesiones_nivel (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    modalidad_usada modalidad_codigo,
    programa_bloques JSONB,
    intentos INTEGER DEFAULT 0,
    tiempo_segundos INTEGER DEFAULT 0,
    completada BOOLEAN DEFAULT FALSE,
    estrellas INTEGER DEFAULT 0 CHECK (estrellas BETWEEN 0 AND 3),
    monedas_ganadas INTEGER DEFAULT 0,
    gemas_ganadas INTEGER DEFAULT 0,
    iniciada_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completada_en TIMESTAMP WITH TIME ZONE
);

-- Envíos de código
CREATE TABLE envios_codigo (
    id SERIAL PRIMARY KEY,
    sesion_id INTEGER NOT NULL REFERENCES sesiones_nivel(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    codigo TEXT NOT NULL,
    origen modalidad_codigo NOT NULL,
    resultado JSONB,
    exitoso BOOLEAN DEFAULT FALSE,
    tiempo_ejecucion_ms INTEGER,
    enviado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pistas del nivel
CREATE TABLE pistas (
    id SERIAL PRIMARY KEY,
    nivel_id INTEGER NOT NULL REFERENCES niveles(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    url_audio VARCHAR(500),
    costo_monedas INTEGER DEFAULT 0
);

-- Logros / Insignias
CREATE TABLE logros (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(200),
    condicion JSONB NOT NULL,
    rareza VARCHAR(50) DEFAULT 'comun',
    activo BOOLEAN DEFAULT TRUE
);

-- Logros obtenidos por usuarios
CREATE TABLE usuarios_logros (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    logro_id INTEGER NOT NULL REFERENCES logros(id) ON DELETE CASCADE,
    obtenido_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, logro_id)
);

-- Items de la tienda
CREATE TABLE items_tienda (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    imagen_url VARCHAR(500),
    costo_monedas INTEGER DEFAULT 0,
    costo_gemas INTEGER DEFAULT 0,
    datos JSONB,
    activo BOOLEAN DEFAULT TRUE
);

-- Inventario del usuario
CREATE TABLE inventario_usuario (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items_tienda(id) ON DELETE CASCADE,
    comprado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, item_id)
);

-- Telemetría particionada por mes
CREATE TABLE telemetria (
    id BIGSERIAL,
    usuario_id INTEGER NOT NULL,
    nivel_id INTEGER,
    evento VARCHAR(100) NOT NULL,
    datos JSONB,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
) PARTITION BY RANGE (creado_en);

CREATE TABLE telemetria_2026_01 PARTITION OF telemetria
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE telemetria_2026_02 PARTITION OF telemetria
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE telemetria_2026_06 PARTITION OF telemetria
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE telemetria_2026_07 PARTITION OF telemetria
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE telemetria_2026_08 PARTITION OF telemetria
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE telemetria_2026_12 PARTITION OF telemetria
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_institucion ON usuarios(institucion_id);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_sesiones_usuario ON sesiones_nivel(usuario_id);
CREATE INDEX idx_sesiones_nivel ON sesiones_nivel(nivel_id);
CREATE INDEX idx_sesiones_completada ON sesiones_nivel(completada);
CREATE INDEX idx_envios_usuario ON envios_codigo(usuario_id);
CREATE INDEX idx_envios_nivel ON envios_codigo(nivel_id);
CREATE INDEX idx_inscripciones_aula ON inscripciones(aula_id);
CREATE INDEX idx_inscripciones_estudiante ON inscripciones(estudiante_id);
CREATE INDEX idx_niveles_mundo ON niveles(mundo_id);
CREATE INDEX idx_telemetria_usuario ON telemetria(usuario_id, creado_en);

-- Vista progreso por aula
CREATE OR REPLACE VIEW v_progreso_aula AS
SELECT
    i.aula_id,
    u.id AS estudiante_id,
    u.nombre AS estudiante_nombre,
    u.banda_edad,
    u.modalidad_pref,
    COUNT(DISTINCT sn.nivel_id) FILTER (WHERE sn.completada = TRUE) AS niveles_completados,
    COALESCE(SUM(sn.estrellas), 0) AS total_estrellas,
    COALESCE(SUM(sn.monedas_ganadas), 0) AS monedas_ganadas,
    u.monedas AS monedas_actuales,
    u.racha_dias,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.origen = 'bloques') AS envios_bloques,
    COUNT(DISTINCT ec.id) FILTER (WHERE ec.origen = 'texto') AS envios_texto,
    MAX(sn.completada_en) AS ultima_actividad
FROM inscripciones i
JOIN usuarios u ON u.id = i.estudiante_id
LEFT JOIN sesiones_nivel sn ON sn.usuario_id = u.id
LEFT JOIN envios_codigo ec ON ec.usuario_id = u.id
GROUP BY i.aula_id, u.id, u.nombre, u.banda_edad, u.modalidad_pref, u.monedas, u.racha_dias;

-- Trigger actualizar actualizado_en en usuarios
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- DATOS SEMILLA

-- Institución
INSERT INTO instituciones (nombre, ciudad, codigo_acceso) VALUES
('Colegio BeSmart Demo', 'Bogotá', 'BSMART001');

-- Docente
INSERT INTO usuarios (email, password_hash, nombre, rol, institucion_id) VALUES
('docente@besmart.edu.co', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdREezYiDy', 'Profesor Demo', 'docente', 1);
-- password: 'demo1234'

-- Estudiantes
INSERT INTO usuarios (email, password_hash, nombre, rol, banda_edad, fecha_nacimiento, nombre_tutor, email_tutor, consentimiento_tutor, fecha_consentimiento, institucion_id) VALUES
('sofia@besmart.edu.co', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdREezYiDy', 'Sofía García', 'estudiante', 'aventureros', '2015-03-15', 'María García', 'maria.garcia@email.com', TRUE, NOW(), 1),
('miguel@besmart.edu.co', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LkdREezYiDy', 'Miguel Torres', 'estudiante', 'heroes', '2013-07-22', 'Carlos Torres', 'carlos.torres@email.com', TRUE, NOW(), 1);

-- Aula
INSERT INTO aulas (nombre, codigo_acceso, docente_id, institucion_id) VALUES
('Clase 4B - Programación', 'CLASE4B', 2, 1);

-- Inscripciones
INSERT INTO inscripciones (estudiante_id, aula_id) VALUES (3, 1), (4, 1);

-- 10 Mundos
INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, bloqueado, total_niveles) VALUES
('El Bosque Inicial', 'Aprende los primeros pasos de la programación', 1, 'tree', '#22C55E', '#16A34A', FALSE, 10),
('La Cueva Misteriosa', 'Descubre los secretos de los bucles', 2, 'cave', '#8B5CF6', '#7C3AED', TRUE, 10),
('El Desierto Digital', 'Domina las condiciones y decisiones', 3, 'sun', '#F59E0B', '#D97706', TRUE, 10),
('El Océano de Datos', 'Explora las variables y listas', 4, 'wave', '#0EA5E9', '#0284C7', TRUE, 10),
('Las Montañas del Código', 'Conquista las funciones', 5, 'mountain', '#EF4444', '#DC2626', TRUE, 10),
('La Ciudad Robótica', 'Aprende sobre objetos y clases', 6, 'robot', '#6366F1', '#4F46E5', TRUE, 10),
('El Castillo de los Algoritmos', 'Domina la ordenación y búsqueda', 7, 'castle', '#EC4899', '#DB2777', TRUE, 10),
('El Espacio Infinito', 'Explora recursividad y patrones', 8, 'star', '#14B8A6', '#0D9488', TRUE, 10),
('El Portal del Tiempo', 'Combina todo lo aprendido', 9, 'portal', '#F97316', '#EA580C', TRUE, 10),
('El Olimpo del Programador', 'El desafío final', 10, 'trophy', '#EAB308', '#CA8A04', TRUE, 15);

-- Niveles del Mundo 1
INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades) VALUES
(1, '¡Tu primer paso!', 1, '{
  "version": 2,
  "id": "m1-n1",
  "nombre": "¡Tu primer paso!",
  "mundo_id": 1,
  "banda_recomendada": "aventureros",
  "modalidades": ["bloques", "bloques_texto", "texto"],
  "tilemap": [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
  "spawn": {"x": 1, "y": 1, "dir": "derecha"},
  "comandos_permitidos": ["avanzar"],
  "bloques_disponibles": ["avanzar"],
  "codigo_inicial": {"javascript": "// Haz que el héroe llegue a la salida\nheroe.avanzar();\n"},
  "narracion": {"intro": "¡Hola, explorador! Usa avanzar para moverte.", "exito": "¡Increíble! Llegaste a la salida."},
  "objetivos": [{"id": "salida", "tipo": "alcanzar_celda", "x": 3, "y": 1, "obligatorio": true}],
  "criterios_estrella": {"1": {"objetivos": ["salida"]}, "2": {"objetivos": ["salida"]}, "3": {"objetivos": ["salida"], "max_bloques": 3}},
  "pistas": [{"texto": "El héroe mira a la derecha. ¡Usa avanzar para moverlo!"}],
  "recompensa": {"monedas": 10, "gemas": 0},
  "tope_ejecucion": 50000
}'::jsonb, 'aventureros', '{bloques,bloques_texto,texto}'),

(1, 'El camino largo', 2, '{
  "version": 2,
  "id": "m1-n2",
  "nombre": "El camino largo",
  "mundo_id": 1,
  "banda_recomendada": "aventureros",
  "modalidades": ["bloques", "bloques_texto", "texto"],
  "tilemap": [[1,1,1,1,1,1,1],[1,0,0,1,0,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]],
  "spawn": {"x": 1, "y": 1, "dir": "derecha"},
  "comandos_permitidos": ["avanzar", "girarDerecha", "girarIzquierda"],
  "bloques_disponibles": ["avanzar", "girarDerecha", "girarIzquierda"],
  "codigo_inicial": {"javascript": "// Guía al héroe por el camino largo\nheroe.avanzar();\nheroe.girarDerecha();\n"},
  "narracion": {"intro": "El camino tiene curvas. ¡Recuerda girar!", "exito": "¡Perfecto! Navegaste el camino."},
  "objetivos": [{"id": "salida", "tipo": "alcanzar_celda", "x": 5, "y": 3, "obligatorio": true}],
  "criterios_estrella": {"1": {"objetivos": ["salida"]}, "2": {"objetivos": ["salida"], "max_instrucciones": 10}, "3": {"objetivos": ["salida"], "max_instrucciones": 7}},
  "pistas": [{"texto": "¡Avanza varias veces y luego gira!"}],
  "recompensa": {"monedas": 15, "gemas": 1},
  "tope_ejecucion": 50000
}'::jsonb, 'aventureros', '{bloques,bloques_texto,texto}'),

(1, 'El poder de repetir', 3, '{
  "version": 2,
  "id": "m1-n3",
  "nombre": "El poder de repetir",
  "mundo_id": 1,
  "banda_recomendada": "aventureros",
  "modalidades": ["bloques", "bloques_texto", "texto"],
  "tilemap": [[1,1,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0,1],[1,0,1,1,1,1,1,0,1],[1,0,0,0,0,0,0,0,1],[1,1,1,1,1,1,1,1,1]],
  "spawn": {"x": 1, "y": 1, "dir": "derecha"},
  "comandos_permitidos": ["avanzar", "girarDerecha", "girarIzquierda", "repetir"],
  "bloques_disponibles": ["avanzar", "girarDerecha", "girarIzquierda", "repetir"],
  "codigo_inicial": {"javascript": "// Usa un bucle para repetir acciones\nfor (let i = 0; i < 3; i++) {\n  heroe.avanzar();\n}\n"},
  "narracion": {"intro": "¡Aprende el poder de los bucles para no repetirte!", "exito": "¡Eres un maestro de los bucles!"},
  "objetivos": [
    {"id": "salida", "tipo": "alcanzar_celda", "x": 7, "y": 3, "obligatorio": true},
    {"id": "moneda1", "tipo": "recoger_item", "x": 4, "y": 1, "obligatorio": false}
  ],
  "criterios_estrella": {"1": {"objetivos": ["salida"]}, "2": {"objetivos": ["salida", "moneda1"]}, "3": {"objetivos": ["salida", "moneda1"], "max_bloques": 5}},
  "pistas": [{"texto": "Usa repetir(7) para avanzar 7 veces sin escribir 7 líneas."}],
  "recompensa": {"monedas": 20, "gemas": 2},
  "tope_ejecucion": 50000
}'::jsonb, 'aventureros', '{bloques,bloques_texto,texto}');

-- Logros base
INSERT INTO logros (nombre, descripcion, icono, condicion, rareza) VALUES
('Primer Paso', 'Completa tu primer nivel', 'boot', '{"tipo": "niveles_completados", "cantidad": 1}', 'comun'),
('Explorador', 'Completa 10 niveles', 'compass', '{"tipo": "niveles_completados", "cantidad": 10}', 'comun'),
('Estrella Naciente', 'Obtén 3 estrellas en un nivel', 'star', '{"tipo": "estrellas_en_nivel", "cantidad": 3}', 'comun'),
('Maestro del Código', 'Completa un nivel en modalidad texto', 'code', '{"tipo": "modalidad", "valor": "texto"}', 'raro'),
('Racha de Fuego', 'Juega 7 días seguidos', 'fire', '{"tipo": "racha_dias", "cantidad": 7}', 'raro'),
('Millonario', 'Acumula 500 monedas', 'coin', '{"tipo": "monedas", "cantidad": 500}', 'epico');

-- Items de tienda básicos
INSERT INTO items_tienda (nombre, tipo, descripcion, costo_monedas, costo_gemas, datos) VALUES
('Sombrero de Mago', 'sombrero', 'Un elegante sombrero con estrellas', 50, 0, '{"slot": "sombrero", "id": "sombrero_mago"}'),
('Corona Dorada', 'sombrero', 'Para los verdaderos campeones', 0, 5, '{"slot": "sombrero", "id": "corona_dorada"}'),
('Gafas de Sol', 'accesorio', 'Para programar con estilo', 30, 0, '{"slot": "accesorio", "id": "gafas_sol"}'),
('Capa Héroe', 'accesorio', 'Una capa de superprogramador', 80, 0, '{"slot": "accesorio", "id": "capa_heroe"}'),
('Color Rojo Fuego', 'color', 'Pinta tu héroe de rojo intenso', 20, 0, '{"color": "rojo"}'),
('Color Verde Esmeralda', 'color', 'Pinta tu héroe de verde brillante', 20, 0, '{"color": "verde"}'),
('Color Dorado', 'color', 'El color de los campeones', 0, 3, '{"color": "dorado"}');
