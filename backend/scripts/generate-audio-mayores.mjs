// Genera con ElevenLabs (voz educadora Alice, offline) el banco de voz de los juegos
// 7-12 del Sitio Miguel (config.fuente='miguel', tipo='quiz'): intro de cada mundo +
// texto de cada slide "Aprende" + enunciado de cada pregunta. NUNCA TTS del navegador.
// Salida: frontend/public/audio/quiz-bank/<slug>.mp3  (idempotente; --force regenera).
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/quiz-bank');

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice — educadora clara
const MODEL = 'eleven_multilingual_v2';
const FORCE = process.argv.includes('--force');

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function slugFrase(t) {
  return (t || '').toLowerCase()
    .replace(/[áàâä]/g, 'a').replace(/[éèêë]/g, 'e').replace(/[íìîï]/g, 'i')
    .replace(/[óòôö]/g, 'o').replace(/[úùûü]/g, 'u').replace(/ñ/g, 'n')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'x';
}

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  await client.connect();

  const rows = (await client.query(
    `SELECT config FROM niveles WHERE config->>'tipo'='quiz' AND config->>'fuente'='miguel'`
  )).rows;

  const frases = new Map();
  for (const { config } of rows) {
    const add = (t) => { if (t && typeof t === 'string') frases.set(slugFrase(t), t); };
    add(config.narracion?.intro);
    for (const s of (config.contenido || [])) add(s.texto);
    if (config.aplicacion) add(config.aplicacion.texto);
    for (const p of (config.preguntas || [])) add(p.enunciado);
  }
  console.log(`Frases a generar: ${frases.size}`);

  let ok = 0, skip = 0, fail = 0;
  for (const [slug, texto] of frases) {
    const out = resolve(OUT_DIR, `${slug}.mp3`);
    if (!FORCE && existsSync(out)) { skip++; continue; }
    try { const b = await tts(texto, out); console.log(`✓ ${slug}.mp3 «${texto.slice(0, 50)}» (${(b / 1024).toFixed(0)}KB)`); ok++; }
    catch (e) { console.error(`✗ ${slug}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 480));
  }

  await client.end();
  console.log(`\n✅ Banco quiz 7-12: ${ok} generados, ${skip} ya existían${fail ? `, ${fail} fallidos` : ''}. Carpeta: frontend/public/audio/quiz-bank/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
