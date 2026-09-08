# Plan — Enriquecer actividades con simulaciones (Matter.js + Three.js)

> Roadmap para continuar mañana. La implementación NO se ejecuta hoy.

## Contexto
Codexia ya tiene un tipo de actividad **`simulacion`** (config-driven) renderizado por
`frontend/src/components/SimulacionActivity.vue` y despachado en `LevelView.vue`
(`isSimulacion` → `<SimulacionActivity :config @complete>`), con mundos "🔬 Laboratorio"
(`seed-simulaciones.mjs`). Hoy las simulaciones son **SVG/CSS** (`config.sim`: `area_rect`,
`perimetro_rect`, `fraccion`, `recta`, `flota`) y emiten `complete(stars)` al cumplir un `objetivo`.

Queremos enriquecer las actividades **donde aplique** con simulaciones **realistas e
interactivas**: física 2D con **Matter.js** y escenas 3D con **Three.js**. Resultado esperado:
laboratorios virtuales jugables (gravedad, planos inclinados, poleas, colisiones; sistema solar,
moléculas, sólidos 3D; balanzas) integrados de forma natural en las materias mayores, gamificados
y con **audio ElevenLabs (sin TTS)**.

**Alcance acordado:** Física Básica, Ciencias Naturales, Geometría y Aritmética.
(Fuera de alcance por ahora: IA, Programación y Preescolar — por peso de las librerías en tablets.)

## Estrategia de integración (reutilizar lo existente)
- **NO crear un tipo de actividad nuevo.** Seguir usando `config.tipo: 'simulacion'` (ya despachado
  en `LevelView.vue:52-58`, ya conectado a recompensa/celebración vía `onQuizComplete`).
- Añadir **nuevos sub-tipos `config.sim`** y delegar el render a **componentes hijo cargados de forma
  diferida** (para no inflar el bundle inicial ni afectar tablets):
  - `sim: 'fisica'` → `SimFisica2D.vue` (Matter.js)
  - `sim: 'escena3d'` → `SimEscena3D.vue` (Three.js)
  - sub-tipos SVG actuales → se quedan **inline** en `SimulacionActivity.vue` (sin tocar).
- En `SimulacionActivity.vue`, despachar con `defineAsyncComponent(() => import('./sim/SimFisica2D.vue'))`
  y `() => import('./sim/SimEscena3D.vue')`. Así Matter/Three se cargan **solo** al abrir ese nivel.
- Cada componente hijo recibe `:config`, valida un `objetivo`/`reto` y emite `complete(stars)` —
  mismo contrato que los sims SVG actuales (`emit('complete', stars)`).
- **Sin cambios de backend**: `/curriculum/worlds?categoria=` ya sirve cualquier categoría; el
  flujo de sesión/recompensa ya funciona para `simulacion`.

## Dependencias a agregar (`frontend/package.json`)
- `matter-js` + `@types/matter-js`
- `three` + `@types/three`
- Importarlas **dentro** de los componentes lazy (Vite las pone en chunks separados).

## Catálogo de simulaciones por materia ("donde aplique")

### ⚛️ Física Básica — Matter.js (`sim:'fisica'`, campo `escena`)
| `escena` | Interacción | Objetivo/validación |
|---|---|---|
| `caida` (gravedad) | Soltar objetos de distinta masa | Observar + reto: "¿cuál llega primero?" |
| `plano_inclinado` | Ajustar ángulo (slider) | Lograr que la caja llegue a la zona verde |
| `polea` | Colgar pesos | Equilibrar / levantar la carga |
| `colision` | Lanzar bolas | Reto sobre rebote/energía |
| `pendulo` | Cambiar longitud | Acertar el ritmo objetivo |
| `proyectil` | Ajustar ángulo y fuerza | Dar en la diana 🎯 (objetivo claro y divertido) |
| `palanca` (balancín) | Mover pesos y distancia | Equilibrar la palanca |

### 🪐 Ciencias Naturales — Three.js (`sim:'escena3d'`, campo `escena3d`)
| `escena3d` | Interacción | Validación |
|---|---|---|
| `sistema_solar` | Sol iluminado, planetas orbitando, zoom/rotación libre | Reto: identificar planeta / ordenar |
| `molecula` | Molécula 3D (H₂O, CO₂) rotable | Reto: contar átomos / nombrarla |
| `solido_celular`/`anatomia` | Modelo 3D simple (órgano/célula) | Identificar partes |
| `ciclo_agua` | Animación 3D por etapas | Ordenar las etapas |
- Patrón de validación = **explorar + responder un `reto`** (reusar el patrón `pregunta` del sim `flota`).

### 📐 Geometría — Three.js (`sim:'escena3d'`, `escena3d:'solido'`)
- Sólidos rotables: cubo, esfera, cono, cilindro, prisma, pirámide.
- Retos: contar caras/aristas/vértices; ajustar dimensiones con sliders y **lograr un volumen objetivo**.

### ➕ Aritmética — Matter.js (`sim:'fisica'`)
- `escena:'balanza'`: poner pesos numéricos a cada lado hasta **equilibrar** (igualdad / comparación / sumas).
- `escena:'conteo'`: objetos que caen a un recipiente; contar cuántos cayeron.

