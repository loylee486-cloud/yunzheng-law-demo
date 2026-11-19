(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 移动端菜单 ---------- */
  var burger = document.getElementById('burger');
  var menu = document.querySelector('.menu');
  var navHost = document.querySelector('header.nav');
  var mobileNav = window.matchMedia('(max-width: 960px)');
  var sub = menu ? menu.querySelector('.has-sub') : null;
  var trigger = sub ? sub.querySelector(':scope > a') : null;

  function closeSubmenu() {
    if (!sub || !trigger) return;
    sub.classList.remove('open');
    if (mobileNav.matches) trigger.setAttribute('aria-expanded', 'false');
    else trigger.removeAttribute('aria-expanded');
  }

  function sizeMenu() {
    if (!menu || !navHost || !menu.classList.contains('is-open')) return;
    var bottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height
      : window.innerHeight;
    var bar = document.querySelector('.mbar');
    if (bar && window.getComputedStyle(bar).display !== 'none') {
      bottom = Math.min(bottom, bar.getBoundingClientRect().top);
    }
    menu.style.setProperty('--menu-max-height', Math.max(0, bottom - navHost.getBoundingClientRect().bottom) + 'px');
  }

  function setMenuOpen(open) {
    if (!burger || !menu) return;
    open = open && mobileNav.matches;
    menu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    if (open) {
      menu.scrollTop = 0;
      sizeMenu();
    } else {
      menu.style.removeProperty('--menu-max-height');
      closeSubmenu();
    }
  }

  if (burger && menu) {
    if (!menu.id) menu.id = 'primary-menu';
    burger.setAttribute('aria-controls', menu.id);
    setMenuOpen(false);
    burger.addEventListener('click', function () {
      setMenuOpen(!menu.classList.contains('is-open'));
    });
    menu.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link && link !== trigger) setMenuOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !burger.contains(e.target)) setMenuOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenuOpen(false);
        burger.focus();
      }
    });
    if (mobileNav.addEventListener) mobileNav.addEventListener('change', function () { setMenuOpen(false); });
    else mobileNav.addListener(function () { setMenuOpen(false); });
    window.addEventListener('resize', sizeMenu);
    window.addEventListener('scroll', sizeMenu, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', sizeMenu);
      window.visualViewport.addEventListener('scroll', sizeMenu);
    }
  }

  /* ---------- 业务领域下拉：触屏 / 窄屏点击展开 ---------- */
  if (sub && trigger) {
    var submenu = sub.querySelector('.submenu');
    if (submenu) {
      if (!submenu.id) submenu.id = 'practice-submenu';
      trigger.setAttribute('aria-controls', submenu.id);
    }
    trigger.addEventListener('click', function (e) {
      if (mobileNav.matches || window.matchMedia('(hover: none)').matches) {
        e.preventDefault();
        var open = sub.classList.toggle('open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        sizeMenu();
      }
    });
    document.addEventListener('click', function (e) {
      if (!sub.contains(e.target)) closeSubmenu();
    });
  }

  /* 仅滚动业务索引本身，避免把页面正文一起滚动。 */
  var practiceNav = document.querySelector('.subnav .wrap');
  function showCurrentPractice() {
    if (!practiceNav) return;
    var current = practiceNav.querySelector('a.on');
    if (!current) return;
    current.setAttribute('aria-current', 'page');
    var box = practiceNav.getBoundingClientRect();
    var item = current.getBoundingClientRect();
    var target = practiceNav.scrollLeft + item.left - box.left - (practiceNav.clientWidth - item.width) / 2;
    practiceNav.scrollLeft = Math.max(0, Math.min(target, practiceNav.scrollWidth - practiceNav.clientWidth));
  }
  showCurrentPractice();
  window.addEventListener('resize', showCurrentPractice);
  window.addEventListener('load', showCurrentPractice);

  /* ---------- 顶部滚动进度条 ---------- */
  var prog = document.createElement('div');
  prog.id = 'prog';
  document.body.appendChild(prog);

  /* ---------- 区块大号编号 ---------- */
  var heads = document.querySelectorAll('.blk-head, .sec-head');
  Array.prototype.forEach.call(heads, function (h, i) {
    var n = document.createElement('span');
    n.className = 'wnum';
    n.setAttribute('aria-hidden', 'true');
    n.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
    h.appendChild(n);
  });

  /* ---------- 鼠标光晕（仅精确指针） ---------- */
  var fine = window.matchMedia('(pointer:fine)').matches;
  if (fine && !reduce) {
    Array.prototype.forEach.call(document.querySelectorAll('.sec'), function (sec) {
      var spot = document.createElement('div');
      spot.className = 'spotlight';
      sec.appendChild(spot);

      sec.addEventListener('pointerenter', function () { sec.classList.add('on'); });
      sec.addEventListener('pointerleave', function () { sec.classList.remove('on'); });

      var raf = null, mx = 0, my = 0;
      sec.addEventListener('pointermove', function (e) {
        var r = sec.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          spot.style.setProperty('--mx', mx + 'px');
          spot.style.setProperty('--my', my + 'px');
        });
      });
    });
  }

  /* ---------- 滚动渐显（区块 + 网格内卡片逐个，按类型给不同入场方向） ---------- */
  if ('IntersectionObserver' in window && !reduce) {
    var GRIDS = ['navgrid', 'news-grid', 'chain', 'adv-grid', 'case-grid',
                 'path-grid', 'team-grid', 'svc-grid', 'about-grid',
                 'svc-index', 'note-list', 'scenes', 'tbl', 'info-list',
                 'split-grid', 'lawyer-grid'];

    function isGrid(el) {
      var cls = ' ' + (el.className || '') + ' ';
      for (var i = 0; i < GRIDS.length; i++) {
        if (cls.indexOf(' ' + GRIDS[i] + ' ') > -1) return true;
      }
      return false;
    }

    function matches(el, sel) {
      try { return el.matches(sel); } catch (e) { return false; }
    }

    /* 入场方向：行式内容由左滑入；卡片缩放淡入；图片位自下揭开 */
    function variant(el) {
      if (matches(el, '.si-row, .note, tr, .info-list li, .deep-card li')) return 'rv-l';
      if (matches(el, '.shot')) return 'rv-m';
      if (matches(el, '.scene, .adv, .navcard, .svc, .deep-card, .chain .step, .team-grid > *')) return 'rv-s';
      return '';
    }

    var targets = [];
    Array.prototype.forEach.call(
      document.querySelectorAll('.sec > .wrap, .blk > .wrap, .creed > .wrap'),
      function (wrap) {
        Array.prototype.forEach.call(wrap.children, function (el, idx) {
          /* 表格：浏览器会自动插入 tbody，直接取行做逐行渐显 */
          if (el.tagName === 'TABLE') {
            var rows = el.querySelectorAll('tr');
            Array.prototype.forEach.call(rows, function (r, i) {
              r.classList.add('rv', 'rv-l');
              r.style.transitionDelay = (i % 10) * 55 + 'ms';
              targets.push(r);
            });
            return;
          }
          if (isGrid(el) && el.children.length > 1) {
            Array.prototype.forEach.call(el.children, function (c, i) {
              c.classList.add('rv');
              var v = variant(c);
              if (v) c.classList.add(v);
              c.style.transitionDelay = (i % 8) * (matches(c, 'tr') ? 55 : 80) + 'ms';
              targets.push(c);
            });
          } else {
            el.classList.add('rv');
            var v2 = variant(el);
            if (v2) el.classList.add(v2);
            if (idx > 0) el.style.transitionDelay = Math.min(idx, 3) * 90 + 'ms';
            targets.push(el);
          }
        });
      }
    );

    if (targets.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

      targets.forEach(function (t) { io.observe(t); });
    }
  }

  /* ---------- 首屏高度：铺满视口剩余空间 ---------- */
  var topbar = document.querySelector('.topbar');
  var navbar = document.querySelector('header.nav');
  function setHeadH() {
    var h = (topbar ? topbar.offsetHeight : 0) + (navbar ? navbar.offsetHeight : 0);
    document.documentElement.style.setProperty('--headh', h + 'px');
    document.documentElement.style.setProperty('--navh', (navbar ? navbar.offsetHeight : 0) + 'px');
  }
  setHeadH();
  window.addEventListener('resize', setHeadH);

  // 滚动只更新阅读进度和吸顶导航。
  var navBar = document.querySelector('header.nav');
  var ticking = false;


  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var y = h.scrollTop;
    prog.style.width = (max > 0 ? (y / max) * 100 : 0) + '%';

    /* 顶部导航：下滑后收拢 */
    if (navBar) navBar.classList.toggle('solid', y > 40);
    ticking = false;
  }


  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });

  onScroll();

  /* ---------- 首屏图片轮播 ---------- */
  var hs = document.getElementById('heroSlider');
  if (hs) {

    var slides = [].slice.call(hs.querySelectorAll('.hs-slide'));
    var status = hs.querySelector('.hs-status');
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var idx = 0;
    var timer = null;
    var visible = !('IntersectionObserver' in window);

    function scheduleRotation() {
      clearTimeout(timer);
      // 鼠标停在画面上仍可观看轮播；键盘阅读链接时保留当前画面。
      if (hs.querySelector('a:focus-visible') || !visible || document.hidden || motion.matches) return;
      timer = setTimeout(function () { go(idx + 1, false); }, 6000);
    }

    function render(previous) {
      slides.forEach(function (s, k) {
        var on = (k === idx);
        s.classList.toggle('is-active', on);
        s.classList.toggle('is-previous', k === previous);
        s.inert = !on;
        if (on) s.removeAttribute('aria-hidden');
        else s.setAttribute('aria-hidden', 'true');
      });
    }

    function go(k, announce) {
      var next = (k + slides.length) % slides.length;
      if (next === idx) return;
      var previous = idx;
      var focusWasInSlide = slides[previous].contains(document.activeElement);
      hs.classList.add('hs-browsing');
      idx = next;
      render(previous);
      if (focusWasInSlide) hs.focus({ preventScroll: true });
      if (status && announce !== false) status.textContent = slides[idx].getAttribute('aria-label');
      scheduleRotation();
    }

    hs.addEventListener('focusin', scheduleRotation);
    hs.addEventListener('focusout', function () { requestAnimationFrame(scheduleRotation); });
    if ('IntersectionObserver' in window) {
      var rotationObserver = new IntersectionObserver(function (entries) {
        visible = entries[0].intersectionRatio >= .5;
        scheduleRotation();
      }, { threshold: .5 });
      rotationObserver.observe(hs);
    }
    document.addEventListener('visibilitychange', scheduleRotation);
    motion.addEventListener('change', scheduleRotation);
    hs.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      go(idx + (e.key === 'ArrowRight' ? 1 : -1));
    });
    var touchStart = null;
    hs.addEventListener('touchstart', function (e) {
      touchStart = e.touches.length === 1 ? e.touches[0] : null;
    }, { passive: true });
    hs.addEventListener('touchcancel', function () { touchStart = null; }, { passive: true });
    hs.addEventListener('touchend', function (e) {
      if (!touchStart) return;
      var dx = e.changedTouches[0].clientX - touchStart.clientX;
      var dy = e.changedTouches[0].clientY - touchStart.clientY;
      touchStart = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
        go(idx + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });

    render();
    scheduleRotation();
  }
})();

