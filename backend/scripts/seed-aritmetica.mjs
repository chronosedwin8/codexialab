// Materia "Aritmética": 10 mundos × 10 actividades, progresión 6–12 años (plan de 6 niveles).
// Preguntas GENERADAS (correctas por construcción) con variedad de tipos:
// opción, V/F, completar, ordenar, relacionar, agrupar.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ri = (r, min, max) => min + Math.floor(r() * (max - min + 1));
const pick = (r, a) => a[Math.floor(r() * a.length)];
const shuffle = (r, arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function opcion(r, enunciado, correcta, distractores, explicacion, tipo = 'opcion') {
  const opts = shuffle(r, [correcta, ...distractores]).slice(0, 4);
  if (!opts.includes(correcta)) opts[0] = correcta;
  return { tipo, enunciado, opciones: opts.map(String), correcta: opts.indexOf(correcta), explicacion };
}
// 3 distractores numéricos distintos, != correcta y >= 0
function distN(correcta, extra = []) {
  const out = []; const cands = [...extra, correcta + 1, correcta - 1, correcta + 2, correcta - 2, correcta + 10, correcta + 3, correcta + 5];
  for (const d of cands) { if (d !== correcta && d >= 0 && !out.includes(d)) out.push(d); if (out.length >= 3) break; }
  let k = 4; while (out.length < 3) { const d = correcta + k; if (d !== correcta && !out.includes(d)) out.push(d); k++; }
  return out.slice(0, 3);
}
const numQ = (r, enun, correcta, exp, tipo = 'opcion') => opcion(r, enun, String(correcta), distN(correcta).map(String), exp, tipo);

// ---------- Generadores ----------
// Conteo
const gSiguiente = (r) => { const n = ri(r, 1, 99); return numQ(r, `¿Qué número viene DESPUÉS de ${n}?`, n + 1, `Después de ${n} viene ${n + 1}.`); };
const gAnterior = (r) => { const n = ri(r, 2, 100); return numQ(r, `¿Qué número viene ANTES de ${n}?`, n - 1, `Antes de ${n} viene ${n - 1}.`); };
const gOrdenar = (max) => (r) => { const s = new Set(); while (s.size < 4) s.add(ri(r, 1, max)); const items = [...s].sort((a, b) => a - b).map(String); return { tipo: 'ordenar', enunciado: 'Ordena de MENOR a MAYOR.', items, explicacion: `De menor a mayor: ${items.join(', ')}.` }; };
const gContarDe = (r) => { const step = pick(r, [2, 5, 10]); const start = step; const s = [start, start + step, start + step * 2, start + step * 3]; return opcion(r, `Cuenta de ${step} en ${step}: ${s.join(', ')}, ___`, String(start + step * 4), distN(start + step * 4).map(String), `Sumas ${step} cada vez.`, 'completar'); };
const gParImpar = (r) => { const n = ri(r, 1, 50); const par = n % 2 === 0; return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "El número ${n} es par."`, respuesta: par, explicacion: `${n} es ${par ? 'par' : 'impar'}.` }; };
const gAgruparPar = (r) => { const ev = shuffle(r, [2, 4, 6, 8, 10, 12]).slice(0, 3).map(String); const od = shuffle(r, [1, 3, 5, 7, 9, 11]).slice(0, 3).map(String); return { tipo: 'agrupar', enunciado: 'Clasifica los números en pares e impares.', grupos: { Pares: ev, Impares: od }, explicacion: 'Los pares terminan en 0,2,4,6,8; los impares en 1,3,5,7,9.' }; };

// Comparación
const gComparar = (max) => (r) => { const a = ri(r, 1, max), b = ri(r, 1, max); const c = a > b ? '>' : a < b ? '<' : '='; return opcion(r, `¿Qué signo va? ${a} ___ ${b}`, c, ['>', '<', '='].filter((x) => x !== c), `${a} ${c} ${b}.`, 'completar'); };
const gMayor = (max) => (r) => { const s = new Set(); while (s.size < 3) s.add(ri(r, 1, max)); const arr = [...s]; const mx = Math.max(...arr); return numQ(r, `¿Cuál es el MAYOR? ${arr.join(', ')}`, mx, `${mx} es el mayor.`); };
const gMenor = (max) => (r) => { const s = new Set(); while (s.size < 3) s.add(ri(r, 1, max)); const arr = [...s]; const mn = Math.min(...arr); return numQ(r, `¿Cuál es el MENOR? ${arr.join(', ')}`, mn, `${mn} es el menor.`); };
const gVFComparar = (max) => (r) => { const a = ri(r, 1, max), b = ri(r, 1, max); const afirm = r() < 0.5; const real = a > b; return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "${a} es mayor que ${b}"`, respuesta: afirm ? real : real, explicacion: `${a} ${real ? 'es' : 'no es'} mayor que ${b}.` }; };

