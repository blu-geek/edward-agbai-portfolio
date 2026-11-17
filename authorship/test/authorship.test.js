// Run: node --test authorship/test/authorship.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cfg = require('../config.js');
const scope = require('../scope.js');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

function hrefOf(markerRegex) {
  const m = html.match(markerRegex);
  assert.ok(m, 'expected element not found: ' + markerRegex);
  return m[1];
}

// ---- Parity with the existing site ------------------------------------------
test('Cal link in the publishing section equals the nav "Book a Call" link', () => {
  const nav = hrefOf(/<a href="([^"]+)" class="nav-book"/);
  const section = html.slice(html.indexOf('id="authorship"'), html.indexOf('<!-- NYXOROS'));
  const sectionCal = section.match(/href="(https:\/\/cal\.com\/[^"]+)"/);
  assert.ok(sectionCal, 'publishing section has no Cal link');
  assert.equal(sectionCal[1], nav);
  assert.equal(cfg.calUrl, nav, 'config.calUrl must match the site');
});

test('publishing form uses the same Web3Forms key as the contact form, with its own subject', () => {
  const contact = html.slice(html.indexOf('id="contact-form"'), html.indexOf('id="contact-form"') + 600);
  const contactKey = contact.match(/name="access_key" value="([^"]+)"/)[1];
  const pub = html.slice(html.indexOf('id="authorship-form"'), html.indexOf('id="authorship-form"') + 600);
  const pubKey = pub.match(/name="access_key" value="([^"]+)"/)[1];
  assert.equal(pubKey, contactKey);
  assert.equal(cfg.web3formsKey, contactKey);
  const pubSubject = pub.match(/name="subject" value="([^"]+)"/)[1].replace(/&amp;/g, '&');
  assert.equal(pubSubject, cfg.subject);
  assert.notEqual(pubSubject, 'Portfolio Inquiry — Edward Agbai');
});

test('section shows the brief fees for every package', () => {
  const section = html.slice(html.indexOf('id="authorship"'), html.indexOf('<!-- NYXOROS'));
  for (const fee of [150, 1500, 7500, 12000]) {
    assert.ok(section.includes('$' + fee.toLocaleString('en-CA')), 'missing fee $' + fee);
  }
  assert.ok(section.includes('$800'), 'missing article add-on fee');
});

test('section sits between Press and NyxorOS, and the nav links to it', () => {
  const press = html.indexOf('id="press"');
  const auth = html.indexOf('id="authorship"');
  const nyx = html.indexOf('id="nyxoros"');
  assert.ok(press < auth && auth < nyx, 'section order');
  assert.ok(html.includes('href="#authorship"'), 'nav link missing');
});

// ---- Scope engine -----------------------------------------------------------
test('complete manuscript under 60k words maps to manuscript review', () => {
  const e = scope.estimate({ interest: 'manuscript_review', stage: 'complete', wordCount: 50000 });
  assert.equal(e.status, 'quote');
  assert.equal(e.tierId, 'manuscript_review');
  assert.equal(e.total, 1500);
});

test('complete manuscript over 60k words gets a custom quote, no invented surcharge', () => {
  const e = scope.estimate({ interest: 'manuscript_review', stage: 'complete', wordCount: 61000 });
  assert.equal(e.status, 'custom');
  assert.equal(e.total, null);
  assert.deepEqual(e.payments, []);
});

test('manuscript review requested at idea stage falls back to co-writing with a note', () => {
  const e = scope.estimate({ interest: 'manuscript_review', stage: 'idea' });
  assert.equal(e.tierId, 'co_writing');
  assert.equal(e.total, 7500);
  assert.ok(e.notes.some((n) => n.includes('complete draft')));
});

test('full publishing maps to $12,000 at any stage', () => {
  for (const stage of ['idea', 'outline', 'partial', 'complete']) {
    const e = scope.estimate({ interest: 'full_publishing', stage, wordCount: 40000 });
    assert.equal(e.tierId, 'full_publishing');
    assert.equal(e.total, 12000);
  }
});

test('articles add-on multiplies the fee and the per-piece duration', () => {
  const one = scope.estimate({ interest: 'articles', stage: 'idea', articleCount: 1 });
  const three = scope.estimate({ interest: 'articles', stage: 'idea', articleCount: 3 });
  assert.equal(three.total, 2400);
  const perPiece = (e) => e.milestones.find((m) => m.name.includes('per piece'));
  assert.equal(perPiece(three).maxWeeks, perPiece(one).maxWeeks * 3);
});

test('unsure + complete under limit recommends manuscript review; zero word count asks for confirmation', () => {
  const e = scope.estimate({ interest: 'unsure', stage: 'complete', wordCount: 0 });
  assert.equal(e.tierId, 'manuscript_review');
  assert.ok(e.notes.some((n) => n.includes('word count')));
});

test('public-office flag sets the conflict check and adds the disclosure note', () => {
  const e = scope.estimate({ interest: 'co_writing', stage: 'idea', publicOffice: true });
  assert.equal(e.conflictCheck, true);
  assert.ok(e.notes.some((n) => n.includes('conflict check')));
  const plain = scope.estimate({ interest: 'co_writing', stage: 'idea', publicOffice: false });
  assert.equal(plain.conflictCheck, false);
});

test('unknown interest or stage is rejected', () => {
  assert.equal(scope.estimate({ interest: 'bogus', stage: 'idea' }).status, 'invalid');
  assert.equal(scope.estimate({ interest: 'co_writing', stage: 'bogus' }).status, 'invalid');
});

test('payment schedule reconciles exactly to the total for every quote', () => {
  const cases = [
    { interest: 'manuscript_review', stage: 'complete', wordCount: 1 },
    { interest: 'co_writing', stage: 'idea' },
    { interest: 'full_publishing', stage: 'idea' },
    { interest: 'articles', stage: 'idea', articleCount: 7 }
  ];
  for (const c of cases) {
    const e = scope.estimate(c);
    const sum = e.payments.reduce((a, p) => Math.round((a + p.amount) * 100) / 100, 0);
    assert.equal(sum, e.total, JSON.stringify(c));
  }
});

test('milestone durations sum to the reported timeline', () => {
  const e = scope.estimate({ interest: 'full_publishing', stage: 'idea' });
  assert.equal(e.weeks.min, e.milestones.reduce((a, m) => a + m.minWeeks, 0));
  assert.equal(e.weeks.max, e.milestones.reduce((a, m) => a + m.maxWeeks, 0));
});

test('discovery call is shown as credited, not added to the package total', () => {
  const e = scope.estimate({ interest: 'co_writing', stage: 'idea' });
  assert.equal(e.discovery.fee, 150);
  assert.equal(e.total, 7500);
});
