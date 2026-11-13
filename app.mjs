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

for (const button of document.querySelectorAll('[data-expand-work]')) button.addEventListener('click', () => {
  const expanded = button.closest('.work').classList.toggle('is-expanded');
  button.setAttribute('aria-expanded', String(expanded));
  button.textContent = `${expanded ? text.collapseDiagram : text.expandDiagram} ${expanded ? '↙' : '↗'}`;
});
