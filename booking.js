/**
 * Riverbank — THE STAY PICKER.
 *
 * Ported from the shipped, device-audited implementation at
 * 02-clients/aurora-hills/src/components/StayPicker.tsx. Behaviour transplanted,
 * styling is Riverbank's own. Two <input type="date"> fields were doing this job
 * before, which is the moment a page asking for 60.000 kr a night stops selling:
 * every OTA the guest is comparing against puts a calendar here.
 *
 * WHAT A STAY PICKER NEEDS THAT A DATE FIELD DOES NOT
 *
 *  1. A three-rule click state machine, so a third click restarts and there is
 *     no "clear" button to explain.
 *  2. The past blocked, taken nights struck, and a range CROSSING a taken night
 *     refused with the reason said out loud rather than as a dead click.
 *  3. A minimum stay enforced at selection, naming the earliest legal checkout.
 *  4. A taken date is still a legal CHECKOUT. You leave that morning and the
 *     next guest arrives that afternoon, so the crossing test runs over
 *     [start, end-1] and never [start, end]. This is the single easiest thing
 *     to get backwards, and getting it wrong refuses perfectly bookable stays.
 *  5. A hover preview, so the guest is not guessing how long a stay they are
 *     drawing between the first click and the second.
 *
 * The chosen dates must leave with the guest: they are written into the two
 * hidden inputs the form already posts, and into the read-back line. Nothing
 * here is a dead control.
 */
