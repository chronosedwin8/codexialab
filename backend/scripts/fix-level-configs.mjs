import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const client = new Client({
  host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db',
});
await client.connect();

const levels = [
  { id: 1, file: '../../frontend/src/levels/mundo1-nivel1.json', nombre: '¡Tu primer paso!' },
  { id: 2, file: '../../frontend/src/levels/mundo1-nivel2.json', nombre: 'El camino largo' },
  { id: 3, file: '../../frontend/src/levels/mundo1-nivel3.json', nombre: 'El poder de repetir' },
];

for (const level of levels) {
  const config = JSON.parse(readFileSync(resolve(__dirname, level.file), 'utf-8'));
  await client.query(
    'UPDATE niveles SET config = $1, nombre = $2 WHERE id = $3',
    [config, level.nombre, level.id]
  );
  console.log(`✓ Nivel ${level.id}: "${level.nombre}" actualizado`);
}

// Fix world names
const worlds = [
  [1, 'Valle de las Secuencias', '🌄'],
  [2, 'Bosque de los Bucles', '🌲'],
  [3, 'Ríos de la Condición', '🌊'],
  [4, 'El Océano de Datos', '🌊'],
  [5, 'Las Montañas del Código', '⛰️'],
  [6, 'La Ciudad Robótica', '🤖'],
  [7, 'El Castillo de los Algoritmos', '🏰'],
  [8, 'El Espacio Infinito', '🚀'],
  [9, 'El Portal del Tiempo', '⏳'],
  [10, 'El Olimpo del Programador', '🏆'],
];

for (const [id, nombre, icono] of worlds) {
  await client.query('UPDATE mundos SET nombre = $1, icono = $2 WHERE id = $3', [nombre, icono, id]);
  console.log(`✓ Mundo ${id}: "${nombre}"`);
}

await client.end();
console.log('\n✅ Encoding corregido en todos los niveles y mundos.');
