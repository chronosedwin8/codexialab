// Materia "Geometría": 10 mundos × 10 actividades. De formas básicas hasta perímetro, área y volumen.
// Cálculos GENERADOS (correctos por construcción) + conceptos autorados. Variedad de tipos.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function opcion(r, enunciado, correcta, distractores, explicacion, tipo = 'opcion') {
  const opts = shuffle(r, [correcta, ...distractores]).slice(0, 4);
  if (!opts.includes(correcta)) opts[0] = correcta;
  return { tipo, enunciado, opciones: opts.map(String), correcta: opts.indexOf(correcta), explicacion };
}
function distN(correcta, extra = []) { const out = []; for (const d of [...extra, correcta + 1, correcta - 1, correcta + 2, correcta + 4, correcta - 2, correcta + 10]) { if (d !== correcta && d >= 0 && !out.includes(d)) out.push(d); if (out.length >= 3) break; } let k = 3; while (out.length < 3) { if (correcta + k !== correcta && !out.includes(correcta + k)) out.push(correcta + k); k++; } return out.slice(0, 3); }
const numQ = (r, e, c, x) => opcion(r, e, String(c), distN(c).map(String), x);

// ---- Cálculos generados ----
const gPerimRect = (r) => { const l = ri(r, 2, 12), w = ri(r, 2, 12); return numQ(r, `Un rectángulo mide ${l} de largo y ${w} de ancho. ¿Cuál es su PERÍMETRO?`, 2 * (l + w), `Perímetro = 2 × (${l} + ${w}) = ${2 * (l + w)}.`); };
const gPerimCuad = (r) => { const s = ri(r, 2, 15); return numQ(r, `Un cuadrado tiene lado ${s}. ¿Cuál es su PERÍMETRO?`, 4 * s, `Perímetro = 4 × ${s} = ${4 * s}.`); };
const gPerimTri = (r) => { const s = ri(r, 2, 12); return numQ(r, `Un triángulo tiene 3 lados iguales de ${s}. ¿Cuál es su PERÍMETRO?`, 3 * s, `Perímetro = 3 × ${s} = ${3 * s}.`); };
const gAreaRect = (r) => { const l = ri(r, 2, 12), w = ri(r, 2, 12); return numQ(r, `Un rectángulo mide ${l} × ${w}. ¿Cuál es su ÁREA?`, l * w, `Área = ${l} × ${w} = ${l * w}.`); };
const gAreaCuad = (r) => { const s = ri(r, 2, 12); return numQ(r, `Un cuadrado tiene lado ${s}. ¿Cuál es su ÁREA?`, s * s, `Área = ${s} × ${s} = ${s * s}.`); };
const gAreaTri = (r) => { const base = 2 * ri(r, 1, 6), h = ri(r, 2, 10); return numQ(r, `Un triángulo tiene base ${base} y altura ${h}. ¿Cuál es su ÁREA?`, base * h / 2, `Área = base × altura ÷ 2 = ${base} × ${h} ÷ 2 = ${base * h / 2}.`); };
const gVolCubo = (r) => { const s = ri(r, 2, 6); return numQ(r, `Un cubo tiene lado ${s}. ¿Cuál es su VOLUMEN?`, s ** 3, `Volumen = ${s} × ${s} × ${s} = ${s ** 3}.`); };
const gVolPrisma = (r) => { const a = ri(r, 2, 6), b = ri(r, 2, 6), c = ri(r, 2, 5); return numQ(r, `Una caja mide ${a} × ${b} × ${c}. ¿Cuál es su VOLUMEN?`, a * b * c, `Volumen = ${a} × ${b} × ${c} = ${a * b * c}.`); };

