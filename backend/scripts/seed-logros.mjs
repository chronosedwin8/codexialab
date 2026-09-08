// Siembra los LOGROS (achievements) con condiciones y recompensas (monedas, gemas, items de tienda GRATIS).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

// condicion incluye la recompensa: { tipo, cantidad?, actividad?, recompensa:{monedas,gemas,item_id} }
const LOGROS = [
  ['Primer Paso', 'Completa tu primera actividad', '👣', 'comun', { tipo: 'niveles_completados', cantidad: 1, recompensa: { monedas: 20 } }],
  ['Aprendiz', 'Completa 10 actividades', '📚', 'comun', { tipo: 'niveles_completados', cantidad: 10, recompensa: { monedas: 50, item_id: 5 } }],
  ['Estudioso', 'Completa 25 actividades', '🎓', 'raro', { tipo: 'niveles_completados', cantidad: 25, recompensa: { monedas: 80, item_id: 3 } }],
  ['Leyenda', 'Completa 50 actividades', '🌟', 'epico', { tipo: 'niveles_completados', cantidad: 50, recompensa: { gemas: 5, item_id: 4 } }],
  ['Estrellado', 'Gana 15 estrellas', '⭐', 'comun', { tipo: 'estrellas', cantidad: 15, recompensa: { monedas: 40, item_id: 6 } }],
  ['Coleccionista de Estrellas', 'Gana 40 estrellas', '✨', 'raro', { tipo: 'estrellas', cantidad: 40, recompensa: { gemas: 3, item_id: 1 } }],
  ['Conquistador', 'Completa un mundo entero', '🏰', 'raro', { tipo: 'mundos_completos', cantidad: 1, recompensa: { monedas: 60, item_id: 31 } }],
  ['Maestro de Materia', 'Completa todos los mundos de una materia', '👑', 'legendario', { tipo: 'materia_completa', cantidad: 1, recompensa: { gemas: 8, item_id: 46 } }],
  ['Gamer Arcade', 'Completa un juego arcade (Mundo Especial)', '🎮', 'raro', { tipo: 'tipo_actividad', actividad: 'arcade', recompensa: { monedas: 30, item_id: 14 } }],
  ['Pequeño Científico', 'Completa un Laboratorio (Mundo Especial)', '🔬', 'raro', { tipo: 'tipo_actividad', actividad: 'simulacion', recompensa: { monedas: 30, item_id: 34 } }],
  ['Cerebro de IA', 'Construye tu primera neurona', '🧠', 'epico', { tipo: 'tipo_actividad', actividad: 'neurona', recompensa: { gemas: 2, item_id: 23 } }],
  ['Racha de Fuego', 'Mantén una racha de 3 días', '🔥', 'raro', { tipo: 'racha', cantidad: 3, recompensa: { monedas: 50 } }],
];

async function main() {
  await client.connect();
  // Limpia logros previos para re-sembrar con recompensas
  await client.query('DELETE FROM usuarios_logros');
  await client.query('DELETE FROM logros');
  await client.query(`SELECT setval('logros_id_seq', 1, false)`);
  for (const [nombre, descripcion, icono, rareza, condicion] of LOGROS) {
    await client.query('INSERT INTO logros (nombre, descripcion, icono, condicion, rareza, activo) VALUES ($1,$2,$3,$4,$5,true)', [nombre, descripcion, icono, JSON.stringify(condicion), rareza]);
  }
  console.log(`✅ ${LOGROS.length} logros sembrados con recompensas (items de tienda gratis incluidos).`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
