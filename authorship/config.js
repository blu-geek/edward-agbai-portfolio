/*
 * Authorship & Publishing — public configuration.
 * Everything here is public by design (the site ships it to every visitor).
 * Secrets (Supabase, Stripe, SendGrid) never go in this file.
 *
 * Fees and tiers mirror authorship-publishing-product-brief.md.
 * Durations and the payment split are DRAFT ASSUMPTIONS — not in the brief.
 * Edward to confirm before go-live.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AUTHORSHIP_CONFIG = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  return {
    // Same Cal.com link as the nav "Book a Call" button (index.html).
    // Parity is enforced by authorship/test/authorship.test.js.
    calUrl: 'https://cal.com/edward-agbai-hfy8zm/secret',

    // Same Web3Forms access key as #contact-form (index.html).
    web3formsKey: '81758e82-8fa7-4359-9710-9ff0bb4c74ba',
    web3formsUrl: 'https://api.web3forms.com/submit',
    subject: 'Authorship & Publishing Inquiry — Edward Agbai',
    fromName: 'Edward Agbai Portfolio — Authorship & Publishing',

    // Phase 2+ switch. Off = Web3Forms-only path.
    backendEnabled: false,

    currency: 'CAD',
    maxManuscriptWords: 60000,
    upload: {
      extensions: ['pdf', 'doc', 'docx', 'rtf', 'txt', 'odt'],
      maxBytes: 25 * 1024 * 1024
    },

    discovery: { name: 'Discovery call', fee: 150, note: '30-minute call. Credited to any package you book.' },

    // Tier fees from the brief. `milestones` durations (weeks, min–max) are assumptions.
    tiers: {
      manuscript_review: {
        name: 'Manuscript review',
        fee: 1500,
        note: 'Structural and line-edit notes on up to 60,000 words. Two revision rounds.',
        milestones: [
          { name: 'Agreement, disclosure & conflict check', min: 1, max: 2 },
          { name: 'Manuscript review & notes', min: 2, max: 3 },
          { name: 'Revision round 1 & 2', min: 2, max: 3 }
        ]
      },
      co_writing: {
        name: 'Co-writing partnership',
        fee: 7500,
        note: 'Outline, chapter drafts from interviews, three revision rounds.',
        milestones: [
          { name: 'Agreement, disclosure & conflict check', min: 1, max: 2 },
          { name: 'Plan & outline', min: 2, max: 3 },
          { name: 'Interviews & chapter drafts', min: 6, max: 10 },
          { name: 'Revision rounds 1–3', min: 2, max: 4 }
        ]
      },
      full_publishing: {
        name: 'Full publishing package',
        fee: 12000,
        note: 'Co-writing plus ISBN setup, typesetting, cover coordination, e-book and print distribution setup, and a launch plan.',
        milestones: [
          { name: 'Agreement, disclosure & conflict check', min: 1, max: 2 },
          { name: 'Plan & outline', min: 2, max: 3 },
          { name: 'Interviews & chapter drafts', min: 6, max: 10 },
          { name: 'Revision rounds 1–3', min: 2, max: 4 },
          { name: 'Edit & proof', min: 2, max: 3 },
          { name: 'Publishing setup (ISBN, typesetting, cover, distribution)', min: 4, max: 6 },
          { name: 'Launch plan & launch', min: 2, max: 4 }
        ]
      },
      articles: {
        name: 'Thought-leadership article',
        fee: 800,
        perUnit: true,
        note: 'Byline op-ed or article drafted in your voice, one per piece.',
        milestones: [
          { name: 'Agreement, disclosure & conflict check', min: 1, max: 2 },
          { name: 'Draft, review & approval (per piece)', min: 1, max: 2, each: true }
        ]
      }
    },

    // DRAFT: proposed split, not in the brief. Amounts reconcile to the package total.
    paymentSplit: [
      { label: 'On signed agreement', pct: 50 },
      { label: 'On final delivery (launch, for Full Publishing)', pct: 50 }
    ]
  };
});