// ---- Conceptos (autorados) ----
const POLY = [['triángulo', 3], ['cuadrado', 4], ['rectángulo', 4], ['pentágono', 5], ['hexágono', 6]];
const gLados = (r) => { const [n, l] = pick(r, POLY); return numQ(r, `¿Cuántos lados tiene un ${n}?`, l, `El ${n} tiene ${l} lados.`); };
const relLados = () => ({ tipo: 'relacionar', enunciado: 'Relaciona cada figura con su número de lados.', pares: [['triángulo', '3'], ['cuadrado', '4'], ['pentágono', '5']], explicacion: 'Triángulo 3, cuadrado 4, pentágono 5.' });
const ordenarLados = () => ({ tipo: 'ordenar', enunciado: 'Ordena las figuras según su número de lados (de menos a más).', items: ['triángulo', 'cuadrado', 'pentágono', 'hexágono'], explicacion: 'Triángulo(3) < cuadrado(4) < pentágono(5) < hexágono(6).' });
const VF_GEO = [
  ['Un cuadrado tiene 4 lados iguales.', true, 'Sí, todos sus lados son iguales.'],
  ['Un triángulo tiene 4 lados.', false, 'No, el triángulo tiene 3 lados.'],
  ['Un círculo no tiene lados rectos.', true, 'Correcto, el círculo es curvo.'],
  ['El perímetro es la distancia alrededor de una figura.', true, 'Sí, es el contorno.'],
  ['El área es el espacio que ocupa una figura por dentro.', true, 'Correcto.'],
  ['Un cubo es una figura plana.', false, 'No, el cubo es un cuerpo 3D.'],
  ['Una pelota tiene forma de esfera.', true, 'Sí, es una esfera.'],
  ['Todos los lados de un rectángulo son iguales.', false, 'Solo los lados opuestos son iguales.'],
];
const gVF = (r) => { const [e, v, x] = pick(r, VF_GEO); return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "${e}"`, respuesta: v, explicacion: x }; };
const agrup2D3D = () => ({ tipo: 'agrupar', enunciado: 'Clasifica en figuras planas (2D) o cuerpos (3D).', grupos: { 'Planas (2D)': ['círculo', 'cuadrado', 'triángulo'], 'Cuerpos (3D)': ['cubo', 'esfera', 'cilindro'] }, explicacion: 'Las planas son 2D; los cuerpos tienen volumen (3D).' });
const CUERPOS = [['un dado', 'cubo'], ['una pelota', 'esfera'], ['una lata', 'cilindro'], ['un gorro de fiesta', 'cono']];
const NOMBRES3D = ['cubo', 'esfera', 'cilindro', 'cono', 'pirámide'];
const gCuerpos = (r) => { const [obj, nom] = pick(r, CUERPOS); const dist = shuffle(r, NOMBRES3D.filter((x) => x !== nom)).slice(0, 3); return opcion(r, `¿Qué cuerpo geométrico se parece a ${obj}?`, nom, dist, `${obj} tiene forma de ${nom}.`); };
const relCuerpos = () => ({ tipo: 'relacionar', enunciado: 'Relaciona el objeto con su cuerpo geométrico.', pares: [['dado', 'cubo'], ['pelota', 'esfera'], ['lata', 'cilindro']], explicacion: 'Cada objeto tiene su forma 3D.' });
const ANG = [['de 90°', 'recto'], ['menor que 90°', 'agudo'], ['mayor que 90°', 'obtuso']];
const gAngulos = (r) => { const [desc, nom] = pick(r, ANG); const dist = ['recto', 'agudo', 'obtuso'].filter((x) => x !== nom); return opcion(r, `Un ángulo ${desc} se llama ángulo ___.`, nom, dist, `Un ángulo ${desc} es ${nom}.`, 'completar'); };
const relAngulos = () => ({ tipo: 'relacionar', enunciado: 'Relaciona cada ángulo con su nombre.', pares: [['90°', 'recto'], ['menor a 90°', 'agudo'], ['mayor a 90°', 'obtuso']], explicacion: 'Recto=90°, agudo<90°, obtuso>90°.' });
const compPerim = (r) => opcion(r, 'El perímetro es la suma de todos los ___ de una figura.', 'lados', ['ángulos', 'colores'], 'El perímetro suma los lados.', 'completar');
const compArea = (r) => opcion(r, 'El área se mide en unidades ___.', 'cuadradas', ['redondas', 'largas'], 'El área se mide en unidades cuadradas.', 'completar');
const compVol = (r) => opcion(r, 'El volumen se mide en unidades ___.', 'cúbicas', ['planas', 'cuadradas'], 'El volumen se mide en unidades cúbicas.', 'completar');

const MUNDOS = [
  { orden: 1, nombre: 'Formas y Figuras', icono: '🔺', banda: 'exploradores', gens: [gLados, relLados, gVF], intro: '¡Bienvenido a Geometría! Soy Astro. Empecemos por las figuras: círculos, cuadrados, triángulos. ¿Cuántos lados tiene cada una?' },
  { orden: 2, nombre: 'Lados y Vértices', icono: '📐', banda: 'exploradores', gens: [gLados, ordenarLados, gVF], intro: 'Los lados son las líneas y los vértices son las esquinas. ¡Vamos a contarlos en cada figura!' },
  { orden: 3, nombre: 'Figuras Planas', icono: '⬜', banda: 'exploradores', gens: [gLados, relLados, gVF], intro: 'Las figuras planas viven en una hoja: no tienen grosor. ¡Conócelas bien!' },
  { orden: 4, nombre: 'Cuerpos Geométricos', icono: '🧊', banda: 'aventureros', gens: [gCuerpos, relCuerpos, agrup2D3D], intro: 'Los cuerpos geométricos son 3D: ¡como un dado (cubo) o una pelota (esfera)! Tienen volumen.' },
  { orden: 5, nombre: 'Perímetro', icono: '🚧', banda: 'aventureros', gens: [gPerimCuad, gPerimRect, gPerimTri, compPerim, gVF], intro: 'El perímetro es la distancia alrededor de una figura: ¡suma todos sus lados! Como caminar por el borde.' },
  { orden: 6, nombre: 'Área de Cuadrados y Rectángulos', icono: '🟩', banda: 'aventureros', gens: [gAreaCuad, gAreaRect, compArea, gVF], intro: 'El área es el espacio DENTRO de una figura. En cuadrados y rectángulos: largo × ancho. ¡A calcular!' },
  { orden: 7, nombre: 'Área de Triángulos', icono: '🔻', banda: 'heroes', gens: [gAreaTri, gAreaRect, gAreaCuad], intro: 'El área de un triángulo es base × altura ÷ 2. ¡La mitad de un rectángulo! Practiquemos.' },
  { orden: 8, nombre: 'Ángulos', icono: '📐', banda: 'heroes', gens: [gAngulos, relAngulos, gVF], intro: 'Un ángulo es la abertura entre dos líneas. Puede ser recto (90°), agudo (pequeño) u obtuso (grande).' },
  { orden: 9, nombre: 'Volumen', icono: '📦', banda: 'heroes', gens: [gVolCubo, gVolPrisma, compVol, gVF], intro: 'El volumen es cuánto espacio ocupa un cuerpo: ¡cuánto cabe dentro! En cajas: largo × ancho × alto.' },
  { orden: 10, nombre: 'El Gran Reto Geométrico', icono: '🏆', banda: 'heroes', gens: [gPerimRect, gAreaRect, gVolCubo, gAreaTri, gLados, gAngulos], intro: '¡El desafío final! Perímetros, áreas, volúmenes y figuras, todo junto. ¡Demuestra que eres un maestro de la geometría!' },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const m of MUNDOS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#F59E0B','#FCD34D','geometria',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10 RETURNING id`,
      [m.nombre, `Geometría: ${m.nombre}`, m.orden, m.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const preguntas = [];
      for (let i = 0; i < 3; i++) { const gen = m.gens[(a - 1 + i) % m.gens.length]; preguntas.push(gen(rng(m.orden * 100000 + a * 1000 + i * 131 + 7))); }
      const nombre = `${m.nombre} — Reto ${a}`;
      const config = { version: 2, tipo: 'quiz', id: `geometria-m${m.orden}-n${a}`, nombre, categoria: 'geometria',
        narracion: { intro: a === 1 ? m.intro : `Reto ${a} de ${m.nombre}. ¡Tú puedes!`, url_audio_intro: null },
        preguntas, recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,$5, ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, nombre, a, config, m.banda]);
    }
    console.log(`✓ Geometría ${m.orden} "${m.nombre}"`);
  }
  console.log('\n✅ Geometría sembrada: 10 mundos × 10 actividades.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