// Sumas/restas
const gSuma = (max) => (r) => { const a = ri(r, 1, max), b = ri(r, 1, max); return numQ(r, `${a} + ${b} = ?`, a + b, `${a} + ${b} = ${a + b}.`); };
const gResta = (max) => (r) => { const a = ri(r, 2, max), b = ri(r, 1, a); return numQ(r, `${a} - ${b} = ?`, a - b, `${a} - ${b} = ${a - b}.`); };
const gProblemaSuma = (max) => (r) => { const a = ri(r, 2, max), b = ri(r, 1, max); const obj = pick(r, ['manzanas', 'globos', 'lápices', 'estrellas', 'monedas']); return numQ(r, `Tienes ${a} ${obj} y te regalan ${b} más. ¿Cuántas tienes?`, a + b, `${a} + ${b} = ${a + b}.`); };
const gProblemaResta = (max) => (r) => { const a = ri(r, 3, max), b = ri(r, 1, a); const obj = pick(r, ['galletas', 'fichas', 'flores', 'dulces']); return numQ(r, `Tenías ${a} ${obj} y regalaste ${b}. ¿Cuántas quedan?`, a - b, `${a} - ${b} = ${a - b}.`); };
const gCompletarSuma = (max) => (r) => { const a = ri(r, 1, max), c = a + ri(r, 1, max); return opcion(r, `${a} + ___ = ${c}`, String(c - a), distN(c - a).map(String), `${c} - ${a} = ${c - a}.`, 'completar'); };
const gVFSuma = (max) => (r) => { const a = ri(r, 1, max), b = ri(r, 1, max); const correcto = r() < 0.5; const mostrado = correcto ? a + b : a + b + ri(r, 1, 3); return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "${a} + ${b} = ${mostrado}"`, respuesta: mostrado === a + b, explicacion: `${a} + ${b} = ${a + b}.` }; };

// Valor posicional
const gDigito = (r) => { const n = ri(r, 100, 999); const lugar = pick(r, [['centenas', Math.floor(n / 100)], ['decenas', Math.floor(n / 10) % 10], ['unidades', n % 10]]); return numQ(r, `En el número ${n}, ¿qué dígito está en las ${lugar[0]}?`, lugar[1], `En ${n}, las ${lugar[0]} son ${lugar[1]}.`); };
const gDescomponer = (r) => { const c = ri(r, 1, 9) * 100, d = ri(r, 1, 9) * 10, u = ri(r, 1, 9); const n = c + d + u; return opcion(r, `${n} = ${c} + ___ + ${u}`, String(d), distN(d, [d + 10, d - 10]).map(String), `${n} se descompone en ${c} + ${d} + ${u}.`, 'completar'); };
const gVFValor = (r) => { const n = ri(r, 100, 999); const dig = ri(r, 0, 9); const lugar = pick(r, ['centenas', 'decenas', 'unidades']); const real = lugar === 'centenas' ? Math.floor(n / 100) : lugar === 'decenas' ? Math.floor(n / 10) % 10 : n % 10; return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "En ${n}, el dígito de las ${lugar} es ${real}"`, respuesta: true, explicacion: `Correcto, en ${n} las ${lugar} son ${real}.` }; };

