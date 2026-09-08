// Siembra la TIENDA de Codexia con muchos objetos: colores, sombreros, coronas, accesorios,
// mascotas, pociones mágicas, superpoderes, memoria RAM, stickers, comidas y gemas.
// Precios en monedas (🪙 la moneda de Codexia, que se gana con estrellas) y/o gemas (💎 premium).
// Los items con datos.exclusivo NO se compran: se ganan completando MUNDOS ESPECIALES o importantes
// (ver backend/scripts/seed-logros.mjs, que los entrega como recompensa de logros).
//
// IMPORTANTE: los ids 1..7 se mantienen estables porque seed-logros.mjs los referencia.
import pg from 'pg';
const client = new pg.Client({ host: 'localhost', port: 5432, user: 'postgres', password: '1004', database: 'codexia_db' });

// [id, nombre, tipo, descripcion, costoMonedas, costoGemas, datos]
const ITEMS = [
  // ── Sombreros (1-2 estables) ──────────────────────────────────────────────
  [1, 'Sombrero de Mago', 'sombrero', 'Un clásico sombrero de hechicero.', 50, 0, { id: 'sombrero_mago', slot: 'sombrero', emoji: '🎩' }],
  [2, 'Corona Dorada', 'corona', 'La corona dorada de toda la vida.', 0, 5, { id: 'corona_dorada', slot: 'sombrero', emoji: '👑' }],
  // ── Accesorios (3-4 estables) ─────────────────────────────────────────────
  [3, 'Gafas de Sol', 'accesorio', 'Para verte genial bajo el sol.', 30, 0, { id: 'gafas_sol', slot: 'accesorio', emoji: '🕶️' }],
  [4, 'Capa de Héroe', 'accesorio', 'Una capa roja de superhéroe.', 80, 0, { id: 'capa_heroe', slot: 'accesorio', emoji: '🦸' }],
  // ── Colores (5-7 estables) ────────────────────────────────────────────────
  [5, 'Color Rojo Fuego', 'color', 'Pinta tu avatar de rojo fuego.', 20, 0, { color: 'rojo', emoji: '🔴' }],
  [6, 'Color Verde Esmeralda', 'color', 'Un verde brillante y natural.', 20, 0, { color: 'verde', emoji: '🟢' }],
  [7, 'Color Dorado', 'color', 'El color de los campeones.', 0, 3, { color: 'dorado', emoji: '🟡' }],
  [8, 'Color Azul Océano', 'color', 'Azul profundo como el mar.', 20, 0, { color: 'cyan', emoji: '🔵' }],
  [9, 'Color Rosa Chicle', 'color', 'Un rosa divertido y dulce.', 20, 0, { color: 'rosa', emoji: '🩷' }],
  [10, 'Color Arcoíris', 'color', 'El color más especial de todos.', 0, 6, { color: 'morado', emoji: '🌈' }],

  // ── Coronas ───────────────────────────────────────────────────────────────
  [11, 'Corona de Joyas', 'corona', 'Brilla con gemas de colores.', 0, 8, { id: 'corona_joya', slot: 'sombrero', emoji: '💎' }],
  [12, 'Corona Real', 'corona', 'Digna de la realeza de Codexia.', 120, 0, { id: 'corona_real', slot: 'sombrero', emoji: '👑' }],
  [13, 'Tiara de Princesa', 'corona', 'Una tiara elegante y brillante.', 90, 0, { id: 'tiara_princesa', slot: 'sombrero', emoji: '👸' }],
  [14, 'Corona de Campeón', 'corona', 'Solo para quienes ganan un Mundo Especial.', 0, 0, { id: 'corona_campeon', slot: 'sombrero', emoji: '🏆', exclusivo: true, comoObtener: 'Gánala completando un Mundo Arcade 🎮' }],

  // ── Sombreros extra ───────────────────────────────────────────────────────
  [15, 'Gorro de Fiesta', 'sombrero', '¡Listo para celebrar!', 40, 0, { id: 'gorro_fiesta', slot: 'sombrero', emoji: '🥳' }],
  [16, 'Diadema de Flores', 'sombrero', 'Flores frescas para tu cabeza.', 45, 0, { id: 'diadema_flor', slot: 'sombrero', emoji: '🌸' }],

  // ── Accesorios extra ──────────────────────────────────────────────────────
  [17, 'Alas de Hada', 'accesorio', 'Vuela con estilo mágico.', 100, 0, { id: 'alas_hada', slot: 'accesorio', emoji: '🧚' }],
  [18, 'Mochila Cohete', 'accesorio', 'Una mochila que despega.', 110, 0, { id: 'mochila_cohete', slot: 'accesorio', emoji: '🚀' }],

  // ── Mascotas ──────────────────────────────────────────────────────────────
  [19, 'Dragón Bebé', 'mascota', 'Un dragoncito que te acompaña.', 150, 0, { id: 'dragon_bebe', emoji: '🐉' }],
  [20, 'Gatito Robot', 'mascota', 'Ronronea en binario.', 130, 0, { id: 'gatito_robot', emoji: '🐱' }],
  [21, 'Búho Sabio', 'mascota', 'Sabe todas las respuestas.', 140, 0, { id: 'buho_sabio', emoji: '🦉' }],
  [22, 'Unicornio', 'mascota', 'Mágico y muy especial.', 0, 10, { id: 'unicornio', emoji: '🦄' }],
  [23, 'Fénix Legendario', 'mascota', 'Renace del fuego. ¡Muy raro!', 0, 0, { id: 'fenix', emoji: '🔥', exclusivo: true, comoObtener: 'Gánalo construyendo tu primera Neurona 🧠 (Mundo de IA)' }],

  // ── Pociones mágicas por materia ──────────────────────────────────────────
  [24, 'Poción de Lógica', 'pocion', 'Te da una pista extra en Lógica.', 25, 0, { materia: 'logica', emoji: '🧪', efecto: 'pista_extra' }],
  [25, 'Poción de Matemáticas', 'pocion', 'Una ayudita en Aritmética.', 25, 0, { materia: 'aritmetica', emoji: '🧴', efecto: 'pista_extra' }],
  [26, 'Poción de Código', 'pocion', 'Energía para programar.', 25, 0, { materia: 'programacion', emoji: '⚗️', efecto: 'pista_extra' }],
  [27, 'Poción de Ciencia', 'pocion', 'Chispa científica para Física.', 25, 0, { materia: 'fisica', emoji: '🔮', efecto: 'pista_extra' }],

  // ── Superpoderes ──────────────────────────────────────────────────────────
  [28, 'Súper Velocidad', 'superpoder', 'Tu avatar se mueve rapidísimo.', 60, 0, { id: 'super_velocidad', emoji: '⚡' }],
  [29, 'Visión de Rayos X', 'superpoder', 'Descubre secretos ocultos.', 70, 0, { id: 'rayos_x', emoji: '👁️' }],
  [30, 'Escudo Mágico', 'superpoder', 'Te protege de los errores.', 80, 0, { id: 'escudo', emoji: '🛡️' }],
  [31, 'Poder Estelar', 'superpoder', 'El poder de las estrellas.', 0, 0, { id: 'poder_estelar', emoji: '🌟', exclusivo: true, comoObtener: 'Gánalo completando un mundo entero 🏰' }],

  // ── Memoria RAM adicional ─────────────────────────────────────────────────
  [32, 'Memoria RAM +1', 'ram', 'Recuerda 1 pista más por nivel.', 40, 0, { cantidad: 1, emoji: '💾' }],
  [33, 'Memoria RAM +2', 'ram', 'Recuerda 2 pistas más por nivel.', 0, 4, { cantidad: 2, emoji: '🧠' }],
  [34, 'RAM Cuántica', 'ram', 'Memoria del futuro. ¡Súper rara!', 0, 0, { cantidad: 3, emoji: '🔋', exclusivo: true, comoObtener: 'Gánala completando un Laboratorio 🔬 (simulación)' }],

  // ── Stickers ──────────────────────────────────────────────────────────────
  [35, 'Sticker Estrella', 'sticker', 'Una estrella para tu colección.', 10, 0, { emoji: '⭐' }],
  [36, 'Sticker Cohete', 'sticker', 'Despega tu colección.', 10, 0, { emoji: '🚀' }],
  [37, 'Sticker Corazón', 'sticker', 'Comparte un poco de amor.', 10, 0, { emoji: '💖' }],
  [38, 'Pack Galaxia', 'sticker', 'Un set completo de stickers espaciales.', 0, 3, { emoji: '🌌' }],

  // ── Comidas ───────────────────────────────────────────────────────────────
  [39, 'Pizza Power', 'comida', '¡Energía para tu héroe!', 15, 0, { emoji: '🍕' }],
  [40, 'Helado Arcoíris', 'comida', 'Dulce y colorido.', 15, 0, { emoji: '🍦' }],
  [41, 'Galleta Mágica', 'comida', 'Una galleta con suerte.', 15, 0, { emoji: '🍪' }],
  [42, 'Banquete Real', 'comida', 'Un festín digno de campeones.', 0, 5, { emoji: '🍰' }],

  // ── Gemas de colección ────────────────────────────────────────────────────
  [43, 'Gema Rubí', 'gema', 'Una gema roja brillante.', 0, 2, { emoji: '🔴', rareza: 'rara' }],
  [44, 'Gema Esmeralda', 'gema', 'Una gema verde preciosa.', 0, 2, { emoji: '🟢', rareza: 'rara' }],
  [45, 'Gema Zafiro', 'gema', 'Una gema azul resplandeciente.', 0, 2, { emoji: '🔵', rareza: 'rara' }],
  [46, 'Gema Maestra', 'gema', 'La gema más rara de Codexia.', 0, 0, { emoji: '💠', exclusivo: true, comoObtener: 'Gánala dominando una materia completa 👑' }],
];

async function main() {
  await client.connect();
  // Re-sembrar manteniendo el inventario de los usuarios intacto (no borramos inventario_usuario).
  // Usamos UPSERT por id para no romper referencias existentes.
  for (const [id, nombre, tipo, descripcion, costoMonedas, costoGemas, datos] of ITEMS) {
    await client.query(
      `INSERT INTO items_tienda (id, nombre, tipo, descripcion, costo_monedas, costo_gemas, datos, activo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre, tipo = EXCLUDED.tipo, descripcion = EXCLUDED.descripcion,
         costo_monedas = EXCLUDED.costo_monedas, costo_gemas = EXCLUDED.costo_gemas,
         datos = EXCLUDED.datos, activo = true`,
      [id, nombre, tipo, descripcion, costoMonedas, costoGemas, JSON.stringify(datos)]
    );
  }
  // Mantener la secuencia por delante del id máximo
  await client.query(`SELECT setval('items_tienda_id_seq', (SELECT MAX(id) FROM items_tienda))`);
  const n = (await client.query('SELECT COUNT(*)::int c FROM items_tienda')).rows[0].c;
  console.log(`✅ Tienda sembrada: ${ITEMS.length} items definidos (${n} en total en la BD).`);
  await client.end();
}
main().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
