import { MemoryStore } from './memory.js';
import { SupabaseStore } from './supabase.js';

export function createStore(cfg, logger = console) {
  if (cfg.supabaseUrl && cfg.supabaseServiceKey) return new SupabaseStore({ url: cfg.supabaseUrl, serviceKey: cfg.supabaseServiceKey });
  logger.warn?.('[store] Supabase not configured: using the in-memory store (data is lost on restart).');
  return new MemoryStore();
}
