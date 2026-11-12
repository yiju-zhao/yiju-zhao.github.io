import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEndpoint, verifyEndpoint } from '../scripts/configure-chat.mjs';

test('only explicit HTTPS origins can become the public assistant endpoint', () => {
  assert.equal(parseEndpoint('https://assistant.example.com/'), 'https://assistant.example.com');
  for (const bad of ['http://example.com', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com/?secret=1', 'https://example.com/#x']) assert.throws(() => parseEndpoint(bad));
});
test('activation verifies readiness and public-origin CORS before writing configuration', async () => {
  const allowed = { 'Access-Control-Allow-Origin': 'https://yiju-zhao.github.io' };
  await assert.rejects(verifyEndpoint('https://worker.test', async () => Response.json({ ready: false }, { headers: allowed })));
  await assert.rejects(verifyEndpoint('https://worker.test', async () => Response.json({ ready: true })));
  const state = await verifyEndpoint('https://worker.test', async (url, init) => {
    assert.equal(init.headers.Origin, 'https://yiju-zhao.github.io');
    if (url.endsWith('/ask')) { assert.equal(init.method, 'POST'); return Response.json({ mode: 'claude', sources: [{ id: 'experience' }] }, { headers: allowed }); }
    assert.equal(url, 'https://worker.test/health');
    return Response.json({ ready: true, model: 'claude-haiku-5-5' }, { headers: allowed });
  });
  assert.equal(state.model, 'claude-haiku-5-5'); assert.equal(state.liveVerified, true);
  await assert.rejects(verifyEndpoint('https://worker.test', async url => Response.json(url.endsWith('/health') ? { ready: true } : { mode: 'sources' }, { headers: allowed })));
});
