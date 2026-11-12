import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { publicProfile, knowledgeRecords, SITE } from '../lib/public-profile.mjs';
import { copy } from '../content.mjs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const files = ['index.html', 'zh.html', 'recruiters.html'];
const unescape = s => s.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const ids = file => [...read(file).matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const plain = s => unescape(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

test('all generated pages have unique anchors, valid local links and real assets', () => {
  for (const file of files) {
    const html = read(file), pageIds = ids(file);
    assert.equal(new Set(pageIds).size, pageIds.length, `${file}: duplicate IDs`);
    assert.equal([...html.matchAll(/<h1\b/g)].length, 1, `${file}: single h1`);
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const href = unescape(match[1]);
      if (/^(mailto:|https?:)/.test(href) && !href.startsWith(SITE)) continue;
      const url = new URL(href, `${SITE}/${file}`);
      if (url.origin !== SITE) continue;
      const target = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      assert.ok(existsSync(new URL(target, root)), `${file}: missing ${target}`);
      if (url.hash && target.endsWith('.html')) assert.ok(ids(target).includes(decodeURIComponent(url.hash.slice(1))), `${file}: broken ${href}`);
    }
    for (const m of html.matchAll(/\baria-(?:labelledby|describedby|controls)="([^"]+)"/g)) for (const id of m[1].split(' ')) assert.ok(pageIds.includes(id), `${file}: missing ARIA target ${id}`);
  }
});
test('bilingual pages keep complete project graphs and labeled source lookup', () => {
  for (const [file, lang] of [['index.html','en'], ['zh.html','zh-CN']]) {
    const html = read(file);
    assert.ok(html.includes(`<html lang="${lang}">`));
    assert.equal([...html.matchAll(/<svg class="dg"/g)].length, 22);
    assert.ok(html.includes('id="portfolio-assistant"')); assert.ok(html.includes('type="module" src="app.mjs"'));
    assert.ok(html.includes('data-assistant-mode')); assert.ok(html.includes('<noscript>'));
    for (const hidden of ['cbrs', 'a-share', 'h-level', 'applications', 'job-survey']) assert.ok(!ids(file).includes(hidden));
  }
  const englishBody = read('index.html').split('<body>')[1];
  assert.equal((plain(englishBody).match(/[\u3400-\u9fff]/g) || []).join(''), '中文');
});
test('structured person data and recruiter-facing files agree with visible career facts', () => {
  const p = publicProfile();
  assert.deepEqual(JSON.parse(read('profile.json')), p);
  const html = read('index.html'), visible = plain(html.split('<body>')[1]);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  assert.equal(graph.find(x => x['@type'] === 'ProfilePage').mainEntity['@id'], `${SITE}/#person`);
  const person = graph.find(x => x['@type'] === 'Person');
  assert.equal(person.name, p.name); assert.ok(visible.includes(person.jobTitle)); assert.ok(visible.includes(person.worksFor.name));
  assert.ok(!person.image, 'No invented avatar');
  for (const e of p.experience) assert.ok(visible.includes(e.text));
  for (const i of p.interests) assert.ok(visible.includes(i.description));
  for (const project of p.projects) assert.ok(visible.includes(project.implementation));
  assert.ok(visible.includes(copy.en.intro));
  assert.ok(read('profile.md').includes('Evaluation is ongoing.'));
  assert.ok(read('recruiters.html').includes('evaluation is ongoing'));
});
test('assistant document anchors are resolvable and no private career details enter the public profile', () => {
  for (const lang of ['en','zh']) for (const r of knowledgeRecords(lang)) {
    assert.ok(ids(lang === 'en' ? 'index.html' : 'zh.html').includes(r.href.slice(1)));
    assert.ok(r.text.length > 0 && r.text.length < 2500);
  }
  const data = read('profile.json') + read('profile.md');
  for (const value of ['519-729', '160K', '200K', '300K', 'Permanent Resident', 'unpublished', '16%', '44%', '0.53']) assert.ok(!data.includes(value));
});
test('sitemap and crawler hints point to real canonical pages without synthetic anchor URLs', () => {
  const locations = [...read('sitemap.xml').matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
  assert.equal(locations.length, 3);
  for (const location of locations) { assert.ok(!location.includes('#')); const u = new URL(location); assert.ok(existsSync(new URL(u.pathname === '/' ? 'index.html' : u.pathname.slice(1), root))); }
  assert.ok(read('robots.txt').includes(`Sitemap: ${SITE}/sitemap.xml`));
  assert.ok(read('llms.txt').includes(`${SITE}/profile.json`));
  assert.ok(read('index.html').includes(`<link rel="canonical" href="${SITE}/">`));
  assert.ok(read('zh.html').includes(`<link rel="canonical" href="${SITE}/zh.html">`));
});
test('the social image is a real 1200 by 630 PNG and CSS tokens are defined', () => {
  const png = readFileSync(new URL('assets/social.png', root));
  assert.equal(png.subarray(1,4).toString(), 'PNG'); assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
  const css = ['base.css','styles.css','tokens.css'].map(read).join('\n');
  const definitions = new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  for (const m of css.matchAll(/var\((--[\w-]+)/g)) assert.ok(definitions.has(m[1]), `Missing token ${m[1]}`);
});
