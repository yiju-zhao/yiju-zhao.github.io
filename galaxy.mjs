// The galaxy: a spiral disc you fly over. Drag, keys or the minimap move the ship;
// clicking a star (or Enter on the star in the sights) flies there and lands, which
// opens that project in the side panel. Everything visitors can reach is a real link
// in the HTML, so the page works the same without this script.
const section = document.querySelector('[data-galaxy]');
const panel = document.querySelector('[data-worlds]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

export let landOnHash = () => {};
if (section && panel) init();

function init() {
  const G = JSON.parse(section.dataset.galaxy), R = G.R, TILT = G.tilt;
  const view = section.querySelector('[data-view]');
  const placed = [...section.querySelectorAll('[data-layer] [data-wx]')].map(el => ({ el, x: +el.dataset.wx, y: +el.dataset.wy }));
  const stars = placed.filter(p => p.el.classList.contains('star'));
  const articles = stars.map(s => document.getElementById(s.el.dataset.world));
  const whereOut = section.querySelector('[data-hud-where]'), targetOut = section.querySelector('[data-hud-target]');
  const minimap = section.querySelector('[data-minimap]'), mm = minimap.getContext('2d');
  const count = panel.querySelector('[data-world-count]');
  const canvas = document.createElement('canvas');
  canvas.className = 'galaxy__canvas'; canvas.setAttribute('aria-hidden', 'true');
  view.prepend(canvas);
  const ctx = canvas.getContext('2d');
  section.classList.add('is-live');

  // ------------------------------------------------------------ the sky, generated once
  let seed = 20261116;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const arms = Object.values(G.arms).map(d => d * Math.PI / 180);
  const along = (base, r) => base + G.twist * r;
  const COLORS = ['#fff6ea', '#ffd7b8', '#f6b48f', '#cdd6ff'];
  const points = [];
  for (const base of arms) for (let i = 0; i < 1500; i++) {
    const r = .06 + rand() ** .85 * .98, t = along(base, r) + gauss() * .2 * (1.15 - r * .5);
    const rr = r + gauss() * .025;
    points.push({ x: R * rr * Math.cos(t), y: R * rr * Math.sin(t), b: .25 + rand() * .65, s: .6 + rand() ** 3 * 1.6, c: rand() < .12 ? 3 : rand() < .25 ? 2 : rand() < .5 ? 1 : 0 });
  }
  for (let i = 0; i < 1100; i++) { const r = Math.abs(gauss()) * .11, t = rand() * Math.PI * 2; points.push({ x: R * r * Math.cos(t), y: R * r * Math.sin(t), b: .35 + rand() * .6, s: .6 + rand() * .9, c: rand() < .5 ? 1 : 0 }); }
  for (let i = 0; i < 700; i++) { const r = Math.sqrt(rand()) * 1.25, t = rand() * Math.PI * 2; points.push({ x: R * r * Math.cos(t), y: R * r * Math.sin(t), b: .15 + rand() * .45, s: .5 + rand() * .8, c: rand() < .15 ? 3 : 0 }); }
  const byColor = COLORS.map((_, c) => points.filter(p => p.c === c));

  // the glow of the disc, painted once into an image and drawn transformed each frame
  const disc = document.createElement('canvas'), DS = 1400, SPAN = R * 2.5;
  disc.width = disc.height = DS;
  {
    const d = disc.getContext('2d');
    d.translate(DS / 2, DS / 2); d.scale(DS / SPAN, DS / SPAN);
    const blob = (x, y, r, rgb, a) => { const g = d.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); d.fillStyle = g; d.fillRect(x - r, y - r, r * 2, r * 2); };
    d.globalCompositeOperation = 'lighter';
    blob(0, 0, R * .55, '255,196,150', .22);
    blob(0, 0, R * .2, '255,222,180', .55);
    for (const base of arms) for (let r = .07; r < 1.02; r += .012) {
      const t = along(base, r), x = R * r * Math.cos(t), y = R * r * Math.sin(t);
      blob(x, y, 70 + 70 * (1 - r), '236,150,112', .05 * (1.1 - r * .6));
      if (rand() < .3) blob(x + gauss() * 40, y + gauss() * 40, 40, '170,182,255', .05);
    }
    d.globalCompositeOperation = 'source-over';
    for (const base of arms) for (let r = .14; r < .95; r += .01) {
      const t = along(base, r) - .13, x = R * r * Math.cos(t), y = R * r * Math.sin(t);
      blob(x, y, 26 + rand() * 18, '10,8,12', .2);
    }
  }

  // ------------------------------------------------------------ camera
  const cam = { x: 0, y: 0, z: 1 };
  let W = 0, H = 0, fit = 1, dpr = 1, home = { x: 0, y: 0, z: 1 };
  const project = (x, y) => [W / 2 + (x - cam.x) * cam.z, H / 2 + (y - cam.y) * cam.z * TILT];
  const zoomLimits = () => [fit * .75, fit * 7];
  const clampCam = () => {
    const [lo, hi] = zoomLimits(); cam.z = Math.min(hi, Math.max(lo, cam.z));
    const d = Math.hypot(cam.x, cam.y), max = R * 1.15; if (d > max) { cam.x *= max / d; cam.y *= max / d; }
  };
  const resize = () => {
    const rect = view.getBoundingClientRect(), before = fit;
    W = rect.width; H = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    // on wide screens the galaxy sits right of centre, leaving the introduction clear sky
    const roomy = W > 1000;
    fit = Math.min(W * (roomy ? .66 : 1) / (2.25 * R), H / (2.25 * R * TILT));
    // phones get a closer default view: the arms fill the screen and the core sits a little low
    home = roomy ? { x: -W * .13 / fit, y: 0, z: fit } : { x: 0, y: -R * .08, z: fit * (W < 600 ? 1.35 : 1) };
    if (before === 1) Object.assign(cam, home); else cam.z = cam.z * fit / before;
    clampCam(); wake();
  };

  // ------------------------------------------------------------ motion: tweens, inertia, thrust, drift
  let tween = null, vel = { x: 0, y: 0 }, keys = new Set(), idleSince = performance.now(), frame = 0, last = performance.now(), visible = true, time = 0;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const travel = (to, done) => {
    const from = { ...cam }, dist = Math.hypot(to.x - from.x, to.y - from.y) * fit;
    if (reduced) { Object.assign(cam, to); clampCam(); wake(); done?.(); return; }
    tween = { from, to, start: performance.now(), dur: Math.min(1700, 650 + dist * 1.6 + Math.abs(Math.log(to.z / from.z)) * 260), done };
    vel = { x: 0, y: 0 }; wake();
  };
  const touch = () => { idleSince = performance.now(); section.classList.add('is-flown'); };

  const step = now => {
    const dt = Math.min(now - last, 50) / 1000; last = now; time += dt;
    let moving = false;
    if (tween) {
      const t = Math.min(1, Math.max(0, (now - tween.start) / tween.dur)), e = ease(t), { from, to } = tween;
      // arc out a little on long trips: pull back, then dive in
      const lift = Math.sin(Math.PI * t) * Math.min(.45, Math.hypot(to.x - from.x, to.y - from.y) / R * .5);
      cam.x = from.x + (to.x - from.x) * e; cam.y = from.y + (to.y - from.y) * e;
      cam.z = Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e) * (1 - lift);
      moving = true;
      if (t >= 1) { const done = tween.done; tween = null; Object.assign(cam, to); done?.(); }
    } else {
      const thrust = 900 / cam.z * fit;
      if (keys.size) {
        if (keys.has('left')) vel.x -= thrust * dt * 3; if (keys.has('right')) vel.x += thrust * dt * 3;
        if (keys.has('up')) vel.y -= thrust * dt * 3 / TILT; if (keys.has('down')) vel.y += thrust * dt * 3 / TILT;
        if (keys.has('in')) cam.z *= 1 + dt * 1.4; if (keys.has('out')) cam.z /= 1 + dt * 1.4;
        touch();
      }
      if (!dragging && (Math.abs(vel.x) > .5 || Math.abs(vel.y) > .5)) {
        cam.x += vel.x * dt; cam.y += vel.y * dt; const f = Math.exp(-dt * 3.2); vel.x *= f; vel.y *= f; moving = true;
      } else if (!dragging) { vel.x = vel.y = 0; }
      // left alone, the ship drifts slowly along the disc
      if (!reduced && current < 0 && now - idleSince > 6000) { cam.x += Math.cos(time * .05) * 9 * dt; cam.y += Math.sin(time * .07) * 6 * dt; moving = true; }
      clampCam();
    }
    draw(now);
    frame = visible && !document.hidden && (moving || keys.size || dragging) ? requestAnimationFrame(step) : 0;
  };
  const wake = () => { if (!frame && visible && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(step); } };

  // ------------------------------------------------------------ drawing
  let lastWhere = '', lastTarget = null;
  const dust = Array.from({ length: 70 }, () => ({ x: rand(), y: rand(), z: .3 + rand() * .7 }));
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const zf = cam.z / fit;
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z * TILT); ctx.translate(-cam.x, -cam.y);
    ctx.drawImage(disc, -SPAN / 2, -SPAN / 2, SPAN, SPAN);
    ctx.lineWidth = 1 / cam.z;
    G.zones.forEach((z, k) => {
      ctx.strokeStyle = section.querySelector(`.galaxy__zone[data-zone="${k}"]`).classList.contains('is-lit') ? 'rgba(242,160,120,.5)' : 'rgba(255,238,220,.1)';
      ctx.setLineDash(k === 3 ? [3 / cam.z, 7 / cam.z] : []);
      ctx.beginPath(); ctx.arc(0, 0, z * R, 0, Math.PI * 2); ctx.stroke();
    });
    ctx.restore();
    // stars stay crisp at any zoom: drawn as points, a little larger as you get closer
    const grow = Math.min(2.2, .8 + zf * .35);
    byColor.forEach((list, c) => {
      ctx.fillStyle = COLORS[c];
      for (const p of list) {
        const sx = W / 2 + (p.x - cam.x) * cam.z, sy = H / 2 + (p.y - cam.y) * cam.z * TILT;
        if (sx < -4 || sy < -4 || sx > W + 4 || sy > H + 4) continue;
        const s = p.s * grow; ctx.globalAlpha = p.b; ctx.fillRect(sx - s / 2, sy - s / 2, s, s);
      }
    });
    // near dust slides past faster than the disc, which is what makes it feel like flying
    ctx.fillStyle = '#fff3e6';
    const speed = tween ? 1 : 0;
    for (const d of dust) {
      const sx = ((d.x * W - cam.x * cam.z * d.z * .9) % W + W) % W, sy = ((d.y * H - cam.y * cam.z * TILT * d.z * .9) % H + H) % H;
      ctx.globalAlpha = .12 + d.z * .25 + speed * .2; ctx.fillRect(sx, sy, 1 + d.z, 1 + d.z);
    }
    ctx.globalAlpha = 1;

    // place the HTML stars and labels
    for (const p of placed) {
      const [sx, sy] = project(p.x, p.y), off = sx < -80 || sy < -40 || sx > W + 80 || sy > H + 40;
      p.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      p.el.style.visibility = off ? 'hidden' : '';
    }
    view.toggleAttribute('data-near', zf > 1.9);

    // what's in the sights
    let target = null, best = 56;
    if (!tween && section.classList.contains('is-flown') && current < 0) for (const s of stars) { const [sx, sy] = project(s.x, s.y), d = Math.hypot(sx - W / 2, sy - H / 2); if (d < best) { best = d; target = s; } }
    if (target !== lastTarget) {
      lastTarget?.el.classList.remove('is-target'); target?.el.classList.add('is-target'); lastTarget = target;
      section.classList.toggle('has-target', Boolean(target));
      targetOut.textContent = target ? `${target.el.querySelector('.star__label').textContent} · ${G.labels.land}` : '';
    }
    const here = current >= 0 ? stars[current] : cam, where = locate(here.x, here.y);
    if (where !== lastWhere) { whereOut.textContent = where; lastWhere = where; }
    drawMinimap();
  };
  const locate = (x, y) => {
    const r = Math.hypot(x, y) / R;
    if (r < .2) return G.labels.core;
    if (r > .92) return G.labels.deep;
    const angle = Math.atan2(y, x);
    let arm = null, best = Infinity;
    for (const [id, deg] of Object.entries(G.arms)) { let d = angle - along(deg * Math.PI / 180, r); d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < best) { best = Math.abs(d); arm = id; } }
    const zone = G.zones.reduce((k, z, i) => Math.abs(z - r) < Math.abs(G.zones[k] - r) ? i : k, 0);
    return `${G.labels.arms[arm]} · ${G.labels.zones[zone]}`;
  };
  const MM = 132, mmScale = MM / (SPAN * .92);
  const drawMinimap = () => {
    const m = Math.min(devicePixelRatio || 1, 2);
    if (minimap.width !== MM * m) { minimap.width = minimap.height = MM * m; }
    mm.setTransform(m, 0, 0, m, 0, 0); mm.clearRect(0, 0, MM, MM);
    mm.save(); mm.translate(MM / 2, MM / 2); mm.scale(mmScale, mmScale);
    mm.globalAlpha = .9; mm.drawImage(disc, -SPAN / 2, -SPAN / 2, SPAN, SPAN); mm.globalAlpha = 1;
    for (const s of stars) { mm.fillStyle = s.el.classList.contains('star--major') ? '#e8875f' : 'rgba(255,240,225,.75)'; const r = (s.el.classList.contains('star--major') ? 3 : 2) / mmScale; mm.fillRect(s.x - r / 2, s.y - r / 2, r, r); }
    const vw = W / cam.z, vh = H / (cam.z * TILT);
    mm.strokeStyle = 'rgba(255,255,255,.85)'; mm.lineWidth = 1 / mmScale;
    mm.strokeRect(cam.x - vw / 2, cam.y - vh / 2, vw, vh);
    mm.restore();
  };

  // ------------------------------------------------------------ landing on a star = opening its world
  const wide = matchMedia('(min-width: 861px)');
  let current = -1;
  const lightZone = k => { for (const z of section.querySelectorAll('.galaxy__zone')) z.classList.toggle('is-lit', k != null && z.dataset.zone === String(k)); wake(); draw(); };
  const approach = (i, z) => {
    const s = stars[i], zoom = Math.max(z ?? cam.z, fit * 2.6);
    // with the panel open on a wide screen, park the star in the middle of the space left over
    // on a narrow screen the panel rises from the bottom, so park the star in the strip above it
    let shiftX = 0, shiftY = 0;
    if (panel.classList.contains('is-open')) {
      const rect = view.getBoundingClientRect();
      if (wide.matches) shiftX = (panel.offsetWidth + 24) / 2 - Math.max(0, innerWidth - rect.right) / 2;
      else { const top = Math.max(rect.top, 64), sheet = innerHeight - 8 - panel.offsetHeight; shiftY = H / 2 - ((top + Math.max(sheet, top + 80)) / 2 - rect.top); }
    }
    return { x: s.x + shiftX / zoom, y: s.y + shiftY / (zoom * TILT), z: zoom };
  };
  const open = (i, { focus = true, fly = true } = {}) => {
    const changed = i !== current;
    current = i;
    stars.forEach((s, j) => s.el.classList.toggle('is-current', j === i));
    articles.forEach((a, j) => a.classList.toggle('is-open', j === i));
    section.classList.add('has-current');
    if (changed) { replay(articles[i], 'is-entering'); replay(articles[i], 'is-fresh'); panel.scrollTop = 0; }
    panel.classList.add('is-open');
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${stars.length}`;
    lightZone(stars[i].el.dataset.zone);
    if (fly) travel(approach(i));
    if (focus) articles[i].querySelector('h3').focus({ preventScroll: true });
  };
  const close = ({ restore = true } = {}) => {
    if (current < 0) return;
    const back = stars[current].el;
    current = -1;
    panel.classList.remove('is-open'); section.classList.remove('has-current');
    for (const s of stars) s.el.classList.remove('is-current');
    lightZone(null);
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (restore) back.focus({ preventScroll: true });
  };
  const indexOf = hash => { try { return stars.findIndex(s => `#${s.el.dataset.world}` === decodeURIComponent(hash)); } catch { return -1; } };
  const go = (i, how = 'push') => { history[how === 'push' ? 'pushState' : 'replaceState'](null, '', `#${stars[i].el.dataset.world}`); open(i); };
  const replay = (el, name) => { el.classList.remove(name); void el.offsetWidth; el.classList.add(name); };

  // ------------------------------------------------------------ input
  const pointers = new Map();
  let dragging = false, moved = 0, pinch = 0, downOn = null;
  view.addEventListener('pointerdown', event => {
    if (event.button !== 0 && event.pointerType === 'mouse') return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    view.setPointerCapture(event.pointerId);
    tween = null; vel = { x: 0, y: 0 }; moved = 0; downOn = event.target.closest('.star');
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); }
    dragging = true; view.classList.add('is-dragging'); touch(); wake();
  });
  view.addEventListener('pointermove', event => {
    const p = pointers.get(event.pointerId); if (!p) return;
    const dx = event.clientX - p.x, dy = event.clientY - p.y;
    p.x = event.clientX; p.y = event.clientY;
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch = d; moved += 10; return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    cam.x -= dx / cam.z; cam.y -= dy / (cam.z * TILT);
    const dt = Math.max(event.timeStamp - (p.t || event.timeStamp - 16), 8) / 1000; p.t = event.timeStamp;
    vel = { x: -dx / cam.z / dt * .9, y: -dy / (cam.z * TILT) / dt * .9 };
    clampCam(); wake();
  });
  const release = event => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size) { pinch = 0; return; }
    dragging = false; view.classList.remove('is-dragging');
    if (moved < 6) {
      vel = { x: 0, y: 0 };
      if (downOn) { const i = stars.findIndex(s => s.el === downOn); if (i === current) close(); else go(i, current < 0 ? 'push' : 'replace'); }
      else if (current >= 0) close({ restore: false });
    }
    downOn = null; wake();
  };
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);
  // stars are links: keep keyboard and assistive activation, but the pointer handler above owns mouse clicks
  for (const s of stars) {
    s.el.addEventListener('click', event => { event.preventDefault(); if (event.detail === 0) { const i = stars.indexOf(s); go(i, current < 0 ? 'push' : 'replace'); } });
    s.el.addEventListener('focus', () => { if (current < 0 && !dragging) { const i = stars.indexOf(s); travel({ x: s.x, y: s.y, z: Math.max(cam.z, fit * 1.8) }); } });
  }
  const zoomAt = (factor, sx, sy) => {
    const rect = view.getBoundingClientRect(), px = sx - rect.left, py = sy - rect.top;
    const wx = cam.x + (px - W / 2) / cam.z, wy = cam.y + (py - H / 2) / (cam.z * TILT);
    cam.z *= factor; clampCam();
    cam.x = wx - (px - W / 2) / cam.z; cam.y = wy - (py - H / 2) / (cam.z * TILT);
    clampCam(); touch(); wake();
  };
  view.addEventListener('wheel', event => {
    // plain scrolling keeps scrolling the page; pinch and Ctrl/⌘ + scroll zoom the galaxy
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault(); tween = null;
    zoomAt(Math.exp(-event.deltaY * .01), event.clientX, event.clientY);
  }, { passive: false });
  const KEYS = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', '+': 'in', '=': 'in', '-': 'out', _: 'out' };
  view.addEventListener('keydown', event => {
    if (event.target !== view && !event.target.classList.contains('star')) return;
    const k = KEYS[event.key];
    if (k) { event.preventDefault(); tween = null; keys.add(k); wake(); return; }
    if (event.key === 'Enter' && event.target === view && lastTarget) { event.preventDefault(); go(stars.indexOf(lastTarget)); }
    if (event.key === 'Home' || event.key === '0') { event.preventDefault(); travel(home); }
  });
  view.addEventListener('keyup', event => { const k = KEYS[event.key]; if (k) keys.delete(k); });
  view.addEventListener('blur', () => keys.clear());
  view.addEventListener('focus', () => { touch(); wake(); });
  for (const b of section.querySelectorAll('[data-zoom]')) b.addEventListener('click', () => { touch(); travel({ x: cam.x, y: cam.y, z: Math.min(zoomLimits()[1], Math.max(zoomLimits()[0], cam.z * (b.dataset.zoom > 0 ? 1.7 : 1 / 1.7))) }); });
  section.querySelector('[data-home]').addEventListener('click', () => { touch(); if (current >= 0) close({ restore: false }); travel(home); });
  minimap.addEventListener('click', event => {
    const r = minimap.getBoundingClientRect();
    const x = (event.clientX - r.left - r.width / 2) / (r.width / MM) / mmScale, y = (event.clientY - r.top - r.height / 2) / (r.height / MM) / mmScale;
    touch(); travel({ x, y, z: Math.max(cam.z, fit * 1.6) });
  });

  // panel controls
  for (const button of panel.querySelectorAll('[data-step]')) button.addEventListener('click', () => go((current + Number(button.dataset.step) + stars.length) % stars.length, 'replace'));
  panel.querySelector('[data-close-world]').addEventListener('click', () => close());
  panel.addEventListener('keydown', event => {
    if (event.target.closest('input, textarea, .dg-wrap')) return;
    const d = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (d) { event.preventDefault(); go((current + d + stars.length) % stars.length, 'replace'); }
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && current >= 0 && !document.querySelector('dialog[open]')) close(); });
  document.addEventListener('pointerdown', event => {
    if (current >= 0 && !panel.contains(event.target) && !section.contains(event.target) && !event.target.closest('dialog, .nav')) close({ restore: false });
  });
  // links to a project anywhere else on the page (research notes, answer sources) fly there
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link || section.contains(link)) return;
    const i = indexOf(link.hash);
    if (i >= 0) { event.preventDefault(); section.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); go(i); }
  });
  addEventListener('popstate', () => { const i = indexOf(location.hash); if (i >= 0) open(i); else close({ restore: false }); });
  addEventListener('hashchange', () => { const i = indexOf(location.hash); if (i >= 0) open(i); });
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', wake);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }).observe(section);

  // ------------------------------------------------------------ arrival
  resize();
  landOnHash = () => { const i = indexOf(location.hash); if (i >= 0) open(i, { focus: false }); };
  if (root.classList.contains('is-landing') && !reduced) {
    // a fresh visit starts far out and falls toward the disc
    const end = { ...home };
    cam.z = fit * .2; cam.x = R * .5; cam.y = -R * .9;
    tween = { from: { ...cam }, to: end, start: performance.now() + 150, dur: 2400, done: () => { root.classList.remove('is-landing'); landOnHash(); } };
    // the minimum zoom is bypassed while arriving
    wake();
  } else { root.classList.remove('is-landing'); landOnHash(); }
}
