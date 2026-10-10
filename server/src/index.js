import { loadConfig, validateConfig } from './config.js';
import { createStore } from './store/index.js';
import { createEngine } from './ai/index.js';
import { createApp } from './app.js';

const cfg = loadConfig();
const problems = validateConfig(cfg);
if (problems.length) { console.error('Configuration problems:\n - ' + problems.join('\n - ')); process.exit(1); }

const store = createStore(cfg), engine = createEngine(cfg);
const app = await createApp({ cfg, store, engine });
const server = app.listen(cfg.port, () => console.log(`[server] http://localhost:${cfg.port}  auth=${cfg.authMode}  ai=${engine.name}${engine.model ? `(${engine.model})` : ''}  store=${store.name}`));
if (cfg.authMode === 'demo') console.warn('[auth] DEMO auth is enabled: anyone can act as any demo user. Never expose this to the internet.');
const stop = () => server.close(() => process.exit(0));
process.on('SIGINT', stop); process.on('SIGTERM', stop);
