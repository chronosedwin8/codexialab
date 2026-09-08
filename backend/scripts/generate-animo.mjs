// Genera clips cortos de ánimo con la voz infantil (Jessica) para usar en lugar del TTS robótico
// en las actividades/mensajes que no tienen narración propia.
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, '../../frontend/public/audio/narracion');
const API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Jessica
const MODEL = 'eleven_multilingual_v2';

const FRASES = {
  'animo-1': '¡Vamos por el siguiente reto, tú puedes!',
  'animo-2': '¡Muy bien! Sigamos aprendiendo juntos.',
  'animo-3': '¡A pensar se ha dicho! Concéntrate, lo lograrás.',
  'animo-4': '¡Eres genial! Continuemos con este desafío.',
  'animo-5': '¡Excelente trabajo! Vamos por más.',
  'animo-6': '¡Lo estás haciendo increíble! No te rindas.',
  'exito-1': '¡Felicidades! Lo lograste, eres un campeón.',
  'exito-2': '¡Increíble! Completaste el reto, sigue así.',
};

async function tts(text, outPath) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true } }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 150)}`);
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, frase] of Object.entries(FRASES)) {
    try { await tts(frase, resolve(OUT_DIR, `${name}.mp3`)); console.log(`✓ ${name}.mp3`); }
    catch (e) { console.error(`✗ ${name}:`, e.message); }
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log('\n✅ Clips de ánimo/éxito generados con voz infantil.');
}
main();
