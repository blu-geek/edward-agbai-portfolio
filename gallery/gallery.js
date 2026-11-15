/* ==================================================================
   Events & Gallery — behaviour
   Data lives in gallery/events.js (window.GALLERY_EVENTS).
   - [data-gx-featured]  mount point for the auto-advancing homepage carousel
   - [data-gx-open]      any element that opens the full event viewer
                         (optional data-gx-event="<event id>" opens that event)
   ================================================================== */
(function () {
  'use strict';

  var EVENTS = window.GALLERY_EVENTS || [];
  if (!EVENTS.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var ICON = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    play: '<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg class="i-pause" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
  };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function photoCount(ev) { return ev.photos.length + (ev.photos.length === 1 ? ' photo' : ' photos'); }

  /* A photo "stack": blurred copy as backdrop + sharp, uncropped foreground. */
  function mediaImgs(photo, lazy) {
    var bg = el('img', 'gx-bg');
    bg.alt = ''; bg.setAttribute('aria-hidden', 'true');
    var fg = el('img', 'gx-fg');
    fg.alt = photo.alt || photo.caption || '';
    if (photo.w) fg.width = photo.w;
    if (photo.h) fg.height = photo.h;
    fg.decoding = 'async';
    if (lazy) { bg.dataset.src = photo.src; fg.dataset.src = photo.src; }
    else { bg.src = photo.src; fg.src = photo.src; }
    return [bg, fg];
  }

  /* ---------------------------------------------------------------
     Carousel
     slides: [{ src, w, h, alt, caption, eventTitle, eventCategory }]
     opts:   { autoplay, interval, thumbs, label }
     --------------------------------------------------------------- */
  function createCarousel(mount, slides, opts) {
    opts = opts || {};
    var interval = opts.interval || 5500;
    var canAuto = !!opts.autoplay && !reduceMotion && slides.length > 1;
    var playing = canAuto;
    var idx = 0, hover = false, offscreen = false;

    mount.innerHTML = '';
    var root = el('div', 'gx-car' + (canAuto ? '' : ' no-auto'));
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    root.setAttribute('aria-label', opts.label || 'Photo gallery');
    root.style.setProperty('--gx-int', interval + 'ms');

    var stage = el('div', 'gx-stage');
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Use left and right arrow keys to browse photos');
    var figures = slides.map(function (s, i) {
      var f = el('figure', 'gx-slide');
      f.setAttribute('role', 'group');
      f.setAttribute('aria-roledescription', 'slide');
      f.setAttribute('aria-label', (i + 1) + ' of ' + slides.length);
      mediaImgs(s, true).forEach(function (img) { f.appendChild(img); });
      stage.appendChild(f);
      return f;
    });

    var chip = el('div', 'gx-chip gx-glass', '<span class="gx-chip-cat"></span><span class="gx-chip-title"></span>');
    stage.appendChild(chip);
    var chipCat = chip.querySelector('.gx-chip-cat');
    var chipTitle = chip.querySelector('.gx-chip-title');

    var prevBtn = el('button', 'gx-nav-btn is-prev gx-glass', ICON.prev);
    prevBtn.type = 'button'; prevBtn.setAttribute('aria-label', 'Previous photo');
    var nextBtn = el('button', 'gx-nav-btn is-next gx-glass', ICON.next);
    nextBtn.type = 'button'; nextBtn.setAttribute('aria-label', 'Next photo');
    if (slides.length > 1) { stage.appendChild(prevBtn); stage.appendChild(nextBtn); }
    root.appendChild(stage);

    var bar = el('div', 'gx-bar gx-glass',
      '<div class="gx-meta"><span class="gx-count"></span><p class="gx-caption" aria-live="polite"></p></div>' +
      '<button type="button" class="gx-play" aria-label="Pause slideshow">' + ICON.play + ICON.pause + '</button>' +
      '<div class="gx-progress" aria-hidden="true"><i></i></div>');
    root.appendChild(bar);
    var countEl = bar.querySelector('.gx-count');
    var capEl = bar.querySelector('.gx-caption');
    var playBtn = bar.querySelector('.gx-play');
    var fill = bar.querySelector('.gx-progress i');

    var thumbBtns = [];
    var thumbWrap = null;
    if (opts.thumbs && slides.length > 1) {
      thumbWrap = el('div', 'gx-thumbs');
      slides.forEach(function (s, i) {
        var b = el('button', 'gx-thumb');
        b.type = 'button';
        b.setAttribute('aria-label', 'Show photo ' + (i + 1) + ': ' + (s.caption || ''));
        var im = el('img'); im.alt = ''; im.loading = 'lazy'; im.src = s.src;
        b.appendChild(im);
        b.addEventListener('click', function () { go(i); });
        thumbWrap.appendChild(b);
        thumbBtns.push(b);
      });
      root.appendChild(thumbWrap);
    }
    mount.appendChild(root);

    function load(i) {
      var f = figures[(i + figures.length) % figures.length];
      f.querySelectorAll('img[data-src]').forEach(function (img) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      });
    }
    function setHeld() {
      root.classList.toggle('is-held', hover || offscreen || document.hidden);
    }
    function restartProgress() {
      fill.classList.remove('run');
      void fill.offsetWidth;
      if (playing) fill.classList.add('run');
    }
    function go(n) {
      idx = (n + slides.length) % slides.length;
      figures.forEach(function (f, i) { f.classList.toggle('is-active', i === idx); });
      load(idx); load(idx + 1); load(idx - 1);
      var s = slides[idx];
      chipCat.textContent = s.eventCategory || '';
      chipTitle.textContent = s.eventTitle || '';
      chip.hidden = !(s.eventCategory || s.eventTitle);
      countEl.textContent = pad(idx + 1) + ' / ' + pad(slides.length);
      capEl.textContent = s.caption || '';
      thumbBtns.forEach(function (b, i) {
        b.classList.toggle('is-active', i === idx);
        if (i === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      if (thumbWrap) {
        var b = thumbBtns[idx];
        thumbWrap.scrollTo({ left: b.offsetLeft - (thumbWrap.clientWidth - b.clientWidth) / 2, behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      restartProgress();
    }
    function setPlaying(v) {
      playing = v && canAuto;
      root.classList.toggle('is-paused', !playing);
      playBtn.setAttribute('aria-label', playing ? 'Pause slideshow' : 'Play slideshow');
      restartProgress();
    }

    prevBtn.addEventListener('click', function () { go(idx - 1); });
    nextBtn.addEventListener('click', function () { go(idx + 1); });
    playBtn.addEventListener('click', function () { setPlaying(!playing); });
    fill.addEventListener('animationend', function () { if (playing) go(idx + 1); });

    root.addEventListener('mouseenter', function () { hover = true; setHeld(); });
    root.addEventListener('mouseleave', function () { hover = false; setHeld(); });
    document.addEventListener('visibilitychange', setHeld);

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
      else if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
      else if (e.key === 'Home') { go(0); e.preventDefault(); }
      else if (e.key === 'End') { go(slides.length - 1); e.preventDefault(); }
    });

    var startX = null;
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      startX = e.clientX;
    });
    stage.addEventListener('pointerup', function (e) {
      if (startX == null) return;
      var dx = e.clientX - startX; startX = null;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    });
    stage.addEventListener('pointercancel', function () { startX = null; });

    var io = null;
    if (canAuto && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(function (entries) {
        offscreen = !entries[0].isIntersecting;
        setHeld();
      }, { threshold: 0.35 });
      io.observe(root);
    }

    setPlaying(canAuto);
    go(0);

    return {
      go: go,
      destroy: function () {
        if (io) io.disconnect();
        document.removeEventListener('visibilitychange', setHeld);
        mount.innerHTML = '';
      }
    };
  }

  /* ---------------------------------------------------------------
     Homepage featured carousel
     --------------------------------------------------------------- */
  function slidesFor(events) {
    var out = [];
    events.forEach(function (ev) {
      ev.photos.forEach(function (p) {
        out.push({ src: p.src, w: p.w, h: p.h, alt: p.alt, caption: p.caption, eventTitle: ev.title, eventCategory: ev.category });
      });
    });
    return out;
  }

  var featuredMount = document.querySelector('[data-gx-featured]');
  if (featuredMount) {
    var featured = EVENTS.filter(function (e) { return e.featured; });
    if (!featured.length) featured = [EVENTS[0]];
    createCarousel(featuredMount, slidesFor(featured), {
      autoplay: true, interval: 5500, label: 'Featured event photos'
    });
  }

  document.querySelectorAll('[data-gx-count]').forEach(function (n) { n.textContent = EVENTS.length; });

  /* ---------------------------------------------------------------
     Full-screen viewer
     --------------------------------------------------------------- */
  var MEDIA = window.GALLERY_MEDIA || null;
  var modal = null, body, title, eyebrow, backBtn, closeBtn, panel, tabsEl, tabBtns = [];
  var activeCarousel = null, lastFocus = null, filter = 'All', currentTab = 'events';

  function safeUrl(u) { return /^https?:\/\//i.test(String(u || '')) ? u : ''; }

  function buildModal() {
    modal = el('div', 'gx-modal',
      '<div class="gx-scrim" data-gx-close></div>' +
      '<div class="gx-panel gx-glass" role="dialog" aria-modal="true" aria-labelledby="gx-title">' +
        '<div class="gx-head">' +
          '<button type="button" class="gx-back" hidden>' + ICON.back + 'All events</button>' +
          '<div class="gx-head-text"><span class="gx-eyebrow"></span><h3 id="gx-title"></h3></div>' +
          '<button type="button" class="gx-close" aria-label="Close gallery">' + ICON.close + '</button>' +
        '</div>' +
        '<div class="gx-tabs" role="tablist" aria-label="Gallery sections">' +
          '<button type="button" class="gx-tab" role="tab" data-tab="events">Events</button>' +
          (MEDIA ? '<button type="button" class="gx-tab" role="tab" data-tab="press">Press &amp; Media</button>' : '') +
        '</div>' +
        '<div class="gx-body" role="tabpanel"></div>' +
      '</div>');
    modal.hidden = true;
    document.body.appendChild(modal);
    panel = modal.querySelector('.gx-panel');
    body = modal.querySelector('.gx-body');
    title = modal.querySelector('#gx-title');
    eyebrow = modal.querySelector('.gx-eyebrow');
    backBtn = modal.querySelector('.gx-back');
    closeBtn = modal.querySelector('.gx-close');
    tabsEl = modal.querySelector('.gx-tabs');
    tabBtns = [].slice.call(tabsEl.querySelectorAll('.gx-tab'));
    tabBtns.forEach(function (b, i) {
      b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        var t = tabBtns[(i + d + tabBtns.length) % tabBtns.length];
        t.focus(); setTab(t.getAttribute('data-tab')); e.preventDefault();
      });
    });

    closeBtn.addEventListener('click', closeModal);
    modal.querySelector('.gx-scrim').addEventListener('click', closeModal);
    backBtn.addEventListener('click', function () { setTab(currentTab); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      var f = panel.querySelectorAll('button:not([hidden]), [tabindex="0"]');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });
  }

  function teardown() {
    if (activeCarousel) { activeCarousel.destroy(); activeCarousel = null; }
    body.innerHTML = '';
  }

  function syncTabs(show) {
    tabsEl.hidden = !show || tabBtns.length < 2;
    tabBtns.forEach(function (b) {
      var on = b.getAttribute('data-tab') === currentTab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
  }

  function setTab(t) {
    currentTab = (t === 'press' && MEDIA) ? 'press' : 'events';
    if (currentTab === 'press') showPress(); else showList();
  }

  function showPress() {
    teardown();
    currentTab = 'press';
    backBtn.hidden = true;
    syncTabs(true);
    eyebrow.textContent = 'Media Kit';
    title.textContent = 'Press & Media';

    var view = el('div', 'gx-view gx-press');
    var kit = MEDIA.kit || {};

    var hero = el('div', 'gx-press-hero',
      '<p class="gx-press-summary">' + esc(MEDIA.summary) + '</p>' +
      '<div class="gx-press-kit"><button type="button" class="btn btn-primary gx-kit-btn">' + esc(kit.label || 'Request Press Kit') + '</button>' +
      (kit.note ? '<span>' + esc(kit.note) + '</span>' : '') + '</div>');
    hero.querySelector('.gx-kit-btn').addEventListener('click', function () {
      closeModal();
      var f = document.getElementById('f-type');
      if (f && !f.value && kit.inquiryType) f.value = kit.inquiryType;
      var c = document.getElementById('contact');
      if (c) c.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    view.appendChild(hero);

    if (MEDIA.books && MEDIA.books.length) {
      var books = el('section', 'gx-block');
      books.appendChild(el('h4', 'gx-block-title', 'Featured Books' + (MEDIA.booksNote ? '<small>' + esc(MEDIA.booksNote) + '</small>' : '')));
      var bg = el('div', 'gx-books');
      MEDIA.books.forEach(function (b) {
        bg.appendChild(el('article', 'gx-book gx-glass',
          '<h5>' + esc(b.title) + '</h5>' +
          (b.subtitle ? '<p class="gx-book-sub">' + esc(b.subtitle) + '</p>' : '') +
          (b.byline ? '<p class="gx-book-by">' + esc(b.byline) + '</p>' : '')));
      });
      books.appendChild(bg);
      view.appendChild(books);
    }

    var cov = el('section', 'gx-block');
    cov.appendChild(el('h4', 'gx-block-title', 'Coverage &amp; Interviews'));
    var items = (MEDIA.coverage || []).filter(function (c) { return safeUrl(c.url); });
    if (items.length) {
      var list = el('div', 'gx-cov-list');
      items.forEach(function (c) {
        var a = el('a', 'gx-cov gx-glass',
          '<span class="gx-cov-type">' + esc(c.type || 'Feature') + '</span>' +
          '<span class="gx-cov-main"><span class="gx-cov-title">' + esc(c.title) + '</span>' +
          '<span class="gx-cov-meta">' + esc([c.outlet, c.date].filter(Boolean).join(' · ')) + '</span></span>' +
          '<span class="gx-cov-arrow" aria-hidden="true">↗</span>');
        a.href = safeUrl(c.url); a.target = '_blank'; a.rel = 'noopener noreferrer';
        list.appendChild(a);
      });
      cov.appendChild(list);
    } else {
      cov.appendChild(el('div', 'gx-empty gx-glass',
        '<strong>Coverage log opening soon.</strong>' +
        '<span>Interviews, features, and the speaking reel will be listed here as they publish. For a current request, ask for the press kit.</span>'));
    }
    view.appendChild(cov);

    var cols = el('div', 'gx-cols');

    var app = el('section', 'gx-block');
    app.appendChild(el('h4', 'gx-block-title', 'Appearances'));
    var al = el('div', 'gx-app-list');
    EVENTS.forEach(function (ev) {
      var b = el('button', 'gx-app gx-glass',
        '<span class="gx-app-main"><span class="gx-app-title">' + esc(ev.title) + '</span>' +
        '<span class="gx-app-meta">' + esc([ev.category, ev.year, photoCount(ev)].filter(Boolean).join(' · ')) + '</span></span>' +
        '<span class="gx-cov-arrow" aria-hidden="true">→</span>');
      b.type = 'button';
      b.addEventListener('click', function () { showEvent(ev); });
      al.appendChild(b);
    });
    app.appendChild(al);
    cols.appendChild(app);

    var side = el('div', 'gx-side');
    if (MEDIA.topics && MEDIA.topics.length) {
      var tp = el('section', 'gx-block');
      tp.appendChild(el('h4', 'gx-block-title', 'Topics'));
      var chips = el('div', 'gx-chips');
      MEDIA.topics.forEach(function (t) { chips.appendChild(el('span', 'gx-topic', esc(t))); });
      tp.appendChild(chips);
      side.appendChild(tp);
    }
    if (MEDIA.organizations && MEDIA.organizations.length) {
      var og = el('section', 'gx-block');
      og.appendChild(el('h4', 'gx-block-title', 'Organizations'));
      var ol = el('ul', 'gx-orgs');
      MEDIA.organizations.forEach(function (o) {
        ol.appendChild(el('li', '', '<strong>' + esc(o.name) + '</strong><span>' + esc(o.role) + '</span>'));
      });
      og.appendChild(ol);
      side.appendChild(og);
    }
    cols.appendChild(side);
    view.appendChild(cols);

    body.appendChild(view);
    body.scrollTop = 0;
  }

  function showList() {
    teardown();
    currentTab = 'events';
    backBtn.hidden = true;
    syncTabs(true);
    eyebrow.textContent = 'Events & Gallery';
    title.textContent = 'Moments from the Room';

    var view = el('div', 'gx-view');
    var cats = ['All'];
    EVENTS.forEach(function (e) { if (e.category && cats.indexOf(e.category) < 0) cats.push(e.category); });

    if (cats.length > 2) {
      var bar = el('div', 'gx-filters');
      bar.setAttribute('role', 'group');
      bar.setAttribute('aria-label', 'Filter events by category');
      cats.forEach(function (c) {
        var b = el('button', 'gx-filter' + (c === filter ? ' is-active' : ''), esc(c));
        b.type = 'button';
        b.setAttribute('aria-pressed', c === filter ? 'true' : 'false');
        b.addEventListener('click', function () { filter = c; showList(); });
        bar.appendChild(b);
      });
      view.appendChild(bar);
    }

    var grid = el('div', 'gx-grid');
    EVENTS.filter(function (e) { return filter === 'All' || e.category === filter; }).forEach(function (ev) {
      var card = el('button', 'gx-card gx-glass');
      card.type = 'button';
      card.setAttribute('aria-label', 'Open ' + ev.title + ', ' + photoCount(ev));
      var media = el('div', 'gx-media');
      mediaImgs(ev.photos[0], false).forEach(function (i) { i.loading = 'lazy'; media.appendChild(i); });
      card.appendChild(media);
      var meta = [photoCount(ev)];
      if (ev.year) meta.unshift(ev.year);
      card.appendChild(el('div', 'gx-card-body',
        '<span class="gx-card-cat">' + esc(ev.category) + '</span>' +
        '<span class="gx-card-title">' + esc(ev.title) + '</span>' +
        (ev.tagline ? '<span class="gx-card-tag">' + esc(ev.tagline) + '</span>' : '') +
        '<span class="gx-card-meta">' + esc(meta.join(' · ')) + '</span>'));
      card.addEventListener('click', function () { showEvent(ev); });
      grid.appendChild(card);
    });
    view.appendChild(grid);
    body.appendChild(view);
    body.scrollTop = 0;
  }

  function showEvent(ev) {
    teardown();
    syncTabs(false);
    backBtn.hidden = false;
    backBtn.lastChild.textContent = currentTab === 'press' ? 'Press & Media' : 'All events';
    eyebrow.textContent = ev.category;
    title.textContent = ev.title;

    var view = el('div', 'gx-view');
    var info = '';
    if (ev.tagline) info += '<p>' + esc(ev.tagline) + '</p>';
    if (ev.description) info += '<p>' + esc(ev.description) + '</p>';
    if (ev.credit) info += '<p class="gx-event-credit">' + esc(ev.credit) + '</p>';
    if (info) view.appendChild(el('div', 'gx-event-info', info));

    var mount = el('div');
    view.appendChild(mount);
    body.appendChild(view);
    body.scrollTop = 0;
    activeCarousel = createCarousel(mount, slidesFor([ev]), {
      autoplay: false, thumbs: true, label: ev.title + ' photos'
    });
  }

  function openModal(eventId, tab) {
    if (!modal) buildModal();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('gx-lock');
    var ev = null;
    EVENTS.forEach(function (e) { if (e.id === eventId) ev = e; });
    currentTab = (tab === 'press' && MEDIA) ? 'press' : 'events';
    if (ev) showEvent(ev);
    else setTab(currentTab);
    closeBtn.focus();
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    teardown();
    modal.hidden = true;
    document.documentElement.classList.remove('gx-lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelectorAll('[data-gx-open]').forEach(function (b) {
    b.addEventListener('click', function () { openModal(b.getAttribute('data-gx-event'), b.getAttribute('data-gx-tab')); });
  });
})();
