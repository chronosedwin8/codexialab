// Genera efectos de sonido (SFX) del juego con la API de generación de sonidos de ElevenLabs.
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../../frontend/public/audio');
const KEY = process.env.ELEVENLABS_API_KEY || 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';

const SFX = {
  'sfx-correcto': { text: 'happy cheerful success chime, short bright ding for kids game', duration_seconds: 1.0 },
  'sfx-error': { text: 'gentle soft wrong answer boing, playful low blip, not scary', duration_seconds: 0.8 },
  'sfx-salto': { text: 'cartoon jump whoosh, short bouncy spring sound', duration_seconds: 0.7 },
  'sfx-moneda': { text: 'coin pickup collect sound, bright video game ding', duration_seconds: 0.6 },
  'sfx-ganar': { text: 'short happy victory fanfare, cheerful kids win jingle', duration_seconds: 1.8 },
  'sfx-click': { text: 'soft UI button click pop, short and clean', duration_seconds: 0.4 },
};

async function gen(text, duration, out) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, duration_seconds: duration, prompt_influence: 0.5 }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 120)}`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  const test = resolve(OUT, 'sfx-test.mp3'); if (existsSync(test)) unlinkSync(test);
  for (const [name, cfg] of Object.entries(SFX)) {
    try { await gen(cfg.text, cfg.duration_seconds, resolve(OUT, `${name}.mp3`)); console.log(`✓ ${name}.mp3`); }
    catch (e) { console.error(`✗ ${name}:`, e.message); }
    await new Promise((r) => setTimeout(r, 800));
  }
  console.log('\n✅ Efectos de sonido generados en public/audio/.');
}
main();
