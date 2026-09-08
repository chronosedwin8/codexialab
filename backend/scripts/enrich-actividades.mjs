// Enriquece TODAS las actividades tipo "quiz" de todas las materias:
//  1) Agrega una fase "Aprende" con slides de CONTENIDO explicativo.
//  2) Agrega un slide de APLICACIÓN del tema ("Aplica lo aprendido").
//  3) Amplía las preguntas de 3 → 6 (entre 5 y 7), tomando más preguntas del
//     MISMO mundo (mismo tema) para mantener la coherencia pedagógica.
//
// Es idempotente: puede correrse varias veces sin duplicar preguntas (dedupe por enunciado)
// y regenerando los slides a partir del material ya validado (narración + explicaciones).
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const OBJETIVO_PREGUNTAS = 6; // entre 5 y 7

function dedupeByEnunciado(arr) {
  const seen = new Set();
  const out = [];
  for (const p of arr) {
    const k = (p.enunciado || '').trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

// Convierte una explicación en una frase de enseñanza limpia
function limpia(txt) {
  if (!txt) return '';
  let t = String(txt).trim();
  if (t && !/[.!?]$/.test(t)) t += '.';
  return t;
}

function construirSlides(cfg, worldName, poolMundo, mundoIntro) {
  // Preferimos la intro principal del mundo (la de la actividad 1, que sí enseña el concepto)
  // en vez de la intro genérica por actividad ("Reto 2. ¡Tú puedes!").
  const intro = mundoIntro || cfg.narracion?.intro || `Hoy vamos a aprender sobre ${worldName}.`;
  const slides = [];

  // Slide 1: qué vamos a aprender (usa la narración/intro ya validada)
  slides.push({ emoji: '📚', titulo: '¿Qué vamos a aprender?', texto: intro });

  // Slides 2-3: ideas clave, derivadas de explicaciones DECLARATIVAS del mismo tema (mundo).
  // Evitamos reacciones de respuesta ("No, ...", "Sí, ...", "Correcto, ...") que fuera de
  // contexto no enseñan; preferimos frases que expliquen el concepto por sí solas.
  const malInicio = /^(no|sí|si|correcto|claro|exacto|cierto|verdad|falso|sip|nop)\b[,:]?/i;
  const ideasUnicas = [...new Set(
    dedupeByEnunciado(poolMundo)
      .map((p) => limpia(p.explicacion))
      .filter((t) => t && t.length >= 22 && !malInicio.test(t))
  )];
  if (ideasUnicas[0]) slides.push({ emoji: '🧠', titulo: 'Idea clave', texto: ideasUnicas[0] });
  if (ideasUnicas[1]) slides.push({ emoji: '✨', titulo: 'Para recordar', texto: ideasUnicas[1] });

  return slides;
}

function construirAplicacion(worldName) {
  return {
    emoji: '🎯',
    titulo: 'Aplica lo aprendido',
    texto: `Piensa en tu día a día: ¿dónde puedes usar lo que aprendiste sobre "${worldName}"? `
      + `En los siguientes retos, usa estas ideas para resolver cada pregunta. ¡Tú puedes! 💪`,
  };
}

async function main() {
  await client.connect();
  const r = await client.query(`
    SELECT n.id, n.mundo_id, n.numero_orden, n.config, m.nombre AS mundo_nombre
    FROM niveles n JOIN mundos m ON m.id = n.mundo_id
    WHERE (n.config->>'tipo') = 'quiz'
    ORDER BY n.mundo_id, n.numero_orden`);

  // Agrupar por mundo y construir un pool de preguntas por mundo (mismo tema)
  const porMundo = new Map();
  for (const row of r.rows) {
    if (!porMundo.has(row.mundo_id)) porMundo.set(row.mundo_id, []);
    porMundo.get(row.mundo_id).push(row);
  }
  const poolPorMundo = new Map();
  const introPorMundo = new Map();
  for (const [mid, filas] of porMundo) {
    const todas = [];
    let mejorIntro = '';
    for (const f of filas) {
      for (const p of (f.config.preguntas || [])) todas.push(p);
      const intro = f.config.narracion?.intro || '';
      // La intro más larga del mundo suele ser la de la actividad 1: la que enseña el concepto.
      if (intro.length > mejorIntro.length) mejorIntro = intro;
    }
    poolPorMundo.set(mid, dedupeByEnunciado(todas));
    introPorMundo.set(mid, mejorIntro);
  }

  let nEnriquecidos = 0, nPreguntasAgregadas = 0;
  for (const row of r.rows) {
    const cfg = row.config;
    const worldName = (row.mundo_nombre || cfg.categoria || 'el tema').replace(/^🎮\s*|^🔬\s*/, '');
    const pool = poolPorMundo.get(row.mundo_id) || [];

    // 1) Slides de contenido + 2) aplicación
    cfg.contenido = construirSlides(cfg, worldName, pool, introPorMundo.get(row.mundo_id));
    cfg.aplicacion = construirAplicacion(worldName);

    // 3) Ampliar preguntas a OBJETIVO_PREGUNTAS, sin duplicar enunciados, del mismo mundo
    let preguntas = dedupeByEnunciado(cfg.preguntas || []);
    const base = preguntas.length;
    if (preguntas.length < OBJETIVO_PREGUNTAS) {
      const yaHay = new Set(preguntas.map((p) => (p.enunciado || '').trim().toLowerCase()));
      for (const p of pool) {
        if (preguntas.length >= OBJETIVO_PREGUNTAS) break;
        const k = (p.enunciado || '').trim().toLowerCase();
        if (yaHay.has(k)) continue;
        yaHay.add(k);
        preguntas.push(p);
      }
    }
    nPreguntasAgregadas += Math.max(0, preguntas.length - base);
    cfg.preguntas = preguntas;
    cfg.enriquecido = true;

    await client.query('UPDATE niveles SET config = $1 WHERE id = $2', [JSON.stringify(cfg), row.id]);
    nEnriquecidos++;
  }

  console.log(`✅ Actividades enriquecidas: ${nEnriquecidos}`);
  console.log(`   Preguntas adicionales agregadas: ${nPreguntasAgregadas}`);
  console.log(`   Cada actividad ahora tiene: slides de contenido + aplicación + hasta ${OBJETIVO_PREGUNTAS} preguntas.`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
