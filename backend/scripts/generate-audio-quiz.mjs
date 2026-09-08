// Genera audio de las INTROS DE MUNDO de las materias de quiz con una voz infantil y llamativa.
// Voz: Jessica (Playful, Bright, Warm). Guarda MP3 en public/audio/narracion/{cat}-m{orden}-intro.mp3
// y actualiza el config del nivel 1 de cada mundo (url_audio_intro).
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/narracion');
const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica — Playful, Bright, Warm (infantil/llamativa)
const MODEL = 'eleven_multilingual_v2';

const CATEGORIAS = process.argv.slice(2).length ? process.argv.slice(2) : ['logica', 'informatica', 'seguridad', 'ia', 'aritmetica', 'geometria', 'fisica'];
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 150)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  await client.connect();
  let total = 0;
  for (const cat of CATEGORIAS) {
    const mundos = await client.query(
      `SELECT m.numero_orden AS orden, n.id AS nivel_id, n.config
       FROM mundos m JOIN niveles n ON n.mundo_id = m.id AND n.numero_orden = 1
       WHERE m.categoria = $1 ORDER BY m.numero_orden`, [cat]);
    for (const row of mundos.rows) {
      const intro = row.config?.narracion?.intro;
      if (!intro) continue;
      const file = `${cat}-m${row.orden}-intro.mp3`;
      const out = resolve(OUT_DIR, file);
      try {
        const bytes = await tts(intro, out);
        const cfg = row.config;
        cfg.narracion.url_audio_intro = `/audio/narracion/${file}`;
        await client.query('UPDATE niveles SET config = $1 WHERE id = $2', [cfg, row.nivel_id]);
        console.log(`✓ ${file} (${(bytes / 1024).toFixed(0)} KB)`);
        total++;
      } catch (e) { console.error(`✗ ${file}:`, e.message); }
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  await client.end();
  console.log(`\n✅ ${total} intros de mundo narradas con voz infantil (Jessica).`);
}
main().catch((e) => { console.error(e); process.exit(1); });
