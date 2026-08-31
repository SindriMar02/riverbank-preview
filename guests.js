/**
 * The review archive's filter.
 *
 * HARD RULE OF THIS FILE: every review is already in the HTML the server sent.
 * This script only HIDES. It never fetches, never injects and never paginates,
 * because the whole point of the page is that a crawler or a language model
 * reading the raw document gets every one of them without running any of this.
 * If this file fails to load, the page degrades to "every review, shown" —
 * which is the correct failure.
 */
(() => {
  const grid = document.querySelector('[data-reviews]')
  if (!grid) return
  const cards = [...grid.querySelectorAll('.rb-gr')]
  const btns = [...document.querySelectorAll('.rb-gf-btn')]
  const live = document.querySelector('[data-count-live]')

  /* A whole sentence per filter, not a noun glued onto a stem. The stem version
   * produced "Showing 177 reviews all." on the default filter, which is the one
   * a screen-reader user hears first. */
  const phrase = {
    all: (n) => `Showing all ${n} reviews.`,
    apartment: (n) => `Showing ${n} review${n === 1 ? '' : 's'} from the Apartment.`,
    'one-bedroom': (n) => `Showing ${n} review${n === 1 ? '' : 's'} from the One-Bedrooms.`,
    neg: (n) => `Showing ${n} review${n === 1 ? '' : 's'} that left a note as well as praise.`,
  }

  const apply = (f) => {
    let n = 0
    for (const c of cards) {
      const show = f === 'all' ? true : f === 'neg' ? c.hasAttribute('data-hasneg') : c.dataset.world === f
      c.hidden = !show
      if (show) n++
    }
    btns.forEach((b) => {
      const on = b.dataset.filter === f
      b.classList.toggle('is-on', on)
      b.setAttribute('aria-pressed', String(on))
    })
    /* Announced, not just recoloured: the only feedback a screen-reader user
     * gets that the list under them changed. */
    if (live) live.textContent = (phrase[f] || phrase.all)(n)
  }

  btns.forEach((b) => {
    b.setAttribute('aria-pressed', String(b.classList.contains('is-on')))
    b.addEventListener('click', () => apply(b.dataset.filter))
  })
})()
