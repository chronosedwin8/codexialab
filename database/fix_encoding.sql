-- Fix encoding issues in seeded data
UPDATE niveles SET nombre = E'¡Tu primer paso!' WHERE id = 1;
UPDATE mundos SET nombre = 'Valle de las Secuencias' WHERE numero_orden = 1;
UPDATE mundos SET nombre = 'Bosque de los Bucles' WHERE numero_orden = 2;
UPDATE mundos SET nombre = 'Ríos de la Condición' WHERE numero_orden = 3;

-- Fix config JSON text fields (re-seed from JSON files)
UPDATE niveles SET config = config::jsonb WHERE id IN (1,2,3);

SELECT id, nombre FROM niveles ORDER BY id;
SELECT id, nombre FROM mundos ORDER BY numero_orden;
