import { knowledgeRecords } from './lib/public-profile.mjs';
import { lookup } from './lib/retrieval.mjs';
import { ui } from './experience-ui.mjs';
import './motion.mjs';

const lang = document.documentElement.lang.startsWith('zh') ? 'zh' : 'en';
const text = ui[lang], records = knowledgeRecords(lang);
const dialog = document.querySelector('#portfolio-assistant');
const input = document.querySelector('#assistant-question');
const result = document.querySelector('#assistant-result');
const form = document.querySelector('#assistant-form');
const submit = form.querySelector('button[type="submit"]');
let endpoint = '', connected = false, busy = false;

function openAssistant(question = '') {
  if (!dialog.open) dialog.showModal();
  if (question) input.value = question;
  input.focus();
  if (question) form.requestSubmit();
}
for (const button of document.querySelectorAll('[data-ask]')) button.addEventListener('click', () => openAssistant(button.dataset.question || ''));
for (const button of document.querySelectorAll('[data-close-assistant]')) button.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openAssistant(); } });

function localAnswer(question, unavailable = false) {
  const matches = lookup(question, records);
  showAnswer({ mode: 'sources', excerpts: matches, unavailable });
}
function sourceLink(source) {
  // Sources are references in our own published record set, never model URLs.
  const known = records.find(r => r.id === source.id);
  if (!known) return null;
  const a = document.createElement('a');
  a.href = known.href; a.textContent = `${known.title} ↗`;
  a.addEventListener('click', () => dialog.close());
  return a;
}
function showAnswer(data) {
  result.replaceChildren();
  const note = document.createElement('p'); note.className = 'answer-note';
  note.textContent = data.mode === 'claude' ? text.aiNotice : data.unavailable ? text.unavailable : text.localNotice;
  result.append(note);
  let sources = [];
  if (data.mode === 'claude' && typeof data.answer === 'string') {
    const p = document.createElement('p'); p.className = 'answer-text'; p.textContent = data.answer;
    result.append(p); sources = data.sources || [];
  } else {
    const excerpts = data.excerpts || [];
    if (!excerpts.length) { sources.push(records.find(r => r.id === 'contact')); const p = document.createElement('p'); p.className = 'answer-text'; p.textContent = text.unknown; result.append(p); }
    for (const excerpt of excerpts) {
      const known = records.find(r => r.id === excerpt.id);
      if (!known) continue;
      const section = document.createElement('section'); section.className = 'answer-excerpt';
      const h = document.createElement('h3'); h.textContent = known.title;
      const p = document.createElement('p'); p.textContent = known.text;
      section.append(h, p); result.append(section); sources.push(known);
    }
  }
  if (sources.length) {
    const nav = document.createElement('div'); nav.className = 'answer-sources';
    const label = document.createElement('span'); label.textContent = text.sources; nav.append(label);
    for (const s of sources) { const link = sourceLink(s); if (link) nav.append(link); }
    result.append(nav);
  }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = input.value.trim();
  if (busy || question.length < 2 || question.length > 1200) return;
  busy = true; submit.disabled = true; input.readOnly = true;
  for (const b of document.querySelectorAll('[data-ask], [data-clear-answer]')) b.disabled = true; result.setAttribute('aria-busy', 'true'); result.textContent = text.loading;
  try {
    if (!connected) { localAnswer(question); return; }
    const response = await fetch(`${endpoint}/ask`, { method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, language: lang }), signal: AbortSignal.timeout(22000),
    });
    if (!response.ok) throw new Error('unavailable');
    const data = await response.json();
    if (data.mode === 'claude') showAnswer(data);
    else localAnswer(question, data.reason !== 'not_configured');
  } catch { localAnswer(question, true); }
  finally { busy = false; submit.disabled = false; input.readOnly = false;
    for (const b of document.querySelectorAll('[data-ask], [data-clear-answer]')) b.disabled = false;
    result.removeAttribute('aria-busy'); }
});

document.querySelector('[data-clear-answer]').addEventListener('click', () => { if (busy) return; result.textContent = text.empty; input.value = ''; input.focus(); });

// Connect only to a deployment URL explicitly set by the site owner.
void (async () => {
try {
  const response = await fetch('chat-config.json', { cache: 'no-cache' });
  const config = await response.json();
  if (typeof config.endpoint === 'string' && config.endpoint) {
    const url = new URL(config.endpoint);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash) {
      endpoint = url.href.replace(/\/$/, '');
      const health = await fetch(`${endpoint}/health`, { credentials: 'omit', signal: AbortSignal.timeout(3500) });
      const state = await health.json(); connected = health.ok && state.ready === true;
    }
  }
} catch { /* Source lookup is immediately usable even without a server. */ }

})();