// Multiplicación
const gMult = (max) => (r) => { const a = ri(r, 1, max), b = ri(r, 1, max); return numQ(r, `${a} × ${b} = ?`, a * b, `${a} × ${b} = ${a * b}.`); };
const gMultRepetida = (r) => { const a = ri(r, 2, 5), b = ri(r, 2, 5); const suma = Array(b).fill(a).join(' + '); return numQ(r, `${suma} = ?  (es ${b} veces ${a})`, a * b, `${b} × ${a} = ${a * b}.`); };
const gTablaCompletar = (max) => (r) => { const a = ri(r, 2, max), b = ri(r, 2, max); return opcion(r, `${a} × ___ = ${a * b}`, String(b), distN(b).map(String), `${a} × ${b} = ${a * b}.`, 'completar'); };
const gVFMult = (max) => (r) => { const a = ri(r, 2, max), b = ri(r, 2, max); const correcto = r() < 0.5; const m = correcto ? a * b : a * b + ri(r, 1, 4); return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "${a} × ${b} = ${m}"`, respuesta: m === a * b, explicacion: `${a} × ${b} = ${a * b}.` }; };
const gRelMult = (r) => { const pares = []; const used = new Set(); while (pares.length < 3) { const a = ri(r, 2, 9), b = ri(r, 2, 9); const k = `${a}x${b}`; if (used.has(a * b)) continue; used.add(a * b); pares.push([`${a} × ${b}`, String(a * b)]); } return { tipo: 'relacionar', enunciado: 'Relaciona cada multiplicación con su resultado.', pares, explicacion: 'Multiplica cada par para encontrar su pareja.' }; };

// División / fracciones
const gDiv = (max) => (r) => { const b = ri(r, 2, max), q = ri(r, 1, max); const a = b * q; return numQ(r, `${a} ÷ ${b} = ?`, q, `${a} ÷ ${b} = ${q}.`); };
const gMitad = (r) => { const n = ri(r, 1, 20) * 2; return numQ(r, `¿Cuál es la MITAD de ${n}?`, n / 2, `La mitad de ${n} es ${n / 2}.`); };
const gFraccionPizza = (r) => { const partes = pick(r, [2, 3, 4]); const nom = { 2: '1/2 (un medio)', 3: '1/3 (un tercio)', 4: '1/4 (un cuarto)' }; const dist = [2, 3, 4].filter((x) => x !== partes).map((x) => nom[x]); return opcion(r, `Divides una pizza en ${partes} partes iguales y tomas 1. ¿Qué fracción tomaste?`, nom[partes], dist, `Una de ${partes} partes es ${nom[partes]}.`); };
const gRelFraccion = () => ({ tipo: 'relacionar', enunciado: 'Relaciona cada fracción con su nombre.', pares: [['1/2', 'un medio'], ['1/3', 'un tercio'], ['1/4', 'un cuarto']], explicacion: '1/2 = medio, 1/3 = tercio, 1/4 = cuarto.' });
const gCompletarDiv = (max) => (r) => { const b = ri(r, 2, max), q = ri(r, 2, max); const a = b * q; return opcion(r, `${a} ÷ ___ = ${q}`, String(b), distN(b).map(String), `${a} ÷ ${b} = ${q}.`, 'completar'); };

// Números grandes / decimales / redondeo
const gOrdenarDec = (r) => { const s = new Set(); while (s.size < 4) s.add(ri(r, 1, 9) / 10); const items = [...s].sort((a, b) => a - b).map((x) => x.toFixed(1)); return { tipo: 'ordenar', enunciado: 'Ordena estos decimales de MENOR a MAYOR.', items, explicacion: `De menor a mayor: ${items.join(', ')}.` }; };
const gCompararDec = (r) => { const a = ri(r, 1, 9) / 10, b = ri(r, 1, 9) / 10; const c = a > b ? '>' : a < b ? '<' : '='; return opcion(r, `¿Qué signo va? ${a.toFixed(1)} ___ ${b.toFixed(1)}`, c, ['>', '<', '='].filter((x) => x !== c), `${a.toFixed(1)} ${c} ${b.toFixed(1)}.`, 'completar'); };
const gRedondear = (r) => { const n = ri(r, 11, 99); const red = Math.round(n / 10) * 10; return numQ(r, `Redondea ${n} a la DECENA más cercana.`, red, `${n} se redondea a ${red}.`); };
const gVFDecimalMedio = (r) => ({ tipo: 'vf', enunciado: '¿Verdadero o Falso? "0.5 es lo mismo que 1/2 (un medio)"', respuesta: true, explicacion: 'Correcto, 0.5 = 1/2.' });
const gRelDecimal = () => ({ tipo: 'relacionar', enunciado: 'Relaciona la fracción con su decimal.', pares: [['1/2', '0.5'], ['1/4', '0.25'], ['1/10', '0.1']], explicacion: '1/2=0.5, 1/4=0.25, 1/10=0.1.' });

// Fracciones / porcentajes
const gSumaFraccion = (r) => { const den = pick(r, [4, 5, 6, 8]); const n1 = ri(r, 1, den - 2), n2 = ri(r, 1, den - n1); return opcion(r, `${n1}/${den} + ${n2}/${den} = ?`, `${n1 + n2}/${den}`, [`${n1 + n2}/${den * 2}`, `${n1 * n2}/${den}`, `${n1 + n2 + 1}/${den}`], `Mismo denominador: suma los de arriba. ${n1}+${n2}=${n1 + n2}.`); };
const gPorcentaje = (r) => { const tipo = pick(r, [[50, 2], [25, 4], [10, 10]]); const base = ri(r, 1, 9) * tipo[1]; return numQ(r, `¿Cuánto es el ${tipo[0]}% de ${base}?`, base / tipo[1], `El ${tipo[0]}% de ${base} es ${base / tipo[1]}.`); };
const gVFPorcentaje = (r) => { const base = ri(r, 1, 9) * 2 * 10; return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "El 50% de ${base} es ${base / 2}"`, respuesta: true, explicacion: `El 50% es la mitad: ${base / 2}.` }; };
const gRelPorcentaje = () => ({ tipo: 'relacionar', enunciado: 'Relaciona el porcentaje con su parte.', pares: [['50%', 'la mitad'], ['25%', 'un cuarto'], ['100%', 'todo']], explicacion: '50%=mitad, 25%=cuarto, 100%=todo.' });

