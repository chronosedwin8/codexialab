// Genera con ElevenLabs (offline) los clips de VOZ de la INTERFAZ de Preescolar:
// frases fijas (saludo, celebración, ánimo) y los NOMBRES de los mundos (para el mapa).
// Así toda la voz es natural (Jessica) y nunca se usa la voz robótica del navegador.
// Salida: frontend/public/audio/preescolar/ui/<key>.mp3 y mundo-<id>.mp3
import pg from 'pg';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/preescolar/ui');

const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica
const MODEL = 'eleven_multilingual_v2';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

const FIJAS = {
  'home-saludo': '¡Hola! Soy Búho. ¿Qué quieres aprender hoy? Toca Matemáticas, o toca Letras.',
  'mate-nombre': 'Matemáticas',
  'letras-nombre': 'Letras',
  'mate-intro': '¡Matemáticas! Elige una aventura.',
  'letras-intro': '¡Letras! Elige una aventura.',
  'bien': '¡Muy bien! ¡Lo lograste!',
  'casi': '¡Casi! Inténtalo otra vez. ¡Tú puedes!',
  'ganaste': '¡Lo lograste! Ganaste estrellas. ¿Quieres jugar otra vez, o seguir?',
};

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
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  await client.connect();
  let ok = 0, fail = 0;

  for (const [key, texto] of Object.entries(FIJAS)) {
    try { const b = await tts(texto, resolve(OUT_DIR, `${key}.mp3`)); console.log(`✓ ${key}.mp3 (${(b / 1024).toFixed(0)} KB)`); ok++; }
    catch (e) { console.error(`✗ ${key}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 450));
  }

  const mundos = await client.query("SELECT id, nombre FROM mundos WHERE categoria IN ('mate_preescolar','lectoescritura') ORDER BY id");
  for (const m of mundos.rows) {
    try { const b = await tts(m.nombre, resolve(OUT_DIR, `mundo-${m.id}.mp3`)); console.log(`✓ mundo-${m.id}.mp3 "${m.nombre}" (${(b / 1024).toFixed(0)} KB)`); ok++; }
    catch (e) { console.error(`✗ mundo-${m.id}:`, e.message); fail++; }
    await new Promise((r) => setTimeout(r, 450));
  }

  await client.end();
  console.log(`\n✅ Voz de interfaz preescolar: ${ok} clips${fail ? `, ${fail} fallidos` : ''}.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
