/* Helpstogrow — brand v2 interactions */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function cssVar(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }

  /* ── Loader (once per session) ── */
  var loader = $('#loader');
  var seen = false;
  try { seen = sessionStorage.getItem('htg-seen') === '1'; } catch (e) {}
  function hideLoader() {
    loader.classList.add('done');
    try { sessionStorage.setItem('htg-seen', '1'); } catch (e) {}
  }
  if (seen || reduce) { loader.style.display = 'none'; }
  else {
    window.addEventListener('load', function () { setTimeout(hideLoader, 1500); });
    setTimeout(hideLoader, 3500); // safety net
  }

  /* ── Theme ── */
  var themeBtn = $('#themeBtn');
  function setTheme(t) {
    root.setAttribute('data-theme', t);
    store('htg-theme', t);
    var m = $('meta[name="theme-color"]');
    if (m) m.setAttribute('content', t === 'light' ? '#F6F7FB' : '#07090E');
  }
  themeBtn.addEventListener('click', function () {
    setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
  });

  /* ── Mobile menu ── */
  var burger = $('#burger'), mobile = $('#mobileMenu');
  function menu(open) {
    mobile.classList.toggle('open', open);
    document.body.classList.toggle('locked', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { menu(!mobile.classList.contains('open')); });
  $$('a', mobile).forEach(function (a) { a.addEventListener('click', function () { menu(false); }); });

  /* ── Scroll: progress, nav hide, to-top, active link ── */
  var progress = $('#progress'), nav = $('#nav'), toTop = $('#toTop');
  var lastY = 0, ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    nav.classList.toggle('hide', y > 400 && y > lastY + 4 && !mobile.classList.contains('open'));
    if (y < lastY - 4 || y < 400) nav.classList.remove('hide');
    lastY = y;
    toTop.classList.toggle('show', y > 900);
    updateTimeline();
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  var links = $$('#navLinks a');
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) {
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });

  /* ── Reveal + counters ── */
  function countUp(el) {
    var end = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0;
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = pre + end.toFixed(dec) + suf; return; }
    var t0 = performance.now(), dur = 1800;
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + (end * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      $$('[data-count]', e.target).forEach(countUp);
      if (e.target.hasAttribute('data-count')) countUp(e.target);
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal]').forEach(function (el) { io.observe(el); });
  // hero counters start after intro
  setTimeout(function () { $$('.hero [data-count]').forEach(countUp); }, seen || reduce ? 400 : 1900);

  /* ── Hero rotating word ── */
  var rot = $('#rotator');
  if (rot && !reduce) {
    var words = rot.dataset.words.split('|'), wi = 0;
    function typeTo(word, done) {
      var cur = rot.textContent;
      (function del() {
        if (cur.length) { cur = cur.slice(0, -1); rot.textContent = cur; setTimeout(del, 38); }
        else (function add(i) {
          if (i <= word.length) { rot.textContent = word.slice(0, i); setTimeout(function () { add(i + 1); }, 70); }
          else done();
        })(1);
      })();
    }
    (function loop() {
      setTimeout(function () {
        wi = (wi + 1) % words.length;
        typeTo(words[wi], loop);
      }, 2600);
    })();
  }

  /* ── Network canvas ── */
  var canvas = $('#net');
  if (canvas && !reduce) {
    var ctx = canvas.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var pts = [], mouse = { x: -999, y: -999 }, running = true, cols;
    function palette() {
      cols = [cssVar('--violet'), cssVar('--aqua'), cssVar('--lime')];
    }
    function size() {
      var r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.min(110, Math.max(38, W * H / 15000)));
      pts = [];
      for (var i = 0; i < n; i++) pts.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.8 + .8, c: i % 3
      });
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      var max = 130, light = root.getAttribute('data-theme') === 'light';
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 160) { p.vx += dx / d * .012; p.vy += dy / d * .012; }
        p.vx *= .995; p.vy *= .995;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j], ax = p.x - q.x, ay = p.y - q.y, dd = ax * ax + ay * ay;
          if (dd < max * max) {
            ctx.globalAlpha = (1 - Math.sqrt(dd) / max) * (light ? .35 : .28);
            ctx.strokeStyle = cols[1];
            ctx.lineWidth = .8;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        ctx.globalAlpha = light ? .8 : .85;
        ctx.fillStyle = cols[p.c];
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      // links to cursor
      if (mouse.x > 0) {
        for (var k = 0; k < pts.length; k++) {
          var m = pts[k], mx = m.x - mouse.x, my = m.y - mouse.y, md = Math.sqrt(mx * mx + my * my);
          if (md < 170) {
            ctx.globalAlpha = (1 - md / 170) * .6;
            ctx.strokeStyle = cols[2]; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(frame);
    }
    palette(); size(); frame();
    var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(size, 200); });
    $('#hero').addEventListener('pointermove', function (e) {
      var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    $('#hero').addEventListener('pointerleave', function () { mouse.x = mouse.y = -999; });
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis && !running) { running = true; frame(); } else if (!vis) running = false;
    }).observe(canvas);
    new MutationObserver(palette).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ── Cursor glow + spotlight + tilt + magnetic (pointer devices only) ── */
  var glow = $('#glow');
  if (fine && !reduce) {
    var gx = 0, gy = 0, gt = 0;
    window.addEventListener('pointermove', function (e) {
      gx = e.clientX; gy = e.clientY;
      glow.classList.add('on');
      if (!gt) gt = requestAnimationFrame(function () { glow.style.transform = 'translate(' + gx + 'px,' + gy + 'px)'; gt = 0; });
    }, { passive: true });
    document.addEventListener('pointerleave', function () { glow.classList.remove('on'); });

    $$('[data-tilt]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transition = 'transform .1s linear';
        el.style.transform = 'perspective(900px) rotateX(' + (-py * 7) + 'deg) rotateY(' + (px * 9) + 'deg) translateY(' + (el.classList.contains('featured') ? -14 : 0) + 'px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = '';
        el.style.transform = '';
      });
    });

    $$('.magnetic').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * .22) + 'px,' + ((e.clientY - r.top - r.height / 2) * .3) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }
  $$('[data-spot]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ── Marquee ── */
  var mq = $('#marquee');
  if (mq) {
    var items = ['ДНК бизнеса', 'Процессы', 'Узкие горлышки', 'Отдел продаж', 'Дашборды', 'Делегирование', 'Энергия собственника', 'Регламенты', 'Переговоры', 'Масштабирование'];
    var html = items.map(function (t) { return '<span>' + t + '</span>'; }).join('');
    mq.innerHTML = html + html;
  }

  /* ── Service tabs ── */
  var tabs = $$('.tab'), panels = $$('.panel');
  function selectTab(i, focus) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      panels[k].classList.toggle('active', on);
      panels[k].hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(i); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length, k = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = (i + 1) % n;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = (i - 1 + n) % n;
      if (e.key === 'Home') k = 0; if (e.key === 'End') k = n - 1;
      if (k > -1) { e.preventDefault(); selectTab(k, true); }
    });
  });

  /* ── Timeline progress ── */
  var tl = $('#timeline'), tlFill = $('#tlFill'), steps = $$('.step', tl);
  function updateTimeline() {
    if (!tl) return;
    var r = tl.getBoundingClientRect(), vh = window.innerHeight, mid = vh * .6;
    var p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    tlFill.style.height = (p * 100) + '%';
    steps.forEach(function (s) { s.classList.toggle('on', s.getBoundingClientRect().top < mid); });
  }
  updateTimeline();

  /* ── Diagnostic quiz ── */
  var pillars = ['ДНК', 'Процессы', 'Горлышки', 'Собственник'];
  var pillarNames = ['ДНК бизнеса', 'Процессы и скелет', 'Узкие горлышки', 'Состояние собственника'];
  var pillarTips = [
    'Стоит заново сформулировать цели, бизнес-модель и ценности — чтобы бизнес рос осознанно, а не по инерции.',
    'Бизнес слишком завязан на вас. Нужны регламенты, правильное делегирование и ответственность по зонам.',
    'Деньги и время утекают в одном-двух местах. Точечная диагностика обычно даёт самый быстрый рост.',
    'Ресурс собственника — главное ограничение роста. Нужны работа с энергией, фокусом и переговорами.'
  ];
  var Q = [
    { p: 0, q: 'Насколько чётко сформулированы цели и модель вашего бизнеса на ближайший год?', o: ['Всё прописано и понятно команде', 'Есть общее понимание, но без деталей', 'Цели есть только у меня в голове', 'Живём по ситуации'] },
    { p: 1, q: 'Что произойдёт с бизнесом, если вы уедете на две недели без связи?', o: ['Всё продолжит работать', 'Будут небольшие сбои', 'Многое остановится', 'Начнётся хаос'] },
    { p: 1, q: 'Насколько описаны регламенты, чек-листы и зоны ответственности?', o: ['Описано всё ключевое', 'Описано частично', 'Что-то есть, но не работает', 'Всё держится на памяти людей'] },
    { p: 2, q: 'Знаете ли вы, где бизнес теряет больше всего денег и времени?', o: ['Да, есть карта потерь с цифрами', 'Догадываюсь, но без цифр', 'Чувствую, что теряем, но не вижу где', 'Нет, не анализировал(а)'] },
    { p: 2, q: 'Как вы принимаете решения: на основе данных или ощущений?', o: ['Дашборд с метриками в реальном времени', 'Иногда смотрю отчёты', 'В основном интуиция', 'Узнаю цифры, когда уже поздно'] },
    { p: 3, q: 'Сколько времени вы тратите на операционку, а не на стратегию?', o: ['Меньше 20%', 'Около половины', 'Большую часть времени', 'Почти всё время тушу пожары'] },
    { p: 3, q: 'Как вы себя чувствуете: энергия, фокус, уверенность в переговорах?', o: ['Полон(а) сил и фокуса', 'Бывают просадки', 'Часто чувствую усталость', 'Близок(а) к выгоранию'] }
  ];
  var view = $('#qView'), qBar = $('#qBar'), qStep = $('#qStep'), qPct = $('#qPct');
  var ans = [], cur = -1, lastResult = '';

  function intro() {
    cur = -1; ans = [];
    qBar.style.width = '0%'; qStep.textContent = 'Диагностика'; qPct.textContent = '7 вопросов · 1 минута';
    view.innerHTML = '<div class="q-intro"><p>Ответь на 7 коротких вопросов — получишь карту по четырём направлениям, слабую зону роста и рекомендацию по формату работы.</p><button class="btn btn-primary" id="qStart">Начать <span class="arr">→</span></button></div>';
    $('#qStart').addEventListener('click', function () { ask(0); });
  }
  function ask(i) {
    cur = i;
    qBar.style.width = (i / Q.length * 100) + '%';
    qStep.textContent = 'Вопрос ' + (i + 1) + ' из ' + Q.length;
    qPct.textContent = pillarNames[Q[i].p];
    var h = '<h3 class="q-title"></h3><div class="opts">';
    Q[i].o.forEach(function (t, k) { h += '<button class="opt" data-k="' + k + '"><span class="k">' + 'ABCD'[k] + '</span><span></span></button>'; });
    h += '</div><div class="q-nav">' + (i > 0 ? '<button class="link-btn" id="qBack">← Назад</button>' : '<span></span>') + '<span></span></div>';
    view.innerHTML = h;
    $('.q-title', view).textContent = Q[i].q;
    $$('.opt', view).forEach(function (b, k) {
      b.lastChild.textContent = Q[i].o[k];
      b.addEventListener('click', function () {
        ans[i] = k;
        if (i + 1 < Q.length) ask(i + 1); else finish();
      });
    });
    var back = $('#qBack'); if (back) back.addEventListener('click', function () { ask(i - 1); });
  }
  function finish() {
    qBar.style.width = '100%'; qStep.textContent = 'Результат'; qPct.textContent = '';
    var sum = [0, 0, 0, 0], cnt = [0, 0, 0, 0];
    Q.forEach(function (q, i) { sum[q.p] += ans[i]; cnt[q.p]++; });
    var pain = sum.map(function (s, i) { return s / (cnt[i] * 3); }); // 0 = всё хорошо, 1 = болит
    var total = pain.reduce(function (a, b) { return a + b; }, 0) / 4;
    var health = Math.round((1 - total) * 100);
    var weak = pain.indexOf(Math.max.apply(null, pain));
    var rec, pick;
    if (total < .35) { rec = 'Разбор бизнеса'; pick = 'Разбор бизнеса — разовая сессия'; }
    else { rec = 'Наставничество 3 месяца'; pick = 'Наставничество 3 месяца'; }
    var headline = health >= 70 ? 'Фундамент крепкий — есть что отшлифовать' : health >= 45 ? 'Есть явные точки роста' : 'Бизнес тянет из вас слишком много энергии';
    lastResult = 'Индекс «здоровья»: ' + health + '%. Слабая зона: ' + pillarNames[weak] + '. Рекомендация: ' + rec + '.';

    // radar
    var cx = 140, cy = 140, R = 96, ang = [-90, 0, 90, 180].map(function (a) { return a * Math.PI / 180; });
    function pt(a, r) { return (cx + Math.cos(a) * R * r).toFixed(1) + ',' + (cy + Math.sin(a) * R * r).toFixed(1); }
    var rings = [.33, .66, 1].map(function (r) { return '<polygon class="ring" points="' + ang.map(function (a) { return pt(a, r); }).join(' ') + '"/>'; }).join('');
    var axes = ang.map(function (a) { return '<line class="axis" x1="140" y1="140" x2="' + pt(a, 1).split(',')[0] + '" y2="' + pt(a, 1).split(',')[1] + '"/>'; }).join('');
    var shape = '<polygon class="shape" points="' + ang.map(function (a, i) { return pt(a, Math.max(.08, 1 - pain[i])); }).join(' ') + '"/>';
    var labels = '<text x="140" y="22" text-anchor="middle">' + pillars[0] + '</text><text x="262" y="144" text-anchor="start" dx="-6">' + pillars[1] + '</text><text x="140" y="268" text-anchor="middle">' + pillars[2] + '</text><text x="18" y="144" text-anchor="end" dx="14">' + pillars[3] + '</text>';
    var radar = '<svg class="radar" viewBox="0 0 280 280" role="img" aria-label="Радар по четырём направлениям">' + rings + axes + shape + labels + '</svg>';

    view.innerHTML = '<div class="result"><div>' + radar + '</div><div><div class="score grad-text">' + health + '%</div><h3></h3><p class="tip"></p><div class="rec">Слабая зона: <b></b><br>Рекомендуем: <b class="r"></b></div><div class="actions"><a href="#contact" class="btn btn-primary" id="qGo">Обсудить результат <span class="arr">→</span></a><button class="link-btn" id="qAgain">Пройти заново</button></div></div></div>';
    $('h3', view).textContent = headline;
    $('.tip', view).textContent = pillarTips[weak];
    $('.rec b', view).textContent = pillarNames[weak];
    $('.rec .r', view).textContent = rec;
    $('#qAgain').addEventListener('click', intro);
    $('#qGo').addEventListener('click', function () {
      $('#f-format').value = pick;
      $('#f-diag').value = lastResult;
      var msg = $('#f-message');
      if (!msg.value) msg.value = 'Прошёл(а) диагностику. ' + lastResult;
    });
  }
  if (view) intro();

  /* ── Programs → prefill form ── */
  $$('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () { $('#f-format').value = a.dataset.pick; });
  });

  /* ── Testimonials carousel ── */
  var slides = $('#slides'), dotsBox = $('#dots'), cards = $$('.t-card', slides);
  cards.forEach(function (c, i) {
    var b = document.createElement('button'); b.setAttribute('aria-label', 'Отзыв ' + (i + 1));
    b.addEventListener('click', function () { slides.scrollTo({ left: c.offsetLeft - slides.offsetLeft, behavior: 'smooth' }); });
    dotsBox.appendChild(b);
  });
  var dotEls = $$('button', dotsBox);
  function syncDots() {
    var idx = 0, best = 1e9;
    cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft - slides.offsetLeft - slides.scrollLeft); if (d < best) { best = d; idx = i; } });
    dotEls.forEach(function (d, i) { d.classList.toggle('on', i === idx); });
  }
  slides.addEventListener('scroll', function () { requestAnimationFrame(syncDots); }, { passive: true });
  function step(dir) { slides.scrollBy({ left: dir * (cards[0].offsetWidth + 20), behavior: 'smooth' }); }
  $('#prev').addEventListener('click', function () { step(-1); });
  $('#next').addEventListener('click', function () { step(1); });
  slides.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); });
  // mouse drag
  var down = false, sx = 0, sl = 0, moved = false;
  slides.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = slides.scrollLeft; });
  window.addEventListener('pointermove', function (e) {
    if (!down) return;
    var dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; slides.classList.add('drag'); }
    slides.scrollLeft = sl - dx;
  });
  window.addEventListener('pointerup', function () { if (!down) return; down = false; slides.classList.remove('drag'); });
  syncDots();

  /* ── FAQ ── */
  $$('.faq-item').forEach(function (item) {
    var btn = $('.faq-q', item);
    btn.addEventListener('click', function () {
      var open = !item.classList.contains('open');
      $$('.faq-item').forEach(function (o) { o.classList.remove('open'); $('.faq-q', o).setAttribute('aria-expanded', 'false'); });
      item.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ── Toast ── */
  var toastEl = $('#toast'), toastT;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('show'); }, 3200);
  }

  /* ── Contact form (Formspree) ── */
  var form = $('#contactForm'), sbtn = $('#submitBtn');
  var sel = $('#f-format');
  $$('input, select', form).forEach(function (f) { f.addEventListener('input', function () { f.classList.remove('err'); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = false;
    ['#f-name', '#f-contact', '#f-format'].forEach(function (s) {
      var f = $(s); if (!f.value.trim()) { f.classList.add('err'); bad = true; }
    });
    if (bad) { toast('Заполни имя, контакт и формат'); return; }
    if ($('.hp', form).value) return; // honeypot
    var label = sbtn.innerHTML;
    sbtn.disabled = true; sbtn.textContent = 'Отправляем…';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('bad');
        $('#formWrap').style.display = 'none';
        $('#formOk').classList.add('show');
        form.reset();
      })
      .catch(function () {
        sbtn.disabled = false; sbtn.innerHTML = label;
        toast('Не получилось отправить — попробуй ещё раз или напиши в Telegram');
      });
  });

  /* ── Command palette (Ctrl/⌘ + K, "/") ── */
  var pal = $('#palette'), palIn = $('#palInput'), palList = $('#palList'), palSel = 0, palItems = [];
  var cmds = [
    { t: 'Экспертиза', k: 'направления днк процессы горлышки', h: '#pillars' },
    { t: 'Услуги', k: 'инструменты анализ crm дашборды продажи скрипты', h: '#services' },
    { t: 'Обо мне', k: 'андрей кто опыт', h: '#about' },
    { t: 'Как работаем', k: 'процесс этапы шаги', h: '#process' },
    { t: 'Экспресс-диагностика', k: 'тест квиз проверить', h: '#diagnostic' },
    { t: 'Программы и цены', k: 'форматы стоимость цена eur', h: '#programs' },
    { t: 'Отзывы', k: 'клиенты результаты кейсы', h: '#reviews' },
    { t: 'Вопросы и ответы', k: 'faq', h: '#faq' },
    { t: 'Оставить заявку', k: 'контакт связаться форма разбор', h: '#contact' },
    { t: 'Написать в Telegram', k: 'tg телеграм', u: 'https://t.me/mentor_helpstogrow' },
    { t: 'Сменить тему', k: 'светлая тёмная dark light', fn: function () { themeBtn.click(); } }
  ];
  function renderPal() {
    var q = palIn.value.trim().toLowerCase();
    palItems = cmds.filter(function (c) { return !q || (c.t + ' ' + c.k).toLowerCase().indexOf(q) > -1; });
    palSel = 0;
    palList.innerHTML = palItems.length ? '' : '<li class="pal-empty">Ничего не найдено</li>';
    palItems.forEach(function (c, i) {
      var li = document.createElement('li'); li.className = i === 0 ? 'sel' : '';
      var s = document.createElement('span'); s.textContent = c.t;
      var m = document.createElement('small'); m.textContent = c.h ? 'раздел' : c.u ? 'ссылка' : 'действие';
      li.appendChild(s); li.appendChild(m);
      li.addEventListener('click', function () { run(c); });
      palList.appendChild(li);
    });
  }
  function run(c) {
    closePal();
    if (c.h) { var el = $(c.h); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
    else if (c.u) window.open(c.u, '_blank', 'noopener');
    else if (c.fn) c.fn();
  }
  function openPal() { pal.classList.add('open'); palIn.value = ''; renderPal(); setTimeout(function () { palIn.focus(); }, 50); }
  function closePal() { pal.classList.remove('open'); }
  $('#palBtn').addEventListener('click', openPal);
  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });
  palIn.addEventListener('input', renderPal);
  palIn.addEventListener('keydown', function (e) {
    var lis = $$('li', palList);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!palItems.length) return;
      palSel = (palSel + (e.key === 'ArrowDown' ? 1 : -1) + palItems.length) % palItems.length;
      lis.forEach(function (li, i) { li.classList.toggle('sel', i === palSel); });
      lis[palSel].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && palItems[palSel]) run(palItems[palSel]);
  });
  document.addEventListener('keydown', function (e) {
    var typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.classList.contains('open') ? closePal() : openPal(); }
    else if (e.key === '/' && !typing) { e.preventDefault(); openPal(); }
    else if (e.key === 'Escape') { closePal(); menu(false); }
  });

  /* ── Misc ── */
  var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  onScroll();
})();
