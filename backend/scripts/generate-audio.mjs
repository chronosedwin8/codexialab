// Genera los audios de narración OFFLINE con ElevenLabs y los descarga como MP3.
// NO es síntesis en tiempo real: se ejecuta una vez y los MP3 quedan servidos estáticamente.
// Lee las narraciones desde la BD (fuente única de verdad) y guarda en frontend/public/audio/narracion/.
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/narracion');

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice — Clear, Engaging Educator
const MODEL = 'eleven_multilingual_v2';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  await client.connect();
  // MUNDOS a generar: por defecto los pasados como args (ej. "node generate-audio.mjs 2 3"), o todos
  const args = process.argv.slice(2).map(Number).filter((n) => !Number.isNaN(n));
  const mundos = args.length ? args : [1, 2, 3];
  const r = await client.query('SELECT mundo_id, numero_orden, config FROM niveles WHERE mundo_id = ANY($1) ORDER BY mundo_id, numero_orden', [mundos]);

  for (const row of r.rows) {
    const m = row.mundo_id, orden = row.numero_orden;
    const intro = row.config?.narracion?.intro;
    if (!intro) { console.log(`- M${m}-${orden}: sin intro, omitido`); continue; }
    const out = resolve(OUT_DIR, `m${m}-n${orden}-intro.mp3`);
    try {
      const bytes = await tts(intro, out);
      console.log(`✓ m${m}-n${orden}-intro.mp3  (${(bytes / 1024).toFixed(0)} KB)`);
    } catch (e) {
      console.error(`✗ M${m}-${orden}:`, e.message);
    }
    await new Promise((res2) => setTimeout(res2, 600)); // throttle suave
  }
  await client.end();
  console.log('\n✅ Audios de narración generados en frontend/public/audio/narracion/');
}

main().catch((e) => { console.error(e); process.exit(1); });
