// Ejecuta código Python real del estudiante con Pyodide (Python compilado a WebAssembly)
// y lo evalúa contra casos de prueba. Pyodide se descarga desde CDN la primera vez.
// El hilo principal impone el timeout terminando el worker si algo se cuelga.
/* eslint-disable @typescript-eslint/no-explicit-any */

let pyPromise: Promise<any> | null = null;

async function getPy(): Promise<any> {
  if (!pyPromise) {
    // Import dinámico del build ESM de Pyodide (worker de módulo). URL en variable para que
    // TS no intente resolverla; @vite-ignore evita que Vite la empaquete.
    const cdn = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
    const mod: any = await import(/* @vite-ignore */ cdn + 'pyodide.mjs');
    pyPromise = mod.loadPyodide({ indexURL: cdn });
  }
  return pyPromise;
}

const HARNESS = `
import json
__res = []
__g = {}
try:
    exec(__code, __g)
    __f = __g.get(__fn)
    if not callable(__f):
        raise Exception("No encontre la funcion " + __fn + "(...). Revisa el nombre.")
    for __t in json.loads(__tests_json):
        try:
            __o = __f(*__t["args"])
            __out = __o if isinstance(__o, (int, float, str, bool, list, dict)) or __o is None else str(__o)
            __res.append({"paso": bool(__o == __t["esperado"]), "obtenido": __out})
        except Exception as __e:
            __res.append({"paso": False, "obtenido": None, "error": str(__e)})
    __final = json.dumps({"ok": True, "res": __res})
except Exception as __e:
    __final = json.dumps({"ok": False, "error": str(__e)})
__final
`;

self.onmessage = async (event: MessageEvent<{ codigo: string; funcion: string; tests: any[] }>) => {
  const { codigo, funcion, tests } = event.data;
  try {
    const py = await getPy();
    py.globals.set('__code', codigo);
    py.globals.set('__fn', funcion);
    py.globals.set('__tests_json', JSON.stringify(tests));
    const salida = py.runPython(HARNESS);
    const data = JSON.parse(salida as string);
    if (!data.ok) {
      self.postMessage({ ok: false, error: data.error });
      return;
    }
    // Adjunta args/esperado (los tiene el worker) para el panel de resultados.
    const resultados = data.res.map((r: any, i: number) => ({
      args: tests[i].args, esperado: tests[i].esperado,
      obtenido: r.obtenido, paso: r.paso, error: r.error,
    }));
    self.postMessage({ ok: true, resultados });
  } catch (err: any) {
    self.postMessage({ ok: false, error: err?.message ?? String(err) });
  }
};