// Enteros / potencias / raíces / retos
const gEnteroMenor = (r) => { const a = -ri(r, 1, 9), b = ri(r, 1, 9); return opcion(r, `¿Qué número es MENOR: ${a} o ${b}?`, String(a), [String(b), '0'], `${a} es negativo, así que es menor que ${b}.`); };
const gPotencia = (r) => { const base = ri(r, 2, 9), exp = pick(r, [2, 3]); const res = base ** exp; return numQ(r, `${base}${exp === 2 ? '²' : '³'} = ? (${base} elevado a ${exp})`, res, `${base}${exp === 2 ? '²' : '³'} = ${Array(exp).fill(base).join(' × ')} = ${res}.`); };
const gRaiz = (r) => { const n = ri(r, 2, 12); return numQ(r, `La raíz cuadrada de ${n * n} es ?`, n, `Porque ${n} × ${n} = ${n * n}.`); };
const gDescuento = (r) => { const precio = ri(r, 2, 10) * 10; const pct = pick(r, [10, 25, 50]); const paga = precio - precio * pct / 100; return numQ(r, `Un juguete cuesta $${precio} y tiene ${pct}% de descuento. ¿Cuánto PAGAS?`, paga, `Descuento: ${precio * pct / 100}. Pagas ${precio} - ${precio * pct / 100} = ${paga}.`); };
const gVFEntero = (r) => { const a = -ri(r, 1, 9); return { tipo: 'vf', enunciado: `¿Verdadero o Falso? "${a} es menor que 0"`, respuesta: true, explicacion: `${a} es negativo, está a la izquierda del 0.` }; };