## Rendimiento en tablets (requisito crítico — ver memoria del proyecto)
- **Carga diferida** de componentes + librerías (dynamic import) → bundle inicial intacto.
- **Three.js:** `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, `powerPreference:'low-power'`,
  geometrías de bajo poligonaje, pausar `requestAnimationFrame` cuando el componente no es visible,
  y **liberar** en `onUnmounted` (`geometry.dispose()`, `material.dispose()`, `renderer.dispose()`,
  quitar canvas). Feature-detect WebGL → **fallback** a imagen/SVG si no hay soporte.
- **Matter.js:** timestep fijo, pocos cuerpos, `Render.stop()` + `Engine.clear()` + remover canvas en
  `onUnmounted`. Tope de tiempo de simulación.
- Crear composables de ciclo de vida reutilizables: `useThreeScene.ts` y `useMatterScene.ts`
  (setup + loop + teardown) para no repetir el manejo de recursos.

## Audio (ElevenLabs, NUNCA TTS) — reusar pipeline existente
- Cada nivel: `config.narracion.intro` + `url_audio_intro` → `LevelView` ya lo narra al abrir
  (`audio.narrate('', url)`), igual que el resto.
- Instrucciones/retos dentro del sim: botón 🔊 + clips por frase con `slugFrase`
  (`frontend/src/composables/vozBank.ts`) en un banco `/audio/sim-bank/`.
- Nuevo generador `backend/scripts/generate-audio-simulaciones.mjs` (mismo molde que
  `generate-audio-mayores.mjs`, voz **Alice**): genera intro + instrucción + enunciado de reto.
  Filtrar por `config.fuente='sim-rica'` para no tocar audio existente.

## Gamificación
- Cada simulación tiene **meta clara** (diana, equilibrio, volumen objetivo, reto) → `complete(stars)`.
- Estrellas por intentos/precisión; sfx ya existentes (`sfx-correcto`, `sfx-ganar`).
- Mantener el tono lúdico (escenas coloridas, objetos con emoji/etiquetas, celebración de `LevelView`).

## Archivos a crear / modificar
- **Crear:** `frontend/src/components/sim/SimFisica2D.vue` (Matter.js),
  `frontend/src/components/sim/SimEscena3D.vue` (Three.js),
  `frontend/src/composables/useMatterScene.ts`, `frontend/src/composables/useThreeScene.ts`.
- **Modificar:** `frontend/src/components/SimulacionActivity.vue` (despacho a componentes lazy por
  `sim`), `frontend/package.json` (deps).
- **Seeds (molde `seed-simulaciones.mjs`):** `backend/scripts/seed-sim-fisica.mjs`
  (física + aritmética/Matter), `backend/scripts/seed-sim-3d.mjs` (ciencias + geometría/Three).
  Mundos "🔬 Laboratorio …" con `config.tipo:'simulacion'`, `numero_orden` = max+1 por categoría.
- **Audio:** `backend/scripts/generate-audio-simulaciones.mjs`.
- **Sin cambios de backend** (curriculum/sesiones ya soportan `simulacion`).

## Fases (orden sugerido para mañana)
1. **Cimientos:** agregar deps; crear `SimFisica2D` + `SimEscena3D` con teardown correcto y los
   composables; despacho lazy en `SimulacionActivity`. 1 ejemplo de cada (caída libre + sistema solar).
   Verificar rendimiento, liberación de recursos y flujo `complete`.
2. **Física** (Matter): catálogo completo + `seed-sim-fisica.mjs` + audio.
3. **Ciencias** (Three): sistema solar, moléculas, etc. + seed + audio.
4. **Geometría** (Three): sólidos 3D + retos de volumen + seed + audio.
5. **Aritmética** (Matter): balanza/conteo + seed + audio.
6. **Pulido:** fallback WebGL, ajustes móviles, pasada de audio, `vue-tsc --noEmit` + `vite build`
   (confirmar code-splitting de matter/three en chunks aparte).

## Verificación
- `cd frontend && npm run dev`; en `/mapa` → materia (Física/Ciencias/Geometría/Aritmética) →
  mundo "🔬 Laboratorio": abrir cada sim, cumplir la meta y confirmar recompensa/celebración.
- **Tablet/móvil:** revisar FPS y memoria; navegar dentro/fuera varias veces y confirmar que no
  hay fugas (los `dispose`/`clear` se ejecutan).
- `npx vue-tsc --noEmit` sin errores; `vite build` OK con matter/three en chunks separados.
- Audio: los clips ElevenLabs suenan (intro + 🔊), **cero TTS**; verificar 0 faltantes con un
  chequeo de cobertura (como en fases anteriores).

## Notas / riesgos
- **Desbloqueo:** los nuevos mundos en materias existentes (aritmética, etc.) se añaden al final →
  para estudiantes quedan bloqueados hasta completar los previos; con login docente se ven todos.
- **GOTCHA audio:** generar el audio **después** de sembrar (los enunciados de reto pueden variar);
  generador idempotente (`--force` regenera).
- 3D de anatomía/células: empezar con modelos primitivos (esferas/cilindros etiquetados) antes de
  cargar mallas externas, para no pesar el bundle.
