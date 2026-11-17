/*
 * Chatbot backends.
 *
 * ScriptedBackend (active): sends every lead to Edward's inbox through the
 * same Web3Forms account and access key as the contact form.
 *   - publishing leads  → subject "Authorship & Publishing Inquiry — Edward Agbai"
 *   - general leads     → subject "Portfolio Inquiry — Edward Agbai" (contact form subject)
 *
 * Phase 2 (not built): when the API exists, publishing leads will POST to
 * /api/authorship-intake with source:'chatbot' so they also land in the
 * leads table. Until then cfg.backendEnabled is ignored on purpose.
 *
 * LlmBackend (stub, disabled): reserved for a later phase. Guardrails that
 * MUST be enforced before it is ever enabled are listed in LLM_GUARDRAILS.
 */
(function (root, factory) {
  var api = factory(
    typeof module === 'object' && module.exports
      ? require('../authorship/config.js')
      : root.AUTHORSHIP_CONFIG
  );
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ChatbotBackend = api;
})(typeof window !== 'undefined' ? window : globalThis, function (cfg) {
  'use strict';

  var GENERAL_SUBJECT = 'Portfolio Inquiry — Edward Agbai';
  var FROM_NAME = 'Edward Agbai Portfolio — Chatbot';

  var LLM_GUARDRAILS = [
    'No prices beyond the product brief.',
    'No promises of outcomes, timelines or availability.',
    'No legal advice; refer disclosure and conflict questions to Edward.',
    'Always offer human follow-up (Cal link or the brief form).',
    'Never claim AI tools are not used in drafting; the brief budgets AI drafting and transcription.',
    'Cost caps, rate limits and abuse controls must exist before launch.'
  ];

  // Pure: lead → the exact fields sent to Web3Forms.
  function buildLeadPayload(lead) {
    var publishing = lead.kind === 'publishing';
    return {
      access_key: cfg.web3formsKey,
      subject: publishing ? cfg.subject : GENERAL_SUBJECT,
      from_name: FROM_NAME,
      name: lead.name,
      email: lead.email,
      message: lead.need,
      topic: lead.topic || (publishing ? 'Authorship & Publishing' : 'General'),
      source: 'chatbot',
      lead_type: lead.kind
    };
  }

  var ScriptedBackend = {
    name: 'scripted',
    // Resolves true on success, false on any failure. Never throws.
    submitLead: async function (lead, fetchImpl) {
      var doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
      if (!doFetch) return false;
      try {
        var resp = await doFetch(cfg.web3formsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(buildLeadPayload(lead))
        });
        return !!resp.ok;
      } catch (_) {
        return false;
      }
    }
  };

  var LlmBackend = {
    name: 'llm',
    enabled: false,
    guardrails: LLM_GUARDRAILS,
    reply: async function () {
      throw new Error('LLM backend is disabled. See LLM_GUARDRAILS before enabling.');
    }
  };

  function selectBackend(flags) {
    return flags && flags.llmEnabled === true && LlmBackend.enabled ? LlmBackend : ScriptedBackend;
  }

  return {
    GENERAL_SUBJECT: GENERAL_SUBJECT,
    LLM_GUARDRAILS: LLM_GUARDRAILS,
    buildLeadPayload: buildLeadPayload,
    ScriptedBackend: ScriptedBackend,
    LlmBackend: LlmBackend,
    selectBackend: selectBackend
  };
});
