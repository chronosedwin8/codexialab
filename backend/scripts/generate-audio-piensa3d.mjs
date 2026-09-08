// Genera con ElevenLabs (voz Jessica, offline) el audio EXPLICATIVO de cada nivel de la
// materia "Piensa en 3D" (config.tipo='lightbot'): narra la intro y guarda la URL en el nivel
// (narracion.url_audio_intro) para que LevelView la reproduzca al abrir. NUNCA TTS del navegador.
// Uso:  node scripts/generate-audio-piensa3d.mjs           (genera lo que falte)
//       node scripts/generate-audio-piensa3d.mjs --force   (regenera todo)
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/piensa3d');
const URL_BASE = '/audio/piensa3d';
const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica
const MODEL = 'eleven_multilingual_v2';
const FORCE = process.argv.includes('--force');

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8 } }),
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
    `SELECT n.id, n.config FROM niveles n JOIN mundos m ON m.id = n.mundo_id
     WHERE m.categoria = 'piensa3d' ORDER BY m.numero_orden, n.numero_orden`
  )).rows;
  console.log(`Niveles Piensa en 3D: ${rows.length}`);
  let ok = 0, skip = 0, fail = 0;
  for (const r of rows) {
    const cfg = r.config;
    const slug = cfg.id || `lvl-${r.id}`;
    const texto = cfg.intro || cfg.narracion?.intro;
    if (!texto) { continue; }
    const file = `${slug}.mp3`;
    const out = resolve(OUT_DIR, file);
    const url = `${URL_BASE}/${file}`;
    if (!FORCE && existsSync(out)) { skip++; }
    else {
      try { const b = await tts(texto, out); console.log(`✓ ${file} «${texto.slice(0, 50)}…» (${(b / 1024).toFixed(0)}KB)`); ok++; await new Promise((s) => setTimeout(s, 480)); }
      catch (e) { console.error(`✗ ${slug}:`, e.message); fail++; continue; }
    }
    // Guardar la URL en el nivel
    await client.query(`UPDATE niveles SET config = jsonb_set(config, '{narracion,url_audio_intro}', to_jsonb($1::text)) WHERE id = $2`, [url, r.id]);
  }
  await client.end();
  console.log(`\n✅ Audio Piensa en 3D: ${ok} generados, ${skip} ya existían${fail ? `, ${fail} fallidos` : ''}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
