// A field of small markers behind the page. Each one turns toward the pointer and
// keeps that heading for a moment after the pointer leaves: feedback in, a trace out.
// Nothing runs while the field is at rest.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const GAP = 34, MEMORY = 1100; // px between markers, ms to fade
let REACH = 120; // px of influence, narrower on small screens

function field() {
  const canvas = document.createElement('canvas');
  canvas.className = 'field'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, cols = 0, rows = 0, level, heading, colors, frame = 0, last = 0;
  const pointer = { x: 0, y: 0, live: false };
  const tour = { start: 0, from: [0, 0], to: [0, 0] };

  const readColors = () => {
    const s = getComputedStyle(document.documentElement);
    colors = { rest: s.getPropertyValue('--color-rule-2').trim(), lit: s.getPropertyValue('--color-accent').trim() };
  };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    REACH = Math.min(120, w * .2);
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / GAP) + 1; rows = Math.ceil(h / GAP) + 1;
    level = new Float32Array(cols * rows); heading = new Float32Array(cols * rows);
    draw();
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    ctx.fillStyle = colors.rest; ctx.globalAlpha = .5;
    for (let i = 0; i < level.length; i++) if (level[i] < .03) ctx.fillRect((i % cols) * GAP - .75, ((i / cols) | 0) * GAP - .75, 1.5, 1.5);
    ctx.strokeStyle = colors.lit;
    for (let i = 0; i < level.length; i++) {
      const a = level[i]; if (a < .03) continue;
      const x = (i % cols) * GAP, y = ((i / cols) | 0) * GAP, r = 1 + a * 5.5;
      const dx = Math.cos(heading[i]) * r, dy = Math.sin(heading[i]) * r;
      ctx.globalAlpha = .18 + a * .55;
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  const tick = now => {
    const dt = Math.min(now - last, 50); last = now;
    let source = pointer.live ? pointer : null;
    if (tour.start) { // one pass across the introduction on load, then the pointer takes over
      const t = (now - tour.start) / 1700;
      if (t >= 1 || pointer.live) tour.start = 0;
      else { const e = t * t * (3 - 2 * t); source = { x: tour.from[0] + (tour.to[0] - tour.from[0]) * e, y: tour.from[1] + (tour.to[1] - tour.from[1]) * e + Math.sin(t * Math.PI) * -40 }; }
    }
    const fade = Math.exp(-dt / MEMORY); let awake = false;
    for (let i = 0; i < level.length; i++) {
      let a = level[i] * fade;
      if (source) {
        const dx = source.x - (i % cols) * GAP, dy = source.y - ((i / cols) | 0) * GAP, d2 = dx * dx + dy * dy;
        if (d2 < REACH * REACH * 6) {
          const pull = Math.exp(-d2 / (2 * REACH * REACH));
          if (pull > a) a += (pull - a) * Math.min(1, dt / 90);
          // turn toward the source along the shorter arc, faster the closer it is
          let turn = Math.atan2(dy, dx) - heading[i];
          turn = Math.atan2(Math.sin(turn), Math.cos(turn));
          heading[i] += turn * Math.min(1, pull * dt / 70);
        }
      }
      level[i] = a; if (a >= .03) awake = true;
    }
    pointer.live = false; // influence lasts one frame per reported position
    draw();
    frame = awake || tour.start ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!frame && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); } };

  addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.live = true; wake(); }, { passive: true });
  addEventListener('pointerdown', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.live = true; wake(); }, { passive: true });
  addEventListener('resize', resize);
  new MutationObserver(() => { readColors(); draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  readColors(); resize();
  const intro = document.querySelector('.intro')?.getBoundingClientRect();
  if (intro && intro.bottom > 0) {
    tour.from = [intro.left - 40, intro.top + intro.height * .72]; tour.to = [intro.right + 40, intro.top + intro.height * .3];
    tour.start = performance.now() + 250; wake();
  }
}

// Each diagram edge gets a short accent stroke that travels it on hover, staggered by
// column so the signal reads left to right through the system.
function pulses() {
  for (const edge of document.querySelectorAll('.dg-edge')) {
    const pulse = edge.cloneNode();
    pulse.setAttribute('class', 'dg-pulse'); pulse.setAttribute('pathLength', '1'); pulse.removeAttribute('marker-end');
    const x = Number(/M\s*([\d.]+)/.exec(edge.getAttribute('d'))?.[1] || 0);
    pulse.style.setProperty('--dg-delay', `${(x / 800 * 1.9).toFixed(2)}s`);
    edge.after(pulse);
  }
}

if (!reduced.matches) { field(); pulses(); }
