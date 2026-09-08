export {};
// Sandbox de ejecución para ARROW PATH (Camino de Flechas).
// Recibe la rejilla de flechas y "ejecuta" el recorrido como un programa: la bola entra
// en la casilla de inicio y, en cada casilla, se mueve en la dirección de su flecha hasta
// llegar a la meta, salirse, chocar con una pared o entrar en bucle.
type Dir = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
const DIRS: Record<Dir, [number, number]> = {
  N: [-1, 0], NE: [-1, 1], E: [0, 1], SE: [1, 1], S: [1, 0], SW: [1, -1], W: [0, -1], NW: [-1, -1],
};

interface Req { rows: number; cols: number; arrows: (Dir | null)[]; walls: boolean[]; start: [number, number]; goal: [number, number]; }

self.onmessage = (e: MessageEvent<Req>) => {
  const { rows, cols, arrows, walls, start, goal } = e.data;
  let [r, c] = start;
  const trace: Array<[number, number]> = [[r, c]];
  const seen = new Set<string>([`${r},${c}`]);
  let res = 'incompleto';
  for (let pasos = 0; pasos < rows * cols + 3; pasos++) {
    if (r === goal[0] && c === goal[1]) { res = 'gano'; break; }
    const dir = arrows[r * cols + c];
    if (!dir) { res = 'incompleto'; break; }            // casilla sin flecha → camino incompleto
    const [dr, dc] = DIRS[dir];
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) { res = 'fuera'; break; }   // se salió
    if (walls[nr * cols + nc]) { res = 'choque'; break; }                          // pared
    r = nr; c = nc; trace.push([r, c]);
    const k = `${r},${c}`;
    if (r === goal[0] && c === goal[1]) { res = 'gano'; break; }
    if (seen.has(k)) { res = 'bucle'; break; }            // dio vueltas
    seen.add(k);
  }
  (self as any).postMessage({ res, trace });
};
