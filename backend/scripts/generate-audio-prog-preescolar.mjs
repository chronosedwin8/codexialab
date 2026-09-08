// Genera OFFLINE con ElevenLabs los audios de VOZ de la materia PROGRAMACIÓN de preescolar:
//  · la instrucción hablada de cada nivel  → frontend/public/audio/preescolar/<id>.mp3
//  · clips de interfaz: prog-nombre, prog-intro  → .../ui/
//  · nombre de cada mundo (para narrar en el mapa) → .../ui/mundo-<id>.mp3
// Voz infantil/cálida Jessica. Ejecuta una sola vez; los MP3 quedan servidos estáticamente.
//
// Uso:  node scripts/generate-audio-prog-preescolar.mjs
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/preescolar');
const UI_DIR = resolve(OUT_DIR, 'ui');

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica — voz cálida para niños
const MODEL = 'eleven_multilingual_v2';
const CATEGORIA = 'prog_preescolar';

const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const FIJAS = {
  'prog-nombre': 'Programación',
  'prog-intro': '¡Programación! Guía al lobito con las flechas. Elige una aventura.',
};

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  return buf.length;
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  if (!existsSync(UI_DIR)) mkdirSync(UI_DIR, { recursive: true });
  await client.connect();
  let ok = 0, fail = 0;

  // 1) Clips de interfaz
  for (const [key, texto] of Object.entries(FIJAS)) {
    try { const b = await tts(texto, resolve(UI_DIR, `${key}.mp3`)); console.log(`✓ ui/${key}.mp3 (${(b / 1024).toFixed(0)} KB)`); ok++; }
    catch (e) { console.error(`✗ ${key}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 450));
  }

  // 2) Nombre de cada mundo
  const mundos = await client.query('SELECT id, nombre FROM mundos WHERE categoria = $1 ORDER BY numero_orden', [CATEGORIA]);
  for (const m of mundos.rows) {
    try { const b = await tts(m.nombre, resolve(UI_DIR, `mundo-${m.id}.mp3`)); console.log(`✓ ui/mundo-${m.id}.mp3 "${m.nombre}"`); ok++; }
    catch (e) { console.error(`✗ mundo-${m.id}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 450));
  }

  // 3) Instrucción hablada de cada nivel
  const niveles = await client.query(
    `SELECT n.id, n.config FROM niveles n JOIN mundos m ON m.id = n.mundo_id
     WHERE m.categoria = $1 ORDER BY m.numero_orden, n.numero_orden`, [CATEGORIA]
  );
  for (const row of niveles.rows) {
    const cfg = row.config;
    const texto = cfg.instruccion || cfg.narracion?.intro;
    const id = cfg.id;
    if (!texto || !id) continue;
    const file = `${id}.mp3`;
    try {
      const bytes = await tts(texto, resolve(OUT_DIR, file));
      const url = `/audio/preescolar/${file}`;
      cfg.audio = url;
      cfg.narracion = { ...(cfg.narracion || {}), intro: texto, url_audio_intro: url };
      await client.query('UPDATE niveles SET config = $1 WHERE id = $2', [JSON.stringify(cfg), row.id]);
      console.log(`✓ ${file} (${(bytes / 1024).toFixed(0)} KB)`);
      ok++;
    } catch (e) { console.error(`✗ ${id}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 500));
  }

  await client.end();
  console.log(`\n✅ Audio de Programación preescolar: ${ok} clips${fail ? `, ${fail} fallidos` : ''}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
