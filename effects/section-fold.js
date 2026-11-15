/* ==================================================================
   Section Fold — scroll-driven paper-fold effect between sections

   Scrolling down: the section leaving the top hinges back on its bottom
   edge and dims; the next section unfolds from its top edge as it arrives.
   Scrolling up plays the same motion in reverse (it is driven by scroll
   position, not by direction), so it always feels continuous.

   Tuning: edit the SETTINGS below.
   Opt a section out:  <section data-no-fold> ...
   Turn it off site-wide:  set window.SECTION_FOLD = false before this script.
   Skipped automatically for visitors who prefer reduced motion.
   ================================================================== */
(function () {
  'use strict';

  var SETTINGS = {
    maxAngle: 16,        // degrees of fold at the extreme (desktop)
    maxAngleSmall: 9,    // gentler on phones
    smallScreen: 640,    // px width treated as "phone"
    perspective: 1600,   // px; lower = more dramatic depth
    shade: 0.38,         // 0-1 darkness reached when fully folded
    enterEnd: 0.35,      // section is flat once its top reaches this fraction of the viewport height
    exitStart: 0.65      // section starts folding once its bottom rises above this fraction
  };

  if (window.SECTION_FOLD === false) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var els = [].slice.call(document.querySelectorAll('section')).filter(function (s) {
    return !s.hasAttribute('data-no-fold');
  });
  if (els.length < 2) return;

  var secs = els.map(function (el) {
    el.classList.add('fold-section');
    var shade = document.createElement('div');
    shade.className = 'fold-shade';
    shade.setAttribute('aria-hidden', 'true');
    el.appendChild(shade);
    return { el: el, shade: shade, active: false };
  });
  document.documentElement.classList.add('fold-ready');

  function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function smooth(p) { return p * p * (3 - 2 * p); }

  /* Layout position (unaffected by our own transforms), so the effect never
     feeds back into its own measurements. */
  function layoutTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }

  function reset(s) {
    if (!s.active) return;
    s.active = false;
    s.el.style.transform = '';
    s.el.style.transformOrigin = '';
    s.el.classList.remove('is-folding');
    s.shade.style.opacity = '0';
  }

  var queued = false;
  function update() {
    queued = false;
    var H = window.innerHeight;
    var angle = window.innerWidth <= SETTINGS.smallScreen ? SETTINGS.maxAngleSmall : SETTINGS.maxAngle;
    var last = secs.length - 1;

    var scrollY = window.pageYOffset;
    secs.forEach(function (s, i) {
      var top = layoutTop(s.el) - scrollY;
      var bottom = top + s.el.offsetHeight;
      if (bottom < -60 || top > H + 60) { reset(s); return; }

      // How far the section is into its entrance (0 = flat) and exit (0 = flat)
      var pin  = i === 0    ? 0 : clamp((top - H * SETTINGS.enterEnd) / (H * (1 - SETTINGS.enterEnd)));
      var pout = i === last ? 0 : clamp((H * SETTINGS.exitStart - bottom) / (H * SETTINGS.exitStart));

      if (pin <= 0 && pout <= 0) { reset(s); return; }

      var entering = pin >= pout;
      var e = smooth(entering ? pin : pout);
      var deg = (entering ? -1 : 1) * angle * e;

      s.active = true;
      s.el.classList.add('is-folding');
      s.el.style.transformOrigin = entering ? '50% 0' : '50% 100%';
      s.el.style.transform = 'perspective(' + SETTINGS.perspective + 'px) rotateX(' + deg.toFixed(2) + 'deg)';
      s.shade.style.opacity = (SETTINGS.shade * e).toFixed(3);
    });
  }

  function onScroll() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  window.addEventListener('load', onScroll);
  update();
})();
