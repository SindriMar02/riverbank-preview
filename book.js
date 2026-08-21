/* Riverbank — guest request form. Request-to-book only: no card, no account.
   What the guest gets back is a RECEIPT of the request, never a confirmation:
   a small business cannot confirm by email what it has not yet costed and
   scheduled. (See memory: order-receipt-vs-confirmation.) */
(function () {
  var form = document.getElementById('rb-form');
  if (!form || !window.riverbankStore) return;

  var receipt = document.getElementById('rb-receipt');
  var errBox  = document.getElementById('rb-error');
  var submit  = document.getElementById('rb-submit');
  var checkin = document.getElementById('checkin');
  var checkout= document.getElementById('checkout');
  var nightsNote = document.getElementById('nights-note');

  /* dates cannot be in the past; leaving cannot precede arriving */
  var today = new Date(); today.setHours(0,0,0,0);
  var iso = function (d) { return d.toISOString().slice(0,10); };
  checkin.min = iso(today);
  checkout.min = iso(new Date(today.getTime() + 86400000));

  function nights() {
    if (!checkin.value || !checkout.value) return 0;
    var a = new Date(checkin.value), b = new Date(checkout.value);
    return Math.round((b - a) / 86400000);
  }
  function syncNights() {
    if (checkin.value) {
      var min = new Date(checkin.value); min.setDate(min.getDate() + 1);
      checkout.min = iso(min);
      if (checkout.value && new Date(checkout.value) <= new Date(checkin.value)) checkout.value = iso(min);
    }
    var n = nights();
    nightsNote.textContent = n > 0 ? (n === 1 ? '1 night' : n + ' nights') : '';
  }
  checkin.addEventListener('change', syncNights);
  checkout.addEventListener('change', syncNights);

  function fail(msg, el) {
    errBox.textContent = msg;
    errBox.hidden = false;
    if (el) { el.focus(); }             /* focus the first error */
    return false;
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    errBox.hidden = true;

    var unit = form.unit.value;
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    if (!name) return fail('Please add your name so the host knows who is asking.', form.name);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('That email address does not look complete. The host needs it to reply.', form.email);
    if (!checkin.value) return fail('Please choose the night you arrive.', checkin);
    if (!checkout.value) return fail('Please choose the day you leave.', checkout);
    if (nights() < 1) return fail('The leaving date needs to be after the arriving date.', checkout);

    submit.disabled = true;
    submit.firstChild.textContent = 'Sending… ';

    var req = {
      id: 'RB-' + Date.now().toString(36).toUpperCase().slice(-6),
      status: 'REQUESTED',
      createdAt: Date.now(),
      unit: unit,
      checkin: checkin.value,
      checkout: checkout.value,
      nights: nights(),
      guests: Number(form.guests.value) || 1,
      name: name,
      email: email,
      phone: form.phone.value.trim(),
      note: form.note.value.trim()
    };
    window.riverbankStore.add(req);

    /* the receipt */
    document.getElementById('rc-name').textContent = name.split(' ')[0];
    document.getElementById('rc-ref').textContent = req.id;
    var fmt = new Intl.DateTimeFormat(navigator.language || 'en-GB',
      { day: 'numeric', month: 'long', year: 'numeric' });
    var facts = [
      ['Apartment', req.unit],
      ['Arriving', fmt.format(new Date(req.checkin))],
      ['Leaving', fmt.format(new Date(req.checkout))],
      ['Nights', String(req.nights)],
      ['Guests', String(req.guests)]
    ];
    var dl = document.getElementById('rc-facts');
    dl.innerHTML = '';
    facts.forEach(function (f) {
      var row = document.createElement('div');
      var dt = document.createElement('dt'); dt.textContent = f[0];
      var dd = document.createElement('dd'); dd.textContent = f[1];
      row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
    });

    form.hidden = true;
    receipt.hidden = false;
    receipt.setAttribute('tabindex', '-1');
    /* This is the one moment on the page the guest is watching, and it happens
       once. A hard swap reads as a page break; a short entrance reads as an
       answer. Flush the start state with a forced reflow rather than waiting a
       frame: rAF is throttled in a backgrounded tab, which would leave the
       receipt invisible instead of merely un-animated. */
    void receipt.offsetWidth;
    receipt.classList.add('is-in');
    receipt.focus({ preventScroll: false });
  });

  document.getElementById('rb-again').addEventListener('click', function () {
    form.reset();
    syncNights();
    submit.disabled = false;
    submit.firstChild.textContent = 'Send the request ';
    receipt.classList.remove('is-in');
    receipt.hidden = true;
    form.hidden = false;
    form.querySelector('select').focus();
  });
})();
