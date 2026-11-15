/* ==================================================================
   Section Stack — sections pin in place while the next one slides over

   Each section sticks to the viewport once you reach it and the next
   section scrolls up and over it, like a deck of cards. The covered
   section recedes (scales down slightly) and dims as it goes under, and
   every incoming section has a rounded top edge. Scrolling back up
   reverses it exactly — it is driven by scroll position.

   Sections taller than the screen stay fully readable: they scroll until
   their bottom edge reaches the bottom of the screen, then pin.

   Tuning: edit SETTINGS below.
   Opt a section out of pinning:  <section data-no-stack> ...
   Turn it off site-wide:  set window.SECTION_STACK = false before this script.
   Skipped automatically for visitors who prefer reduced motion.
   ================================================================== */
(function () {
  'use strict';

  var SETTINGS = {
    scale: 0.94,         // how small a fully covered section gets (desktop)
    scaleSmall: 0.97,    // gentler on phones
    shade: 0.5,          // 0-1 darkness of a fully covered section
    radius: 24,          // px, rounded top edge of incoming sections (desktop)
    radiusSmall: 16,
    smallScreen: 640     // px width treated as "phone"
  };

  if (window.SECTION_STACK === false) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var nodes = [].slice.call(document.querySelectorAll('section'));
  if (nodes.length < 2) return;

  var footer = document.querySelector('footer');
  var root = document.documentElement;

  var secs = nodes.map(function (el, i) {
    el.classList.add('stack-section');
    if (i > 0) el.classList.add('stack-round');
    el.style.setProperty('--stack-z', String(i + 1));

    // Make sure a section can never be see-through to the one pinned behind it
    var cs = window.getComputedStyle(el);
    if (cs.backgroundImage === 'none' && /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) {
      el.style.backgroundColor = 'var(--surface)';
    }

    var shade = document.createElement('div');
    shade.className = 'stack-shade';
    shade.setAttribute('aria-hidden', 'true');
    el.appendChild(shade);

    var anchor = document.createElement('div');
    anchor.className = 'stack-anchor';
    anchor.setAttribute('aria-hidden', 'true');
    el.parentNode.insertBefore(anchor, el);

    return { el: el, shade: shade, anchor: anchor, pinned: !el.hasAttribute('data-no-stack'), covered: false };
  });

  if (footer) {
    footer.classList.add('stack-footer');
    footer.style.setProperty('--stack-z', String(nodes.length + 1));
  }
  root.classList.add('stack-ready');

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(p) { return p * p * (3 - 2 * p); }

  /* Layout position (unaffected by our own transforms). */
  function layoutTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  /* Pin offset: tall sections pin when their BOTTOM reaches the screen bottom. */
  function setPins() {
    var H = window.innerHeight;
    var small = window.innerWidth <= SETTINGS.smallScreen;
    root.style.setProperty('--stack-radius', (small ? SETTINGS.radiusSmall : SETTINGS.radius) + 'px');
    secs.forEach(function (s, i) {
      if (!s.pinned || i === secs.length - 1) {
        s.el.style.position = i === secs.length - 1 || !s.pinned ? 'relative' : '';
        return;
      }
      s.el.style.position = '';
      s.el.style.top = Math.min(0, H - s.el.offsetHeight) + 'px';
    });
  }

  function resetCover(s) {
    if (!s.covered) return;
    s.covered = false;
    s.el.style.transform = '';
    s.el.classList.remove('is-covered');
    s.shade.style.opacity = '0';
  }

  var queued = false;
  function update() {
    queued = false;
    var H = window.innerHeight;
    var scrollY = window.pageYOffset;
    var scale = window.innerWidth <= SETTINGS.smallScreen ? SETTINGS.scaleSmall : SETTINGS.scale;

    for (var i = 0; i < secs.length - 1; i++) {
      var s = secs[i], next = secs[i + 1];
      var top = layoutTop(s.el) - scrollY;
      var bottom = top + s.el.offsetHeight;
      var visTop = Math.max(0, top);
      var visBottom = Math.min(H, bottom);
      if (visBottom - visTop <= 1) { resetCover(s); continue; }

      var nextTop = layoutTop(next.el) - scrollY;
      var p = clamp((visBottom - nextTop) / (visBottom - visTop));
      if (p <= 0) { resetCover(s); continue; }

      var e = smooth(p);
      s.covered = true;
      s.el.classList.add('is-covered');
      s.el.style.transformOrigin = '50% ' + ((visTop + visBottom) / 2 - top).toFixed(1) + 'px';
      s.el.style.transform = 'scale(' + (1 - (1 - scale) * e).toFixed(4) + ')';
      s.shade.style.opacity = (SETTINGS.shade * e).toFixed(3);
    }
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }
  function relayout() { setPins(); onScroll(); }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', relayout);
  window.addEventListener('load', relayout);
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(relayout);
    secs.forEach(function (s) { ro.observe(s.el); });
  }

  /* Anchor links: a pinned section sits at the top already, so the browser's
     own jump can do nothing. Scroll to each section's natural position. */
  function targetFor(id) {
    for (var i = 0; i < secs.length; i++) if (secs[i].el.id === id) return secs[i];
    return null;
  }
  function goTo(s, smoothScroll) {
    var y = s.anchor.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: y, behavior: smoothScroll ? 'smooth' : 'auto' });
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var s = targetFor(id);
    if (!s) return;
    e.preventDefault();
    goTo(s, true);
    if (window.history && history.pushState) history.pushState(null, '', '#' + id);
  });
  window.addEventListener('load', function () {
    var s = targetFor(decodeURIComponent(location.hash.slice(1)));
    if (s) goTo(s, false);
  });

  setPins();
  update();
})();
