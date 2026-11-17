/*
 * Chatbot conversation engine — scripted, no AI.
 * Pure and UI-free so it can be unit-tested in Node and reused by the widget.
 *
 * FAQ answers are drawn ONLY from authorship-publishing-product-brief.md and
 * the existing site copy. Do not add prices, promises, timelines or legal
 * statements that are not in those sources.
 */
(function (root, factory) {
  var api = factory(
    typeof module === 'object' && module.exports
      ? require('../authorship/config.js')
      : root.AUTHORSHIP_CONFIG
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChatbotFlows = api;
})(typeof window !== 'undefined' ? window : globalThis, function (cfg) {
  'use strict';

  var RESTART = { label: 'Start over', to: 'welcome' };
  var BOOK = { label: 'Book a call', to: 'book' };

  function fee(n) { return '$' + n.toLocaleString('en-CA'); }
  var T = cfg.tiers;

  // Option shapes:
  //   { label, to }                          go to another node
  //   { label, link }                        open a URL in a new tab
  //   { label, scroll }                      scroll to a page anchor (form)
  //   { label, openPress: true }             open the Press & Media viewer
  //   { label, lead: 'publishing'|'general', topic }   start lead capture
  var nodes = {
    welcome: {
      say: [
        "Hello, I'm the assistant for Edward Agbai's site. I can answer common questions and connect you with Edward's team. What brings you here?"
      ],
      options: [
        { label: 'Authorship & publishing', to: 'pub_menu' },
        { label: 'Speaking & consulting', to: 'speaking' },
        { label: 'Partnerships & press', to: 'partners' },
        BOOK
      ]
    },

    pub_menu: {
      say: ['Edward offers a bookable authorship service. What would you like to know?'],
      options: [
        { label: 'Packages & fees', to: 'faq_packages' },
        { label: 'How it works', to: 'faq_process' },
        { label: 'Ethics & disclosure', to: 'faq_ethics' },
        { label: 'Timelines', to: 'faq_timelines' },
        { label: 'Submit a brief or manuscript', scroll: '#authorship-intake' },
        { label: 'Talk to Edward’s team', lead: 'publishing', topic: 'Authorship & Publishing' },
        BOOK
      ]
    },

    faq_packages: {
      say: [
        'All fees are in CAD and exclude tax.',
        'Discovery call: ' + fee(cfg.discovery.fee) + '. A 30-minute call to scope the book, credited to any package.',
        'Manuscript review: ' + fee(T.manuscript_review.fee) + '. Structural and line-edit notes on up to 60,000 words, with two revision rounds.',
        'Co-writing partnership: ' + fee(T.co_writing.fee) + '. Outline, chapter drafts from interviews, and three revision rounds.',
        'Full publishing package: ' + fee(T.full_publishing.fee) + '. Co-writing plus ISBN setup, typesetting, cover design coordination, e-book and print distribution setup, and a launch plan.',
        'Thought-leadership articles: ' + fee(T.articles.fee) + ' per piece, drafted in your voice.',
        'No payment is taken until your package is confirmed.'
      ],
      options: [
        { label: 'How it works', to: 'faq_process' },
        { label: 'Talk to Edward’s team', lead: 'publishing', topic: 'Authorship & Publishing' },
        BOOK, RESTART
      ]
    },

    faq_process: {
      say: [
        'The process has four steps: plan, write or review, publish, and launch.',
        'You can book a discovery call, or submit a brief or manuscript through the form on this page. Edward reviews it, confirms the package, and then issues an invoice. No payment is taken until the package is confirmed.'
      ],
      options: [
        { label: 'Submit a brief or manuscript', scroll: '#authorship-intake' },
        { label: 'Packages & fees', to: 'faq_packages' },
        BOOK, RESTART
      ]
    },

    faq_ethics: {
      say: [
        'Every engagement follows a disclosure and ethics policy, and it is mandatory for public-office holders.',
        'Clients who hold public office agree in writing that a ghostwritten or co-written work may be identified as such where required by law or their office’s rules.',
        'The service declines engagements where the client is involved in active procurement, lobbying or regulatory decisions that Edward or Valtara AI would be involved in. Content that promotes violence, discrimination or disinformation is also declined.',
        'This is not legal advice.'
      ],
      options: [
        { label: 'Talk to Edward’s team', lead: 'publishing', topic: 'Authorship & Publishing' },
        { label: 'Packages & fees', to: 'faq_packages' },
        BOOK, RESTART
      ]
    },

    faq_timelines: {
      say: [
        'Timelines depend on the package and on your manuscript. The estimate you see after submitting a brief is indicative only.',
        'Edward confirms the plan and timeline after he reviews your brief.'
      ],
      options: [
        { label: 'Submit a brief or manuscript', scroll: '#authorship-intake' },
        { label: 'Talk to Edward’s team', lead: 'publishing', topic: 'Authorship & Publishing' },
        BOOK, RESTART
      ]
    },

    speaking: {
      say: [
        'Edward takes speaking engagements, consulting opportunities, academic collaborations and Canada–Africa partnerships.'
      ],
      options: [
        { label: 'Send an inquiry', lead: 'general', topic: 'Speaking & Consulting' },
        BOOK, RESTART
      ]
    },

    partners: {
      say: [
        'For interviews, editorial contributions and feature requests, a full press kit with biography, photography and a speaking reel is available on request.'
      ],
      options: [
        { label: 'Request the press kit', lead: 'general', topic: 'Press kit request' },
        { label: 'Open Press & Media', openPress: true },
        { label: 'Discuss a partnership', lead: 'general', topic: 'Partnership' },
        BOOK, RESTART
      ]
    },

    book: {
      say: ['You can book a time directly on Edward’s calendar.'],
      options: [
        { label: 'Open the calendar', link: cfg.calUrl },
        RESTART
      ]
    },

    handoff: {
      say: [
        'Thank you. Edward’s team will be in touch within 2 business days.',
        'If you would like to move faster, you can also book a call.'
      ],
      options: [
        { label: 'Open the calendar', link: cfg.calUrl },
        { label: 'Submit a brief or manuscript', scroll: '#authorship-intake', only: 'publishing' },
        RESTART
      ]
    },

    lead_failed: {
      say: ['Sorry, that did not go through. Please try again, or use the contact form on this page.'],
      options: [{ label: 'Try again', retry: true }, RESTART]
    }
  };

  var LEAD_STEPS = [
    { key: 'name', ask: 'What is your name?', type: 'text', placeholder: 'Your name', label: 'Name' },
    { key: 'email', ask: 'What is the best email to reach you?', type: 'email', placeholder: 'you@example.com', label: 'Email' },
    { key: 'need', ask: 'In a sentence or two, how can Edward’s team help?', type: 'text', placeholder: 'Briefly describe your need', label: 'How can we help?' }
  ];

  var LIMITS = { name: 100, email: 254, need: 1000 };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate(key, raw) {
    var v = String(raw == null ? '' : raw).trim();
    if (!v) return { ok: false, error: 'Please enter a value to continue.' };
    if (v.length > LIMITS[key]) return { ok: false, error: 'That is a bit long. Please shorten it.' };
    if (key === 'email' && !EMAIL_RE.test(v)) return { ok: false, error: 'That does not look like an email address. Please check it.' };
    return { ok: true, value: v };
  }

  function createConversation() {
    var state = { node: 'welcome', lead: null, submitted: false };

    function nodeView(id) {
      var n = nodes[id];
      var kind = state.lead && state.lead.kind;
      state.node = id;
      return {
        node: id,
        messages: n.say.slice(),
        options: n.options.filter(function (o) { return !o.only || o.only === kind; }),
        input: null,
        submit: null
      };
    }

    function askStep() {
      var step = LEAD_STEPS[state.lead.step];
      return {
        node: 'lead',
        messages: [step.ask],
        options: [{ label: 'Cancel', to: 'welcome' }],
        input: { key: step.key, type: step.type, placeholder: step.placeholder, label: step.label },
        submit: null
      };
    }

    function submitView(messageText) {
      return {
        node: 'lead_submit',
        messages: [messageText],
        options: [],
        input: null,
        submit: {
          kind: state.lead.kind,
          topic: state.lead.topic,
          name: state.lead.data.name,
          email: state.lead.data.email,
          need: state.lead.data.need
        }
      };
    }

    return {
      state: state,

      start: function () { return nodeView('welcome'); },

      choose: function (option) {
        if (option.retry && state.lead) return submitView('Sending again…');
        if (option.lead) {
          if (state.submitted) {
            return {
              node: 'lead_done',
              messages: ['Your message has already been sent. Edward’s team will be in touch within 2 business days.'],
              options: [{ label: 'Open the calendar', link: cfg.calUrl }, RESTART],
              input: null,
              submit: null
            };
          }
          state.lead = { kind: option.lead, topic: option.topic, step: 0, data: {} };
          return askStep();
        }
        if (option.to) {
          if (option.to === 'welcome') state.lead = null;
          return nodeView(option.to);
        }
        // link / scroll / openPress are handled by the UI; the conversation stays put.
        return null;
      },

      answer: function (raw) {
        if (!state.lead) return null;
        var step = LEAD_STEPS[state.lead.step];
        var res = validate(step.key, raw);
        if (!res.ok) {
          var again = askStep();
          again.messages = [res.error];
          return again;
        }
        state.lead.data[step.key] = res.value;
        state.lead.step += 1;
        if (state.lead.step < LEAD_STEPS.length) return askStep();
        return submitView('Sending your message…');
      },

      leadResult: function (ok) {
        if (ok) {
          state.submitted = true;
          return nodeView('handoff');
        }
        return nodeView('lead_failed');
      }
    };
  }

  return {
    nodes: nodes,
    LEAD_STEPS: LEAD_STEPS,
    validate: validate,
    createConversation: createConversation
  };
});
