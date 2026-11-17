/* Authorship & Publishing — section behaviour (Phase 1: Web3Forms-only submit + scope preview). */
(function () {
  'use strict';

  var cfg = window.AUTHORSHIP_CONFIG;
  var scope = window.AuthorshipScope;
  var form = document.getElementById('authorship-form');
  if (!cfg || !scope || !form) return;

  var successEl = document.getElementById('authorship-success');
  var errorEl = document.getElementById('authorship-error');
  var scopeEl = document.getElementById('authorship-scope');
  var fileInput = document.getElementById('a-file');
  var dropzone = document.getElementById('a-dropzone');
  var dropzoneFile = document.getElementById('a-file-name');
  var fileError = document.getElementById('a-file-error');
  var interestSel = document.getElementById('a-interest');
  var articleRow = document.getElementById('a-articles-row');
  var honeypot = document.getElementById('a-website');
  var submitBtn = form.querySelector('.form-submit');
  var submitLabel = submitBtn.textContent;

  function el(tag, text, cls) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function fileExtension(name) {
    var i = name.lastIndexOf('.');
    return i === -1 ? '' : name.slice(i + 1).toLowerCase();
  }

  function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  // Validates the chosen file. Returns an error message, or null when OK.
  function validateFile(file) {
    if (!file) return null;
    if (cfg.upload.extensions.indexOf(fileExtension(file.name)) === -1) {
      return 'Please choose a PDF, DOC, DOCX, RTF, TXT or ODT file.';
    }
    if (file.size > cfg.upload.maxBytes) {
      return 'That file is over 25 MB. Please send a smaller file or a sample chapter.';
    }
    return null;
  }

  function setFile(file) {
    var msg = validateFile(file);
    if (msg) {
      if (fileInput) fileInput.value = '';
      dropzoneFile.textContent = '';
      fileError.textContent = msg;
      fileError.style.display = 'block';
      return;
    }
    fileError.textContent = '';
    fileError.style.display = 'none';
    dropzoneFile.textContent = file
      ? file.name + ' (' + formatBytes(file.size) + ')'
      : '';
  }

  if (fileInput) {
    fileInput.addEventListener('change', function () {
      setFile(fileInput.files && fileInput.files[0]);
    });
  }
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      dropzone.addEventListener(evt, function (e) {
        e.preventDefault();
        dropzone.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      dropzone.addEventListener(evt, function () {
        dropzone.classList.remove('is-over');
      });
    });
    dropzone.addEventListener('drop', function (e) {
      e.preventDefault();
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      try { fileInput.files = e.dataTransfer.files; } catch (_) { /* older browsers: fall through */ }
      setFile(file);
    });
  }

  // Article count only matters for the articles add-on.
  function syncArticleRow() {
    if (!interestSel || !articleRow) return;
    var isArticles = interestSel.value === 'articles';
    articleRow.style.display = isArticles ? 'flex' : 'none';
  }
  if (interestSel) interestSel.addEventListener('change', syncArticleRow);
  syncArticleRow();

  function readInput() {
    var data = new FormData(form);
    return {
      interest: data.get('service_interest'),
      stage: data.get('project_stage'),
      wordCount: data.get('approx_word_count'),
      articleCount: data.get('article_count'),
      publicOffice: data.get('public_office') === 'Yes'
    };
  }

  function summaryLine(input, est, file) {
    var parts = [
      'Interest: ' + input.interest,
      'Stage: ' + input.stage,
      'Words: ' + (input.wordCount || 'not given'),
      'Public office: ' + (input.publicOffice ? 'yes' : 'no')
    ];
    if (est.status === 'quote') {
      parts.push('Indicative: ' + est.tierName + (est.qty > 1 ? ' × ' + est.qty : '') +
        ' = ' + scope.money(est.total) + ' (' + est.weeks.min + '–' + est.weeks.max + ' weeks)');
    } else if (est.status === 'custom') {
      parts.push('Indicative: custom quote');
    }
    parts.push('File: ' + (file ? file.name + ' (' + formatBytes(file.size) + ')' : 'none (send after submit)'));
    return parts.join(' | ');
  }

  function renderScope(est, file) {
    scopeEl.innerHTML = ''; // cleared before rebuilding with DOM nodes only
    var card = el('div', null, 'scope-card');
    card.appendChild(el('h4', 'Your indicative scope'));

    if (est.status === 'custom') {
      card.appendChild(el('p', 'Your manuscript is over the 60,000-word limit for the review package, so Edward will quote it individually.', 'scope-custom'));
    } else {
      var table = el('table');
      var thead = el('thead');
      var hr = el('tr');
      hr.appendChild(el('th', 'Package'));
      hr.appendChild(el('th', 'Indicative fee', 'num'));
      thead.appendChild(hr);
      table.appendChild(thead);
      var tbody = el('tbody');
      est.lines.forEach(function (line) {
        var tr = el('tr');
        tr.appendChild(el('td', line.label));
        tr.appendChild(el('td', line.display, 'num'));
        tbody.appendChild(tr);
      });
      var totalRow = el('tr', null, 'total-row');
      totalRow.appendChild(el('td', 'Total (CAD, excluding tax)'));
      totalRow.appendChild(el('td', scope.money(est.total), 'num'));
      tbody.appendChild(totalRow);
      table.appendChild(tbody);
      card.appendChild(table);

      card.appendChild(el('p', 'Discovery call: ' + est.discovery.display + ' — ' + est.discovery.note));

      card.appendChild(el('p', 'Indicative timeline: ' + est.weeks.min + '–' + est.weeks.max + ' weeks, in sequence:'));
      var ul = el('ul');
      est.milestones.forEach(function (m) {
        var range = m.minWeeks === m.maxWeeks ? m.minWeeks + ' wk' : m.minWeeks + '–' + m.maxWeeks + ' wk';
        ul.appendChild(el('li', m.name + ' (' + range + ')'));
      });
      card.appendChild(ul);

      card.appendChild(el('p', 'Proposed payment schedule (to be confirmed by Edward):'));
      var ul2 = el('ul');
      est.payments.forEach(function (p) {
        ul2.appendChild(el('li', p.display + ' — ' + p.label));
      });
      card.appendChild(ul2);
    }

    est.notes.forEach(function (n) {
      card.appendChild(el('p', n, 'scope-disclaimer'));
    });
    card.appendChild(el('p', est.disclaimer, 'scope-disclaimer'));
    if (file) card.appendChild(el('p', 'Your file will be requested securely after you submit.', 'scope-disclaimer'));

    scopeEl.appendChild(card);
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    errorEl.style.display = 'none';

    // Honeypot: a bot filled the hidden field. Pretend success, send nothing.
    if (honeypot && honeypot.value) {
      form.style.display = 'none';
      successEl.style.display = 'block';
      return;
    }

    var file = fileInput && fileInput.files && fileInput.files[0];
    var fileMsg = validateFile(file);
    if (fileMsg) {
      fileError.textContent = fileMsg;
      fileError.style.display = 'block';
      return;
    }

    var input = readInput();
    var est = scope.estimate(input);
    if (est.status === 'invalid') {
      errorEl.textContent = 'Please check your selections and try again.';
      errorEl.style.display = 'block';
      return;
    }

    var data = new FormData(form);
    data.delete('website'); // honeypot is never forwarded
    data.set('scope_summary', summaryLine(input, est, file));
    if (file) {
      data.set('attached_file_name', file.name);
      data.set('attached_file_size', formatBytes(file.size));
    }
    // Phase 1 = text only: the file input has no `name`, so it is never part of FormData.

    submitBtn.textContent = 'Sending…';
    submitBtn.disabled = true;

    try {
      var resp = await fetch(cfg.web3formsUrl, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' }
      });
      if (!resp.ok) throw new Error('non-ok');
    } catch (_) {
      submitBtn.textContent = submitLabel;
      submitBtn.disabled = false;
      errorEl.textContent = 'Something went wrong. Please try again, or email Edward directly.';
      errorEl.style.display = 'block';
      return;
    }

    form.style.display = 'none';
    successEl.style.display = 'block';
    renderScope(est, file);
    scopeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