/* 阅读区停在视口，由原生滚动推进画面；锚点可跳到对应的阅读段。 */
(function () {
  var section = document.getElementById('home-practice');
  if (!section) return;
  var index = section.querySelector('.practice-index');
  var stage = section.querySelector('.practice-stage');
  var deck = stage.querySelector('.practice-deck');
  var header = document.querySelector('header.nav');
  var links = Array.from(index.querySelectorAll('a[href^="#"]'));
  var chapters = links.map(function (link) { return document.getElementById(link.hash.slice(1)); });
  var pinned = window.matchMedia('(min-height: 540px) and (prefers-reduced-motion: no-preference)');
  var markers = [];
  var current = -2;
  var shown = -1;
  var frame = 0;

  function renderScene(next) {
    if (next === shown) return;
    var previous = shown;
    shown = next;
    chapters.forEach(function (chapter, i) {
      chapter.classList.toggle('is-current', i === shown);
      chapter.classList.toggle('is-outgoing', i === previous);
      chapter.inert = i !== shown;
    });
  }

  function update() {
    frame = 0;
    var headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    var next = -1;
    if (markers.length) {
      var pinTop = headerBottom + index.offsetHeight;
      section.style.setProperty('--practice-index-height', index.offsetHeight + 'px');
      markers.forEach(function (marker, i) {
        if (marker.getBoundingClientRect().top <= pinTop + 2) next = i;
      });
      renderScene(Math.max(0, next));
      if (stage.getBoundingClientRect().bottom <= pinTop) next = -1;
    } else {
      var readingLine = headerBottom + (innerHeight - headerBottom) * .33;
      chapters.forEach(function (chapter, i) {
        var bounds = chapter.getBoundingClientRect();
        if (bounds.top <= readingLine && bounds.bottom > readingLine) next = i;
      });
    }
    if (next === current) return;
    current = next;
    links.forEach(function (link, i) {
      if (i === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function setLayout() {
    if (pinned.matches && !markers.length) {
      markers = chapters.map(function (chapter, i) {
        var marker = document.createElement('span');
        marker.className = 'practice-marker';
        marker.id = chapter.id;
        marker.style.setProperty('--chapter-index', i);
        chapter.removeAttribute('id');
        deck.before(marker);
        return marker;
      });
      section.classList.add('practice-pinned');
      renderScene(0);
    } else if (!pinned.matches && markers.length) {
      chapters.forEach(function (chapter, i) {
        chapter.id = markers[i].id;
        markers[i].remove();
        chapter.inert = false;
        chapter.classList.remove('is-current', 'is-outgoing');
      });
      section.classList.remove('practice-pinned');
      markers = [];
      shown = -1;
    }
    update();
  }

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  pinned.addEventListener('change', setLayout);
  setLayout();
})();

/* 章程首屏（简介页）：逐字入场 + 细线展开。无 JS 时文字保持原样可见 */
(function () {
  var hero = document.querySelector('.creed-hero');
  if (!hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var head = hero.querySelector('.ch-m');
  var chars = [];
  if (head) {
    var raw = head.textContent.trim();
    head.setAttribute('aria-label', raw);
    var PUNCT = '。，、；：？！）》」』”’%）·';
    var groups = [];
    for (var i = 0; i < raw.length; i++) {
      var c = raw.charAt(i);
      if (PUNCT.indexOf(c) > -1 && groups.length) groups[groups.length - 1] += c;
      else groups.push(c);
    }
    var frag = document.createDocumentFragment();
    groups.forEach(function (g) {
      var w = document.createElement('span');
      w.className = 'ch-w';
      for (var k = 0; k < g.length; k++) {
        var s = document.createElement('span');
        s.className = 'ch-c';
        s.textContent = g.charAt(k);
        w.appendChild(s);
        chars.push(s);
      }
      frag.appendChild(w);
    });
    head.textContent = '';
    head.appendChild(frag);
  }

  var crumb = hero.querySelector('.crumb');
  var k1 = hero.querySelector('.ch-lead .ch-k');
  var noteRows = hero.querySelectorAll('.ch-note-row');
  var narrow = window.innerWidth <= 900;
  var step = narrow ? 34 : 46;

  if (crumb) crumb.style.transitionDelay = '70ms';

  chars.forEach(function (el, i) {
    el.style.transitionDelay = (230 + i * step) + 'ms';
  });

  if (k1) { k1.style.transitionDelay = '130ms'; k1.style.setProperty('--kd', '130ms'); }

  var tNote = 230 + chars.length * step + 40;
  Array.prototype.forEach.call(noteRows, function (row, i) {
    row.style.transitionDelay = (tNote + i * 190) + 'ms';
  });

  hero.classList.add('ch-anim');
  void hero.offsetHeight;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { hero.classList.add('is-in'); });
  });
})();

/* 章程首屏（简介页）：光尘粒子层 —— 金/蓝两色微尘缓慢上浮、摆动、闪烁，
   外加少量大颗虚化光斑（bokeh）。reduce-motion 时只画一帧静点 */
(function () {
  var cv = document.querySelector('.ch-dust');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, dots = [], bokeh = [], raf = null, t0 = 0;
  var GOLD = '216,180,116', BLUE = '150,198,228';

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function mkDot(init) {
    var depth = Math.random(); /* 0 远 → 1 近 */
    return {
      x: Math.random() * W,
      y: init ? Math.random() * H : H + 8 + Math.random() * 30,
      r: 0.7 + depth * 2.1,
      vy: 5 + depth * 15,                       /* 上浮 px/s */
      vx: (Math.random() - 0.5) * 4,
      sway: 6 + Math.random() * 20,             /* 横向摆幅 */
      ph: Math.random() * 6.2832,
      tw: 0.5 + Math.random() * 1.4,            /* 闪烁频率 */
      a: 0.2 + depth * 0.44,
      c: Math.random() < 0.42 ? GOLD : BLUE
    };
  }

  function mkBokeh(init) {
    return {
      x: Math.random() * W,
      y: init ? Math.random() * H : H + 60,
      r: 9 + Math.random() * 20,
      vy: 2.5 + Math.random() * 5,
      vx: (Math.random() - 0.5) * 4,
      ph: Math.random() * 6.2832,
      tw: 0.2 + Math.random() * 0.35,
      a: 0.055 + Math.random() * 0.08,
      c: Math.random() < 0.5 ? GOLD : BLUE
    };
  }

  function build() {
    var n = window.innerWidth < 760 ? 48 : 96;
    dots = []; bokeh = [];
    for (var i = 0; i < n; i++) dots.push(mkDot(true));
    for (var j = 0; j < 9; j++) bokeh.push(mkBokeh(true));
  }

  function blob(x, y, r, c, al) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(' + c + ',' + al.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(' + c + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  function draw(dt, t) {
    ctx.clearRect(0, 0, W, H);
    var i, d, al;
    for (i = 0; i < bokeh.length; i++) {
      d = bokeh[i];
      if (!reduce) {
        d.y -= d.vy * dt;
        d.x += (d.vx + Math.sin(t * 0.00022 * d.tw + d.ph) * 4) * dt;
      }
      if (d.y < -d.r - 24) { d.y = H + d.r + 24; d.x = Math.random() * W; }
      if (d.x < -d.r - 24) d.x = W + d.r; else if (d.x > W + d.r + 24) d.x = -d.r;
      al = d.a * (0.7 + 0.3 * Math.sin(t * 0.001 * d.tw + d.ph));
      blob(d.x, d.y, d.r, d.c, al);
    }
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      if (!reduce) {
        d.y -= d.vy * dt;
        d.x += (d.vx + Math.sin(t * 0.0005 * d.tw + d.ph) * d.sway * 0.4) * dt;
      }
      if (d.y < -12) { d.y = H + 10; d.x = Math.random() * W; }
      if (d.x < -12) d.x = W + 10; else if (d.x > W + 12) d.x = -10;
      al = d.a * (0.5 + 0.5 * Math.sin(t * 0.0012 * d.tw + d.ph));
      if (al <= 0.012) continue;
      blob(d.x, d.y, d.r * 4, d.c, al * 0.5);  /* 外圈微光 */
      ctx.fillStyle = 'rgba(' + d.c + ',' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.2832); ctx.fill();
    }
  }

  function frame() {
    var now = Date.now();
    var dt = Math.min((now - t0) / 1000, 0.05);
    t0 = now;
    draw(dt, now);
    raf = requestAnimationFrame(frame);
  }

  var started = false;

  function start() {
    resize();
    if (!W || !H) return;
    build();
    started = true;
    if (reduce) draw(0, 0);
    else if (!raf) { t0 = Date.now(); frame(); }
  }

  /* canvas 在首屏渲染前 clientWidth 可能为 0：等真正拿到尺寸再启动 */
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () {
      if (!started) { start(); return; }
      resize(); build();
      if (reduce) draw(0, 0);
    }).observe(cv);
  } else {
    window.addEventListener('load', start);
  }
  start();

  window.addEventListener('resize', function () {
    if (!started) { start(); return; }
    resize(); build();
    if (reduce) draw(0, 0);
  });
  document.addEventListener('visibilitychange', function () {
    if (reduce || !started) return;
    if (document.hidden) { if (raf) { cancelAnimationFrame(raf); raf = null; } }
    else if (!raf) { t0 = Date.now(); frame(); }
  });
})();
