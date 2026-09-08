# Plan: Videos educativos animados para Codexia (estilo Ozaria/CodeCombat)

## Contexto

Codexia ya tiene 8 materias, ~800 actividades, una mascota-guía ("Astro"), narraciones de texto en
`config.narracion.intro`/`.exito` de cada nivel y audios MP3 (ElevenLabs, voces Alice y Jessica) en
`frontend/public/audio/narracion/`. **No existe ninguna infraestructura de video.** El usuario quiere
videos animados narrativos/explicativos (bienvenida, concepto, final) generados programáticamente con
**Motion Canvas**, con audio **ElevenLabs**, todo en **español**, pedagógicamente correctos y con
historias llamativas — cobertura amplia de las 8 materias, con reproducción en 4 lugares de la app.

**Decisión de motor:** se usará **Revideo** (https://re.video — fork de Motion Canvas con `renderVideo()`
para render por CLI/lotes y audio integrado por FFmpeg). Misma sintaxis de escenas que Motion Canvas
(generadores `function*`, `yield*`, componentes `Rect/Circle/Txt/Layout`, signals), pero **automatizable**,
imprescindible para producir cientos de videos. Motion Canvas "puro" se reserva solo si se necesita pulir
una pieza a mano en su editor visual.

## Objetivo y estilo

- Estilo visual tipo Ozaria/CodeCombat: vectorial limpio, colores por materia (ya definidos en
  `frontend/src/data/materias.ts`), mascota Astro animada con expresiones, tipografía grande y amable.
- Narración en español con voz infantil/cálida (reutilizar voces ya elegidas: **Jessica**
  `cgSgspJ2msm6clMCkdW9` para niños; **Alice** `Xb7hH8MSUJpSbSDYk0k2` como alternativa de narrador).
- Duración objetivo: 25–45 s (bienvenida/final), 45–90 s (explicativos de concepto), 60–120 s (historia).
- Subtítulos VTT en español incrustados (accesibilidad + aulas sin audio).

## Taxonomía de videos y alcance ("donde sea apropiado")

NO se hace un video por cada actividad (sería inviable). Cobertura amplia razonable:

| Tipo | Dónde | Cantidad estimada |
|---|---|---|
| Intro general de la plataforma | 1ª vez que entra el estudiante | 1 |
| Intro de materia (historia/saga) | Al abrir cada materia | 8 |
| Bienvenida de mundo | Al entrar a un mundo | ~80 (8 materias × 10) |
| Final de mundo | Al completar un mundo | ~40 (1 por materia por hito; no los 80) |
| Explicativo de concepto | Antes de la actividad / como pista | ~60 (conceptos clave por materia) |
| Episodios "Historia/Cine" | Sección dedicada | ~10 (arco narrativo de Codexia) |

**Total estimado: ~200 videos.** Se produce por fases (ver Estimación). La historia central: Astro y el
héroe recorren las "tierras de Codexia" (cada materia es una región), conectando los mundos en una saga.

## Pipeline de producción

### 1. Proyecto de video (nuevo workspace `videos/` en la raíz del repo, separado de `frontend/`)
```
videos/
  package.json            # revideo, @revideo/core, @revideo/2d, vite
  vite.config.ts
  src/
    project.ts            # registra escenas a renderizar
    components/
      Astro.tsx           # mascota rig: poses/expresiones (idle, hablar, señalar, celebrar)
      MateriaTheme.tsx     # fondo + paleta por materia (lee colores de materias)
      Bocadillo.tsx        # globo de diálogo con texto + “typewriter”
      CodeBlock.tsx        # bloque de código/bloques animado (para explicativos)
      Personaje.tsx        # héroe (avatar configurable)
    templates/
      bienvenidaMundo.tsx  # plantilla escena: intro de mundo (parametrizada)
      finalMundo.tsx
      explicativo.tsx      # concepto con animación paso a paso
      historia.tsx
    scenes/                # escenas concretas generadas desde plantillas + guion
  content/                 # guiones (JSON): texto, beats, timings, materia, voz
    <materia>/<id>.json
  scripts/
    gen-narracion.mjs      # ElevenLabs: guion -> MP3 + VTT (reusa patrón de backend/scripts/generate-audio.mjs)
    render-batch.mjs       # renderVideo() por lote -> videos/output/*.mp4
    publicar.mjs           # copia MP4+VTT a frontend/public/videos/ y actualiza manifest
  output/                  # MP4 crudos
```

