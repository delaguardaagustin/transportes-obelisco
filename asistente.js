/* Asistente de reservas de SENTRY-CODE — sin costo, sin servidor.
   Lee window.ASISTENTE (config por cliente) y convierte el botón flotante (.fab) en un asistente guiado.
   Sin JS, el botón sigue siendo un enlace normal a WhatsApp (o a tel: en modo llamada).
   C.modo = 'llamada' (en vez de WhatsApp): usa C.tel, termina las conversaciones sugiriendo
   qué decir y un botón para llamar, en vez de un link con el mensaje precargado. */
(function () {
  var C = window.ASISTENTE;
  var fab = document.querySelector('.fab');
  if (!C || !fab) return;
  var LLAMADA = C.modo === 'llamada';
  C.cuando = C.cuando || [{ t: 'Lo antes posible', m: 'Me acomoda lo antes posible.' }, { t: 'Esta semana', m: 'Me acomoda esta semana.' }, { t: 'Fin de semana', m: 'Me acomoda el fin de semana.' }, { t: 'Todavía no sé', m: 'Aún no tengo fecha definida.' }];

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var st = {};
  var busy = false;

  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function wa(text) { return LLAMADA ? ('tel:+' + C.tel) : ('https://wa.me/' + C.wa + '?text=' + encodeURIComponent(text)); }

  var root = document.createElement('div');
  root.className = 'asis';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Asistente de ' + C.negocio);
  root.innerHTML =
    '<header class="asis-head"><div><strong>' + C.negocio + '</strong>' +
    '<span>Asistente virtual · las horas se confirman ' + (LLAMADA ? 'llamando' : ('con ' + C.persona + ' por WhatsApp')) + '</span>' +
    '<a class="asis-direct" href="' + wa('Hola ' + C.persona + ', vi tu página web.') + '"' + (LLAMADA ? '' : ' target="_blank" rel="noopener"') + '>' + (LLAMADA ? 'Llamar ahora' : 'Ir directo a WhatsApp') + '</a></div>' +
    '<button type="button" class="asis-x" aria-label="Cerrar asistente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>' +
    '<div class="asis-log" aria-live="polite"></div>' +
    '<div class="asis-opts"></div>' +
    '<form class="asis-form"><label class="asis-sr" for="asis-in">Escribe tu duda</label>' +
    '<input id="asis-in" type="text" autocomplete="off" maxlength="200" placeholder="O escribe tu duda aquí">' +
    '<button type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button></form>';
  document.body.appendChild(root);

  var log = root.querySelector('.asis-log');
  var opts = root.querySelector('.asis-opts');
  var form = root.querySelector('.asis-form');
  var input = root.querySelector('#asis-in');
  var fabTxt = fab.querySelector('.fab-txt');
  if (fabTxt) fabTxt.textContent = C.boton || 'Cuéntame qué buscas';
  fab.setAttribute('aria-label', C.boton || 'Cuéntame qué buscas');
  fab.setAttribute('aria-haspopup', 'dialog');

  function line(cls, text) {
    var p = document.createElement('p');
    p.className = cls;
    p.textContent = text;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
    return p;
  }
  function clearOpts() { opts.innerHTML = ''; }
  function chip(text, fn, primary) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'asis-chip' + (primary ? ' is-primary' : '');
    b.textContent = text;
    b.addEventListener('click', function () { if (!busy) fn(); });
    opts.appendChild(b);
  }
  function link(text, href) {
    var a = document.createElement('a');
    a.className = 'asis-chip is-primary';
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.textContent = text;
    opts.appendChild(a);
  }
  function say(text, then) {
    clearOpts();
    busy = true;
    var wait = reduce ? 0 : Math.min(200 + text.length * 9, 900);
    var dots = null;
    if (wait) { dots = line('a asis-dots', '···'); }
    setTimeout(function () {
      if (dots) dots.remove();
      line('a', text);
      busy = false;
      if (then) then();
    }, wait);
  }
  function me(text) { line('me', text); }

  function start() {
    log.innerHTML = ''; st = {};
    say(C.saludo, menu);
  }
  function menu() {
    clearOpts();
    C.servicios.forEach(function (s) { chip(s.n, function () { pickService(s); }); });
    chip('Tengo una duda', function () { me('Tengo una duda'); say('Cuéntame, escríbela abajo y te respondo. Si es algo que no sé, te dejo el mensaje listo para ' + C.persona + '.'); input.focus(); });
  }
  function pickService(s, silent) {
    if (!silent) me(s.n);
    st.svc = s.n; st.det = '';
    if (s.opts && s.opts.length) {
      say(s.info, function () {
        s.opts.forEach(function (o) { chip(o, function () { st.det = o; me(o); askWhen(); }); });
        chip('Aún no lo sé', function () { me('Aún no lo sé'); askWhen(); });
      });
    } else {
      say(s.info, askWhen);
    }
  }
  function askWhen() {
    say('¿Para cuándo te acomoda?', function () {
      C.cuando.forEach(function (w) {
        chip(w.t, function () { st.when = w; me(w.t); finish(); });
      });
    });
  }
  function finish() {
    var que = st.det ? st.det.toLowerCase() + ' (' + st.svc.toLowerCase() + ')' : st.svc.toLowerCase();
    var cuando = st.when.m;
    var msg = 'Hola ' + C.persona + ', vi tu página web y me gustaría agendar: ' + que + '. ' + cuando;
    say(LLAMADA ? 'Listo. Esto le puedes decir cuando llames:' : ('Listo. Este es el mensaje que le llegaría a ' + C.persona + ':'), function () {
      var q = line('quote', msg);
      link(LLAMADA ? 'Llamar ahora' : 'Enviar por WhatsApp', wa(msg));
      chip('Empezar de nuevo', function () { me('Empezar de nuevo'); start(); });
      q.scrollIntoView({ block: 'nearest' });
    });
  }
  function offerHandoff(text, raw) {
    say(text, function () {
      link(LLAMADA ? ('Llamar a ' + C.persona) : ('Escribir a ' + C.persona + ' por WhatsApp'), wa('Hola ' + C.persona + ', vi tu página web y tengo una consulta: ' + raw));
      chip('Ver servicios', function () { me('Ver servicios'); say('Estos son los servicios:', menu); });
    });
  }
  function free(raw) {
    var t = norm(raw), i, j;
    me(raw);
    var faqs = C.faq.filter(function (f) { return f.pri; }).concat(C.faq.filter(function (f) { return !f.pri; }));
    for (j = 0; j < faqs.length; j++) { if (faqs[j].pri && new RegExp(faqs[j].kw, 'i').test(t)) { answer(faqs[j], raw); return; } }
    for (i = 0; i < C.servicios.length; i++) {
      if (new RegExp(C.servicios[i].kw, 'i').test(t)) { pickService(C.servicios[i], true); return; }
    }
    for (j = 0; j < faqs.length; j++) {
      if (new RegExp(faqs[j].kw, 'i').test(t)) { answer(faqs[j], raw); return; }
    }
    offerHandoff('Eso prefiero que te lo responda ' + C.persona + ' directamente. Te dejo el chat listo con tu pregunta, o puedes ver los servicios.', raw);
  }
  function answer(f, raw) {
    say(f.r, function () {
      chip('Quiero agendar', function () { me('Quiero agendar'); say('¿Qué servicio buscas?', menu); });
      link(LLAMADA ? 'Llamar ahora' : 'Escribir por WhatsApp', wa('Hola ' + C.persona + ', vi tu página web y tengo una consulta: ' + raw));
    });
  }

  function open() {
    root.hidden = false;
    requestAnimationFrame(function () { root.classList.add('is-open'); });
    fab.setAttribute('aria-expanded', 'true');
    if (!log.children.length) start();
    if (!(window.matchMedia && matchMedia('(pointer:coarse)').matches)) setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
  }
  function close() {
    root.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    setTimeout(function () { root.hidden = true; }, reduce ? 0 : 200);
    fab.focus();
  }

  fab.addEventListener('click', function (e) { e.preventDefault(); if (root.hidden) open(); else close(); });
  root.querySelector('.asis-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !root.hidden) close(); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v || busy) return;
    input.value = '';
    free(v);
  });
})();
