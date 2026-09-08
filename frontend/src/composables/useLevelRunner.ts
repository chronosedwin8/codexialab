import { ref } from 'vue';
import type { NivelConfig, Accion, WorkerResponse, IRenderer } from '@/game/types';

export function useLevelRunner() {
  const isRunning = ref(false);
  const workerResult = ref<WorkerResponse | null>(null);
  const error = ref<string | null>(null);

  let worker: Worker | null = null;

  function createWorker(): Worker {
    return new Worker(new URL('../workers/codeRunner.worker.ts', import.meta.url), {
      type: 'module',
    });
  }

  async function runCode(
    codigo: string,
    lenguaje: 'javascript' | 'python',
    levelConfig: NivelConfig
  ): Promise<WorkerResponse> {
    if (worker) {
      worker.terminate();
    }

    worker = createWorker();
    isRunning.value = true;
    error.value = null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        worker?.terminate();
        const resp: WorkerResponse = {
          ok: false,
          error: { mensaje: 'La ejecución tardó demasiado tiempo. Revisa si tienes un bucle infinito.' },
        };
        workerResult.value = resp;
        isRunning.value = false;
        resolve(resp);
      }, 6000);

      worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
        clearTimeout(timeout);
        workerResult.value = event.data;
        isRunning.value = false;
        resolve(event.data);
      };

      worker!.onerror = (e) => {
        clearTimeout(timeout);
        const resp: WorkerResponse = {
          ok: false,
          error: { mensaje: `Error en el worker: ${e.message}` },
        };
        workerResult.value = resp;
        isRunning.value = false;
        resolve(resp);
      };

      // Convertir a objetos planos — los Proxies reactivos de Vue no son clonables por structuredClone
      worker!.postMessage({
        codigo: String(codigo),
        lenguaje,
        apiPermitida: JSON.parse(JSON.stringify(levelConfig.comandos_permitidos ?? [])),
        tope_ejecucion: Number(levelConfig.tope_ejecucion ?? 50000),
        tilemap: JSON.parse(JSON.stringify(levelConfig.tilemap ?? [])),
        spawn: { x: levelConfig.spawn.x, y: levelConfig.spawn.y, dir: levelConfig.spawn.dir },
      });
    });
  }

  async function playActions(acciones: Accion[], renderer: IRenderer): Promise<void> {
    for (const accion of acciones) {
      await renderer.playAction(accion);
      await delay(60);
    }
  }

  function checkObjectives(acciones: Accion[], levelConfig: NivelConfig): Record<string, boolean> {
    const completados: Record<string, boolean> = {};

    // Calcular posición final del héroe
    let hx = levelConfig.spawn.x;
    let hy = levelConfig.spawn.y;
    let dir: 'arriba' | 'abajo' | 'izquierda' | 'derecha' = levelConfig.spawn.dir;

    const turnRight: Record<string, string> = {
      derecha: 'abajo', abajo: 'izquierda', izquierda: 'arriba', arriba: 'derecha',
    };
    const turnLeft: Record<string, string> = {
      derecha: 'arriba', arriba: 'izquierda', izquierda: 'abajo', abajo: 'derecha',
    };
    const deltas: Record<string, { dx: number; dy: number }> = {
      derecha: { dx: 1, dy: 0 },
      izquierda: { dx: -1, dy: 0 },
      abajo: { dx: 0, dy: 1 },
      arriba: { dx: 0, dy: -1 },
    };

    const visitedCells: Array<{ x: number; y: number }> = [{ x: hx, y: hy }];

    // Mapa de comandos direccionales absolutos → dirección
    const moveDir: Record<string, typeof dir> = {
      moverArriba: 'arriba', moverAbajo: 'abajo',
      moverIzquierda: 'izquierda', moverDerecha: 'derecha',
    };

    for (const accion of acciones) {
      if (accion.cmd === 'avanzar') {
        const d = deltas[dir];
        if (d) {
          hx += d.dx;
          hy += d.dy;
          visitedCells.push({ x: hx, y: hy });
        }
      } else if (accion.cmd in moveDir) {
        dir = moveDir[accion.cmd];
        const d = deltas[dir];
        if (d) {
          hx += d.dx;
          hy += d.dy;
          visitedCells.push({ x: hx, y: hy });
        }
      } else if (accion.cmd === 'girarDerecha') {
        dir = (turnRight[dir] ?? dir) as typeof dir;
      } else if (accion.cmd === 'girarIzquierda') {
        dir = (turnLeft[dir] ?? dir) as typeof dir;
      }
    }

    for (const obj of levelConfig.objetivos) {
      if (obj.tipo === 'alcanzar_celda') {
        completados[obj.id] = hx === obj.x && hy === obj.y;
      } else if (obj.tipo === 'recoger_item') {
        completados[obj.id] = visitedCells.some((c) => c.x === obj.x && c.y === obj.y);
      } else if (obj.tipo === 'activar_palanca') {
        completados[obj.id] = acciones.some((a) => a.cmd === 'activarPalanca') &&
          visitedCells.some((c) => c.x === obj.x && c.y === obj.y);
      }
    }

    return completados;
  }

  function calculateStars(
    objetivosCompletados: Record<string, boolean>,
    accionesCount: number,
    levelConfig: NivelConfig,
    programSize?: number
  ): number {
    const criterios = levelConfig.criterios_estrella;
    // max_bloques mide el tamaño del programa ESCRITO (premia el uso de bucles);
    // max_instrucciones mide las acciones EJECUTADAS (premia el camino óptimo).
    const tamProg = programSize ?? accionesCount;

    function cumpleCriterio(c: { objetivos: string[]; max_bloques?: number; max_instrucciones?: number }): boolean {
      const objOk = c.objetivos.every((id) => objetivosCompletados[id]);
      if (!objOk) return false;
      if (c.max_bloques !== undefined && tamProg > c.max_bloques) return false;
      if (c.max_instrucciones !== undefined && accionesCount > c.max_instrucciones) return false;
      return true;
    }

    if (cumpleCriterio(criterios['3'])) return 3;
    if (cumpleCriterio(criterios['2'])) return 2;
    if (cumpleCriterio(criterios['1'])) return 1;
    return 0;
  }

  // Cuenta las instrucciones escritas en el código (líneas con contenido real).
  // Un bucle 'for(...) { x }' cuenta poco aunque ejecute muchas acciones → premia los bucles.
  function countProgramSize(codigo: string): number {
    return codigo
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith('//') && !l.startsWith('#'))
      .filter((l) => l !== '{' && l !== '}')
      .length;
  }

  function terminate(): void {
    worker?.terminate();
    worker = null;
    isRunning.value = false;
  }

  return {
    isRunning,
    workerResult,
    error,
    runCode,
    playActions,
    checkObjectives,
    calculateStars,
    countProgramSize,
    terminate,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
