/* Codexia — checkout con Mercado Pago (Checkout API / pago transparente).
   La tarjeta se tokeniza en el navegador con la Public Key; el token viaja a
   nuestra API, que cobra con el Access Token (secreto, solo en el servidor). */
(function () {
  'use strict';

  var API = ''; // mismo origen: el sitio se sirve desde el backend en /web
  var params = new URLSearchParams(location.search);
  var planParam = params.get('plan');
  var plan = planParam === 'escuela' || planParam === 'prueba' ? planParam : 'individual';

  var PLAN_INFO = {
    prueba: { nombre: 'Prueba 24 horas', label: 'Prueba', sub: 'Acceso por 24 horas', vigencia: '24 horas' },
    individual: { nombre: 'Licencia Individual', label: 'Individual', sub: 'Renovación anual', vigencia: '1 año' },
    escuela: { nombre: 'Licencia Escuela', label: 'Escuela', sub: 'Renovación anual', vigencia: '1 año' },
  };

  var form = document.getElementById('checkoutForm');
  var msg = document.getElementById('msg');
  var payBtn = document.getElementById('payBtn');
  var precios = { prueba: 10000, individual: 2000000, escuela: 12000000 };
  var mp = null;

  document.body.classList.toggle('plan-escuela', plan === 'escuela');
  document.querySelectorAll('.plan-switch a').forEach(function (a) {
    if (a.dataset.plan === plan) a.classList.add('on');
  });

  function formatCOP(n) {
    return '$' + Number(n).toLocaleString('es-CO') + ' COP';
  }

  function pintarResumen() {
    document.getElementById('planLabel').textContent = PLAN_INFO[plan].label;
    document.getElementById('planSub').textContent = PLAN_INFO[plan].sub;
    document.getElementById('planName').textContent = PLAN_INFO[plan].nombre;
    document.getElementById('vigencia').textContent = PLAN_INFO[plan].vigencia;
    document.getElementById('planPrice').textContent = formatCOP(precios[plan]);
    document.getElementById('totalPrice').textContent = formatCOP(precios[plan]);
    document.getElementById('payAmount').textContent = formatCOP(precios[plan]);
  }

  function showError(text) {
    msg.className = 'msg err';
    msg.textContent = text;
    msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function showInfo(text) {
    msg.className = 'msg info';
    msg.textContent = text;
  }

  // Inicializa: trae la Public Key y los precios reales del servidor.
  function init() {
    pintarResumen();
    fetch(API + '/api/pagos/config')
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg.precios) { precios = cfg.precios; pintarResumen(); }
        if (!cfg.publicKey) { showError('La pasarela de pago no está configurada. Contacta a soporte.'); return; }
        if (typeof MercadoPago === 'undefined') { showError('No se pudo cargar la pasarela de pago. Revisa tu conexión.'); return; }
        mp = new MercadoPago(cfg.publicKey, { locale: 'es-CO' });
      })
      .catch(function () { showError('No se pudo conectar con el servidor. Intenta más tarde.'); });
  }

  // ── Formateo de los campos de tarjeta ──
  var cardNumber = document.getElementById('cardNumber');
  cardNumber.addEventListener('input', function () {
    var v = cardNumber.value.replace(/\D/g, '').slice(0, 19);
    cardNumber.value = v.replace(/(.{4})/g, '$1 ').trim();
  });
  var exp = document.getElementById('cardExpiration');
  exp.addEventListener('input', function () {
    var v = exp.value.replace(/\D/g, '').slice(0, 4);
    exp.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
  });

  // Detecta el medio de pago (visa/master/...) a partir del BIN de la tarjeta.
  function detectarMedioPago(bin) {
    return mp.getPaymentMethods({ bin: bin }).then(function (res) {
      var pm = res.results && res.results[0];
      if (!pm) throw new Error('No reconocemos esa tarjeta. Verifica el número.');
      return pm;
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!mp) { showError('La pasarela aún se está cargando, espera un momento.'); return; }
    msg.className = 'msg';

    // Validaciones de cuenta
    var nombre = form.nombre.value.trim();
    var email = form.email.value.trim();
    var password = form.password.value;
    if (nombre.length < 2) return showError('Escribe tu nombre completo.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return showError('Escribe un correo válido.');
    if (password.length < 6) return showError('La contraseña debe tener al menos 6 caracteres.');

    var institucion = null;
    if (plan === 'escuela') {
      var instNombre = form.instNombre.value.trim();
      if (instNombre.length < 2) return showError('Escribe el nombre de tu institución.');
      institucion = { nombre: instNombre, ciudad: form.instCiudad.value.trim() || undefined };
    }

    var rawCard = cardNumber.value.replace(/\s/g, '');
    var expParts = exp.value.split('/');
    if (expParts.length !== 2) return showError('Revisa la fecha de vencimiento (MM/AA).');
    var idNumber = document.getElementById('idNumber').value.trim();
    if (!idNumber) return showError('Ingresa tu número de documento.');

    payBtn.disabled = true;
    payBtn.textContent = 'Procesando…';

    var bin = rawCard.slice(0, 8);
    detectarMedioPago(bin)
      .then(function (pm) {
        return mp
          .createCardToken({
            cardNumber: rawCard,
            cardholderName: document.getElementById('cardholderName').value.trim(),
            cardExpirationMonth: expParts[0],
            cardExpirationYear: '20' + expParts[1],
            securityCode: document.getElementById('securityCode').value.trim(),
            identificationType: document.getElementById('idType').value,
            identificationNumber: idNumber,
          })
          .then(function (tk) {
            return {
              token: tk.id,
              payment_method_id: pm.id,
              issuer_id: pm.issuer ? String(pm.issuer.id) : undefined,
              installments: parseInt(document.getElementById('installments').value, 10) || 1,
              identification: { type: document.getElementById('idType').value, number: idNumber },
            };
          });
      })
      .then(function (pago) {
        return fetch(API + '/api/pagos/procesar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: plan,
            cuenta: { nombre: nombre, email: email, password: password },
            institucion: institucion || undefined,
            pago: pago,
          }),
        }).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); });
      })
      .then(function (res) {
        var b = res.body;
        if (res.ok && b.status === 'approved') {
          // Deja la sesión lista para la app (mismo origen) y va a la pantalla de gracias.
          if (b.token) localStorage.setItem('bs_token', b.token);
          if (b.user) localStorage.setItem('bs_user', JSON.stringify(b.user));
          var qs = new URLSearchParams({ plan: plan });
          if (b.codigoInstitucion) qs.set('inst', b.codigoInstitucion);
          if (b.codigoAula) qs.set('aula', b.codigoAula);
          location.href = 'gracias.html?' + qs.toString();
          return;
        }
        if (b.status === 'in_process' || b.status === 'pending') {
          showInfo(b.mensaje || 'Tu pago está en revisión. Te avisaremos por correo al aprobarse.');
          payBtn.disabled = false;
          payBtn.innerHTML = 'Pagar ' + formatCOP(precios[plan]);
          return;
        }
        showError(b.error || 'El pago fue rechazado. Verifica los datos de tu tarjeta e intenta de nuevo.');
        payBtn.disabled = false;
        payBtn.innerHTML = 'Pagar <span>' + formatCOP(precios[plan]) + '</span>';
      })
      .catch(function (err) {
        var detail = '';
        if (err && err.length && err[0] && err[0].message) detail = ' (' + err[0].message + ')';
        else if (err && err.message) detail = ' (' + err.message + ')';
        showError('No pudimos procesar el pago' + detail + '. Verifica los datos de tu tarjeta.');
        payBtn.disabled = false;
        payBtn.innerHTML = 'Pagar ' + formatCOP(precios[plan]);
      });
  });

  init();
})();
