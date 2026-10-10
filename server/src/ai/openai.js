import { zodToJsonSchema } from 'zod-to-json-schema';
import { WORKFLOWS, normalize } from '../schemas.js';
import { buildMessages } from './prompts.js';
import { AIError } from '../errors.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jsonSchemaFor = (kind) => {
  const s = zodToJsonSchema(WORKFLOWS[kind].output, { target: 'openAi', $refStrategy: 'none' });
  delete s.$schema; return s;
};

/**
 * Real OpenAI engine (Chat Completions + strict JSON-schema structured outputs, via plain fetch).
 * Handles timeouts, 429/5xx retries with backoff (+Retry-After), refusals, truncated or invalid JSON (retried), and
 * validates every response against the same zod schema used by the rest of the app. Raw upstream errors never reach clients.
 */
export class OpenAIEngine {
  constructor(cfg, logger = console) {
    this.name = 'openai'; this.cfg = cfg; this.log = logger; this.model = cfg.openaiModel; this.calls = 0;
  }

  async #post(body) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), this.cfg.openaiTimeoutMs);
    try {
      this.calls++;
      return await fetch(`${this.cfg.openaiBaseUrl}/chat/completions`, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json', authorization: `Bearer ${this.cfg.openaiApiKey}` }, body: JSON.stringify(body) });
    } finally { clearTimeout(timer); }
  }

  async run(kind, input) {
    const body = {
      model: this.model, temperature: 0.4, max_completion_tokens: 4000, messages: buildMessages(kind, input),
      response_format: { type: 'json_schema', json_schema: { name: kind, strict: true, schema: jsonSchemaFor(kind) } },
    };
    const max = this.cfg.openaiMaxAttempts;
    let lastReason = 'unknown';
    for (let attempt = 1; attempt <= max; attempt++) {
      let retryAfterMs = 0;
      try {
        const res = await this.#post(body);
        if (res.status === 401 || res.status === 403) throw new AIError('AI provider rejected our credentials. Contact the site owner.', { status: 502, code: 'AI_AUTH' });
        if (res.status === 429 || res.status >= 500) {
          lastReason = `http ${res.status}`; retryAfterMs = Math.min((Number(res.headers.get('retry-after')) || 0) * 1000, 15000);
          if (attempt === max) throw new AIError(res.status === 429 ? 'The AI service is busy. Please try again in a minute.' : 'The AI service is temporarily unavailable.', { status: res.status === 429 ? 503 : 502, code: res.status === 429 ? 'AI_BUSY' : 'AI_UNAVAILABLE' });
        } else if (!res.ok) {
          this.log.error?.(`[openai] ${res.status}: ${(await res.text()).slice(0, 300)}`);
          throw new AIError('The AI request was rejected. Try shortening your input.', { status: 502, code: 'AI_REJECTED' });
        } else {
          const data = await res.json();
          const choice = data.choices?.[0];
          if (choice?.message?.refusal) throw new AIError('The AI declined to process this request.', { status: 422, code: 'AI_REFUSED' });
          if (choice?.finish_reason === 'length') { lastReason = 'truncated'; }
          else {
            let parsed;
            try { parsed = JSON.parse(choice?.message?.content ?? ''); } catch { lastReason = 'invalid json'; parsed = undefined; }
            if (parsed !== undefined) {
              const v = WORKFLOWS[kind].output.safeParse(parsed);
              if (v.success) return normalize(kind, v.data);
              lastReason = 'schema mismatch';
            }
          }
        }
      } catch (e) {
        if (e instanceof AIError) throw e;
        lastReason = e.name === 'AbortError' ? 'timeout' : `network: ${e.message}`;
        if (attempt === max) throw new AIError(e.name === 'AbortError' ? 'The AI service took too long to respond.' : 'Could not reach the AI service.', { status: 504, code: e.name === 'AbortError' ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE' });
      }
      this.log.warn?.(`[openai] attempt ${attempt}/${max} failed (${lastReason}); retrying`);
      await sleep(retryAfterMs || this.cfg.openaiRetryBaseMs * 2 ** (attempt - 1));
    }
    throw new AIError('The AI returned an unusable answer. Please try again.', { status: 502, code: 'AI_BAD_OUTPUT' });
  }
}
