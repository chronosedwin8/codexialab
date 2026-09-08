// Sandbox de programación para "Piensa en 3D" (estilo Light-Bot).
// Ejecuta el algoritmo del estudiante (bloques compilados a JS) con un `bot` controlado,
// sobre un mundo 3D de alturas. Devuelve la secuencia de acciones (con su resultado) para
// animarlas en Three.js, y si encendió TODAS las placas azules (ganaste).
export {};
type Dir = 'norte' | 'sur' | 'este' | 'oeste';
interface Req { codigo: string; grid: number[][]; spawn: { x: number; y: number; dir: Dir }; metas: { x: number; y: number }[]; api: string[]; tope: number; }

const DIRS: Record<Dir, { dx: number; dy: number }> = { norte: { dx: 0, dy: -1 }, sur: { dx: 0, dy: 1 }, este: { dx: 1, dy: 0 }, oeste: { dx: -1, dy: 0 } };
const TR: Record<Dir, Dir> = { norte: 'este', este: 'sur', sur: 'oeste', oeste: 'norte' };
const TL: Record<Dir, Dir> = { norte: 'oeste', oeste: 'sur', sur: 'este', este: 'norte' };

self.onmessage = (e: MessageEvent<Req>) => {
  const { codigo, grid, spawn, metas, api, tope } = e.data;
  const rows = grid.length, cols = grid[0]?.length ?? 0;
  let x = spawn.x, y = spawn.y, dir: Dir = spawn.dir;
  const acciones: any[] = [];
  let pasos = 0;
  const lit = new Set<string>();
  const metaSet = new Set(metas.map((m) => `${m.x},${m.y}`));
  const H = (cx: number, cy: number): number | null => (cx >= 0 && cy >= 0 && cy < rows && cx < cols && grid[cy][cx] > 0 ? grid[cy][cx] : null);
  const lim = () => { if (++pasos > (tope || 1000)) throw new Error('Tu programa hizo demasiados pasos. ¿Hay un bucle infinito?'); };
  const chk = (c: string) => { if (!api.includes(c)) throw new Error(`El comando "${c}" no está disponible en este nivel`); };

  const bot = {
    avanzar() {
      lim(); chk('avanzar'); const d = DIRS[dir]; const tx = x + d.dx, ty = y + d.dy; const th = H(tx, ty), ch = H(x, y);
      if (th !== null && th === ch) { x = tx; y = ty; acciones.push({ cmd: 'avanzar', x, y, z: th, ok: true }); }
      else acciones.push({ cmd: 'avanzar', ok: false });
    },
    saltar() {
      lim(); chk('saltar'); const d = DIRS[dir]; const tx = x + d.dx, ty = y + d.dy; const th = H(tx, ty), ch = H(x, y);
      if (th !== null && ch !== null && (th === ch + 1 || th < ch)) { x = tx; y = ty; acciones.push({ cmd: 'saltar', x, y, z: th, ok: true }); }
      else acciones.push({ cmd: 'saltar', ok: false });
    },
    girarDerecha() { lim(); chk('girarDerecha'); dir = TR[dir]; acciones.push({ cmd: 'girarDerecha', dir }); },
    girarIzquierda() { lim(); chk('girarIzquierda'); dir = TL[dir]; acciones.push({ cmd: 'girarIzquierda', dir }); },
    encender() {
      lim(); chk('encender'); const k = `${x},${y}`;
      if (metaSet.has(k)) { lit.add(k); acciones.push({ cmd: 'encender', x, y, ok: true }); }
      else acciones.push({ cmd: 'encender', ok: false });
    },
    // Sensores (para condicionales). Cuentan paso para evitar bucles/recursión infinitos.
    hayObstaculo(): boolean { lim(); const d = DIRS[dir]; const th = H(x + d.dx, y + d.dy); return !(th !== null && th === H(x, y)); },
    puedeAvanzar(): boolean { lim(); const d = DIRS[dir]; const th = H(x + d.dx, y + d.dy); return th !== null && th === H(x, y); },
  };

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('bot', codigo);
    fn(bot);
    const ganaste = metas.length > 0 && metas.every((m) => lit.has(`${m.x},${m.y}`));
    (self as any).postMessage({ ok: true, acciones, ganaste });
  } catch (err: any) {
    (self as any).postMessage({ ok: false, error: err?.message || String(err), acciones });
  }
};