(function () {
  var root = document.querySelector('[data-stay]');
  if (!root) return;

  var WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var MO = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DAY = 86400000;
  var MIN_STAY = 2;

  var sod = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  var add = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };
  var addMo = function (d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); };
  var nights = function (a, b) { return Math.round((b - a) / DAY); };
  var key = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  var same = function (a, b) { return !!a && !!b && key(a) === key(b); };
  var fmtLong = function (d) { return d.getDate() + ' ' + MO[d.getMonth()] + ' ' + d.getFullYear(); };

  /* Measured on the live Booking.com listing on 31 August 2026, not invented.
     It is a snapshot and it is labelled as one in the panel: the moment his
     Airbnb and Booking calendars are connected this array is replaced by the
     real feed, which is the thing being sold. Keeping it small and true is the
     point; a calendar peppered with fake bookings would be a lie about how busy
     the house is. */
  var TAKEN = {
    'all': ['2026-09-04', '2026-10-14'],
    'Apartment (160 m2, four bedrooms)': ['2027-07-17'],
  };

  var el = function (s) { return root.querySelector(s); };
  var grids = el('[data-grids]');
  var noteEl = el('[data-note]');
  var readEl = el('[data-read]');
  var monthEl = el('[data-month]');
  var inCheck = document.getElementById('checkin');
  var outCheck = document.getElementById('checkout');
  var unitSel = document.getElementById('unit');

  var today = sod(new Date());
  /* Opening on a month with a week left shows a grid that is almost entirely
     greyed-out past, which reads as a fully booked house rather than a month
     that has simply run out. */
  var daysLeft = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
  var month = new Date(today.getFullYear(), today.getMonth() + (daysLeft < 7 ? 1 : 0), 1);
  var start = null, end = null, hover = null;

  function takenFor(d) {
    var k = key(d);
    if (TAKEN.all.indexOf(k) > -1) return true;
    var u = unitSel && unitSel.value;
    return !!(u && TAKEN[u] && TAKEN[u].indexOf(k) > -1);
  }

  /* [start, end-1]: see rule 4 in the header. */
  function crosses(a, b) {
    for (var d = a; d < b; d = add(d, 1)) if (takenFor(d)) return true;
    return false;
  }

  function say(t) { noteEl.textContent = t || ''; noteEl.hidden = !t; }

  function pick(day) {
    if (day < today) return;
    if (takenFor(day) && (!start || end)) {
      say(fmtLong(day) + ' is already taken. The nights in grey are booked.');
      return;
    }
    if (!start || (start && end)) { start = day; end = null; say(''); return render(); }
    if (day <= start) { start = day; end = null; say(''); return render(); }
    /* A crossing click RESTARTS at that day rather than only refusing. Refusing
       alone is a dead end: with a start sitting before a booked night, every
       later checkout crosses it, so the guest gets the same error forever and
       the only escape is to guess that clicking an earlier date starts over.
       "Or start later" has to actually be reachable by clicking later. */
    if (crosses(start, day)) {
      start = day; end = null;
      say('A booked night sits between those dates, so this is a new arrival on ' + fmtLong(day) + '. Pick the morning you leave.');
      return render();
    }
    if (nights(start, day) < MIN_STAY) {
      say('The minimum stay is ' + MIN_STAY + ' nights, so the earliest checkout is ' + fmtLong(add(start, MIN_STAY)) + '.');
      return render();
    }
    end = day; say(''); render();
  }

  function monthGrid(m) {
    var first = new Date(m.getFullYear(), m.getMonth(), 1);
    var lead = (first.getDay() + 6) % 7;
    var cells = [];
    /* always six rows: a grid that changes height between months makes the
       whole panel jump when you page, which reads as a bug */
    for (var i = 0; i < 42; i++) {
      var d = add(first, i - lead);
      cells.push({ d: d, inMonth: d.getMonth() === m.getMonth() });
    }
    return cells;
  }

  function render() {
    monthEl.textContent = MO[month.getMonth()] + ' ' + month.getFullYear() +
      '  ·  ' + MO[addMo(month, 1).getMonth()] + ' ' + addMo(month, 1).getFullYear();
    grids.innerHTML = '';
    [month, addMo(month, 1)].forEach(function (m, mi) {
      var wrap = document.createElement('div');
      wrap.className = 'rb-stay-m' + (mi ? ' rb-stay-m2' : '');
      var cap = document.createElement('p');
      cap.className = 'rb-stay-cap';
      cap.textContent = MO[m.getMonth()] + ' ' + m.getFullYear();
      wrap.appendChild(cap);
      var wd = document.createElement('div');
      wd.className = 'rb-stay-wd'; wd.setAttribute('aria-hidden', 'true');
      WD.forEach(function (w) { var s = document.createElement('span'); s.textContent = w; wd.appendChild(s); });
      wrap.appendChild(wd);
      var g = document.createElement('div');
      g.className = 'rb-stay-g';
      monthGrid(m).forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rb-stay-d';
        b.textContent = c.d.getDate();
        if (!c.inMonth) b.classList.add('is-out');
        var past = c.d < today;
        var taken = takenFor(c.d);
        if (past) { b.classList.add('is-past'); b.disabled = true; }
        if (taken) b.classList.add('is-taken');
        if (same(c.d, start)) b.classList.add('is-start');
        if (same(c.d, end)) b.classList.add('is-end');
        var to = end || (start && !end && hover && hover > start ? hover : null);
        if (start && to && c.d > start && c.d < to) b.classList.add('is-in');
        b.setAttribute('aria-label', fmtLong(c.d) + (taken ? ', booked' : ''));
        if (same(c.d, start) || same(c.d, end)) b.setAttribute('aria-pressed', 'true');
        b.addEventListener('click', function () { pick(c.d); });
        b.addEventListener('mouseenter', function () {
          if (start && !end) { hover = c.d; render(); }
        });
        g.appendChild(b);
      });
      wrap.appendChild(g);
      grids.appendChild(wrap);
    });

    var n = start && end ? nights(start, end) : 0;
    if (start && end) {
      readEl.innerHTML = '<strong>' + fmtLong(start) + '</strong> to <strong>' + fmtLong(end) + '</strong>' +
        '<span>' + n + (n === 1 ? ' night' : ' nights') + '</span>';
      inCheck.value = key(start); outCheck.value = key(end);
    } else if (start) {
      readEl.innerHTML = '<strong>' + fmtLong(start) + '</strong><span>Now pick the morning you leave</span>';
      inCheck.value = key(start); outCheck.value = '';
    } else {
      readEl.innerHTML = '<span>Pick the night you arrive, then the morning you leave. Minimum ' + MIN_STAY + ' nights.</span>';
      inCheck.value = ''; outCheck.value = '';
    }
    el('[data-prev]').disabled = !(month > new Date(today.getFullYear(), today.getMonth(), 1));
  }

  el('[data-prev]').addEventListener('click', function () { month = addMo(month, -1); render(); });
  el('[data-next]').addEventListener('click', function () { month = addMo(month, 1); render(); });
  grids.addEventListener('mouseleave', function () { if (hover) { hover = null; render(); } });
  /* Changing apartment changes what is free, so a range picked against the old
     calendar must not silently survive into the new one. */
  if (unitSel) unitSel.addEventListener('change', function () { start = null; end = null; say(''); render(); });

  render();
})();
