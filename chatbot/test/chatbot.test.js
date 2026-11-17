// Run: node --test chatbot/test/chatbot.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const cfg = require('../../authorship/config.js');
const flows = require('../flows.js');
const be = require('../backend.js');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');
const uiSource = fs.readFileSync(path.join(__dirname, '..', 'chatbot.js'), 'utf8');

const allText = () => Object.values(flows.nodes).flatMap((n) => n.say).join('\n');
const options = () => Object.values(flows.nodes).flatMap((n) => n.options);

// ---- Parity with the site ----------------------------------------------------
test('every Cal link in the flows equals the nav "Book a Call" link', () => {
  const nav = html.match(/<a href="([^"]+)" class="nav-book"/)[1];
  const links = options().filter((o) => o.link).map((o) => o.link);
  assert.ok(links.length > 0);
  links.forEach((l) => assert.equal(l, nav));
});

test('leads use the contact form Web3Forms key; subjects match the site forms', () => {
  const contactKey = html.slice(html.indexOf('id="contact-form"')).match(/name="access_key" value="([^"]+)"/)[1];
  const contactSubject = html.slice(html.indexOf('id="contact-form"')).match(/name="subject" value="([^"]+)"/)[1];
  const pub = be.buildLeadPayload({ kind: 'publishing', name: 'A', email: 'a@b.co', need: 'x' });
  const gen = be.buildLeadPayload({ kind: 'general', name: 'A', email: 'a@b.co', need: 'x' });
  assert.equal(pub.access_key, contactKey);
  assert.equal(gen.access_key, contactKey);
  assert.equal(gen.subject, contactSubject);
  assert.equal(pub.subject, cfg.subject);
  assert.notEqual(pub.subject, gen.subject);
  assert.equal(pub.source, 'chatbot');
});

test('page loads the chatbot assets after the authorship config', () => {
  assert.ok(html.includes('href="chatbot/chatbot.css"'));
  const order = ['authorship/config.js', 'chatbot/flows.js', 'chatbot/backend.js', 'chatbot/chatbot.js']
    .map((s) => html.indexOf('src="' + s + '"'));
  order.forEach((i) => assert.ok(i > -1));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
});

test('widget is appended to <body>, not inside a section', () => {
  assert.ok(uiSource.includes('document.body.appendChild(launcher)'));
  assert.ok(uiSource.includes('document.body.appendChild(panel)'));
});

// ---- Answers come only from the brief ---------------------------------------
test('package answer states every fee from the brief', () => {
  const text = flows.nodes.faq_packages.say.join('\n');
  for (const f of ['$150', '$1,500', '$7,500', '$12,000', '$800']) assert.ok(text.includes(f), f);
  assert.ok(text.includes('60,000'));
  assert.ok(text.toLowerCase().includes('no payment is taken until'));
});

test('answers make no unconfirmed promises, durations, or AI claims', () => {
  const t = allText().toLowerCase();
  assert.ok(!t.includes('guarantee'));
  assert.ok(!/\b\d+\s*(weeks?|months?)\b/.test(t), 'no durations: they are unconfirmed assumptions');
  assert.ok(!/never.{0,30}\bai\b/.test(t));
  assert.ok(t.includes('not legal advice'));
});

// ---- Flow graph --------------------------------------------------------------
test('every option target exists and every node is reachable from welcome', () => {
  const reachable = new Set(['welcome']);
  let grew = true;
  while (grew) {
    grew = false;
    for (const id of [...reachable]) {
      for (const o of flows.nodes[id].options) {
        assert.ok(!o.to || flows.nodes[o.to], 'missing target ' + o.to);
        if (o.to && !reachable.has(o.to)) { reachable.add(o.to); grew = true; }
      }
    }
  }
  // handoff and lead_failed are reached by lead results, not by options.
  const unreachable = Object.keys(flows.nodes).filter((id) => !reachable.has(id));
  assert.deepEqual(unreachable.sort(), ['handoff', 'lead_failed']);
});

test('no dead ends: every node offers a way forward', () => {
  for (const [id, n] of Object.entries(flows.nodes)) assert.ok(n.options.length > 0, id);
});

test('welcome offers the four paths from the plan', () => {
  const labels = flows.nodes.welcome.options.map((o) => o.label);
  assert.deepEqual(labels, ['Authorship & publishing', 'Speaking & consulting', 'Partnerships & press', 'Book a call']);
});

// ---- Lead capture ------------------------------------------------------------
function pick(view, label) { return view.options.find((o) => o.label === label); }

test('publishing lead flow collects name, email, need, then submits', () => {
  const c = flows.createConversation();
  let v = c.start();
  v = c.choose(pick(v, 'Authorship & publishing'));
  v = c.choose(pick(v, 'Talk to Edward’s team'));
  assert.equal(v.input.key, 'name');
  v = c.answer('Ada Obi');
  assert.equal(v.input.key, 'email');
  v = c.answer('not-an-email');
  assert.equal(v.input.key, 'email', 'invalid email keeps the step');
  assert.ok(v.messages[0].includes('email'));
  v = c.answer('ada@example.com');
  assert.equal(v.input.key, 'need');
  v = c.answer('I have a memoir outline');
  assert.deepEqual(v.submit, {
    kind: 'publishing', topic: 'Authorship & Publishing',
    name: 'Ada Obi', email: 'ada@example.com', need: 'I have a memoir outline'
  });
});

