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

  /* ---- diptych entrance ---- */
  var doors = gsap.utils.toArray('.rb-door');
  if (doors.length) {
    gsap.from(doors.map(function (d) { return d.querySelector('.rb-door-media'); }), {
      clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'power3.out', stagger: 0.09
    });
    gsap.from('.rb-door-inner > :not(.rb-door-peek)', {
      y: 26, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06, delay: 0.5
    });
    /* the button keeps its own transform for :active, so fade it only */
    gsap.from('.rb-door-peek', { opacity: 0, duration: 0.7, ease: 'power2.out', delay: 0.9 });
    gsap.from('.rb-hero-mark h1, .rb-hero-mark p', {
      opacity: 0, y: 18, duration: 1.1, ease: 'power3.out', stagger: 0.08, delay: 0.35
    });
  }
  var propHero = document.querySelector('.rb-prop-hero');
  if (propHero) {
    gsap.from('.rb-prop-hero-media img', { scale: 1.12, duration: 1.6, ease: 'power2.out' });
    gsap.from('.rb-prop-hero-inner > *', {
      y: 30, opacity: 0, duration: 1.0, ease: 'power3.out', stagger: 0.1, delay: 0.25
    });
  }

  /* ---- masked line heads ---- */
  gsap.utils.toArray('.rb-lines').forEach(function (el) {
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

  /* ---- photo clip reveals ---- */
  gsap.utils.toArray('.rb-frame[data-reveal]').forEach(function (f) {
    var img = f.querySelector('img');
    var tl = gsap.timeline({ scrollTrigger: { trigger: f, start: 'top 85%' } });
    tl.fromTo(f, { '--clip': '100%' }, { '--clip': '0%', duration: 1.25, ease: 'power2.out' })
      .fromTo(img, { scale: 1.12 }, { scale: 1.04, duration: 1.4, ease: 'power2.out' }, 0);
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
