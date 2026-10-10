import { OpenAIEngine } from './openai.js';
import { MockEngine } from './mock.js';

export function createEngine(cfg, logger = console) {
  if (cfg.aiEngine === 'openai') return new OpenAIEngine(cfg, logger);
  logger.warn?.('[ai] Using the offline heuristic engine. Set OPENAI_API_KEY for real AI feedback.');
  return new MockEngine();
}