test('empty and oversize answers are rejected', () => {
  assert.equal(flows.validate('name', '   ').ok, false);
  assert.equal(flows.validate('need', 'x'.repeat(1001)).ok, false);
  assert.equal(flows.validate('name', ' Ada ').value, 'Ada');
});

test('general lead (speaking) is typed general and carries its topic', () => {
  const c = flows.createConversation();
  let v = c.start();
  v = c.choose(pick(v, 'Speaking & consulting'));
  v = c.choose(pick(v, 'Send an inquiry'));
  c.answer('Sam'); c.answer('sam@example.com');
  v = c.answer('Keynote in March');
  assert.equal(v.submit.kind, 'general');
  assert.equal(v.submit.topic, 'Speaking & Consulting');
});

test('success leads to hand-off with Cal link; only publishing leads see the brief form', () => {
  const c = flows.createConversation();
  let v = c.start();
  v = c.choose(pick(v, 'Authorship & publishing'));
  c.choose(pick(v, 'Talk to Edward’s team'));
  c.answer('A'); c.answer('a@b.co'); c.answer('hi');
  v = c.leadResult(true);
  const labels = v.options.map((o) => o.label);
  assert.ok(labels.includes('Open the calendar'));
  assert.ok(labels.includes('Submit a brief or manuscript'));

  const g = flows.createConversation();
  let gv = g.start();
  gv = g.choose(pick(gv, 'Speaking & consulting'));
  g.choose(pick(gv, 'Send an inquiry'));
  g.answer('A'); g.answer('a@b.co'); g.answer('hi');
  gv = g.leadResult(true);
  assert.ok(!gv.options.map((o) => o.label).includes('Submit a brief or manuscript'));
});

test('failed send offers retry that resends the same lead without re-asking', () => {
  const c = flows.createConversation();
  let v = c.start();
  v = c.choose(pick(v, 'Speaking & consulting'));
  c.choose(pick(v, 'Send an inquiry'));
  c.answer('A'); c.answer('a@b.co');
  const first = c.answer('need');
  v = c.leadResult(false);
  assert.equal(v.node, 'lead_failed');
  const retry = c.choose(pick(v, 'Try again'));
  assert.deepEqual(retry.submit, first.submit);
});

test('a second lead in the same session is blocked after a successful send', () => {
  const c = flows.createConversation();
  let v = c.start();
  v = c.choose(pick(v, 'Speaking & consulting'));
  const startLead = pick(v, 'Send an inquiry');
  c.choose(startLead);
  c.answer('A'); c.answer('a@b.co'); c.answer('hi');
  c.leadResult(true);
  const again = c.choose(startLead);
  assert.equal(again.input, null);
  assert.equal(again.submit, null);
  assert.ok(again.messages[0].includes('already been sent'));
});

test('cancelling lead capture returns to the welcome menu', () => {
  const c = flows.createConversation();
  let v = c.start();
  v = c.choose(pick(v, 'Speaking & consulting'));
  v = c.choose(pick(v, 'Send an inquiry'));
  v = c.choose(pick(v, 'Cancel'));
  assert.equal(v.node, 'welcome');
  assert.equal(c.state.lead, null);
});

// ---- Backend -----------------------------------------------------------------
test('ScriptedBackend posts JSON to Web3Forms and reports success', async () => {
  let call;
  const ok = await be.ScriptedBackend.submitLead(
    { kind: 'publishing', name: 'A', email: 'a@b.co', need: 'x', topic: 'T' },
    async (url, init) => { call = { url, init }; return { ok: true }; }
  );
  assert.equal(ok, true);
  assert.equal(call.url, cfg.web3formsUrl);
  assert.equal(call.init.method, 'POST');
  const body = JSON.parse(call.init.body);
  assert.equal(body.subject, cfg.subject);
  assert.equal(body.source, 'chatbot');
});

test('ScriptedBackend returns false on HTTP error or network failure, never throws', async () => {
  const lead = { kind: 'general', name: 'A', email: 'a@b.co', need: 'x' };
  assert.equal(await be.ScriptedBackend.submitLead(lead, async () => ({ ok: false })), false);
  assert.equal(await be.ScriptedBackend.submitLead(lead, async () => { throw new Error('offline'); }), false);
});

test('LLM backend is a disabled stub; scripted is always selected today', async () => {
  assert.equal(be.selectBackend().name, 'scripted');
  assert.equal(be.selectBackend({ llmEnabled: true }).name, 'scripted');
  await assert.rejects(() => be.LlmBackend.reply(), /disabled/);
  assert.ok(be.LLM_GUARDRAILS.some((g) => g.includes('legal advice')));
});
