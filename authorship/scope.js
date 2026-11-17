/*
 * Authorship scope engine — deterministic, no AI.
 * Pure function: same input → same estimate. Shared by the browser preview
 * and the unit tests; the Phase 2 API will reuse this file.
 *
 * estimate(input) → {
 *   status: 'quote' | 'custom' | 'invalid',
 *   tierId, tierName, qty, total, lines, milestones, weeks, payments,
 *   conflictCheck, notes, disclaimer
 * }
 */
(function (root, factory) {
  var api = factory(
    typeof module === 'object' && module.exports
      ? require('./config.js')
      : (root.AUTHORSHIP_CONFIG)
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AuthorshipScope = api;
})(typeof window !== 'undefined' ? window : globalThis, function (cfg) {
  'use strict';

  var DISCLAIMER =
    'Indicative estimate only. Edward reviews your brief, then issues your invoice. ' +
    'No payment is taken until your package is confirmed.';

  function money(amount) {
    try {
      return new Intl.NumberFormat('en-CA', { style: 'currency', currency: cfg.currency }).format(amount);
    } catch (_) {
      return '$' + amount.toFixed(2) + ' ' + cfg.currency;
    }
  }

  // Splits total by cfg.paymentSplit; the last instalment absorbs rounding so amounts sum exactly.
  function paymentPlan(total) {
    var out = [];
    var running = 0;
    cfg.paymentSplit.forEach(function (step, i, all) {
      var amount = i === all.length - 1
        ? Math.round((total - running) * 100) / 100
        : Math.round(total * step.pct) / 100;
      running = Math.round((running + amount) * 100) / 100;
      out.push({ label: step.label, amount: amount, display: money(amount) });
    });
    return out;
  }

  function invalid(message) {
    return { status: 'invalid', error: message };
  }

  function estimate(input) {
    input = input || {};
    var interest = input.interest;
    var stage = input.stage;
    var words = Math.max(0, parseInt(input.wordCount, 10) || 0);
    var publicOffice = !!input.publicOffice;
    var notes = [];
    var tierId = null;
    var qty = 1;
    var custom = false;

    if (['manuscript_review', 'co_writing', 'full_publishing', 'articles', 'unsure'].indexOf(interest) === -1) {
      return invalid('Unknown service interest: ' + interest);
    }
    if (['idea', 'outline', 'partial', 'complete'].indexOf(stage) === -1) {
      return invalid('Unknown project stage: ' + stage);
    }

    if (interest === 'articles') {
      tierId = 'articles';
      qty = Math.max(1, parseInt(input.articleCount, 10) || 1);
    } else if (interest === 'full_publishing') {
      tierId = 'full_publishing';
    } else if (interest === 'co_writing') {
      tierId = 'co_writing';
    } else {
      // manuscript_review or unsure
      if (stage === 'complete') {
        if (words > cfg.maxManuscriptWords) custom = true;
        else tierId = 'manuscript_review';
        if (words === 0) notes.push('Confirm your word count so we can confirm the review tier.');
      } else {
        tierId = 'co_writing';
        if (interest === 'manuscript_review') {
          notes.push('A manuscript review needs a complete draft. Co-writing fits your current stage.');
        }
      }
    }

    if (publicOffice) {
      notes.push('Because of your public-office role, we complete a disclosure agreement and conflict check before any work starts.');
    }

    var base = {
      disclaimer: DISCLAIMER,
      conflictCheck: publicOffice,
      notes: notes,
      discovery: { name: cfg.discovery.name, fee: cfg.discovery.fee, display: money(cfg.discovery.fee), note: 'Credited to your package if you proceed.' }
    };

    if (custom) {
      return Object.assign(base, {
        status: 'custom',
        tierId: null,
        tierName: null,
        qty: 0,
        total: null,
        lines: [],
        milestones: [],
        weeks: null,
        payments: [],
        notes: notes.concat(['Manuscripts over ' + cfg.maxManuscriptWords.toLocaleString('en-CA') + ' words are quoted individually.'])
      });
    }

    var tier = cfg.tiers[tierId];
    var total = Math.round(tier.fee * qty * 100) / 100;

    var milestones = tier.milestones.map(function (m) {
      var mult = m.each ? qty : 1;
      return { name: m.name, minWeeks: m.min * mult, maxWeeks: m.max * mult };
    });
    var weeks = milestones.reduce(function (acc, m) {
      acc.min += m.minWeeks;
      acc.max += m.maxWeeks;
      return acc;
    }, { min: 0, max: 0 });

    return Object.assign(base, {
      status: 'quote',
      tierId: tierId,
      tierName: tier.name,
      qty: qty,
      total: total,
      lines: [{ label: tier.name + (qty > 1 ? ' × ' + qty : ''), amount: total, display: money(total) }],
      milestones: milestones,
      weeks: weeks,
      payments: paymentPlan(total)
    });
  }

  return { estimate: estimate, money: money, DISCLAIMER: DISCLAIMER };
});
