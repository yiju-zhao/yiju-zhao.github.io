// Stars behind the page. Nearer stars shift more with the pointer and with scrolling,
// so moving through the page reads as moving through space. Nothing runs at rest.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const root = document.documentElement;
const JUMP = 1100; // ms

function stars() {
  const canvas = document.createElement('canvas');
  canvas.className = 'field'; canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, list = [], color = '', frame = 0, jump = 0, drawnScroll = -1;
  const view = { x: 0, y: 0, tx: 0, ty: 0 }; // pointer offset from centre, -1..1, eased

  const readColor = () => { color = getComputedStyle(root).getPropertyValue('--color-star').trim(); };
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth; h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(300, w * h / 4600));
    list = Array.from({ length: count }, () => ({ x: Math.random() * w, y: Math.random() * h, z: .12 + Math.random() ** 2.2 * .88, r: .6 + Math.random() * .8 }));
    draw(performance.now());
  };
  const draw = now => {
    ctx.clearRect(0, 0, w, h);
    const t = jump ? Math.min(1, (now - jump) / JUMP) : 1;
    const burst = jump ? Math.sin(Math.PI * t) ** 1.4 : 0;
    const cx = w / 2, cy = h / 2, sy = scrollY;
    ctx.fillStyle = ctx.strokeStyle = color; ctx.lineCap = 'round';
    for (const s of list) {
      const x = s.x - view.x * 22 * s.z;
      const y = ((s.y - sy * .1 * s.z - view.y * 16 * s.z) % h + h) % h;
      ctx.globalAlpha = .18 + s.z * .62;
      if (burst > .01) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, len = burst * (6 + d * .08) * s.z;
        ctx.globalAlpha *= .75; ctx.lineWidth = s.r * (.5 + s.z * .6);
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx / d * len, y + dy / d * len); ctx.stroke();
      } else {
        const size = s.r * (.5 + s.z);
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
    drawnScroll = sy;
    if (t >= 1) jump = 0;
  };
  const tick = now => {
    view.x += (view.tx - view.x) * .07; view.y += (view.ty - view.y) * .07;
    draw(now);
    const settling = Math.abs(view.tx - view.x) > .002 || Math.abs(view.ty - view.y) > .002;
    frame = settling || jump ? requestAnimationFrame(tick) : 0;
  };
  const wake = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(tick); };

  if (!reduced.matches) {
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; view.tx = e.clientX / w * 2 - 1; view.ty = e.clientY / h * 2 - 1; wake(); }, { passive: true });
  addEventListener('scroll', () => { if (scrollY !== drawnScroll) wake(); }, { passive: true });
  addEventListener('portfolio:land', () => { jump = performance.now(); wake(); });
  }
  addEventListener('resize', resize);
  new MutationObserver(() => { readColor(); draw(performance.now()); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  readColor(); resize();
}

// Each diagram edge gets a short accent stroke that travels it, staggered by column
// so the signal reads left to right through the system.
function pulses() {
  for (const edge of document.querySelectorAll('.dg-edge')) {
    const pulse = edge.cloneNode();
    pulse.setAttribute('class', 'dg-pulse'); pulse.setAttribute('pathLength', '1'); pulse.removeAttribute('marker-end');
    const x = Number(/M\s*([\d.]+)/.exec(edge.getAttribute('d'))?.[1] || 0);
    pulse.style.setProperty('--dg-delay', `${(x / 800 * 1.9).toFixed(2)}s`);
    edge.after(pulse);
  }
}

stars();
if (!reduced.matches) pulses();
