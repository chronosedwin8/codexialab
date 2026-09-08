// Asigna un MINI-JUEGO a 1 de cada 3 actividades quiz (sin tocar los juegos que ya existen:
// programación/grid, arcade, neurona, simulación). Rota entre 10 plantillas y deriva los datos
// de cada juego a partir del contenido de la actividad (preguntas, vocabulario del tema).
//
// Idempotente: la cadencia es determinista por orden (mundo, numero_orden); re-correr reasigna
// los mismos juegos. GOTCHA: re-sembrar una materia borra config.juego → volver a correr esto
// (y enrich-actividades.mjs) después.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const PLANTILLAS = ['sopa', 'ahorcado', 'memoria', 'globos', 'lluvia', 'topo', 'camino', 'pacman', 'mario', 'rompecabezas'];
const STOP = new Set(['DE', 'LA', 'EL', 'LOS', 'LAS', 'UN', 'UNA', 'UNOS', 'UNAS', 'QUE', 'CON', 'POR', 'PARA', 'DEL', 'AL', 'ES', 'SON', 'TU', 'TUS', 'MUY', 'MAS', 'NO', 'SI', 'EN', 'SE', 'SU', 'SUS', 'LO', 'LE', 'COMO', 'CADA', 'TODO', 'TODA', 'TODOS', 'TODAS', 'MAYUSCULAS', 'SOLO', 'PERO', 'SOBRE', 'ENTRE', 'CUANDO', 'PORQUE', 'ESTA', 'ESTE', 'ESTOS', 'HACE', 'HACER', 'TIENE', 'PUEDE', 'DEBES', 'DEBE', 'SIEMPRE', 'NUNCA', 'MEJOR', 'BIEN', 'ALGO', 'ELLA', 'ELLOS']);

function sinAcentos(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function aPalabra(s) { return sinAcentos(String(s)).toUpperCase().replace(/[^A-ZÑ]/g, ''); }

// Preguntas de opción múltiple utilizables (opciones + correcta numérica)
function getPreguntas(cfg) {
  return (cfg.preguntas || [])
    .filter((p) => Array.isArray(p.opciones) && p.opciones.length >= 2 && typeof p.correcta === 'number' && p.opciones[p.correcta] != null)
    .map((p) => ({ enunciado: String(p.enunciado || '').slice(0, 120), opciones: p.opciones.map((o) => String(o).slice(0, 28)), correcta: p.correcta, explicacion: p.explicacion || '' }));
}

// Vocabulario del tema: palabras limpias de 3..9 letras desde respuestas/opciones/nombre del mundo
function getPalabras(cfg, worldName) {
  const fuente = [];
  for (const p of (cfg.preguntas || [])) {
    if (Array.isArray(p.opciones)) for (const o of p.opciones) fuente.push(o);
  }
  fuente.push(worldName);
  const set = new Set();
  for (const frag of fuente) {
    for (const tok of String(frag).split(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]+/)) {
      const w = aPalabra(tok);
      if (w.length >= 4 && w.length <= 9 && !STOP.has(w)) set.add(w);
    }
  }
  // Más largas primero (suelen ser conceptos clave)
  return [...set].sort((a, b) => b.length - a.length);
}

function buildSopa(cfg, worldName) {
  const palabras = getPalabras(cfg, worldName).slice(0, 6);
  return palabras.length >= 4 ? { tipo: 'sopa', palabras } : null;
}
function buildAhorcado(cfg, worldName) {
  const palabras = getPalabras(cfg, worldName);
  if (!palabras.length) return null;
  const palabra = palabras[0];
  // Pista: una pregunta cuyo correcto contenga la palabra, o el nombre del tema
  let pista = `Tema: ${worldName}`;
  for (const p of (cfg.preguntas || [])) {
    if (typeof p.correcta === 'number' && p.opciones?.[p.correcta] && aPalabra(p.opciones[p.correcta]).includes(palabra)) {
      pista = String(p.enunciado || pista).slice(0, 80); break;
    }
  }
  return { tipo: 'ahorcado', palabra, pista };
}
function buildMemoria(cfg) {
  const qs = getPreguntas(cfg);
  const pares = [];
  for (const q of qs) {
    const a = q.enunciado.replace(/\s+/g, ' ').replace(/[¿?]/g, '').trim().slice(0, 46);
    const b = q.opciones[q.correcta];
    if (a && b && b.length <= 28) pares.push([a, b]);
    if (pares.length >= 5) break;
  }
  return pares.length >= 3 ? { tipo: 'memoria', pares } : null;
}
function buildPreguntasJuego(tipo, cfg) {
  const preguntas = getPreguntas(cfg).slice(0, 3);
  return preguntas.length >= 1 ? { tipo, preguntas } : null;
}
function buildRompecabezas(cfg, worldName) {
  // Un dato curioso para revelar al resolver
  let fact = `¡Lo lograste! Sigue aprendiendo sobre ${worldName}.`;
  const ideas = (cfg.contenido || []).map((s) => s.texto).filter(Boolean);
  const exps = (cfg.preguntas || []).map((p) => p.explicacion).filter(Boolean);
  const cand = [...ideas, ...exps].find((t) => t && t.length > 20 && t.length < 140);
  if (cand) fact = cand;
  return { tipo: 'rompecabezas', fact };
}

function construir(tipo, cfg, worldName) {
  switch (tipo) {
    case 'sopa': return buildSopa(cfg, worldName);
    case 'ahorcado': return buildAhorcado(cfg, worldName);
    case 'memoria': return buildMemoria(cfg);
    case 'rompecabezas': return buildRompecabezas(cfg, worldName);
    default: return buildPreguntasJuego(tipo, cfg); // globos/lluvia/topo/camino/pacman/mario
  }
}

async function main() {
  await client.connect();
  const r = await client.query(`
    SELECT n.id, n.config, m.nombre AS mundo_nombre
    FROM niveles n JOIN mundos m ON m.id = n.mundo_id
    WHERE (n.config->>'tipo') = 'quiz'
    ORDER BY n.mundo_id, n.numero_orden`);

  let conJuego = 0, rot = 0;
  const cuenta = {};
  let idxGlobal = 0;
  for (const row of r.rows) {
    const cfg = row.config;
    const worldName = (row.mundo_nombre || cfg.categoria || 'el tema').replace(/^🎮\s*|^🔬\s*/, '');
    idxGlobal++;
    const asignar = idxGlobal % 3 === 0; // 1 de cada 3 actividades

    if (!asignar) {
      if (cfg.juego) { delete cfg.juego; await client.query('UPDATE niveles SET config=$1 WHERE id=$2', [JSON.stringify(cfg), row.id]); }
      continue;
    }

    // Elegir plantilla por rotación; si no es viable, probar las siguientes
    let juego = null, intento = 0;
    while (!juego && intento < PLANTILLAS.length) {
      const tipo = PLANTILLAS[(rot + intento) % PLANTILLAS.length];
      juego = construir(tipo, cfg, worldName);
      intento++;
    }
    rot++;
    if (!juego) { if (cfg.juego) delete cfg.juego; await client.query('UPDATE niveles SET config=$1 WHERE id=$2', [JSON.stringify(cfg), row.id]); continue; }

    cfg.juego = juego;
    cuenta[juego.tipo] = (cuenta[juego.tipo] || 0) + 1;
    conJuego++;
    await client.query('UPDATE niveles SET config=$1 WHERE id=$2', [JSON.stringify(cfg), row.id]);
  }

  console.log(`✅ Mini-juegos asignados a ${conJuego} actividades (1 de cada 3).`);
  console.log('   Por tipo:', JSON.stringify(cuenta));
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
