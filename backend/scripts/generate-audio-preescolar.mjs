// Genera OFFLINE con ElevenLabs los audios de VOZ de las instrucciones de PREESCOLAR.
// (No es síntesis en tiempo real: se ejecuta una vez y los MP3 quedan servidos estáticamente.)
// Voz infantil/cálida Jessica. Guarda en frontend/public/audio/preescolar/<id>.mp3
// y actualiza config.narracion.url_audio_intro de cada actividad a esa ruta.
//
// Uso:  node scripts/generate-audio-preescolar.mjs            (todas)
//       node scripts/generate-audio-preescolar.mjs mate       (solo matemática)
//       node scripts/generate-audio-preescolar.mjs lecto      (solo lectoescritura)
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/preescolar');

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica — voz cálida, ideal para niños
const MODEL = 'eleven_multilingual_v2';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: MODEL,
      // Voz expresiva y clara para niños pequeños
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  await client.connect();

  const arg = (process.argv[2] || '').toLowerCase();
  let cats = ['mate_preescolar', 'lectoescritura'];
  if (arg.startsWith('mate')) cats = ['mate_preescolar'];
  else if (arg.startsWith('lecto')) cats = ['lectoescritura'];

  const r = await client.query(
    `SELECT n.id, n.config FROM niveles n JOIN mundos m ON m.id = n.mundo_id
     WHERE m.categoria = ANY($1) ORDER BY m.numero_orden, n.numero_orden`, [cats]
  );

  let ok = 0, fail = 0;
  for (const row of r.rows) {
    const cfg = row.config;
    const texto = cfg.instruccion || cfg.narracion?.intro;
    const id = cfg.id;
    if (!texto || !id) continue;
    const file = `${id}.mp3`;
    const out = resolve(OUT_DIR, file);
    try {
      const bytes = await tts(texto, out);
      const url = `/audio/preescolar/${file}`;
      cfg.narracion = { ...(cfg.narracion || {}), intro: texto, url_audio_intro: url };
      cfg.audio = url;
      await client.query('UPDATE niveles SET config = $1 WHERE id = $2', [JSON.stringify(cfg), row.id]);
      console.log(`✓ ${file}  (${(bytes / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (e) {
      console.error(`✗ ${id}:`, e.message);
      fail++;
    }
    await new Promise((res2) => setTimeout(res2, 500)); // throttle suave
  }
  await client.end();
  console.log(`\n✅ Audios de preescolar: ${ok} generados${fail ? `, ${fail} fallidos` : ''}. Carpeta: frontend/public/audio/preescolar/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
