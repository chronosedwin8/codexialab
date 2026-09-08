// Genera con ElevenLabs (voz natural Jessica, offline) TODO el audio de los juegos
// preescolares (sub:'juego'): banco de frases (intro + cada ronda.instruccion) +
// clips de interfaz (nombre de cada mundo para el mapa + nombre/intro de la sección
// "Mundos Mágicos"). NUNCA se usa TTS del navegador. Idempotente: salta lo que ya existe.
//
// Uso:  node scripts/generate-audio-pre-juegos.mjs                (TODAS las categorías)
//       node scripts/generate-audio-pre-juegos.mjs <categoria>    (una)
//       node scripts/generate-audio-pre-juegos.mjs --force        (regenera todo)
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_DIR = resolve(__dirname, '../../frontend/public/audio/preescolar/bank');
const UI_DIR = resolve(__dirname, '../../frontend/public/audio/preescolar/ui');

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica
const MODEL = 'eleven_multilingual_v2';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const CAT_ARG = args.find((a) => !a.startsWith('--')) || null;

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
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(BANK_DIR)) mkdirSync(BANK_DIR, { recursive: true });
  if (!existsSync(UI_DIR)) mkdirSync(UI_DIR, { recursive: true });
  await client.connect();

  const where = CAT_ARG ? 'm.categoria = $1 AND' : '';
  const params = CAT_ARG ? [CAT_ARG] : [];
  const rows = (await client.query(
    `SELECT n.config, m.id AS mundo_id, m.nombre AS mundo_nombre FROM niveles n JOIN mundos m ON m.id = n.mundo_id
     WHERE ${where} n.config->>'sub' = 'juego'`, params
  )).rows;

  const frases = new Map();   // banco: intro + instrucciones de rondas
  const mundos = new Map();    // UI hover: nombre de cada mundo
  for (const r of rows) {
    const cfg = r.config;
    const add = (t) => { if (t && typeof t === 'string') frases.set(slugFrase(t), t); };
    add(cfg.instruccion); add(cfg.intro);
    for (const rd of (cfg.rondas || [])) add(rd.instruccion);
    mundos.set(r.mundo_id, r.mundo_nombre);
  }

  const FIJAS = { 'mundos-nombre': 'Mundos Mágicos', 'mundos-intro': '¡Mundos Mágicos! Elige una aventura.' };

  console.log(`Frases de banco: ${frases.size} · Mundos: ${mundos.size}`);
  let ok = 0, skip = 0, fail = 0;

  for (const [slug, texto] of frases) {
    const out = resolve(BANK_DIR, `${slug}.mp3`);
    if (!FORCE && existsSync(out)) { skip++; continue; }
    try { const b = await tts(texto, out); console.log(`✓ bank/${slug}.mp3 «${texto}» (${(b / 1024).toFixed(0)}KB)`); ok++; }
    catch (e) { console.error(`✗ ${slug}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 460));
  }
  for (const [id, nombre] of mundos) {
    const out = resolve(UI_DIR, `mundo-${id}.mp3`);
    if (!FORCE && existsSync(out)) { skip++; continue; }
    try { const b = await tts(nombre, out); console.log(`✓ ui/mundo-${id}.mp3 «${nombre}» (${(b / 1024).toFixed(0)}KB)`); ok++; }
    catch (e) { console.error(`✗ mundo-${id}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 460));
  }
  for (const [key, texto] of Object.entries(FIJAS)) {
    const out = resolve(UI_DIR, `${key}.mp3`);
    if (!FORCE && existsSync(out)) { skip++; continue; }
    try { const b = await tts(texto, out); console.log(`✓ ui/${key}.mp3 «${texto}» (${(b / 1024).toFixed(0)}KB)`); ok++; }
    catch (e) { console.error(`✗ ${key}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 460));
  }

  await client.end();
  console.log(`\n✅ Audio juegos preescolar: ${ok} generados, ${skip} ya existían${fail ? `, ${fail} fallidos` : ''}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
