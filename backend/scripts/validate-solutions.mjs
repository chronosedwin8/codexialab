// Ejecuta el codigo_inicial de cada nivel con la MISMA lógica del worker (colisión + sensores)
// y reporta si resuelve el nivel (llega a objetivos obligatorios) o si choca / se queda corto.
import pg from 'pg';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const DELTAS = { derecha: { dx: 1, dy: 0 }, izquierda: { dx: -1, dy: 0 }, abajo: { dx: 0, dy: 1 }, arriba: { dx: 0, dy: -1 } };
const TURN_R = { derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha' };
const TURN_L = { derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha' };

function simulate(cfg) {
  const map = cfg.tilemap, R = map.length, C = map[0].length;
  let x = cfg.spawn.x, y = cfg.spawn.y, dir = cfg.spawn.dir;
  const visited = new Set([`${x},${y}`]);
  const walkable = (nx, ny) => ny >= 0 && ny < R && nx >= 0 && nx < C && map[ny][nx] === 0;
  const move = (d) => {
    const nx = x + DELTAS[d].dx, ny = y + DELTAS[d].dy;
    if (!walkable(nx, ny)) throw new Error(`colisión hacia ${d} desde (${x},${y})`);
    x = nx; y = ny; dir = d; visited.add(`${x},${y}`);
  };
  const heroe = {
    avanzar: () => move(dir),
    moverArriba: () => move('arriba'), moverAbajo: () => move('abajo'),
    moverIzquierda: () => move('izquierda'), moverDerecha: () => move('derecha'),
    girarDerecha: () => { dir = TURN_R[dir]; }, girarIzquierda: () => { dir = TURN_L[dir]; },
    detectarObstaculo: () => { const nx = x + DELTAS[dir].dx, ny = y + DELTAS[dir].dy; return !walkable(nx, ny); },
    puedeAvanzar: () => walkable(x + DELTAS[dir].dx, y + DELTAS[dir].dy),
    leerSensor: () => 'libre',
  };
  // eslint-disable-next-line no-new-func
  new Function('heroe', cfg.codigo_inicial.javascript)(heroe);
  return { x, y, visited };
}

async function main() {
  await client.connect();
  const r = await client.query('SELECT id, mundo_id, numero_orden, nombre, config FROM niveles ORDER BY mundo_id, numero_orden');
  let problemas = 0;
  for (const row of r.rows) {
    const cfg = row.config;
    // Solo validar niveles de PROGRAMACIÓN (rejilla): tienen tilemap y objetivos, sin tipo quiz/arcade/etc.
    if (cfg.tipo || !Array.isArray(cfg.tilemap) || !Array.isArray(cfg.objetivos)) continue;
    const obligatorios = cfg.objetivos.filter((o) => o.obligatorio && o.tipo === 'alcanzar_celda');
    const opcionales = cfg.objetivos.filter((o) => !o.obligatorio);
    let res;
    try { res = simulate(cfg); }
    catch (e) {
      // Mundo 1 y starters parciales NO son soluciones completas: solo marcamos si chocan
      console.log(`⚠️  M${row.mundo_id}-${row.numero_orden} "${row.nombre}": el código inicial CHOCA (${e.message})`);
      problemas++; continue;
    }
    const llegaTodos = obligatorios.every((o) => res.x === o.x && res.y === o.y);
    const tag = `M${row.mundo_id}-${row.numero_orden} "${row.nombre}"`;
    if (row.mundo_id === 1) {
      // World 1 starters son parciales por diseño; solo confirmamos que no chocan
      console.log(`·  ${tag}: starter parcial OK (no choca)`);
    } else if (llegaTodos) {
      const opOk = opcionales.every((o) => res.visited.has(`${o.x},${o.y}`));
      console.log(`✓  ${tag}: SOLUCIÓN COMPLETA${opcionales.length ? (opOk ? ' (+coleccionables)' : ' (faltan coleccionables)') : ''}`);
    } else {
      console.log(`✗  ${tag}: el código inicial NO llega a la meta (queda en ${res.x},${res.y})`);
      problemas++;
    }
  }
  console.log(problemas === 0 ? '\n✅ Sin colisiones ni soluciones rotas.' : `\n⚠️  ${problemas} nivel(es) requieren ajuste.`);
  await client.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
