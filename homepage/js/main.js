/* Codexia — interacciones del sitio (sin frameworks) */
(function () {
  'use strict';

  // Menú móvil
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) toggle.addEventListener('click', () => links.classList.toggle('open'));

  // Marcar enlace activo según la página
  const here = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach((a) => {
    if ((a.getAttribute('href') || '').endsWith(here)) a.classList.add('active');
  });

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  // Contadores animados
  // Formato compacto tipo 1.2M / 8.5K (un decimal, sin .0 sobrante).
  function compact(n) {
    if (n >= 1e6) { const v = Math.round(n / 1e5) / 10; return (v % 1 === 0 ? v : v.toFixed(1)) + 'M'; }
    if (n >= 1e3) { const v = Math.round(n / 1e2) / 10; return (v % 1 === 0 ? v : v.toFixed(1)) + 'K'; }
    return Math.round(n).toLocaleString('es');
  }
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const dec = (el.dataset.dec | 0);
    const isCompact = el.dataset.format === 'compact';
    const dur = 1500; const t0 = performance.now();
    function tick(t) {
      const p = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      const cur = target * ease;
      el.textContent = (isCompact ? compact(cur) : Number(cur.toFixed(dec)).toLocaleString('es')) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animateCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.5 });
    counters.forEach((c) => cio.observe(c));
  }

  // FAQ acordeón
  document.querySelectorAll('.faq-q').forEach((q) => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const ans = item.querySelector('.faq-a');
      const open = item.classList.toggle('open');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0';
    });
  });

  // Año en footer
  document.querySelectorAll('[data-year]').forEach((e) => (e.textContent = new Date().getFullYear()));
})();
