(() => {
  const cv = document.getElementById('mirror-cube');
  if (!cv) return;

  const gl = cv.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  const ctx = gl ? null : cv.getContext('2d');

  if (!gl && !ctx) {
    document.documentElement.classList.add('no-cube');
    return;
  }

  const vs = `
    attribute vec3 aPos;
    attribute vec3 aNorm;
    attribute vec2 aUV;
    attribute float aMetal;
    varying vec3 vPos;
    varying vec3 n;
    varying vec2 uv;
    varying float metal;
    void main() {
      gl_Position = vec4(aPos, 1.0);
      vPos = aPos;
      n = aNorm;
      uv = aUV;
      metal = aMetal;
    }
  `;

  const fs = `
    precision mediump float;
    uniform vec2 uLight;
    uniform float uLightStrength;
    varying vec3 vPos;
    varying vec3 n;
    varying vec2 uv;
    varying float metal;
    void main() {
      vec3 N = normalize(n);
      vec3 I = normalize(vec3(vPos.x * 0.22, vPos.y * 0.22, -1.0));
      vec3 r = reflect(I, N);

      float sky = smoothstep(-0.35, 0.78, r.y * 0.85 - r.x * 0.25);
      float horizon = exp(-pow((r.y + 0.08 + vPos.y * 0.14) * 4.2, 2.0));
      float brush = sin(uv.y * 460.0 + sin(uv.x * 80.0) * 0.7) * 0.015;

      vec3 darkMirror = vec3(0.11, 0.16, 0.34);
      vec3 midMirror = vec3(0.42, 0.49, 0.64);
      vec3 brightMirror = vec3(0.93, 0.95, 0.98);

      vec3 c = mix(darkMirror, midMirror, clamp(sky * 0.85 + 0.15 + brush, 0.0, 1.0));
      c = mix(c, brightMirror, clamp(horizon * 0.68 + pow(max(0.0, r.z), 3.0) * 0.32, 0.0, 1.0));

      float spec = pow(max(0.0, dot(r, normalize(vec3(-0.35, 0.72, 0.65)))), 28.0);
      c += vec3(0.28, 0.30, 0.34) * spec;

      float fresnel = pow(1.0 - max(0.0, dot(N, -I)), 3.0);
      c = mix(c, brightMirror, fresnel * 0.24);

      float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
      c *= 0.88 + 0.12 * smoothstep(0.0, 0.055, edge);

      // Subtle #FE7E00 cursor light reflection
      vec3 lightPos = vec3(uLight.x, uLight.y, 0.85);
      vec3 L = normalize(lightPos - vec3(vPos.x, vPos.y, -vPos.z * 2.5));
      vec3 H = normalize(L - I);
      float dist = length(uLight - vPos.xy);
      float falloff = exp(-dist * dist * 1.85);
      float oSpec = pow(max(0.0, dot(N, H)), 18.0);
      float oDiff = max(0.0, dot(N, L));
      vec3 orange = vec3(0.996, 0.494, 0.0);
      c += orange * (oDiff * 0.14 + oSpec * 0.50) * falloff * uLightStrength;

      if (metal < 0.5) {
        float coreShade = 0.55 + 0.45 * max(0.0, dot(N, normalize(vec3(-0.3, 0.7, 0.8))));
        c = vec3(0.05, 0.08, 0.19) * coreShade;
        c += orange * oDiff * 0.08 * falloff * uLightStrength;
      }

      gl_FragColor = vec4(c, 1.0);
    }
  `;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  let buffer;
  let uLightLoc = null;
  let uLightStrengthLoc = null;
  if (gl) {
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw Error(gl.getProgramInfoLog(program));
    }
    gl.useProgram(program);
    uLightLoc = gl.getUniformLocation(program, 'uLight');
    uLightStrengthLoc = gl.getUniformLocation(program, 'uLightStrength');
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    for (const [name, size, offset] of [
      ['aPos', 3, 0],
      ['aNorm', 3, 3],
      ['aUV', 2, 6],
      ['aMetal', 1, 8]
    ]) {
      const a = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, size, gl.FLOAT, false, 36, offset * 4);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
  }

  const I = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
  const mul = (a, b) => a.map((r) => r.reduce((s, n, i) => s + n * b[i], 0));
  const mm = (a, b) =>
    a.map((r) => b[0].map((_, j) => r.reduce((s, n, i) => s + n * b[i][j], 0)));
  const add = (a, b) => a.map((n, i) => n + b[i]);

  function rot(a, t) {
    const c = Math.cos(t);
    const s = Math.sin(t);
    return a === 0
      ? [
          [1, 0, 0],
          [0, c, -s],
          [0, s, c]
        ]
      : a === 1
      ? [
          [c, 0, s],
          [0, 1, 0],
          [-s, 0, c]
        ]
      : [
          [c, -s, 0],
          [s, c, 0],
          [0, 0, 1]
        ];
  }

  // The interior cuts are at +/- .5 about the mechanical rotation centre.
  // Unequal outer depths give the solved cube its offset, asymmetric face grid.
  const widths = [
    [0.66, 1, 1.34],
    [1.3, 1, 0.7],
    [0.78, 1, 1.22]
  ];
  const pieces = [];

  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 3; y++) {
      for (let z = 0; z < 3; z++) {
        if (x === 1 && y === 1 && z === 1) continue;
        const idx = [x, y, z];
        const dim = idx.map((n, a) => widths[a][n]);
        const center = idx.map(
          (n, a) =>
            -0.5 -
            widths[a][0] +
            widths[a].slice(0, n).reduce((s, v) => s + v, 0) +
            dim[a] / 2
        );
        pieces.push({
          grid: idx.map((n) => n - 1),
          home: idx.map((n) => n - 1),
          center,
          dim,
          R: I.map((r) => r.slice())
        });
      }
    }
  }

  const clone = (a) =>
    a.map((p) => ({
      ...p,
      grid: p.grid.slice(),
      center: p.center.slice(),
      R: p.R.map((r) => r.slice())
    }));

  function turn(arr, m, t = 1, commit = false) {
    const [axis, layer, dir] = m;
    const R = rot(axis, ((dir * Math.PI) / 2) * t);
    for (const p of arr) {
      if (p.grid[axis] === layer) {
        p.center = mul(R, p.center);
        p.R = mm(R, p.R);
        if (commit) p.grid = mul(R, p.grid).map(Math.round);
      }
    }
  }

  const scramble = [
    [0, 1, 1],
    [1, 1, -1],
    [2, -1, 1],
    [0, -1, -1],
    [1, -1, 1],
    [2, 1, -1],
    [0, 1, -1],
    [1, 1, 1],
    [2, -1, -1],
    [0, -1, 1]
  ];

  const start = clone(pieces);
  scramble.forEach((m) => turn(start, m, 1, true));
  const moves = scramble
    .slice()
    .reverse()
    .map(([a, l, d]) => [a, l, -d]);
  const states = [clone(start)];

  for (const m of moves) {
    const a = clone(states.at(-1));
    turn(a, m, 1, true);
    states.push(a);
  }

  const error = Math.max(
    ...states
      .at(-1)
      .flatMap((p, i) => p.center.map((v, j) => Math.abs(v - pieces[i].center[j])))
  );
  if (error > 1e-8) throw Error('Cube reversal failed');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const ease = (t) => t * t * (3 - 2 * t);
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const mix = (a, b, t) => a + (b - a) * t;

  let queued = false;
  let manualYaw = 0;
  let manualPitch = 0;
  let hoverYaw = 0;
  let hoverPitch = 0;
  let targetHoverYaw = 0;
  let targetHoverPitch = 0;
  let lightX = 0.25;
  let lightY = 0.25;
  let targetLightX = 0.25;
  let targetLightY = 0.25;
  let lightStrength = 0.25;
  let targetLightStrength = 0.25;
  let drag = false;
  let lastX = 0;
  let lastY = 0;
  const cubeState = (window.__udghatCube = {
    cx: 0,
    cy: 0,
    hitRadius: 0,
    active: false,
    dragging: false
  });

  // x/y are viewport fractions; size is relative to the smaller screen dimension.
  function keyframes() {
    const h = innerHeight;
    const top = (id) => document.getElementById(id).getBoundingClientRect().top + scrollY;
    const resTop = top('resolution');
    const conTop = top('contact');
    const solvedY = resTop - h * 0.38;
    const glideStartY = Math.max(solvedY + 140, resTop - h * 0.04);
    const glideEndY = Math.max(glideStartY + 220, conTop - h * 0.32);
    return [
      [0, 0, 0.77, 0.5, 0.115, 1, -0.63],
      [top('about') - h * 0.7, 0.08, 0.75, 0.48, 0.11, 1, -0.48],
      [top('about') - h * 0.15, 0.15, 0.2, 0.48, 0.098, 1, -0.2],
      [top('expertise') - h * 0.55, 0.27, 0.83, 0.44, 0.094, 1, 0.15],
      [top('journey') - h * 0.55, 0.65, 0.82, 0.56, 0.1, 1, 0.65],
      [top('difference') - h * 0.55, 0.78, 0.82, 0.46, 0.09, 1, 0.9],
      [top('team') - h * 0.55, 0.84, 0.82, 0.46, 0.092, 1, 0.98],
      [resTop - h * 0.8, 0.92, 0.5, 0.39, 0.104, 1, 1.1],
      [solvedY, 1, 0.5, 0.39, 0.11, 1, 1.25],
      [glideStartY, 1, 0.5, 0.39, 0.11, 1, 1.25],
      [glideEndY, 1, 0.5, 0.26, 0.085, 0, 1.25]
    ].map((k, i, a) => {
      if (i) k[0] = Math.max(k[0], a[i - 1][0] + 1);
      return k;
    });
  }

  function render() {
    queued = false;
    const w = innerWidth;
    const h = innerHeight;
    const d = Math.min(devicePixelRatio || 1, 1.75);

    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) {
      cv.width = Math.round(w * d);
      cv.height = Math.round(h * d);
    }

    if (gl) {
      gl.viewport(0, 0, cv.width, cv.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
      ctx.setTransform(d, 0, 0, d, 0, 0);
      ctx.clearRect(0, 0, w, h);
    }

    const keys = keyframes();
    const y = scrollY;
    let k = 0;
    while (k < keys.length - 2 && y >= keys[k + 1][0]) k++;

    const a = keys[k];
    const b = keys[k + 1];
    const t = ease(clamp((y - a[0]) / (b[0] - a[0])));
    const v = a.map((x, i) => mix(x, b[i], t));
    let [, p, px, py, size, alpha, yaw] = v;

    const mobile = w <= 850;
    if (mobile) {
      const resBlendStart = keys.at(-5)[0];
      const solvedKey = keys.at(-3)[0];
      const glideStartKey = keys.at(-2)[0];
      const endKey = keys.at(-1)[0];
      const resolutionBlend = ease(
        clamp((y - resBlendStart) / Math.max(1, solvedKey - resBlendStart))
      );
      const exitBlend = ease(
        clamp((y - glideStartKey) / Math.max(1, endKey - glideStartKey))
      );
      // Keep horizontally centered across small screens, hold above #resolution, then glide up as #contact rises
      px = 0.5;
      py = mix(0.46, 0.39, resolutionBlend);
      py = mix(py, 0.26, exitBlend);
      size *= mix(0.95, 1.05, resolutionBlend) * mix(1, 0.8, exitBlend);
    } else {
      const heroBlend = 1 - ease(clamp(y / Math.max(1, keys[1][0])));
      if (heroBlend > 0.001) {
        // Align hero cube inside .wrap's right column so spacing scales across desktop/tablet widths
        const wrapW = Math.min(1380, w * 0.9);
        const wrapLeft = (w - wrapW) * 0.5;
        const wrapRight = wrapLeft + wrapW;
        const copyRight = Math.min(wrapLeft + 410, wrapRight - 220);
        const rightCol = Math.max(200, wrapRight - copyRight - 40);
        const targetHeroPx = (copyRight + 40 + rightCol * 0.52) / w;
        const targetHeroSize = Math.min(0.122, (rightCol * 0.25) / Math.max(1, Math.min(w, h)));
        px = mix(px, targetHeroPx, heroBlend);
        size = mix(size, targetHeroSize, heroBlend);
      }
    }

    if (reduced.matches) {
      p = 1;
      yaw = -0.65;
    }

    // Fade only near actual text lines, not entire sections. Keep the same layer throughout.
    const radius = Math.min(w, h) * size * 1.95;
    const cx = px * w;
    const cy = py * h;
    let proximity = 0;
    const range = document.createRange();

    for (const el of document.querySelectorAll(
      'main h1, main h2, main h3, main p, main .eyebrow, main .signoff, main summary, main .tags, main .hero-cta, main .team-card'
    )) {
      const bounds = el.getBoundingClientRect();
      if (bounds.bottom < cy - radius - 40 || bounds.top > cy + radius + 40) continue;
      range.selectNodeContents(el);
      for (const r of range.getClientRects()) {
        if (!r.width || !r.height) continue;
        const dx = Math.max(r.left - cx, 0, cx - r.right);
        const dy = Math.max(r.top - cy, 0, cy - r.bottom);
        const dist = Math.hypot(dx, dy);
        proximity = Math.max(
          proximity,
          1 - ease(clamp((dist - radius * 0.85) / (radius * 0.35 + 24)))
        );
      }
    }

    // Preserve full metallic visibility in the desktop hero (side-by-side with copy);
    // at #resolution the cube stays full opacity when above the text and yields via proximity if text scrolls behind it.
    const heroPriority = 1 - ease(clamp((y - keys[1][0] * 0.35) / Math.max(1, keys[1][0] * 0.65)));
    const priority = mobile ? 0 : heroPriority;
    const ambientFloor = mobile ? heroPriority * 0.14 : 0;

    alpha *= Math.max(ambientFloor, mix(1, 0.095, proximity * (1 - priority)));
    cv.style.opacity = alpha;

    const scale = Math.min(w, h) * size;
    const interactive = !mobile && finePointer.matches;
    cubeState.cx = cx;
    cubeState.cy = cy;
    cubeState.hitRadius = scale * 2.15;
    cubeState.active = interactive && alpha > 0.35;
    cubeState.dragging = interactive && drag;

    if (alpha < 0.005) return;

    if (interactive) {
      hoverYaw += (targetHoverYaw - hoverYaw) * 0.14;
      hoverPitch += (targetHoverPitch - hoverPitch) * 0.14;
      lightX += (targetLightX - lightX) * 0.2;
      lightY += (targetLightY - lightY) * 0.2;
      lightStrength += (targetLightStrength - lightStrength) * 0.14;
    } else {
      hoverYaw = 0;
      hoverPitch = 0;
      targetHoverYaw = 0;
      targetHoverPitch = 0;
      lightX = px * 2 - 1 - 0.18;
      lightY = 1 - py * 2 + 0.18;
      lightStrength = 0.22;
    }

    const z = p * moves.length;
    const n = Math.min(moves.length, Math.floor(z));
    const f = z - n;
    const arr = clone(states[n]);
    if (n < moves.length) turn(arr, moves[n], ease(f));

    const V = interactive
      ? mm(
          rot(0, 0.43 + manualPitch + hoverPitch),
          rot(1, yaw + manualYaw + hoverYaw)
        )
      : mm(rot(0, 0.43), rot(1, yaw));
    const data = [];
    const polys = [];

    function quad(piece, axis, sign, metal) {
      const others = [0, 1, 2].filter((i) => i !== axis);
      const normal = [0, 0, 0];
      normal[axis] = sign;
      const vn = mul(V, mul(piece.R, normal));
      const pts = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
      ];
      const uv = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1]
      ];
      const verts = pts.map((q, i) => {
        const local = [0, 0, 0];
        local[axis] = sign * (piece.dim[axis] / 2 - 0.022 + (metal ? 0.002 : 0));
        others.forEach((a, j) => {
          local[a] = q[j] * (piece.dim[a] / 2 - (metal ? 0.039 : 0.022));
        });
        const c = mul(V, add(piece.center, mul(piece.R, local)));
        return [
          ((px * w + c[0] * scale) * 2) / w - 1,
          1 - ((py * h - c[1] * scale) * 2) / h,
          -c[2] / 10,
          ...vn,
          ...uv[i],
          metal ? 1 : 0
        ];
      });

      if (gl) {
        for (const i of [0, 1, 2, 0, 2, 3]) data.push(...verts[i]);
      } else if (vn[2] > 0) {
        polys.push({
          verts,
          vn,
          metal,
          depth: verts.reduce((sum, v) => sum + v[2], 0) / 4
        });
      }
    }

    for (const piece of arr) {
      for (let axis = 0; axis < 3; axis++) {
        for (const sign of [-1, 1]) {
          quad(piece, axis, sign, false);
          if (piece.home[axis] === sign) quad(piece, axis, sign, true);
        }
      }
    }

    if (gl) {
      if (uLightLoc) gl.uniform2f(uLightLoc, lightX, lightY);
      if (uLightStrengthLoc) gl.uniform1f(uLightStrengthLoc, lightStrength);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.TRIANGLES, 0, data.length / 9);
    } else {
      polys.sort((a, b) => b.depth - a.depth);
      for (const { verts, vn, metal } of polys) {
        const pts = verts.map((v) => [((v[0] + 1) * w) / 2, ((1 - v[1]) * h) / 2]);
        const l = Math.max(0, Math.min(1, 0.36 - vn[0] * 0.24 + vn[1] * 0.42 + vn[2] * 0.28));
        const c = [65 + 150 * l, 81 + 145 * l, 105 + 132 * l].map(Math.round);
        ctx.beginPath();
        pts.forEach((v, i) => (i ? ctx.lineTo(...v) : ctx.moveTo(...v)));
        ctx.closePath();

        if (metal) {
          const g = ctx.createLinearGradient(...pts[0], pts[2][0] + 0.01, pts[2][1] + 0.01);
          g.addColorStop(0, `rgb(${c.map((x) => Math.min(255, x + 25)).join(',')})`);
          g.addColorStop(0.48, `rgb(${c.join(',')})`);
          g.addColorStop(0.52, `rgb(${c.map((x) => Math.min(255, x + 12)).join(',')})`);
          g.addColorStop(1, `rgb(${c.map((x) => x - 18).join(',')})`);
          ctx.fillStyle = g;
        } else {
          ctx.fillStyle = '#303b4c';
        }
        ctx.fill();
      }
    }

    cv.dataset.solveProgress = p.toFixed(3);
    cv.dataset.residual = error.toExponential(1);

    if (
      !mobile &&
      finePointer.matches &&
      (Math.abs(targetHoverYaw - hoverYaw) > 0.001 ||
        Math.abs(targetHoverPitch - hoverPitch) > 0.001 ||
        Math.abs(targetLightX - lightX) > 0.002 ||
        Math.abs(targetLightY - lightY) > 0.002 ||
        Math.abs(targetLightStrength - lightStrength) > 0.005)
    ) {
      queue();
    }
  }

  function queue() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(render);
    }
  }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  document.querySelectorAll('details').forEach((x) => x.addEventListener('toggle', queue));
  reduced.addEventListener('change', queue);
  finePointer.addEventListener('change', queue);

  function isOverCube(x, y) {
    return (
      innerWidth > 850 &&
      finePointer.matches &&
      cubeState.active &&
      Math.hypot(x - cubeState.cx, y - cubeState.cy) <= cubeState.hitRadius
    );
  }

  function stopDrag() {
    if (drag) {
      drag = false;
      cubeState.dragging = false;
      document.body.style.userSelect = '';
    }
  }

  // Only attach mouse drag and hover-tilt exploration on fine-pointer desktop devices
  if (finePointer.matches) {
    addEventListener('pointerdown', (e) => {
      if (
        e.pointerType === 'mouse' &&
        e.button === 0 &&
        !e.target.closest('a, button, summary, details, input, textarea') &&
        isOverCube(e.clientX, e.clientY)
      ) {
        e.preventDefault();
        drag = true;
        cubeState.dragging = true;
        document.body.style.userSelect = 'none';
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });

    addEventListener('pointermove', (e) => {
      if (innerWidth <= 850) {
        stopDrag();
        return;
      }

      if (e.pointerType === 'mouse' && cubeState.active) {
        targetLightX = (e.clientX / innerWidth) * 2 - 1;
        targetLightY = 1 - (e.clientY / innerHeight) * 2;
        const dist = Math.hypot(e.clientX - cubeState.cx, e.clientY - cubeState.cy);
        targetLightStrength = dist < cubeState.hitRadius * 1.85 ? 1.0 : 0.25;
        queue();
      }

      if (drag) {
        manualYaw += (e.clientX - lastX) * 0.009;
        manualPitch = Math.max(-0.48, Math.min(0.48, manualPitch + (e.clientY - lastY) * 0.006));
        lastX = e.clientX;
        lastY = e.clientY;
        queue();
        return;
      }

      if (e.pointerType === 'mouse' && !reduced.matches && isOverCube(e.clientX, e.clientY)) {
        if (!e.target.closest('a, button, summary, details')) {
          targetHoverYaw = ((e.clientX - cubeState.cx) / Math.max(1, cubeState.hitRadius)) * 0.22;
          targetHoverPitch = ((e.clientY - cubeState.cy) / Math.max(1, cubeState.hitRadius)) * 0.14;
          queue();
          return;
        }
      }

      if (targetHoverYaw !== 0 || targetHoverPitch !== 0) {
        targetHoverYaw = 0;
        targetHoverPitch = 0;
        queue();
      }
    });

    document.addEventListener('mouseleave', () => {
      targetLightStrength = 0.25;
      targetHoverYaw = 0;
      targetHoverPitch = 0;
      queue();
    });

    addEventListener('pointerup', stopDrag);
    addEventListener('pointercancel', stopDrag);
    addEventListener('blur', stopDrag);
  }

  render();
})();
