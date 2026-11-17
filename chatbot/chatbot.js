/* Chat widget UI — scripted lead capture. Engine: flows.js. Delivery: backend.js. */
(function () {
  'use strict';

  var flows = window.ChatbotFlows;
  var backendApi = window.ChatbotBackend;
  if (!flows || !backendApi || document.getElementById('cb-panel')) return;

  var backend = backendApi.selectBackend({ llmEnabled: false });
  var conv = flows.createConversation();
  var started = false;
  var busy = false;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  // ---- Build the widget (appended to <body>, never inside a <section>) -------
  var launcher = el('button', {
    type: 'button',
    class: 'cb-launcher',
    'aria-expanded': 'false',
    'aria-controls': 'cb-panel',
    'aria-label': 'Chat with Edward’s team'
  });
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>';
  launcher.appendChild(el('span', null, 'Chat'));

  var panel = el('div', {
    id: 'cb-panel',
    class: 'cb-panel',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-labelledby': 'cb-title',
    tabindex: '-1'
  });
  panel.hidden = true;

  var head = el('div', { class: 'cb-head' });
  var titleWrap = el('div');
  var title = el('h2', { id: 'cb-title', class: 'cb-title' }, 'Edward Agbai’s team');
  title.appendChild(el('span', { class: 'cb-sub' }, 'Automated assistant. A person follows up.'));
  titleWrap.appendChild(title);
  var closeBtn = el('button', { type: 'button', class: 'cb-close', 'aria-label': 'Close chat' }, '✕');
  head.appendChild(titleWrap);
  head.appendChild(closeBtn);

  var log = el('div', { class: 'cb-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  var optionsEl = el('div', { class: 'cb-options' });
  var form = el('form', { class: 'cb-form', novalidate: '' });
  form.hidden = true;
  var inputLabel = el('label', { class: 'cb-sr', for: 'cb-input' }, 'Your answer');
  var input = el('input', { id: 'cb-input', class: 'cb-input', type: 'text', autocomplete: 'off', maxlength: '1000' });
  var sendBtn = el('button', { type: 'submit', class: 'cb-send' }, 'Send');
  form.appendChild(inputLabel);
  form.appendChild(input);
  form.appendChild(sendBtn);

  panel.appendChild(head);
  panel.appendChild(log);
  panel.appendChild(optionsEl);
  panel.appendChild(form);
  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  // ---- Rendering --------------------------------------------------------------
  function addMsg(text, who) {
    log.appendChild(el('div', { class: 'cb-msg cb-msg--' + who }, text));
    log.scrollTop = log.scrollHeight;
  }

  function isOpen() { return !panel.hidden; }

  function openPanel() {
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!started) { started = true; render(conv.start()); }
    focusPrimary();
  }

  function closePanel(returnFocus) {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    if (returnFocus !== false) launcher.focus();
  }

  function focusPrimary() {
    if (!form.hidden) { input.focus(); return; }
    var first = optionsEl.querySelector('.cb-opt');
    if (first) first.focus(); else panel.focus();
  }

  function render(view) {
    if (!view) return;
    view.messages.forEach(function (m) { addMsg(m, 'bot'); });

    optionsEl.innerHTML = ''; // cleared, then rebuilt from static option data via DOM nodes
    view.options.forEach(function (opt) {
      var node;
      if (opt.link) {
        node = el('a', { class: 'cb-opt', href: opt.link, target: '_blank', rel: 'noopener' }, opt.label);
        node.addEventListener('click', function () { addMsg(opt.label, 'user'); });
      } else {
        node = el('button', { type: 'button', class: 'cb-opt' }, opt.label);
        node.addEventListener('click', function () { onOption(opt); });
      }
      optionsEl.appendChild(node);
    });

    if (view.input) {
      form.hidden = false;
      input.type = view.input.type;
      input.placeholder = view.input.placeholder;
      inputLabel.textContent = view.input.label;
      input.value = '';
    } else {
      form.hidden = true;
    }

    if (view.submit) { deliver(view.submit); return; }
    if (isOpen()) focusPrimary();
  }

  // ---- Actions ----------------------------------------------------------------
  function onOption(opt) {
    if (busy) return;
    if (opt.scroll) {
      var target = document.querySelector(opt.scroll);
      closePanel(false);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var firstField = target.querySelector('input:not([type="hidden"]), select, textarea');
        if (firstField) setTimeout(function () { firstField.focus({ preventScroll: true }); }, 500);
      }
      return;
    }
    if (opt.openPress) {
      var btn = document.querySelector('[data-gx-open][data-gx-tab="press"]');
      closePanel(false);
      if (btn) btn.click();
      return;
    }
    addMsg(opt.label, 'user');
    render(conv.choose(opt));
  }

  async function deliver(lead) {
    busy = true;
    form.hidden = true;
    optionsEl.innerHTML = '';
    var ok = await backend.submitLead(lead);
    busy = false;
    render(conv.leadResult(ok));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    var text = input.value;
    if (!String(text).trim()) return;
    addMsg(text.trim(), 'user');
    render(conv.answer(text));
  });

  launcher.addEventListener('click', function () {
    if (isOpen()) closePanel(); else openPanel();
  });
  closeBtn.addEventListener('click', function () { closePanel(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen() && (panel.contains(document.activeElement) || document.activeElement === launcher)) {
      closePanel();
    }
  });
})();
