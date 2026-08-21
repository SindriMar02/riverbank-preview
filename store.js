/**
 * THE TWO-SIDED DEMO STORE — Riverbank edition.
 *
 * One request, two screens: the guest asks for a night on the site, and it
 * appears in the owner's dashboard as a pending request. That single loop
 * explains the product better than any paragraph, so it has to actually work.
 *
 * Same origin, so localStorage is the store and BroadcastChannel pushes changes
 * between open tabs, with the storage event as fallback. No server, no auth,
 * works offline. One browser only, which is the right trade for a demo one
 * person drives. Do NOT reach for a real Worker/KV to show someone a screen.
 * (Lineage: iceland-redesigns/src/preview/mirrorhouse/demoStore.ts.)
 */
(function (global) {
  var KEY = 'riverbank_demo_requests_v1';
  var CHANNEL = 'riverbank_demo';

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      /* one corrupt row must not blind the dashboard to the rest */
      return Array.isArray(parsed) ? parsed.filter(function (b) { return b && typeof b.id === 'string'; }) : [];
    } catch (e) { return []; }
  }

  function write(rows) {
    try { localStorage.setItem(KEY, JSON.stringify(rows)); }
    catch (e) { /* private mode: the demo still works in-memory for this tab */ }
    try { new BroadcastChannel(CHANNEL).postMessage({ t: Date.now() }); }
    catch (e) { /* no BroadcastChannel: the storage event still fires cross-tab */ }
  }

  global.riverbankStore = {
    all: read,

    add: function (b) {
      var rows = read();
      rows.push(b);
      write(rows);
      return rows;
    },

    setStatus: function (id, status) {
      var rows = read().map(function (b) {
        return b.id === id ? Object.assign({}, b, { status: status, decidedAt: Date.now() }) : b;
      });
      write(rows);
      return rows;
    },

    reset: function () { write([]); return []; },

    /**
     * Fires on any change, from this tab or another one. Returns unsubscribe.
     * Both channels are wired because BroadcastChannel does not fire in the tab
     * that posted, and the storage event does not fire in the tab that wrote.
     */
    subscribe: function (fn) {
      var bc = null;
      try { bc = new BroadcastChannel(CHANNEL); bc.onmessage = function () { fn(); }; }
      catch (e) { bc = null; }
      function onStorage(e) { if (e.key === KEY) fn(); }
      window.addEventListener('storage', onStorage);
      return function () {
        if (bc) bc.close();
        window.removeEventListener('storage', onStorage);
      };
    }
  };
})(window);