const themeButton = document.querySelector('[data-theme-toggle]');
let savedTheme;
try { savedTheme = localStorage.getItem('portfolio-theme'); } catch {}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
}
if (savedTheme === 'light' || savedTheme === 'dark') applyTheme(savedTheme);
else applyTheme(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(theme); try { localStorage.setItem('portfolio-theme', theme); } catch {}
});

if ('IntersectionObserver' in window) {
  const links = [...document.querySelectorAll('.nav__sections a')];
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      for (const link of links) {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });
  for (const section of document.querySelectorAll('main > section[id]')) observer.observe(section);
}

// Asking from the introduction opens the same dialog, already answering.
document.querySelector('[data-ask-form]')?.addEventListener('submit', event => {
  event.preventDefault();
  const field = event.currentTarget.elements.question;
  openAssistant(field.value.trim()); field.value = '';
});

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const replay = (el, name) => { el.classList.remove(name); void el.offsetWidth; el.classList.add(name); };

// The map: every world is a project. Landing on one opens it in the side panel; on wide
// screens the map also turns its camera toward that world.
const map = document.querySelector('[data-map]'), panel = document.querySelector('[data-worlds]');
let landOnHash = () => {};
if (map && panel) {
  const planets = [...map.querySelectorAll('.planet')];
  const articles = planets.map(p => document.getElementById(p.dataset.world));
  const camera = map.querySelector('[data-camera]'), spin = map.querySelector('[data-spin]');
  const system = map.closest('.system'), count = panel.querySelector('[data-world-count]');
  const markers = [...map.querySelectorAll('.map__ring, .map__ring-label')];
  const wide = matchMedia('(min-width: 861px)');
  let current = -1;
  const light = ring => { for (const m of markers) m.classList.toggle('is-lit', ring != null && m.dataset.ring === String(ring)); };
  const aim = planet => {
    const rect = map.getBoundingClientRect();
    const visible = rect.bottom > 160 && rect.top < innerHeight - 160;
    if (!planet || !wide.matches || !visible) { camera.style.transform = ''; system.classList.remove('is-focused'); return; }
    // where the world sits now: its place on the map, turned by however far the map has spun
    const turn = (parseFloat(getComputedStyle(spin).rotate) || 0) * Math.PI / 180;
    const x0 = parseFloat(planet.style.getPropertyValue('--x')) / 100 - .5, y0 = parseFloat(planet.style.getPropertyValue('--y')) / 100 - .5;
    const px = (.5 + x0 * Math.cos(turn) - y0 * Math.sin(turn)) * rect.width, py = (.5 + x0 * Math.sin(turn) + y0 * Math.cos(turn)) * rect.height;
    const room = innerWidth - panel.offsetWidth - 24;
    const tx = room / 2 - rect.left, ty = Math.min(Math.max(innerHeight / 2, rect.top + 120), rect.bottom - 120) - rect.top;
    camera.style.transformOrigin = `${px}px ${py}px`;
    camera.style.transform = `translate(${tx - px}px, ${ty - py}px) scale(1.35)`;
    system.classList.add('is-focused');
  };
  const open = (index, { focus = true } = {}) => {
    const changed = index !== current;
    current = index;
    planets.forEach((p, i) => p.classList.toggle('is-current', i === index));
    articles.forEach((a, i) => a.classList.toggle('is-open', i === index));
    map.classList.add('has-current', 'is-paused');
    if (changed) { replay(articles[index], 'is-entering'); replay(articles[index], 'is-fresh'); panel.scrollTop = 0; }
    panel.classList.add('is-open');
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${planets.length}`;
    light(planets[index].dataset.ring); aim(planets[index]);
    if (focus) articles[index].querySelector('h3').focus({ preventScroll: true });
  };
  const close = ({ restore = true } = {}) => {
    if (current < 0) return;
    const back = planets[current];
    current = -1;
    panel.classList.remove('is-open'); map.classList.remove('has-current', 'is-paused');
    for (const p of planets) p.classList.remove('is-current');
    light(null); aim(null);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (restore) back.focus({ preventScroll: true });
  };
  const indexOf = hash => { try { return planets.findIndex(p => `#${p.dataset.world}` === decodeURIComponent(hash)); } catch { return -1; } };
  const go = (index, how = 'push') => { open(index); history[how === 'push' ? 'pushState' : 'replaceState'](null, '', `#${planets[index].dataset.world}`); };

  map.addEventListener('click', event => {
    const planet = event.target.closest('.planet');
    if (!planet) { close({ restore: false }); return; }
    event.preventDefault();
    const index = planets.indexOf(planet);
    if (index === current) close(); else go(index, current < 0 ? 'push' : 'replace');
  });
  for (const planet of planets) {
    planet.addEventListener('pointerenter', () => light(planet.dataset.ring));
    planet.addEventListener('pointerleave', () => light(current < 0 ? null : planets[current].dataset.ring));
    planet.addEventListener('focus', () => light(planet.dataset.ring));
    planet.addEventListener('blur', () => light(current < 0 ? null : planets[current].dataset.ring));
  }
  for (const button of panel.querySelectorAll('[data-step]')) button.addEventListener('click', () => go((current + Number(button.dataset.step) + planets.length) % planets.length, 'replace'));
  panel.querySelector('[data-close-world]').addEventListener('click', () => close());
  panel.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, .dg-wrap')) return;
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step) { event.preventDefault(); go((current + step + planets.length) % planets.length, 'replace'); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && current >= 0 && !document.querySelector('dialog[open]')) close(); });
  document.addEventListener('pointerdown', event => {
    if (current >= 0 && !panel.contains(event.target) && !map.contains(event.target) && !event.target.closest('dialog, .nav')) close({ restore: false });
  });
  // Links to a project anywhere on the page (research notes, answer sources) land on that world.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || map.contains(link)) return;
    const index = indexOf(link.hash);
    if (index >= 0) { event.preventDefault(); go(index); }
  });
  addEventListener('hashchange', () => { const index = indexOf(location.hash); if (index >= 0) open(index); else close({ restore: false }); });
  addEventListener('popstate', () => { const index = indexOf(location.hash); if (index >= 0) open(index); else close({ restore: false }); });
  addEventListener('resize', () => { if (current >= 0) aim(planets[current]); });
  landOnHash = () => { const index = indexOf(location.hash); if (index >= 0) open(index); };
}

