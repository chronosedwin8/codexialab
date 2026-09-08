import type { WorkerRequest, WorkerResponse, Accion } from '@/game/types';

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { codigo, lenguaje, apiPermitida, tope_ejecucion, tilemap, spawn } = event.data;

  if (lenguaje === 'python') {
    self.postMessage({ ok: false, error: { mensaje: 'Python requiere Pyodide. Usa JavaScript o bloques por ahora.' } } satisfies WorkerResponse);
    return;
  }

  const acciones: Accion[] = [];
  let instrucciones = 0;
  let timedOut = false;

  // Estado de posición del héroe (para validar colisiones)
  let hx = spawn?.x ?? 0;
  let hy = spawn?.y ?? 0;
  let hdir: string = spawn?.dir ?? 'derecha';

  const rows = tilemap?.length ?? 0;
  const cols = tilemap?.[0]?.length ?? 0;

  function isWalkable(x: number, y: number): boolean {
    if (!tilemap) return true; // Sin mapa no validamos
    if (x < 0 || y < 0 || y >= rows || x >= cols) return false;
    return tilemap[y][x] === 0;
  }

  const TURN_RIGHT: Record<string, string> = { derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha' };
  const TURN_LEFT: Record<string, string> = { derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha' };
  const DELTAS: Record<string, { dx: number; dy: number }> = {
    derecha: { dx: 1, dy: 0 }, izquierda: { dx: -1, dy: 0 },
    abajo: { dx: 0, dy: 1 }, arriba: { dx: 0, dy: -1 },
  };

  const timeoutId = setTimeout(() => { timedOut = true; }, 5000);

  function checkLimit() {
    instrucciones++;
    if (timedOut) throw new Error('Tiempo de ejecución excedido (5 segundos)');
    if (instrucciones > tope_ejecucion) throw new Error(`Límite de instrucciones excedido (máx: ${tope_ejecucion}). ¿Hay un bucle infinito?`);
  }

  // Movimiento absoluto en una dirección dada (mover-arriba/abajo/etc.)
  function moverEnDireccion(dir: 'arriba' | 'abajo' | 'izquierda' | 'derecha', cmd: string) {
    checkLimit();
    if (!apiPermitida.includes(cmd)) throw new Error(`Comando "${cmd}" no permitido en este nivel`);
    const d = DELTAS[dir];
    const nx = hx + d.dx;
    const ny = hy + d.dy;
    if (!isWalkable(nx, ny)) {
      throw new Error(`¡El héroe chocó con una pared! No puede moverse hacia ${dir}.`);
    }
    hx = nx;
    hy = ny;
    hdir = dir;
    acciones.push({ cmd });
  }

  const heroe = new Proxy(
    {
      moverArriba() { moverEnDireccion('arriba', 'moverArriba'); },
      moverAbajo() { moverEnDireccion('abajo', 'moverAbajo'); },
      moverIzquierda() { moverEnDireccion('izquierda', 'moverIzquierda'); },
      moverDerecha() { moverEnDireccion('derecha', 'moverDerecha'); },
      avanzar() {
        checkLimit();
        if (!apiPermitida.includes('avanzar')) throw new Error('Comando "avanzar" no permitido en este nivel');
        const d = DELTAS[hdir];
        const nx = hx + (d?.dx ?? 0);
        const ny = hy + (d?.dy ?? 0);
        if (!isWalkable(nx, ny)) {
          throw new Error(`¡El héroe chocó con una pared! No puede avanzar hacia ${hdir}.`);
        }
        hx = nx;
        hy = ny;
        acciones.push({ cmd: 'avanzar' });
      },
      girarDerecha() {
        checkLimit();
        if (!apiPermitida.includes('girarDerecha')) throw new Error('Comando "girarDerecha" no permitido');
        hdir = TURN_RIGHT[hdir] ?? hdir;
        acciones.push({ cmd: 'girarDerecha' });
      },
      girarIzquierda() {
        checkLimit();
        if (!apiPermitida.includes('girarIzquierda')) throw new Error('Comando "girarIzquierda" no permitido');
        hdir = TURN_LEFT[hdir] ?? hdir;
        acciones.push({ cmd: 'girarIzquierda' });
      },
      saltar() {
        checkLimit();
        if (!apiPermitida.includes('saltar')) throw new Error('Comando "saltar" no permitido');
        acciones.push({ cmd: 'saltar' });
      },
      activarPalanca() {
        checkLimit();
        if (!apiPermitida.includes('activarPalanca')) throw new Error('Comando "activarPalanca" no permitido');
        acciones.push({ cmd: 'activarPalanca' });
      },
      detectarObstaculo(): boolean {
        checkLimit();
        const d = DELTAS[hdir];
        if (!d) return false;
        return !isWalkable(hx + d.dx, hy + d.dy);
      },
      puedeAvanzar(): boolean {
        checkLimit();
        const d = DELTAS[hdir];
        if (!d) return false;
        return isWalkable(hx + d.dx, hy + d.dy);
      },
      leerSensor(): string {
        checkLimit();
        return 'libre';
      },
    },
    {
      get(target, prop) {
        if (prop in target) return (target as any)[prop];
        throw new Error(`heroe.${String(prop)} no existe. Comandos disponibles: ${apiPermitida.join(', ')}`);
      },
    }
  );

  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('heroe', codigo);
    fn(heroe);
    clearTimeout(timeoutId);
    self.postMessage({ ok: true, acciones } satisfies WorkerResponse);
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : String(err);
    const lineMatch = (err instanceof Error ? err.stack ?? '' : '').match(/<anonymous>:(\d+):/);
    const linea = lineMatch ? parseInt(lineMatch[1], 10) - 1 : undefined;
    self.postMessage({ ok: false, error: { mensaje: errorMsg, linea }, accionesParciales: acciones } satisfies WorkerResponse);
  }
};