### 2. Biblioteca de componentes reutilizables (clave para escalar con calidad)
- **Astro.tsx**: mascota como componente con `signal` de pose y boca animada sincronizable al audio
  (lip-sync simple por amplitud o por marcas de tiempo). Es la inversión más importante: una vez hecho,
  todos los videos lo reutilizan.
- **MateriaTheme.tsx**: aplica color/ícono/fondo de la materia (fuente única: portar `MATERIAS` de
  `frontend/src/data/materias.ts` a `videos/src/lib/materias.ts`).
- **Plantillas parametrizadas**: cada plantilla recibe un guion JSON (título, beats, código a mostrar,
  duración por beat) y produce la escena. Producir un nuevo video = escribir un JSON de guion, no código.

### 3. Guion → Audio → Animación → Render
1. **Guion** (JSON en `content/`): escrito por Claude (pedagógico, narrativo). Define beats y texto de
   narración por beat.
2. **Audio + subtítulos**: `gen-narracion.mjs` manda el texto a ElevenLabs (voz Jessica), guarda
   `mp3` y genera `vtt` (timings por beat). Reutiliza el patrón de `backend/scripts/generate-audio.mjs`.
   Para música/SFX usar ElevenLabs sound-generation (ya probado en `generate-sfx.mjs`).
3. **Animación**: la plantilla carga el audio como pista (Revideo `useScene`/audio API) y sincroniza los
   beats con los timings del VTT.
4. **Render por lotes**: `render-batch.mjs` usa `renderVideo()` de Revideo (headless, FFmpeg) → MP4 con
   audio. Se puede paralelizar por materia.
5. **Publicar**: `publicar.mjs` copia a `frontend/public/videos/<materia>/...mp4` y actualiza
   `frontend/public/videos/manifest.json` (mapa mundo/actividad → archivo de video + vtt + duración).

## Integración en Codexia (las 4 ubicaciones pedidas)

- **Datos**: usar un `manifest.json` en `public/videos/` (sin migración de BD) mapeando claves
  (`intro-general`, `materia-<cat>`, `mundo-<cat>-<orden>-bienvenida|final`, `concepto-<cat>-<slug>`,
  `historia-<n>`) → `{ src, vtt, duracion }`. Opcionalmente, añadir `url_video_intro`/`url_video_final`
  a `config` de mundos/niveles vía un seed (patrón ya usado en los `seed-*.mjs`).
- **`VideoPlayer.vue`** (nuevo): modal con `<video>` HTML5, subtítulos `<track kind=subtitles>`,
  botón "Saltar", "Volver a ver", y autocierre al terminar. Reutilizable en todos los puntos.
- **Bienvenida/final de mundo**: en `WorldMapView.vue` (al seleccionar/entrar a un mundo) y al disparar
  `level-complete` del último nivel del mundo → abrir `VideoPlayer` con el video correspondiente
  (con flag en `localStorage`/perfil para no repetir).
- **Explicativo antes de actividad**: en `LevelView.vue`, botón "🎬 ¿Cómo funciona?" junto a las pistas
  (`showHint`) que abre el explicativo del concepto del nivel.
- **Sección "Historia / Cine"**: nueva `HistoriaView.vue` + ruta `/historia` (registrar en
  `frontend/src/router/index.ts`, enlace en `WorldMapView`/header), galería de episodios y repaso de
  conceptos por materia.
- **Intro general**: tras el primer login (en `LoginView`/router guard o `WorldMapView onMounted` con
  flag de "primera vez") reproducir `intro-general`.

## Flujo con Claude y modelos recomendados

- **claude-opus-4-8 (Opus 4.8) — usar para lo crítico de calidad:**
  - Guiones pedagógicos y narrativos en español (que sean correctos y llamativos).
  - Diseño del arco de historia y la "biblia" de Codexia.
  - Construcción de la **biblioteca de componentes** y **plantillas** Revideo (animaciones complejas,
    lip-sync, sincronía con audio). Aquí la calidad del código de animación importa mucho.
