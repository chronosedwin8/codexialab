/**
 * Genera con ElevenLabs la voz de las LECCIONES PREVIAS (Programación MD, HL y Python).
 *
 *   npx tsx backend/scripts/generate-audio-lecciones.mts [categoria...]
 *
 * Voz: Alice (educadora clara), la misma de los niveles de programación.
 * Es idempotente y reanudable: salta los MP3 que ya existen, así una interrupción
 * no obliga a regenerar (ni a pagar) lo ya hecho.
 * Se narra el título y el texto; el CÓDIGO no se lee en voz alta (suena horrible),
 * pero los pasos numerados sí, porque ahí está el método.
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { leccionMundo } from '../../frontend/src/data/lecciones.js';

const API_KEY = process.env.ELEVENLABS_API_KEY ?? 'sk_280eaa1f0826f3e391f541d1f36afbfdc0022933aea14f9c';
const VOZ = 'Xb7hH8MSUJpSbSDYk0k2'; // Alice
const MODELO = 'eleven_multilingual_v2';
const DESTINO = join(process.cwd(), 'frontend', 'public', 'audio', 'lecciones');

const MUNDOS: Record<string, number> = {
  programacion_md: 11,
  programacion_hl: 15,
  python: 5,
};

async function existe(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

async function sintetizar(texto: string, destino: string): Promise<void> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOZ}`, {
    method: 'POST',
    headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: texto,
      model_id: MODELO,
      voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  await writeFile(destino, Buffer.from(await res.arrayBuffer()));
}

/** Lo que se narra de una diapositiva. El código queda fuera a propósito. */
function guion(s: { titulo: string; texto: string; pasos?: readonly string[] }): string {
  const base = `${s.titulo}. ${s.texto}`;
  if (!s.pasos?.length) return base;
  return `${base} Los pasos son: ${s.pasos.map((p, i) => `${i + 1}. ${p}`).join(' ')}`;
}

async function main(): Promise<void> {
  const pedidas = process.argv.slice(2);
  const categorias = pedidas.length ? pedidas : Object.keys(MUNDOS);

  await mkdir(DESTINO, { recursive: true });

  let generados = 0;
  let saltados = 0;
  const fallos: string[] = [];

  for (const categoria of categorias) {
    const total = MUNDOS[categoria];
    if (!total) { console.log(`  ! categoría desconocida: ${categoria}`); continue; }

    for (let m = 1; m <= total; m++) {
      const leccion = leccionMundo(categoria, m);
      if (!leccion) { console.log(`  ! sin lección: ${categoria} m${m}`); continue; }

      for (let i = 0; i < leccion.slides.length; i++) {
        const nombre = `${leccion.clave}-s${i + 1}.mp3`;
        const ruta = join(DESTINO, nombre);

        if (await existe(ruta)) { saltados++; continue; }

        try {
          await sintetizar(guion(leccion.slides[i]), ruta);
          generados++;
          console.log(`  ✓ ${nombre}`);
          await new Promise((r) => setTimeout(r, 350)); // no atropellar la API
        } catch (e) {
          fallos.push(`${nombre}: ${(e as Error).message}`);
          console.log(`  ✗ ${nombre} — ${(e as Error).message}`);
        }
      }
    }
  }

  console.log(`\nGenerados ${generados} · ya existían ${saltados} · fallos ${fallos.length}`);
  if (fallos.length) {
    console.log('Fallos:');
    for (const f of fallos) console.log('  ' + f);
    process.exitCode = 1;
  }
}

main().catch((e) => { console.error('ERROR:', e); process.exit(1); });