const MUNDOS = [
  { orden: 1, nombre: 'El País de los Números', icono: '🔢', banda: 'exploradores', gens: [gSiguiente, gAnterior, gContarDe, gOrdenar(50), gParImpar, gAgruparPar], intro: '¡Bienvenido a Aritmética! Soy Astro. Empecemos contando: hacia adelante y hacia atrás. ¡Vamos a jugar con los números hasta 100!' },
  { orden: 2, nombre: 'Mayor, Menor o Igual', icono: '⚖️', banda: 'exploradores', gens: [gComparar(20), gMayor(20), gMenor(20), gVFComparar(20), gOrdenar(30)], intro: '¿Qué número es más grande? Aquí aprenderás a comparar usando mayor que, menor que e igual. ¡Usa tu lógica!' },
  { orden: 3, nombre: 'Sumas y Restas Mágicas', icono: '➕', banda: 'exploradores', gens: [gSuma(20), gResta(20), gProblemaSuma(15), gProblemaResta(15), gCompletarSuma(20), gVFSuma(20)], intro: 'Sumar es juntar y restar es quitar. ¡Resuelve sumas y restas hasta 20 y problemas divertidos!' },
  { orden: 4, nombre: 'El Valor de Cada Lugar', icono: '🏯', banda: 'aventureros', gens: [gDigito, gDescomponer, gVFValor, gMayor(999), gOrdenar(999)], intro: 'Cada dígito vale según su lugar: unidades, decenas y centenas. ¡Descubre el valor de cada número hasta 1.000!' },
  { orden: 5, nombre: 'Llevadas y Préstamos', icono: '🔁', banda: 'aventureros', gens: [gSuma(99), gResta(99), gProblemaSuma(99), gProblemaResta(99), gCompletarSuma(99), gVFSuma(99)], intro: 'Cuando sumas y pasas de 9, ¡hay que llevar! Y al restar, a veces hay que pedir prestado. ¡Practiquemos con números más grandes!' },
  { orden: 6, nombre: 'El Mundo de las Tablas', icono: '✖️', banda: 'aventureros', gens: [gMult(10), gMultRepetida, gTablaCompletar(10), gVFMult(10), gRelMult], intro: 'Multiplicar es sumar muchas veces lo mismo. ¡Domina las tablas de multiplicar como un campeón!' },
  { orden: 7, nombre: 'Repartir y Fracciones', icono: '🍕', banda: 'aventureros', gens: [gDiv(10), gMitad, gFraccionPizza, gRelFraccion, gCompletarDiv(10)], intro: 'Dividir es repartir en partes iguales. ¡Y las fracciones son trozos de un todo, como rebanadas de pizza!' },
  { orden: 8, nombre: 'Números Gigantes y Decimales', icono: '🌌', banda: 'heroes', gens: [gRedondear, gCompararDec, gOrdenarDec, gVFDecimalMedio, gRelDecimal], intro: 'Números enormes y números con coma (decimales). ¡Aprende a compararlos, ordenarlos y redondearlos!' },
  { orden: 9, nombre: 'Fracciones, Decimales y Porcentajes', icono: '🧮', banda: 'heroes', gens: [gSumaFraccion, gPorcentaje, gVFPorcentaje, gRelPorcentaje, gRelDecimal], intro: 'Fracciones, decimales y porcentajes son tres formas de hablar de partes. ¡Descubre cómo se relacionan!' },
  { orden: 10, nombre: 'Enteros, Potencias y Grandes Retos', icono: '🏆', banda: 'heroes', gens: [gEnteroMenor, gPotencia, gRaiz, gDescuento, gVFEntero, gPorcentaje], intro: '¡El desafío final de Aritmética! Números negativos, potencias, raíces y problemas de la vida real. ¡Demuestra que eres un maestro!' },
];

async function main() {
  await client.connect();
  await client.query(`SELECT setval('mundos_id_seq', GREATEST((SELECT MAX(id) FROM mundos), 1))`);
  await client.query(`SELECT setval('niveles_id_seq', GREATEST((SELECT MAX(id) FROM niveles), 1))`);
  for (const m of MUNDOS) {
    const res = await client.query(
      `INSERT INTO mundos (nombre, descripcion, numero_orden, icono, color_primario, color_secundario, categoria, bloqueado, total_niveles)
       VALUES ($1,$2,$3,$4,'#16A34A','#4ADE80','aritmetica',false,10)
       ON CONFLICT (categoria, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, descripcion=EXCLUDED.descripcion, icono=EXCLUDED.icono, total_niveles=10 RETURNING id`,
      [m.nombre, `Aritmética: ${m.nombre}`, m.orden, m.icono]
    );
    const mundoId = res.rows[0].id;
    for (let a = 1; a <= 10; a++) {
      const preguntas = [];
      for (let i = 0; i < 3; i++) {
        const gen = m.gens[(a - 1 + i) % m.gens.length];
        preguntas.push(gen(rng(m.orden * 100000 + a * 1000 + i * 131 + 7)));
      }
      const nombre = `${m.nombre} — Reto ${a}`;
      const config = { version: 2, tipo: 'quiz', id: `aritmetica-m${m.orden}-n${a}`, nombre, categoria: 'aritmetica',
        narracion: { intro: a === 1 ? m.intro : `Reto ${a} de ${m.nombre}. ¡Tú puedes con las matemáticas!`, url_audio_intro: null },
        preguntas, recompensa: { monedas: 8 + a, gemas: a === 10 ? 2 : (a % 5 === 0 ? 1 : 0) } };
      await client.query(`INSERT INTO niveles (mundo_id, nombre, numero_orden, config, banda_recomendada, modalidades, activo)
        VALUES ($1,$2,$3,$4,$5, ARRAY['bloques']::modalidad_codigo[], true)
        ON CONFLICT (mundo_id, numero_orden) DO UPDATE SET nombre=EXCLUDED.nombre, config=EXCLUDED.config`, [mundoId, nombre, a, config, m.banda]);
    }
    console.log(`✓ Aritmética ${m.orden} "${m.nombre}" (${m.banda})`);
  }
  console.log('\n✅ Aritmética sembrada: 10 mundos × 10 actividades, con variedad de tipos.');
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
