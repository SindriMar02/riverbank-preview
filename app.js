/* Riverbank demo — shared motion layer. rb- scope. Engine: N18, re-aimed. */
(function () {
  document.documentElement.classList.add('js');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- nav chrome: solid past hero, invert over dark bands (Set-tracked) ---- */
  var nav = document.querySelector('.rb-nav');
  function initNavChrome() {
    if (!nav) return;
    var solidIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        nav.classList.toggle('is-solid', !e.isIntersecting);
      });
    }, { rootMargin: '-72px 0px 0px 0px', threshold: 0 });
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:120px;width:1px;';
    document.body.prepend(sentinel);
    solidIO.observe(sentinel);

    var darkNow = new Set();
    var darkIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) darkNow.add(e.target); else darkNow.delete(e.target);
      });
      nav.classList.toggle('is-over-dark', darkNow.size > 0);
    }, { rootMargin: '-32px 0px -92% 0px', threshold: 0 });
    document.querySelectorAll('.rb-navdark').forEach(function (el) { darkIO.observe(el); });
  }

  /* ---- the reveal ------------------------------------------------------
     Two documented faults this is built to avoid, neither visible in a
     screenshot:
       1. a curtain whose only display comes from the class the finish handler
          removes hard-cuts with zero intermediate frames. Display here hangs
          off .js, which is never removed, so the panels keep a display all the
          way through their exit.
       2. a hero entrance driven by a scroll observer plays BEHIND the curtain,
          because the observer hands it its class at t=0 while it is covered.
          Nothing here is observer-driven: is-revealed alone drives the hero,
          and it is set at reveal time.
     The node is removed only after the panel transition has finished, or it
     pops out mid-flight. */
  function initReveal() {
    var html = document.documentElement;
    var doors = document.querySelector('.rb-doors');
    var load = document.querySelector('.rb-load');
    function open() { html.classList.remove('rb-loading'); if (doors) doors.classList.add('is-revealed'); }
    if (!doors || !load) { open(); if (load) load.remove(); return; }
    if (reduce) { open(); load.remove(); return; }

    /* The waiting visuals (wordmark, hairline) are CSS animations that start at
       first paint, so nothing here has to kick them off. This function only
       decides WHEN to open. */
    var waits = [].slice.call(doors.querySelectorAll('.rb-door-media img')).map(function (img) {
      return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    });
    if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);

    /* A floor so the hairline is actually seen on a warm cache, and a ceiling so
       one dead image can never hold the page shut. */
    var floor = new Promise(function (r) { setTimeout(r, 900); });
    var ceiling = new Promise(function (r) { setTimeout(r, 2600); });
    var fired = false;

    Promise.race([Promise.all(waits.concat([floor])), ceiling]).then(function () {
      if (fired) return; fired = true;
      load.classList.add('is-full');
      setTimeout(function () {
        open();
        load.classList.add('is-done');
        setTimeout(function () { load.remove(); }, 1400);
      }, 260);
    });
  }
  initReveal();

  initNavChrome(); /* nav legibility is not motion: runs regardless of reduced-motion */

  if (reduce || !window.gsap) return;

  gsap.registerPlugin(ScrollTrigger);

  /* ---- Lenis: fine-pointer desktop ONLY, never on touch ---- */
  var lenis = null;
  var finePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches
                 && window.innerWidth > 840;
  if (window.Lenis && finePointer) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (ev) {
        var id = a.getAttribute('href');
        if (id.length > 1) {
          var el = document.querySelector(id);
          if (el) { ev.preventDefault(); lenis.scrollTo(el, { offset: -64 }); }
        }
      });
    });
  }

  /* ---- hero entrance: owned by the reveal, NOT by page load ----------------
     This used to be a block of gsap.from() calls on .rb-door-media,
     .rb-door-inner and .rb-hero-mark h1/p, all firing at load. Two problems, and
     the second one shipped broken:
       - it played entirely BEHIND the loading curtain, so the curtain lifted
         onto an already static hero. That is the documented fault.
       - gsap.from() writes inline opacity:0 on the children, which outranks the
         CSS reveal animating their parent, so the wordmark stayed invisible for
         the whole load. Measured: .rb-hero-mark > div at opacity 1 while its own
         h1 sat at inline opacity 0.
     One system owns the hero and it is the CSS in styles.css, keyed off
     .is-revealed. Nothing here touches it. The sub-page hero keeps its load
     entrance because those pages have no curtain yet. */
  var propHero = document.querySelector('.rb-prop-hero');
  if (propHero) {
    gsap.from('.rb-prop-hero-media img', { scale: 1.12, duration: 1.6, ease: 'power2.out' });
    gsap.from('.rb-prop-hero-inner > *', {
      y: 30, opacity: 0, duration: 1.0, ease: 'power3.out', stagger: 0.1, delay: 0.25
    });
  }

  /* ---- masked line reveal ------------------------------------------------
     Was a single rise of the whole block, which reads as one slab moving. This
     splits the heading into its real rendered lines and lifts them out of their
     own masks with a stagger.

     Two traps, both from [[split-line-probe-must-match-render]]:
       1. the probe spans must wrap exactly where the finished text wraps. An
          inline-block span with white-space:pre and the space inside it is a
          hair wider than the real line, and the mask clips the last glyph
          ("THEIR BOOKING PAG"). Plain inline spans with real space text nodes
          between them, grouped by offsetTop, wrap identically.
       2. overflow:hidden also crops a display face's vertical overshoot, so
          "ARE" renders as "ARF". The mask gets padding and an equal negative
          margin, which buys the overshoot room without moving the layout.

     Elements containing markup are left alone and keep the old block rise:
     rebuilding them from words would throw their links and spans away. */
  var LINE_PAD_TOP = 0.14, LINE_PAD_BOT = 0.3;

  function splitLines(el) {
    var text = el.getAttribute('data-rl-text');
    if (text === null) { text = el.textContent.replace(/\s+/g, ' ').trim(); el.setAttribute('data-rl-text', text); }
    if (!text) return [];
    /* probe: one plain inline span per word, real spaces between them */
    el.textContent = '';
    var probes = text.split(' ').map(function (w, i) {
      if (i) el.appendChild(document.createTextNode(' '));
      var s = document.createElement('span');
      s.textContent = w;
      el.appendChild(s);
      return s;
    });
    var rows = [], lastTop = null;
    probes.forEach(function (s) {
      var t = Math.round(s.offsetTop);
      if (lastTop === null || Math.abs(t - lastTop) > 2) { rows.push([]); lastTop = t; }
      rows[rows.length - 1].push(s.textContent);
    });
    el.textContent = '';
    return rows.map(function (ws) {
      var mask = document.createElement('span');
      mask.className = 'rb-rl';
      mask.style.paddingTop = LINE_PAD_TOP + 'em';
      mask.style.paddingBottom = LINE_PAD_BOT + 'em';
      mask.style.marginTop = '-' + LINE_PAD_TOP + 'em';
      mask.style.marginBottom = '-' + LINE_PAD_BOT + 'em';
      var inner = document.createElement('span');
      inner.className = 'rb-rl-i';
      inner.textContent = ws.join(' ');
      mask.appendChild(inner);
      el.appendChild(mask);
      return inner;
    });
  }

  var lineEls = gsap.utils.toArray('.rb-lines').filter(function (el) {
    return !el.querySelector('*');
  });
  var lineTriggers = [];

  function buildLines() {
    lineTriggers.forEach(function (t) { t.kill(); });
    lineTriggers = [];
    lineEls.forEach(function (el) {
      var inners = splitLines(el);
      if (!inners.length) return;
      var tw = gsap.fromTo(inners, { yPercent: 108 }, {
        yPercent: 0, duration: 0.95, ease: 'power3.out', stagger: 0.075,
        scrollTrigger: { trigger: el, start: 'top 88%' }
      });
      if (tw.scrollTrigger) lineTriggers.push(tw.scrollTrigger);
    });
  }
  buildLines();

  /* Re-split on a real width change only. Mobile browsers fire resize on every
     address-bar collapse, and re-splitting mid-scroll would restart reveals the
     visitor already watched. */
  var lastW = window.innerWidth;
  var rsT;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    clearTimeout(rsT);
    rsT = setTimeout(function () { buildLines(); ScrollTrigger.refresh(); }, 180);
  });

  /* blocks that still contain markup keep the old whole-element rise */
  gsap.utils.toArray('.rb-lines').filter(function (el) { return !!el.querySelector('*'); })
    .forEach(function (el) {
      gsap.from(el, {
        y: 34, opacity: 0, duration: 0.85, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });

  /* ---- rise furniture ---- */
  gsap.utils.toArray('.rb-rise').forEach(function (el) {
    gsap.from(el, {
      y: 26, opacity: 0, duration: 0.7, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---- photo reveals: float up, out of focus, and settle ------------------
     Replaces a clip wipe, which dragged a hard edge across the picture. These
     rise from below already blurred and come into focus in place.

     Two things this is careful about:
       - filter:blur() is composited every frame, so will-change is set in CSS
         and CLEARED the moment the tween ends. Leaving will-change on a dozen
         large images permanently costs memory for no benefit.
       - the blur halo would be cropped by an overflow:hidden ancestor, so the
         blur rides on .rb-frame itself rather than the img inside it. */
  gsap.utils.toArray('.rb-frame[data-reveal]').forEach(function (f) {
    var img = f.querySelector('img');
    var tl = gsap.timeline({
      scrollTrigger: { trigger: f, start: 'top 92%' },
      onComplete: function () { f.classList.add('is-settled'); }
    });
    tl.fromTo(f,
      { y: 72, opacity: 0, filter: 'blur(18px)' },
      { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.25, ease: 'power2.out' })
      .fromTo(img, { scale: 1.08 }, { scale: 1.02, duration: 1.5, ease: 'power2.out' }, 0);
  });

  /* ---- band media parallax ---- */
  gsap.utils.toArray('.rb-band-media img').forEach(function (img) {
    gsap.fromTo(img, { yPercent: -6 }, {
      yPercent: 6, ease: 'none',
      scrollTrigger: { trigger: img.closest('.rb-band'), start: 'top bottom', end: 'bottom top', scrub: 0.4 }
    });
  });

  /* ---- THE STAIR: crop climbs while image translates down ---- */
  gsap.utils.toArray('.rb-climb').forEach(function (band) {
    var img = band.querySelector('img');
    gsap.fromTo(img,
      { y: function () { return -(img.offsetHeight - band.offsetHeight); } },
      {
        y: 0, ease: 'none',
        scrollTrigger: {
          trigger: band, start: 'top bottom', end: 'bottom top', scrub: 0.4,
          invalidateOnRefresh: true
        }
      });
  });

  /* ---- THE ROW OF FOUR: lateral pan ---- */
  gsap.utils.toArray('.rb-pan').forEach(function (band) {
    var track = band.querySelector('.rb-pan-track');
    gsap.fromTo(track,
      { x: 0 },
      {
        x: function () { return -(track.scrollWidth - band.offsetWidth); },
        ease: 'none',
        scrollTrigger: {
          trigger: band, start: 'top bottom', end: 'bottom top', scrub: 0.4,
          invalidateOnRefresh: true
        }
      });
  });

  function hardRefresh() { ScrollTrigger.refresh(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(hardRefresh);
  window.addEventListener('load', hardRefresh);
})();

/* ---- guest quote rotators: independently timed, WCAG pause control ---- */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var rotators = [].slice.call(document.querySelectorAll('[data-rotator]'));
  if (!rotators.length) return;

  var HOLD = 5600, STAGGER = 1800;
  var paused = reduce;

  var units = rotators.map(function (root, idx) {
    var slides = [].slice.call(root.querySelectorAll('.rb-slide'));
    var dotWrap = root.querySelector('.rb-dots');
    var i = 0, timer = null, hovered = false;

    var dots = slides.map(function (_, n) {
      var b = document.createElement('button');
      b.className = 'rb-dot' + (n === 0 ? ' is-on' : '');
      b.type = 'button';
      b.setAttribute('aria-label', 'Show review ' + (n + 1) + ' of ' + slides.length);
      b.addEventListener('click', function () { show(n); restart(); });
      dotWrap.appendChild(b);
      return b;
    });

    function show(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === i); });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-on', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
    }
    function tick() { if (!paused && !hovered) show(i + 1); }
    function restart() {
      clearInterval(timer);
      if (slides.length < 2) return;
      timer = setInterval(tick, HOLD);
    }
    function start() {
      if (slides.length < 2 || reduce) return;
      setTimeout(restart, idx * STAGGER);
    }

    root.addEventListener('mouseenter', function () { hovered = true; });
    root.addEventListener('mouseleave', function () { hovered = false; });
    root.addEventListener('focusin', function () { hovered = true; });
    root.addEventListener('focusout', function () { hovered = false; });

    show(0); start();
    return { restart: restart, stop: function () { clearInterval(timer); } };
  });

  var toggle = document.querySelector('[data-rotator-pause]');
  if (toggle) {
    if (reduce) { toggle.hidden = true; }
    toggle.setAttribute('aria-pressed', 'false');
    toggle.addEventListener('click', function () {
      paused = !paused;
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.querySelector('[data-pause-label]').textContent = paused ? 'Play reviews' : 'Pause reviews';
      units.forEach(function (u) { paused ? u.stop() : u.restart(); });
    });
  }
})();

/* ---- mobile preview sheet (≤840px): tap a door to sample it ---- */
(function () {
  var sheet = document.querySelector('.rb-sheet');
  var scrim = document.querySelector('.rb-sheet-scrim');
  var doors = [].slice.call(document.querySelectorAll('.rb-door'));
  if (!sheet || !scrim || !doors.length) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wrap = document.querySelector('.rb-doors');
  var lastFocus = null, open = false, lockY = 0;

  var els = {
    loc: sheet.querySelector('.rb-sheet-loc'),
    name: sheet.querySelector('.rb-sheet-name'),
    lede: sheet.querySelector('.rb-sheet-lede'),
    shots: sheet.querySelector('.rb-sheet-shots'),
    facts: sheet.querySelector('.rb-sheet-facts'),
    go: sheet.querySelector('.rb-sheet-go'),
    close: sheet.querySelector('.rb-sheet-close')
  };

  function fill(door) {
    var data = door.querySelector('.rb-door-prev');
    if (!data) return false;
    els.loc.textContent  = door.querySelector('.rb-door-loc').textContent;
    els.name.textContent = door.querySelector('.rb-door-name').textContent;
    els.lede.textContent = data.getAttribute('data-lede') || '';

    els.shots.innerHTML = '';
    (data.getAttribute('data-shots') || '').split('|').filter(Boolean).forEach(function (src) {
      var img = document.createElement('img');
      img.src = src; img.alt = ''; img.loading = 'lazy';
      els.shots.appendChild(img);
    });

    els.facts.innerHTML = '';
    try {
      JSON.parse(data.getAttribute('data-facts') || '[]').forEach(function (f) {
        var row = document.createElement('div');
        var dt = document.createElement('dt'); dt.textContent = f[0];
        var dd = document.createElement('dd'); dd.textContent = f[1];
        row.appendChild(dt); row.appendChild(dd); els.facts.appendChild(row);
      });
    } catch (e) {}

    var dest = door.querySelector('.rb-door-link');
    els.go.setAttribute('href', dest ? dest.getAttribute('href') : '#');
    els.go.firstChild.textContent = (data.getAttribute('data-cta') || 'Open') + ' ';
    return true;
  }

  /* fixed-body scroll lock: sticky-safe (the awning survives) */
  function lock() {
    lockY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = -lockY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
  }
  function unlock() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, lockY);
  }

  function openSheet(door) {
    if (!fill(door)) return;
    lastFocus = door.querySelector('.rb-door-peek') || door;
    sheet.hidden = false; scrim.hidden = false;
    wrap.classList.add('is-picking');
    doors.forEach(function (d) { d.classList.toggle('is-picked', d === door); });
    requestAnimationFrame(function () {
      sheet.classList.add('is-on'); scrim.classList.add('is-on');
    });
    open = true;
    els.close.focus({ preventScroll: true });
    lock();
  }

  function closeSheet() {
    if (!open) return;
    open = false;
    sheet.classList.remove('is-on'); scrim.classList.remove('is-on');
    wrap.classList.remove('is-picking');
    doors.forEach(function (d) { d.classList.remove('is-picked'); });
    unlock();
    var done = function () { sheet.hidden = true; scrim.hidden = true; };
    reduce.matches ? done() : setTimeout(done, 340);
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }

  doors.forEach(function (door) {
    var btn = door.querySelector('.rb-door-peek');
    if (!btn) return;
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openSheet(door);
    });
  });

  els.close.addEventListener('click', closeSheet);
  scrim.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  var y0 = null;
  sheet.addEventListener('touchstart', function (e) {
    if (sheet.scrollTop <= 0) y0 = e.touches[0].clientY;
  }, { passive: true });
  sheet.addEventListener('touchmove', function (e) {
    if (y0 === null) return;
    var dy = e.touches[0].clientY - y0;
    if (dy > 0) sheet.style.transform = 'translateY(' + dy + 'px)';
  }, { passive: true });
  sheet.addEventListener('touchend', function () {
    if (y0 === null) return;
    var moved = parseFloat((sheet.style.transform.match(/translateY\(([-\d.]+)px\)/) || [0, 0])[1]);
    sheet.style.transform = '';
    if (moved > 90) closeSheet();
    y0 = null;
  });
})();
