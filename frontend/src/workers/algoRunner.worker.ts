// Ejecuta de forma aislada la función que escribe el estudiante y la evalúa contra
// una batería de casos de prueba (retos de programación tipo "algoritmo").
// El hilo principal impone un timeout terminando el worker si hay bucle infinito.

interface Caso { args: unknown[]; esperado: unknown }
interface AlgoRequest { codigo: string; funcion: string; tests: Caso[] }
interface ResultadoCaso { args: unknown[]; esperado: unknown; obtenido: unknown; paso: boolean; error?: string }

function estable(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (typeof val === 'number' && !Number.isFinite(val)) return String(val);
    return val;
  });
}

self.onmessage = (event: MessageEvent<AlgoRequest>) => {
  const { codigo, funcion, tests } = event.data;
  try {
    // Construye la función del estudiante y la extrae por nombre.
    // eslint-disable-next-line no-new-func
    const fabrica = new Function(`${codigo}\n; return typeof ${funcion} === 'function' ? ${funcion} : null;`);
    const fn = fabrica();
    if (typeof fn !== 'function') {
      self.postMessage({ ok: false, error: `No encontré la función "${funcion}(...)". Revisa el nombre.` });
      return;
    }

    const resultados: ResultadoCaso[] = [];
    for (const caso of tests) {
      try {
        const obtenido = fn(...(caso.args as unknown[]));
        resultados.push({ args: caso.args, esperado: caso.esperado, obtenido, paso: estable(obtenido) === estable(caso.esperado) });
      } catch (err) {
        resultados.push({ args: caso.args, esperado: caso.esperado, obtenido: undefined, paso: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    self.postMessage({ ok: true, resultados });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
