// Crea la tabla de puntajes de la Zona de Juegos (records con fecha/hora, ranking compartido).
import pg from 'pg';
const c = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });
async function main() {
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS puntajes_juego (
      id SERIAL PRIMARY KEY,
      juego VARCHAR(60) NOT NULL,
      usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
      nombre VARCHAR(150) NOT NULL,
      puntos INT NOT NULL DEFAULT 0,
      mundo INT NOT NULL DEFAULT 1,
      creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  await c.query('CREATE INDEX IF NOT EXISTS idx_puntajes_juego ON puntajes_juego (juego, puntos DESC)');
  console.log('✅ Tabla puntajes_juego lista.');
  await c.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
