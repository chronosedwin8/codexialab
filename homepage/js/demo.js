/* Demo interactiva: arma un programa con bloques y lleva al robot 🤖 a la meta 🌟.
   Replica la mecánica real de Codexia (secuencias + giros) en JS puro. */
(function () {
  'use strict';
  const stage = document.getElementById('demoBoard');
  if (!stage) return;

  // Mapa: 0 camino, 1 pared. Robot empieza en (0,3) mirando derecha; meta en (4,0).
  const MAP = [
    [0, 0, 0, 0, 'G'],
    [1, 1, 0, 1, 0],
    [0, 0, 0, 1, 0],
    ['S', 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
  ];
  const ROWS = MAP.length, COLS = MAP[0].length;
  let start = { x: 0, y: 3 }, goal = { x: 4, y: 0 };
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (MAP[y][x] === 'S') start = { x, y };
    if (MAP[y][x] === 'G') goal = { x, y };
  }

  const DIRS = { der: [1, 0], izq: [-1, 0], arr: [0, -1], aba: [0, 1] };
  const ROT = ['der', 'aba', 'izq', 'arr']; // giro a la derecha
  const FACE = { der: 90, aba: 180, izq: 270, arr: 0 };

  const program = [];
  const progEl = document.getElementById('demoProgram');
  const msgEl = document.getElementById('demoMsg');
  const boardEl = document.getElementById('demoBoard');

  function renderBoard(robot, dir, broke) {
    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${COLS}, 52px)`;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const c = document.createElement('div');
      c.className = 'cell';
      if (MAP[y][x] === 1) c.classList.add('wall');
      if (x === goal.x && y === goal.y) { c.classList.add('goal'); c.textContent = '🌟'; }
      if (robot && x === robot.x && y === robot.y) {
        const b = document.createElement('span');
        b.className = 'hero-bot'; b.textContent = broke ? '💥' : '🤖';
        b.style.transform = `rotate(${FACE[dir]}deg)`;
        c.textContent = ''; c.appendChild(b);
      }
      boardEl.appendChild(c);
    }
  }

  function renderProgram() {
    progEl.innerHTML = '';
    if (!program.length) { progEl.innerHTML = '<span class="muted" style="font-size:.85rem">Toca los bloques para crear tu programa…</span>'; return; }
    program.forEach((cmd, i) => {
      const line = document.createElement('div');
      line.className = 'prog-line';
      line.innerHTML = `<span>${i + 1}.</span><span>${LABEL[cmd]}</span><button title="Quitar">✕</button>`;
      line.querySelector('button').addEventListener('click', () => { program.splice(i, 1); renderProgram(); });
      progEl.appendChild(line);
    });
  }

  const LABEL = { avanzar: '➡️ heroe.avanzar()', girar: '🔄 heroe.girarDerecha()' };

  function add(cmd) { if (program.length < 12) { program.push(cmd); renderProgram(); } }

  function msg(text, cls) { msgEl.textContent = text; msgEl.className = 'demo-msg ' + (cls || ''); }

  async function run() {
    if (!program.length) { msg('Agrega bloques primero 🙂', 'err'); return; }
    let robot = { ...start }, dir = 'der';
    renderBoard(robot, dir, false);
    msg('Ejecutando…', '');
    for (const cmd of program) {
      await sleep(420);
      if (cmd === 'girar') { dir = ROT[(ROT.indexOf(dir) + 1) % 4]; renderBoard(robot, dir, false); continue; }
      const [dx, dy] = DIRS[dir];
      const nx = robot.x + dx, ny = robot.y + dy;
      const fuera = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS;
      if (fuera || MAP[ny][nx] === 1) { renderBoard(robot, dir, true); msg('💥 ¡Choque! Ajusta tu programa e intenta otra vez.', 'err'); return; }
      robot = { x: nx, y: ny }; renderBoard(robot, dir, false);
      if (robot.x === goal.x && robot.y === goal.y) { msg('🌟 ¡Lo lograste! Así se programa en Codexia.', 'ok'); return; }
    }
    msg('Casi… el robot no llegó a la estrella. ¡Sigue intentando!', 'err');
  }

  function reset() { program.length = 0; renderProgram(); renderBoard(start, 'der', false); msg('', ''); }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  document.querySelectorAll('[data-cmd]').forEach((b) => b.addEventListener('click', () => add(b.dataset.cmd)));
  document.getElementById('demoRun').addEventListener('click', run);
  document.getElementById('demoReset').addEventListener('click', reset);

  // Solución sugerida (botón "pista"): carga un programa válido para este mapa
  const SOLUCION = ['avanzar', 'avanzar', 'girar', 'girar', 'girar', 'avanzar', 'avanzar', 'avanzar', 'girar', 'avanzar', 'avanzar'];
  const solBtn = document.getElementById('demoHint');
  if (solBtn) solBtn.addEventListener('click', () => {
    program.length = 0; SOLUCION.forEach((c) => program.push(c)); renderProgram();
    msg('Pista cargada 💡 — pulsa Ejecutar ▶ para ver al robot llegar.', '');
  });

  reset();
})();