- **claude-sonnet-4-6 (Sonnet 4.6) — usar para volumen/línea de ensamblaje:**
  - Generar en serie los **guiones JSON** por mundo/concepto a partir de las narraciones ya existentes
    en la BD (`config.narracion`) siguiendo la plantilla validada.
  - Ajustes repetitivos de escenas ya plantilladas.
- **Recomendación práctica:** Opus 4.8 para Fases 0–2 (fundaciones, piloto, 1ª materia completa) y para
  todos los guiones de historia; Sonnet 4.6 para la producción masiva de Fases 3 (resto de materias),
  revisando con Opus una muestra de calidad por materia. "Fast mode" (Opus con salida rápida) ayuda en la
  iteración de animaciones.

## Estimación de tiempo (1 persona + asistencia de Claude)

| Fase | Trabajo | Tiempo |
|---|---|---|
| 0. Fundaciones | Proyecto Revideo, Astro rig, temas por materia, 4 plantillas, pipeline ElevenLabs+VTT, `VideoPlayer.vue`, manifest | 1.5–2.5 semanas |
| 1. Piloto | Programación M1 end-to-end (bienvenida + 1 explicativo + final) + intro general | 0.5–1 semana |
| 2. Materia completa | Programación: 10 bienvenidas, finales por hito, ~8 explicativos, intro de materia, integración en app | 2–3 semanas |
| 3. Resto de materias (×7) | Línea de ensamblaje con Sonnet; ~150 videos | 6–10 semanas |
| 4. Historia/Cine + pulido | ~10 episodios de saga, sección /historia, QA, subtítulos, optimización de tamaño | 1.5–2.5 semanas |

**Total: ~3–4.5 meses** para cobertura amplia (~200 videos). Por video, ya con plantillas: ~1–2 h
(guion + JSON + audio + render + QA). El cuello de botella real es la **revisión pedagógica/calidad**,
no el render. Se acorta si se paraleliza (varias materias en simultáneo) o se reduce el alcance de finales.

## Riesgos y mitigaciones
- **Render headless de Motion Canvas no es nativo** → por eso se elige **Revideo** (render por CLI). Si
  Revideo diera problemas, alternativa: render manual en el editor de Motion Canvas (más lento).
- **Tamaño de ~200 MP4 en `public/`** → mantener clips cortos (480–720p, 30–60 s); si crece mucho, mover
  a un CDN/almacenamiento y dejar solo el manifest apuntando a URLs.
- **Lip-sync** → empezar con boca animada simple por beats (no fonemas); subir fidelidad solo si hace falta.
- **Consistencia pedagógica** → toda narración nace de las `config.narracion` ya validadas + revisión Opus.

## Archivos a crear / modificar
- **Nuevos (workspace `videos/`)**: `package.json`, `project.ts`, `src/components/Astro.tsx`,
  `MateriaTheme.tsx`, `Bocadillo.tsx`, `CodeBlock.tsx`; `src/templates/*.tsx`; `src/lib/materias.ts`;
  `scripts/gen-narracion.mjs`, `render-batch.mjs`, `publicar.mjs`; `content/<materia>/*.json`.
- **Frontend**: `frontend/src/components/VideoPlayer.vue` (nuevo), `frontend/src/views/HistoriaView.vue`
  (nuevo), `frontend/src/router/index.ts` (+ruta `/historia`), `WorldMapView.vue` (bienvenida/final +
  intro general), `LevelView.vue` (botón explicativo), `frontend/public/videos/manifest.json` (nuevo).
- **Reusar**: voces y patrón ElevenLabs de `backend/scripts/generate-audio.mjs` y `generate-sfx.mjs`;
  paleta de `frontend/src/data/materias.ts`; narraciones en `niveles.config.narracion`.

## Verificación
1. **Piloto**: renderizar los 3–4 videos de Programación M1, reproducirlos en `VideoPlayer.vue` con
   subtítulos y audio en español; validar pedagogía y estilo antes de escalar (criterio de "go/no-go").
2. **Integración**: entrar a un mundo (bienvenida aparece 1 sola vez), completar un mundo (final),
   abrir explicativo desde una actividad, ver la sección `/historia`, y la intro general en primer login.
3. **Lote**: correr `render-batch.mjs` para una materia completa y confirmar que `publicar.mjs` actualiza
   el manifest y los MP4 cargan en la app.
4. **Calidad**: muestreo por materia revisado con Opus 4.8 (correcto, claro, llamativo, español neutro).
