import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { SITE } from '../lib/public-profile.mjs';

export function parseEndpoint(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Use the HTTPS origin of the Worker, without credentials, a path, query, or fragment.');
  return url.origin;
}
export async function verifyEndpoint(endpoint, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(`${endpoint}/health`, { headers: { Origin: SITE }, signal: AbortSignal.timeout(8000) });
  if (!response.ok || response.headers.get('Access-Control-Allow-Origin') !== SITE) throw new Error('The Worker is not reachable by the public portfolio origin. Check ALLOWED_ORIGINS.');
  const state = await response.json();
  if (state.ready !== true) throw new Error('The Worker is missing its Anthropic secret or rate/budget bindings.');
  // One bounded, billable probe confirms that this is real Claude mode, not a
  // configured-but-invalid key silently falling back to source lookup.
  const probe = await fetchImpl(`${endpoint}/ask`, { method: 'POST', headers: { Origin: SITE, 'Content-Type': 'application/json' }, body: JSON.stringify({ question: 'What does Yiju work on?', language: 'en' }), signal: AbortSignal.timeout(22000) });
  const answer = await probe.json();
  if (!probe.ok || answer.mode !== 'claude' || !answer.sources?.length) throw new Error('Claude did not return a cited answer. Check the API key, provider access and request limits.');
  return { ...state, liveVerified: true };
}
async function main() {
  const value = process.argv[2];
  if (!value) throw new Error('Usage: node scripts/configure-chat.mjs https://YOUR-WORKER.workers.dev');
  const endpoint = parseEndpoint(value);
  const state = await verifyEndpoint(endpoint);
  writeFileSync(new URL('../chat-config.json', import.meta.url), JSON.stringify({ endpoint }, null, 2) + '\n');
  console.log(`Connected ${endpoint} (${state.model}). Publish chat-config.json with the site to activate AI answers.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
