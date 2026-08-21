/* Riverbank — owner view. Renders the request list from the shared demo store
   and re-renders on any change from this tab or the guest tab. */
(function () {
  var store = window.riverbankStore;
  if (!store) return;

  var list  = document.getElementById('rb-reqs');
  var empty = document.getElementById('rb-empty');
  var tally = document.getElementById('rb-tally');

  var dateFmt = new Intl.DateTimeFormat(navigator.language || 'en-GB',
    { day: 'numeric', month: 'short' });
  var timeFmt = new Intl.DateTimeFormat(navigator.language || 'en-GB',
    { hour: '2-digit', minute: '2-digit' });

  var LABEL = { REQUESTED: 'Waiting on you', CONFIRMED: 'Confirmed', DECLINED: 'Declined' };

  /* render() rebuilds the list, so without this every card would replay its
     entrance every time any row changed. Only rows this screen has never shown
     animate in; confirming a request must not re-animate the whole list. */
  var seen = new Set();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, txt) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }

  function card(r) {
    var wrap = el('article', 'rb-req is-' + r.status.toLowerCase());

    var head = el('div', 'rb-req-head');
    var who = el('div');
    who.appendChild(el('h3', 'rb-req-name', r.name));
    who.appendChild(el('p', 'rb-req-unit', r.unit));
    head.appendChild(who);
    head.appendChild(el('span', 'rb-req-state', LABEL[r.status] || r.status));
    wrap.appendChild(head);

    var facts = el('dl', 'rb-req-facts');
    [
      ['Nights', dateFmt.format(new Date(r.checkin)) + ' to ' + dateFmt.format(new Date(r.checkout)) +
                 ' · ' + r.nights + (r.nights === 1 ? ' night' : ' nights')],
      ['Guests', String(r.guests)],
      ['Email', r.email],
      ['Phone', r.phone || 'not given'],
      ['Asked', timeFmt.format(new Date(r.createdAt))]
    ].forEach(function (f) {
      var row = el('div');
      row.appendChild(el('dt', null, f[0]));
      row.appendChild(el('dd', null, f[1]));
      facts.appendChild(row);
    });
    wrap.appendChild(facts);

    if (r.note) {
      var note = el('p', 'rb-req-note', '“' + r.note + '”');
      wrap.appendChild(note);
    }

    if (r.status === 'REQUESTED') {
      var row = el('div', 'rb-req-actions');
      var yes = el('button', 'rb-btn rb-btn-solid rb-req-yes', 'Confirm');
      yes.type = 'button';
      yes.addEventListener('click', function () { store.setStatus(r.id, 'CONFIRMED'); render(); });
      var no = el('button', 'rb-btn rb-btn-line rb-req-no', 'Decline');
      no.type = 'button';
      no.addEventListener('click', function () { store.setStatus(r.id, 'DECLINED'); render(); });
      row.appendChild(yes); row.appendChild(no);
      wrap.appendChild(row);
    } else {
      var done = el('p', 'rb-req-done',
        r.status === 'CONFIRMED'
          ? 'Confirmed. In a live version this is the moment the guest gets the agreed price in writing.'
          : 'Declined. The guest is told, and the dates stay open.');
      wrap.appendChild(done);
    }

    var ref = el('p', 'rb-req-ref', r.id);
    wrap.appendChild(ref);
    if (!seen.has(r.id) && !reduce) wrap.classList.add('is-new');
    seen.add(r.id);
    return wrap;
  }

  function render() {
    var rows = store.all().slice().sort(function (a, b) { return b.createdAt - a.createdAt; });
    list.innerHTML = '';
    empty.hidden = rows.length > 0;

    var waiting = rows.filter(function (r) { return r.status === 'REQUESTED'; }).length;
    var confirmed = rows.filter(function (r) { return r.status === 'CONFIRMED'; }).length;
    var nights = rows.filter(function (r) { return r.status === 'CONFIRMED'; })
                     .reduce(function (n, r) { return n + r.nights; }, 0);
    /* Build the three slots once, then only write the numbers. Rebuilding the
       innerHTML of an aria-live region makes a screen reader re-announce all of
       it on every change, and it throws away the DOM the numbers live in. */
    var slots = [[waiting, 'waiting on you'], [confirmed, 'confirmed'],
                 [nights, nights === 1 ? 'night direct' : 'nights direct']];
    if (!tally.children.length) {
      slots.forEach(function () {
        var b = el('div', 'rb-tally-item');
        b.appendChild(el('strong')); b.appendChild(el('span'));
        tally.appendChild(b);
      });
    }
    slots.forEach(function (t, i) {
      var b = tally.children[i];
      if (b.firstChild.textContent !== String(t[0])) b.firstChild.textContent = String(t[0]);
      if (b.lastChild.textContent !== t[1]) b.lastChild.textContent = t[1];
    });

    rows.forEach(function (r, i) {
      var c = card(r);
      /* stagger only the new arrivals, 60ms apart, within the 30-80ms window */
      if (c.classList.contains('is-new')) c.style.animationDelay = (i * 0.06) + 's';
      list.appendChild(c);
    });
  }

  /* Both channels fire for one change (BroadcastChannel in other tabs, the
     storage event in other tabs), so an un-coalesced subscribe rebuilds the
     list twice per request. The second pass had already marked the row seen,
     which silently killed the arrival animation. Collapse them into one. */
  var pending = false;
  function scheduleRender() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; render(); }, 0);
  }
  store.subscribe(scheduleRender);
  render();

  document.getElementById('rb-reset').addEventListener('click', function () {
    store.reset(); render();
  });

  /* ---- the maths: pure arithmetic on the owner's own inputs ---- */
  var rate  = document.getElementById('rate');
  var nightsIn = document.getElementById('nights');
  var pct   = document.getElementById('pct');
  var shift = document.getElementById('shift');
  var kr = new Intl.NumberFormat('is-IS', { maximumFractionDigits: 0 });

  function calc() {
    var r = Math.max(0, Number(rate.value) || 0);
    var n = Math.max(0, Number(nightsIn.value) || 0);
    var p = Math.max(0, Number(pct.value) || 0) / 100;
    var s = Math.max(0, Number(shift.value) || 0) / 100;
    var month = r * n * p;
    document.getElementById('out-month').textContent = kr.format(Math.round(month)) + ' kr';
    document.getElementById('out-year').textContent  = kr.format(Math.round(month * 12)) + ' kr';
    document.getElementById('out-keep').textContent  = kr.format(Math.round(month * 12 * s)) + ' kr';
    document.getElementById('shift-out').textContent = shift.value;
    document.getElementById('shift-echo').textContent = shift.value;
  }
  [rate, nightsIn, pct, shift].forEach(function (i) { i.addEventListener('input', calc); });
  calc();
})();
