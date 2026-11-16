// The galaxy, in 3D. A WebGL point cloud of a spiral disc that visitors fly through:
// drag to look around, WASD / arrows / two fingers to fly, pinch or Ctrl + scroll to
// move closer. Clicking a star (or Enter on the star in the sights) flies there and
// lands, which opens that project's panel. Every star is still a real link in the HTML,
// so without WebGL or scripting the page keeps a flat map that works.
const section = document.querySelector('[data-galaxy]');
const panel = document.querySelector('[data-worlds]');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;

if (section && panel) init();

function init() {
  const G = JSON.parse(section.dataset.galaxy), R = G.R;
  const view = section.querySelector('[data-view]');
  const canvas = document.createElement('canvas');
  canvas.className = 'galaxy__canvas'; canvas.setAttribute('aria-hidden', 'true');
  // without WebGL the stars still fly in 3D; only the painted sky behind them is missing
  const gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true });
  let glReady = Boolean(gl);
  view.prepend(canvas);
  section.classList.add('is-live');

  const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0) / 4294967295; };
  const placed = [...section.querySelectorAll('[data-layer] [data-wx]')].map(el => {
    const lift = el.classList.contains('star') ? (hash(el.dataset.world) - .5) * 50 : el.classList.contains('galaxy__arm') ? 30 : 0;
    return { el, x: +el.dataset.wx, y: lift, z: +el.dataset.wy };
  });
  const stars = placed.filter(p => p.el.classList.contains('star'));
  const articles = stars.map(s => document.getElementById(s.el.dataset.world));
  const reticle = view.querySelector('.galaxy__reticle');
  const whereOut = section.querySelector('[data-hud-where]'), targetOut = section.querySelector('[data-hud-target]');
  const minimap = section.querySelector('[data-minimap]'), mm = minimap.getContext('2d');
  const count = panel.querySelector('[data-world-count]');

  // ------------------------------------------------------------ the sky, generated once
  let seed = 20261116;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const arms = Object.values(G.arms).map(d => d * Math.PI / 180);
  const along = (base, r) => base + G.twist * r;
  const WARM = [[1, .96, .91], [1, .84, .72], [.97, .7, .56], [.8, .84, 1]];
  const pick = () => { const v = rand(); return v < .1 ? 3 : v < .3 ? 2 : v < .6 ? 1 : 0; };
  const nebula = [], dust = [], points = [];
  const add = (list, x, y, z, rgb, a, size) => list.push(x, y, z, rgb[0], rgb[1], rgb[2], a, size);
  for (const base of arms) {
    for (let i = 0; i < 2600; i++) {
      const r = .05 + rand() ** .85 * 1.0, t = along(base, r) + gauss() * .19 * (1.15 - r * .5), rr = r + gauss() * .024;
      add(points, R * rr * Math.cos(t), gauss() * 26 * (1.2 - r * .7), R * rr * Math.sin(t), WARM[pick()], .45 + rand() * .55, 2.2 + rand() ** 4 * 7);
    }
    for (let r = .06; r < 1.02; r += .01) {
      const t = along(base, r), x = R * r * Math.cos(t), z = R * r * Math.sin(t);
      add(nebula, x + gauss() * 30, gauss() * 10, z + gauss() * 30, rand() < .22 ? [.55, .6, 1] : [.93, .55, .4], .055 * (1.15 - r * .6), 150 + 140 * (1 - r));
      const td = t - .13;
      add(dust, R * r * Math.cos(td), 4, R * r * Math.sin(td), [0, 0, 0], .28, 52 + rand() * 30);
    }
  }
  for (let i = 0; i < 2600; i++) { const r = Math.abs(gauss()) * .12, t = rand() * Math.PI * 2, y = gauss() * R * .045 * (1 - r * 2); add(points, R * r * Math.cos(t), y, R * r * Math.sin(t), WARM[rand() < .6 ? 1 : 0], .5 + rand() * .5, 2 + rand() * 3.5); }
  for (let i = 0; i < 1400; i++) { const r = Math.sqrt(rand()) * 1.35, t = rand() * Math.PI * 2; add(points, R * r * Math.cos(t), gauss() * 90, R * r * Math.sin(t), WARM[rand() < .2 ? 3 : 0], .3 + rand() * .5, 2 + rand() * 2.5); }
  // a far sky behind everything, so turning the camera always shows stars
  for (let i = 0; i < 1800; i++) { const u = rand() * 2 - 1, t = rand() * Math.PI * 2, d = 9000 + rand() * 3000, k = Math.sqrt(1 - u * u); add(points, d * k * Math.cos(t), d * u, d * k * Math.sin(t), WARM[rand() < .25 ? 3 : 0], .35 + rand() * .5, 18 + rand() * 22); }
  add(nebula, 0, 0, 0, [1, .82, .6], .5, 520); add(nebula, 0, 0, 0, [1, .9, .75], .7, 230);
  const rings = [];
  for (const z of G.zones) for (let i = 0; i <= 128; i++) { const t = i / 128 * Math.PI * 2; add(rings, z * R * Math.cos(t), 0, z * R * Math.sin(t), [1, .93, .86], .09, 1); }

  // ------------------------------------------------------------ WebGL
  let loc, bufs, bind;
  if (glReady) {
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, `
    attribute vec3 p; attribute vec4 c; attribute float s;
    uniform mat4 vp; uniform float scale; uniform float lineMode;
    varying vec4 vc; varying float vf; varying float vl;
    void main() {
      vl = lineMode;
      gl_Position = vp * vec4(p, 1.0);
      float px = s * scale / max(gl_Position.w, 1.0);
      gl_PointSize = clamp(px, 1.4, 900.0);
      // tiny points fade instead of flickering; huge cloud sprites fade as you fly into them
      vf = lineMode > .5 ? 1.0 : clamp(px / 1.4, .25, 1.0) * clamp(1.6 - px / 500.0, 0.0, 1.0);
      vc = c;
    }`));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, `
    precision mediump float; varying vec4 vc; varying float vf; varying float vl; uniform float soft;
    void main() {
      float a = 1.0;
      if (vl < .5) { float d = length(gl_PointCoord - .5) * 2.0; a = soft > .5 ? pow(max(1.0 - d, 0.0), 1.8) : exp(-d * d * 5.0); }
      a *= vc.a * vf;
      gl_FragColor = vec4(vc.rgb * a, a);
    }`));
  gl.linkProgram(prog);
  glReady = gl.getProgramParameter(prog, gl.LINK_STATUS);
  if (!glReady) console.warn('galaxy: WebGL program did not link', gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  loc = { p: gl.getAttribLocation(prog, 'p'), c: gl.getAttribLocation(prog, 'c'), s: gl.getAttribLocation(prog, 's'), vp: gl.getUniformLocation(prog, 'vp'), scale: gl.getUniformLocation(prog, 'scale'), line: gl.getUniformLocation(prog, 'lineMode'), soft: gl.getUniformLocation(prog, 'soft') };
  const upload = data => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); return { b, n: data.length / 8 }; };
  bufs = { nebula: upload(nebula), dust: upload(dust), points: upload(points), rings: upload(rings) };
  bind = ({ b }) => {
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(loc.c); gl.vertexAttribPointer(loc.c, 4, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(loc.s); gl.vertexAttribPointer(loc.s, 1, gl.FLOAT, false, 32, 28);
  };
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
  }
  section.classList.toggle('no-gl', !glReady);

  // ------------------------------------------------------------ camera: orbit a point on the disc
  const FOV = 50 * Math.PI / 180, T = 1 / Math.tan(FOV / 2);
  const cam = { x: 0, z: 0, dist: 2300, yaw: .5, pitch: .62, ox: 0, oy: 0 };
  let W = 0, H = 0, dpr = 1, home = { ...cam }, vp = new Float32Array(16), eye = [0, 0, 0];
  const LIM = { dist: [140, 5200], pitch: [.06, 1.5] };
  const clampCam = () => {
    cam.dist = Math.min(LIM.dist[1], Math.max(LIM.dist[0], cam.dist));
    cam.pitch = Math.min(LIM.pitch[1], Math.max(LIM.pitch[0], cam.pitch));
    const d = Math.hypot(cam.x, cam.z), max = R * 1.25; if (d > max) { cam.x *= max / d; cam.z *= max / d; }
  };
  const matrices = () => {
    const cp = Math.cos(cam.pitch);
    eye = [cam.x + cam.dist * cp * Math.sin(cam.yaw), cam.dist * Math.sin(cam.pitch), cam.z + cam.dist * cp * Math.cos(cam.yaw)];
    const f = [eye[0] - cam.x, eye[1], eye[2] - cam.z], fl = Math.hypot(...f); const zv = f.map(v => v / fl);
    let xv = [zv[2], 0, -zv[0]]; const xl = Math.hypot(...xv) || 1; xv = xv.map(v => v / xl);
    const yv = [zv[1] * xv[2] - zv[2] * xv[1], zv[2] * xv[0] - zv[0] * xv[2], zv[0] * xv[1] - zv[1] * xv[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const V = [xv[0], yv[0], zv[0], 0, xv[1], yv[1], zv[1], 0, xv[2], yv[2], zv[2], 0, -dot(xv, eye), -dot(yv, eye), -dot(zv, eye), 1];
    const n = 5, far = 20000, a = W / H;
    const P = [T / a, 0, 0, 0, 0, T, 0, 0, cam.ox * -1, cam.oy * -1, (far + n) / (n - far), -1, 0, 0, 2 * far * n / (n - far), 0];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += P[k * 4 + r] * V[c * 4 + k]; vp[c * 4 + r] = s; }
  };
  const project = (x, y, z) => {
    const m = vp, cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw < 6) return null;
    return [(cx / cw * .5 + .5) * W, (1 - (cy / cw * .5 + .5)) * H, cw];
  };
  const resize = () => {
    const rect = view.getBoundingClientRect(), first = W === 0;
    W = rect.width; H = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr; if (glReady) gl.viewport(0, 0, canvas.width, canvas.height);
    // wide screens push the galaxy right of centre (a lens shift) to leave the introduction clear sky
    const roomy = W > 1000;
    home = { x: 0, z: 0, dist: roomy ? 2250 : W < 600 ? 2700 : 2400, yaw: .5, pitch: .6, ox: roomy ? .3 : 0, oy: roomy ? 0 : -.08 };
    if (first) Object.assign(cam, home); else if (current < 0 && !tween) { cam.ox = home.ox; cam.oy = home.oy; }
    wake();
  };

  // ------------------------------------------------------------ motion
  let tween = null, current = -1, frame = 0, last = performance.now(), visible = true, idleSince = performance.now();
  const keys = new Set(), vel = { x: 0, z: 0 };
  const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const angleTo = (a, b) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const travel = (to, done) => {
    const target = { ...cam, ...to };
    target.yaw = angleTo(cam.yaw, target.yaw);
    if (reduced) { Object.assign(cam, target); clampCam(); wake(); done?.(); return; }
    const far = Math.hypot(target.x - cam.x, target.z - cam.z);
    tween = { from: { ...cam }, to: target, start: performance.now(), dur: Math.min(2200, 900 + far * .9 + Math.abs(Math.log(target.dist / cam.dist)) * 300), lift: Math.min(.9, far / R * .8), done };
    vel.x = vel.z = 0; wake();
  };
  const touch = () => { idleSince = performance.now(); section.classList.add('is-flown'); };
  const panBy = (dx, dy) => {
    // screen movement to movement over the disc, relative to where the camera is facing
    const k = cam.dist * 2 / (T * H), right = [Math.cos(cam.yaw), -Math.sin(cam.yaw)], fwd = [-Math.sin(cam.yaw), -Math.cos(cam.yaw)];
    const kf = k / Math.max(Math.sin(cam.pitch), .35);
    cam.x -= dx * k * right[0] - dy * kf * fwd[0]; cam.z -= dx * k * right[1] - dy * kf * fwd[1];
  };
  const step = now => {
    const dt = Math.min(now - last, 50) / 1000; last = now;
    let moving = false;
    if (tween) {
      const t = Math.min(1, Math.max(0, (now - tween.start) / tween.dur)), e = ease(t), { from, to } = tween;
      for (const k of ['x', 'z', 'yaw', 'pitch', 'ox', 'oy']) cam[k] = from[k] + (to[k] - from[k]) * e;
      cam.dist = Math.exp(Math.log(from.dist) + (Math.log(to.dist) - Math.log(from.dist)) * e) * (1 + Math.sin(Math.PI * t) * tween.lift);
      moving = true;
      if (t >= 1) { const done = tween.done; tween = null; Object.assign(cam, to); done?.(); }
    } else {
      if (keys.size) {
        const speed = cam.dist * .45;
        const fwd = [-Math.sin(cam.yaw), -Math.cos(cam.yaw)], right = [Math.cos(cam.yaw), -Math.sin(cam.yaw)];
        const f = (keys.has('up') ? 1 : 0) - (keys.has('down') ? 1 : 0), s = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
        vel.x += (fwd[0] * f + right[0] * s) * speed * dt * 4; vel.z += (fwd[1] * f + right[1] * s) * speed * dt * 4;
        if (keys.has('turnL')) cam.yaw += dt * 1.1; if (keys.has('turnR')) cam.yaw -= dt * 1.1;
        if (keys.has('in')) cam.dist /= 1 + dt * 1.6; if (keys.has('out')) cam.dist *= 1 + dt * 1.6;
        touch();
      }
      if (!dragging && (Math.abs(vel.x) + Math.abs(vel.z) > .5)) {
        cam.x += vel.x * dt; cam.z += vel.z * dt; const k = Math.exp(-dt * 3); vel.x *= k; vel.z *= k; moving = true;
      } else if (!dragging) vel.x = vel.z = 0;
      // left alone, the ship slowly circles where it is
      if (!reduced && current < 0 && now - idleSince > 5000) { cam.yaw += dt * .035; moving = true; }
      clampCam();
    }
    draw();
    frame = visible && !document.hidden && (moving || keys.size || dragging) ? requestAnimationFrame(step) : 0;
  };
  const wake = () => { if (!frame && visible && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(step); } };

  // ------------------------------------------------------------ drawing
  let lastWhere = '', lastTarget = null;
  const draw = () => {
    matrices();
    if (glReady) {
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.vp, false, vp);
    gl.uniform1f(loc.scale, H * dpr / 2 * T);
    gl.uniform1f(loc.line, 0);
    gl.uniform1f(loc.soft, 1); gl.blendFunc(gl.ONE, gl.ONE); bind(bufs.nebula); gl.drawArrays(gl.POINTS, 0, bufs.nebula.n);
    gl.blendFunc(gl.ZERO, gl.ONE_MINUS_SRC_ALPHA); bind(bufs.dust); gl.drawArrays(gl.POINTS, 0, bufs.dust.n);
    gl.uniform1f(loc.soft, 0); gl.blendFunc(gl.ONE, gl.ONE); bind(bufs.points); gl.drawArrays(gl.POINTS, 0, bufs.points.n);
    gl.uniform1f(loc.line, 1); bind(bufs.rings);
    for (let k = 0; k < G.zones.length; k++) gl.drawArrays(gl.LINE_STRIP, k * 129, 129);
    }

    // HTML stars and labels follow the same projection; nearer ones draw larger and on top
    const near = cam.dist < 900;
    for (const p of placed) {
      const s = project(p.x, p.y, p.z);
      if (!s || s[0] < -90 || s[1] < -50 || s[0] > W + 90 || s[1] > H + 50) { p.el.style.visibility = 'hidden'; continue; }
      p.el.style.visibility = '';
      p.el.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
      const k = Math.min(1.9, Math.max(.6, 1500 / s[2]));
      p.el.style.setProperty('--k', k.toFixed(2)); p.el.style.zIndex = String(Math.round(20000 - s[2]));
      p.s = s;
    }
    view.toggleAttribute('data-near', near);
    const cx = (cam.ox * .5 + .5) * W, cy = (1 - (cam.oy * .5 + .5)) * H;
    reticle.style.left = `${cx}px`; reticle.style.top = `${cy}px`;
    let target = null, best = 60;
    if (!tween && current < 0 && section.classList.contains('is-flown')) for (const st of stars) { if (!st.s || st.el.style.visibility) continue; const d = Math.hypot(st.s[0] - cx, st.s[1] - cy); if (d < best) { best = d; target = st; } }
    if (target !== lastTarget) {
      lastTarget?.el.classList.remove('is-target'); target?.el.classList.add('is-target'); lastTarget = target;
      section.classList.toggle('has-target', Boolean(target));
      targetOut.textContent = target ? `${target.el.querySelector('.star__label').textContent} · ${G.labels.land}` : '';
    }
    const here = current >= 0 ? stars[current] : cam, where = locate(here.x, here.z);
    if (where !== lastWhere) { whereOut.textContent = where; lastWhere = where; }
    drawMinimap();
  };
  const locate = (x, z) => {
    const r = Math.hypot(x, z) / R;
    if (r < .2) return G.labels.core;
    if (r > .92) return G.labels.deep;
    const angle = Math.atan2(z, x);
    let arm = null, best = Infinity;
    for (const [id, deg] of Object.entries(G.arms)) { let d = angle - along(deg * Math.PI / 180, r); d = Math.atan2(Math.sin(d), Math.cos(d)); if (Math.abs(d) < best) { best = Math.abs(d); arm = id; } }
    const zone = G.zones.reduce((k, zz, i) => Math.abs(zz - r) < Math.abs(G.zones[k] - r) ? i : k, 0);
    return `${G.labels.arms[arm]} · ${G.labels.zones[zone]}`;
  };

  // the minimap is the disc from above: painted once, with the ship and its heading on top
  const MM = 132, mmScale = MM / (R * 2.7);
  const chart = document.createElement('canvas'); chart.width = chart.height = MM * 2;
  {
    const c = chart.getContext('2d'); c.scale(2, 2); c.translate(MM / 2, MM / 2); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < points.length; i += 8) {
      if (Math.abs(points[i]) > R * 1.4 || Math.abs(points[i + 2]) > R * 1.4) continue;
      c.fillStyle = `rgba(255,220,190,${points[i + 6] * .28})`; c.fillRect(points[i] * mmScale, points[i + 2] * mmScale, .9, .9);
    }
  }
  const drawMinimap = () => {
    const m = Math.min(devicePixelRatio || 1, 2);
    if (minimap.width !== MM * m) minimap.width = minimap.height = MM * m;
    mm.setTransform(m, 0, 0, m, 0, 0); mm.clearRect(0, 0, MM, MM); mm.drawImage(chart, 0, 0, MM, MM);
    mm.save(); mm.translate(MM / 2, MM / 2);
    for (const s of stars) { const major = s.el.classList.contains('star--major'); mm.fillStyle = major ? '#e8875f' : 'rgba(255,240,225,.8)'; const r = major ? 3 : 2; mm.fillRect(s.x * mmScale - r / 2, s.z * mmScale - r / 2, r, r); }
    const x = cam.x * mmScale, z = cam.z * mmScale, dir = Math.atan2(-Math.cos(cam.yaw), -Math.sin(cam.yaw));
    const reach = Math.min(40, 10 + cam.dist * mmScale * .5);
    mm.fillStyle = 'rgba(255,255,255,.14)'; mm.beginPath(); mm.moveTo(x, z); mm.arc(x, z, reach, dir - .45, dir + .45); mm.closePath(); mm.fill();
    mm.fillStyle = '#fff'; mm.beginPath(); mm.arc(x, z, 2.6, 0, Math.PI * 2); mm.fill();
    mm.restore();
  };

  // ------------------------------------------------------------ landing on a star = opening its world
  const wide = matchMedia('(min-width: 861px)');
  const lightZone = k => { for (const z of section.querySelectorAll('.galaxy__zone')) z.classList.toggle('is-lit', k != null && z.dataset.zone === String(k)); };
  const approach = i => {
    const s = stars[i];
    // park the star in the open sky beside the panel (desktop) or above it (phones)
    let ox = 0, oy = 0;
    const rect = view.getBoundingClientRect();
    if (wide.matches) { const free = Math.min(rect.right, innerWidth - panel.offsetWidth - 24) - rect.left; ox = free / 2 / W * 2 - 1; }
    else { const top = Math.max(rect.top, 64), sheet = innerHeight - 8 - panel.offsetHeight, y = (top + Math.max(sheet, top + 80)) / 2 - rect.top; oy = 1 - y / H * 2; }
    return { x: s.x, z: s.z, dist: 300, pitch: .42, yaw: Math.atan2(s.x, s.z) + .5, ox, oy };
  };
  const open = (i, { focus = true } = {}) => {
    const changed = i !== current;
    current = i;
    stars.forEach((s, j) => s.el.classList.toggle('is-current', j === i));
    articles.forEach((a, j) => a.classList.toggle('is-open', j === i));
    section.classList.add('has-current');
    if (changed) { replay(articles[i], 'is-entering'); replay(articles[i], 'is-fresh'); panel.scrollTop = 0; }
    panel.classList.add('is-open');
    count.textContent = `${String(i + 1).padStart(2, '0')} / ${stars.length}`;
    lightZone(stars[i].el.dataset.zone);
    travel(approach(i));
    if (focus) articles[i].querySelector('h3').focus({ preventScroll: true });
  };
  const close = ({ restore = true } = {}) => {
    if (current < 0) return;
    const back = stars[current].el;
    current = -1;
    panel.classList.remove('is-open'); section.classList.remove('has-current');
    for (const s of stars) s.el.classList.remove('is-current');
    lightZone(null);
    travel({ ox: home.ox, oy: home.oy, dist: Math.max(cam.dist, 650), pitch: Math.max(cam.pitch, .55) });
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (restore) back.focus({ preventScroll: true });
  };
  const indexOf = h => { try { return stars.findIndex(s => `#${s.el.dataset.world}` === decodeURIComponent(h)); } catch { return -1; } };
  const go = (i, how = 'push') => { history[how === 'push' ? 'pushState' : 'replaceState'](null, '', `#${stars[i].el.dataset.world}`); open(i); };
  const replay = (el, name) => { el.classList.remove(name); void el.offsetWidth; el.classList.add(name); };

  // ------------------------------------------------------------ input
  const pointers = new Map();
  let dragging = false, moved = 0, pinch = null, downOn = null, panning = false;
  view.addEventListener('contextmenu', e => e.preventDefault());
  view.addEventListener('pointerdown', event => {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    view.setPointerCapture(event.pointerId);
    tween = null; vel.x = vel.z = 0; moved = 0; downOn = event.target.closest('.star');
    panning = event.shiftKey || event.button === 2;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
    dragging = true; view.classList.add('is-dragging'); touch(); wake();
  });
  view.addEventListener('pointermove', event => {
    const p = pointers.get(event.pointerId); if (!p) return;
    const dx = event.clientX - p.x, dy = event.clientY - p.y;
    p.x = event.clientX; p.y = event.clientY;
    if (pointers.size === 2 && pinch) {
      // two fingers: spread to move closer, slide to fly
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.dist *= pinch.d / d; panBy(mx - pinch.x, my - pinch.y);
      pinch = { d, x: mx, y: my }; moved += 10; clampCam(); return;
    }
    moved += Math.abs(dx) + Math.abs(dy);
    if (panning) panBy(dx, dy);
    else { cam.yaw -= dx * .005; cam.pitch += dy * .004; }
    clampCam();
  });
  const release = event => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size) { pinch = null; return; }
    dragging = false; view.classList.remove('is-dragging');
    if (moved < 6) {
      if (downOn) { const i = stars.findIndex(s => s.el === downOn); if (i === current) close(); else go(i, current < 0 ? 'push' : 'replace'); }
      else if (current >= 0) close({ restore: false });
    }
    downOn = null; wake();
  };
  view.addEventListener('pointerup', release);
  view.addEventListener('pointercancel', release);
  for (const s of stars) s.el.addEventListener('click', event => { event.preventDefault(); if (event.detail === 0) go(stars.indexOf(s), current < 0 ? 'push' : 'replace'); });
  view.addEventListener('wheel', event => {
    // plain scrolling keeps scrolling the page; pinch and Ctrl / ⌘ + scroll move closer
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault(); tween = null;
    cam.dist *= Math.exp(event.deltaY * .01); clampCam(); touch(); wake();
  }, { passive: false });
  const KEYS = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', q: 'turnL', Q: 'turnL', e: 'turnR', E: 'turnR', '+': 'in', '=': 'in', '-': 'out', _: 'out' };
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
  for (const b of section.querySelectorAll('[data-zoom]')) b.addEventListener('click', () => { touch(); travel({ dist: Math.min(LIM.dist[1], Math.max(LIM.dist[0], cam.dist * (b.dataset.zoom > 0 ? 1 / 1.8 : 1.8))) }); });
  section.querySelector('[data-home]').addEventListener('click', () => { touch(); if (current >= 0) close({ restore: false }); travel(home); });
  minimap.addEventListener('click', event => {
    const r = minimap.getBoundingClientRect();
    const x = (event.clientX - r.left - r.width / 2) * (MM / r.width) / mmScale, z = (event.clientY - r.top - r.height / 2) * (MM / r.height) / mmScale;
    touch(); travel({ x, z, dist: Math.min(cam.dist, 1100) });
  });

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
  const landOnHash = () => { const i = indexOf(location.hash); if (i >= 0) open(i, { focus: false }); };
  if (root.classList.contains('is-landing') && !reduced) {
    // a fresh visit starts far above the disc and swings down into it
    Object.assign(cam, { ...home, dist: 7000, pitch: 1.42, yaw: home.yaw - 1.6 });
    tween = { from: { ...cam }, to: { ...home }, start: performance.now() + 150, dur: 3000, lift: 0, done: () => { root.classList.remove('is-landing'); landOnHash(); } };
    wake();
  } else { root.classList.remove('is-landing'); landOnHash(); }
}