// Opening: on a fresh visit or reload the map assembles once and the stars make one short jump.
const root = document.documentElement;
if (root.classList.contains('is-landing') && !reducedMotion) {
  dispatchEvent(new Event('portfolio:land'));
  setTimeout(() => root.classList.remove('is-landing'), 2000);
} else root.classList.remove('is-landing');
landOnHash();

// Diagrams: point at a part to keep what feeds it and what it feeds, and quiet the rest.
for (const svg of document.querySelectorAll('.dg')) {
  const edges = [...svg.querySelectorAll('[data-from]')], boxes = [...svg.querySelectorAll('.dg-box')];
  const note = svg.closest('figure')?.querySelector('[data-trace-note]');
  const label = id => boxes.find(box => box.dataset.node === id)?.querySelector('.dg-name').textContent;
  const reach = (start, from, to) => {
    const found = new Set([start]), queue = [start];
    while (queue.length) { const at = queue.pop(); for (const e of edges) if (e.dataset[from] === at && !found.has(e.dataset[to])) { found.add(e.dataset[to]); queue.push(e.dataset[to]); } }
    return found;
  };
  let origin = null, touch = false;
  const trace = id => {
    if (id === origin) return;
    origin = id; svg.classList.toggle('is-tracing', Boolean(id));
    const up = id ? reach(id, 'to', 'from') : new Set(), down = id ? reach(id, 'from', 'to') : new Set();
    for (const box of boxes) { box.classList.toggle('is-on', up.has(box.dataset.node) || down.has(box.dataset.node)); box.classList.toggle('is-origin', box.dataset.node === id); }
    for (const e of edges) e.classList.toggle('is-on', (up.has(e.dataset.from) && up.has(e.dataset.to)) || (down.has(e.dataset.from) && down.has(e.dataset.to)));
    if (!note) return;
    if (!id) { note.textContent = note.dataset.default; return; }
    const direct = (from, to) => [...new Set(edges.filter(e => e.dataset[to] === id).map(e => label(e.dataset[from])))].join(', ');
    note.textContent = [direct('from', 'to'), label(id), direct('to', 'from')].filter(Boolean).join(' → ');
  };
  svg.addEventListener('pointerdown', event => { touch = event.pointerType !== 'mouse'; });
  svg.addEventListener('pointerover', event => { if (event.pointerType === 'mouse') trace(event.target.closest('.dg-box')?.dataset.node || null); });
  svg.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') trace(null); });
  svg.addEventListener('click', event => { if (!touch) return; const id = event.target.closest('.dg-box')?.dataset.node || null; trace(id === origin ? null : id); });
}
