(() => {
  // Fallback defaults used only when opened directly via file:// where browsers block fetch() on JSON files.
  const FALLBACK_LOGOS = [
    { name: 'TerraPay', file: 'terrapay.svg' },
    { name: 'ABB', file: 'ABB.svg' },
    { name: 'Client Logo', file: 'logo.png' }
  ];

  const FALLBACK_TEAM = [
    { name: 'Rex', position: 'Strategy & Leadership', linkedin: '', image: '' },
    { name: 'Krishna', position: 'Strategy & Operations', linkedin: '', image: '' },
    { name: 'Shubrat', position: 'Content & Communications', linkedin: '', image: '' },
    { name: 'Shahid', position: 'Design & Experience', linkedin: '', image: '' },
    { name: 'Deepa', position: 'Strategic Advisor', linkedin: '', image: '' }
  ];

  let revealObserver = null;
  if ('IntersectionObserver' in window) {
    document.documentElement.classList.add('js');
    revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
  }

  function renderLogos(entries) {
    const logos = document.getElementById('logos');
    if (!logos) return;

    const normalized = Array.isArray(entries)
      ? entries
          .map((item) => {
            if (typeof item === 'string') {
              return {
                name: item.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
                src: `assets/logos/${item}`
              };
            }
            if (item && item.file) {
              return {
                name: item.name || item.file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
                src: item.file.includes('/') ? item.file : `assets/logos/${item.file}`
              };
            }
            return null;
          })
          .filter(Boolean)
      : [];

    const baseClients = normalized.length
      ? normalized
      : Array.from({ length: 12 }, (_, i) => ({
          name: 'LOGO ' + String(i + 1).padStart(2, '0'),
          src: ''
        }));

    // Repeat entries inside each half-track when fewer than 12 logos are present so the ribbon spans full width seamlessly
    const clients = [];
    while (clients.length < 12) {
      clients.push(...baseClients);
    }

    logos.textContent = '';
    for (let i = 0; i < 2; i++) {
      const group = document.createElement('div');
      group.className = 'logo-group';
      if (i) group.setAttribute('aria-hidden', 'true');

      clients.forEach((c) => {
        const el = document.createElement('div');
        el.className = 'client-logo';
        if (!i) el.tabIndex = 0;
        if (c.src) {
          const img = document.createElement('img');
          img.src = c.src;
          img.alt = c.name;
          el.append(img);
        } else {
          el.textContent = c.name;
        }
        group.append(el);
      });

      logos.append(group);
    }
  }

  function resolveTeamImage(imgPath) {
    if (!imgPath) return '';
    if (/^(https?:)?\/\//.test(imgPath) || imgPath.includes('/')) return imgPath;
    return `assets/team/${imgPath}`;
  }

  function renderTeam(members) {
    const grid = document.querySelector('#team .team-grid');
    if (!grid || !Array.isArray(members) || !members.length) return;

    grid.textContent = '';
    members.forEach((member) => {
      const name = member && member.name ? String(member.name).trim() : '';
      if (!name) return;
      const position = member.position ? String(member.position).trim() : '';
      const linkedin = member.linkedin ? String(member.linkedin).trim() : '';
      const image = resolveTeamImage(member.image ? String(member.image).trim() : '');

      const card = document.createElement('article');
      card.className = 'team-card reveal';

      const portrait = document.createElement('div');
      portrait.className = 'team-portrait';
      const initial = document.createElement('span');
      initial.textContent = name.charAt(0).toUpperCase();

      if (image) {
        const img = document.createElement('img');
        img.src = image;
        img.alt = name;
        img.loading = 'lazy';
        img.onerror = () => {
          img.remove();
          portrait.setAttribute('aria-hidden', 'true');
          portrait.append(initial);
        };
        portrait.append(img);
      } else {
        portrait.setAttribute('aria-hidden', 'true');
        portrait.append(initial);
      }

      const meta = document.createElement('div');
      meta.className = 'team-meta';

      const nameRow = document.createElement('div');
      nameRow.className = 'team-name-row';
      const h3 = document.createElement('h3');
      h3.textContent = name;
      nameRow.append(h3);

      if (linkedin) {
        const link = document.createElement('a');
        link.className = 'team-linkedin';
        link.href = linkedin;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `${name} on LinkedIn`);
        link.innerHTML =
          '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM7.93 19H4.97V9.5h2.96V19ZM6.45 8.2a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42ZM19 19h-2.96v-4.62c0-1.1-.02-2.52-1.54-2.52-1.54 0-1.77 1.2-1.77 2.44V19H9.77V9.5h2.84v1.3h.04a3.11 3.11 0 0 1 2.8-1.54c3 0 3.55 1.97 3.55 4.54V19Z"/></svg>';
        nameRow.append(link);
      }

      meta.append(nameRow);

      if (position) {
        const role = document.createElement('p');
        role.className = 'team-role';
        role.textContent = position;
        meta.append(role);
      }

      card.append(portrait, meta);
      grid.append(card);

      if (revealObserver) revealObserver.observe(card);
    });
  }

  async function loadSiteData() {
    if (location.protocol === 'file:') {
      renderLogos(FALLBACK_LOGOS);
      renderTeam(FALLBACK_TEAM);
      return;
    }

    try {
      const res = await fetch('data/logos.json', { cache: 'no-store' });
      renderLogos(res.ok ? await res.json() : FALLBACK_LOGOS);
    } catch {
      renderLogos(FALLBACK_LOGOS);
    }

    try {
      const res = await fetch('data/team.json', { cache: 'no-store' });
      renderTeam(res.ok ? await res.json() : FALLBACK_TEAM);
    } catch {
      renderTeam(FALLBACK_TEAM);
    }
  }

  loadSiteData();

  const header = document.querySelector('header');
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('nav');
  if (header && menu && nav) {
    function setMenuOpen(state) {
      nav.classList.toggle('open', state);
      header.classList.toggle('menu-open', state);
      document.body.classList.toggle('menu-locked', state);
      menu.setAttribute('aria-expanded', state);
    }

    menu.onclick = () => {
      setMenuOpen(!nav.classList.contains('open'));
    };

    nav.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => setMenuOpen(false))
    );

    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('open')) {
        setMenuOpen(false);
      }
    });

    addEventListener('resize', () => {
      if (innerWidth > 850 && nav.classList.contains('open')) {
        setMenuOpen(false);
      }
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const expertiseEl = document.getElementById('expertise');
  const floatBackTop = document.querySelector('.back-top-float');
  const footerBackTop = document.querySelector('.footer-actions .back-top');
  let pending = false;

  function updateBackToTop(h) {
    if (!expertiseEl || !floatBackTop || !footerBackTop) return;

    const pastSecondSection = expertiseEl.getBoundingClientRect().top <= h * 0.55;
    const fRect = footerBackTop.getBoundingClientRect();
    const bottomOffset = innerWidth <= 850 ? 20 : 24;
    const floatH = floatBackTop.offsetHeight || 38;
    const restTop = h - bottomOffset - floatH;
    const dockedInFooter = fRect.top <= restTop;
    const showFloat = pastSecondSection && !dockedInFooter;

    floatBackTop.classList.toggle('is-visible', showFloat);
    floatBackTop.setAttribute('aria-hidden', String(!showFloat));
    floatBackTop.tabIndex = showFloat ? 0 : -1;

    const hideDocked = pastSecondSection && !dockedInFooter;
    footerBackTop.classList.toggle('is-dock-hidden', hideDocked);
    footerBackTop.setAttribute('aria-hidden', String(hideDocked));
    footerBackTop.tabIndex = hideDocked ? -1 : 0;
  }

  function update() {
    pending = false;
    const y = scrollY;
    const h = innerHeight;
    const total = document.documentElement.scrollHeight - h;
    const progress = document.querySelector('.progress');
    if (progress) {
      progress.style.width = (total ? (y / total) * 100 : 0) + '%';
    }

    updateBackToTop(h);

    if (reduced.matches) return;

    document.documentElement.style.setProperty('--hero-shift', Math.min(y * 0.25, 200) + 'px');
    document.documentElement.style.setProperty('--hero-scale', 1 + Math.min(y / h, 0.9) * 0.12);

    document.querySelectorAll('.art').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) {
        el.style.setProperty('--shift', (r.top + r.height / 2 - h / 2) * -0.12 + 'px');
      }
    });
  }

  addEventListener(
    'scroll',
    () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  addEventListener('resize', () => {
    if (!pending) {
      pending = true;
      requestAnimationFrame(update);
    }
  });

  update();

  // Custom orange dot cursor on fine-pointer desktops
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  if (finePointer.matches) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot is-hidden';
    dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'cursor-dot-label';
    label.textContent = 'Drag';
    dot.append(label);
    document.body.append(dot);
    document.documentElement.classList.add('custom-cursor');

    let mouseX = -100;
    let mouseY = -100;
    let curX = -100;
    let curY = -100;
    let visible = false;
    let rafId = 0;
    let lastTarget = null;

    // Continuous tapered stroke canvas for cursor motion
    const trailCanvas = document.createElement('canvas');
    trailCanvas.className = 'cursor-trail-canvas';
    trailCanvas.setAttribute('aria-hidden', 'true');
    document.body.append(trailCanvas);
    const trailCtx = trailCanvas.getContext('2d');
    const TRAIL_LIFE = 185;
    let trailPoints = [];

    function resizeTrailCanvas() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      trailCanvas.width = Math.round(innerWidth * dpr);
      trailCanvas.height = Math.round(innerHeight * dpr);
      if (trailCtx) trailCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeTrailCanvas();
    addEventListener('resize', resizeTrailCanvas);

    function drawTaperedStroke(now, speed, isDragging) {
      if (!trailCtx) return;
      trailCtx.clearRect(0, 0, innerWidth, innerHeight);

      trailPoints = trailPoints.filter((p) => now - p.t < TRAIL_LIFE);
      if (trailPoints.length < 2) return;

      // Only show a noticeable ribbon once the cursor has meaningful motion
      let totalLen = 0;
      for (let i = 1; i < trailPoints.length; i++) {
        totalLen += Math.hypot(
          trailPoints[i].x - trailPoints[i - 1].x,
          trailPoints[i].y - trailPoints[i - 1].y
        );
      }
      if (totalLen < 6) return;

      const n = trailPoints.length;
      const baseWidth = isDragging ? 9 : Math.min(7.5, 3.2 + speed * 0.08);
      const left = [];
      const right = [];

      for (let i = 0; i < n; i++) {
        const pPrev = trailPoints[Math.max(0, i - 1)];
        const pNext = trailPoints[Math.min(n - 1, i + 1)];
        let tx = pNext.x - pPrev.x;
        let ty = pNext.y - pPrev.y;
        const tLen = Math.hypot(tx, ty) || 1;
        tx /= tLen;
        ty /= tLen;
        const nx = -ty;
        const ny = tx;

        const u = i / (n - 1);
        const ageRatio = Math.max(0, 1 - (now - trailPoints[i].t) / TRAIL_LIFE);
        const r = baseWidth * Math.pow(u, 1.45) * (0.35 + 0.65 * ageRatio);
        left.push([trailPoints[i].x + nx * r, trailPoints[i].y + ny * r]);
        right.push([trailPoints[i].x - nx * r, trailPoints[i].y - ny * r]);
      }

      const head = trailPoints[n - 1];
      const tail = trailPoints[0];
      const grad = trailCtx.createLinearGradient(tail.x, tail.y, head.x, head.y);
      grad.addColorStop(0, 'rgba(254, 126, 0, 0)');
      grad.addColorStop(0.55, isDragging ? 'rgba(254, 126, 0, 0.35)' : 'rgba(254, 126, 0, 0.22)');
      grad.addColorStop(1, isDragging ? 'rgba(254, 126, 0, 0.72)' : 'rgba(254, 126, 0, 0.52)');

      trailCtx.beginPath();
      trailCtx.moveTo(tail.x, tail.y);
      for (let i = 1; i < n; i++) {
        const prev = left[i - 1];
        const curr = left[i];
        trailCtx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) * 0.5, (prev[1] + curr[1]) * 0.5);
      }
      trailCtx.lineTo(left[n - 1][0], left[n - 1][1]);
      trailCtx.lineTo(right[n - 1][0], right[n - 1][1]);
      for (let i = n - 2; i >= 0; i--) {
        const prev = right[i + 1];
        const curr = right[i];
        trailCtx.quadraticCurveTo(prev[0], prev[1], (prev[0] + curr[0]) * 0.5, (prev[1] + curr[1]) * 0.5);
      }
      trailCtx.closePath();
      trailCtx.fillStyle = grad;
      trailCtx.fill();
    }

    function syncCursorState() {
      const cube = window.__udghatCube;
      const onLink = lastTarget && lastTarget.closest('a, button, summary, [role="button"]');
      const onCube =
        cube &&
        cube.active &&
        Math.hypot(mouseX - cube.cx, mouseY - cube.cy) <= cube.hitRadius;

      const dragging = Boolean(cube && cube.dragging);
      dot.classList.toggle('is-dragging', dragging);
      dot.classList.toggle('is-link', !dragging && Boolean(onLink));
      dot.classList.toggle('is-cube', dragging || (!onLink && Boolean(onCube)));
      label.textContent = dragging ? '↻' : 'Drag';
    }

    function tick() {
      rafId = 0;
      const now = performance.now();
      const dx = mouseX - curX;
      const dy = mouseY - curY;
      // Weighted lag gives the cursor tactile mass
      const factor = reduced.matches ? 1 : 0.2;
      curX += dx * factor;
      curY += dy * factor;
      dot.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`;

      const speed = Math.hypot(dx, dy);
      const isDragging = Boolean(window.__udghatCube && window.__udghatCube.dragging);

      if (!reduced.matches && visible) {
        const lastPt = trailPoints[trailPoints.length - 1];
        if (speed > 1.2 && (!lastPt || Math.hypot(curX - lastPt.x, curY - lastPt.y) > 1.5)) {
          trailPoints.push({ x: curX, y: curY, t: now });
          if (trailPoints.length > 26) trailPoints.shift();
        }
        drawTaperedStroke(now, speed, isDragging);
      } else if (trailPoints.length) {
        trailPoints = [];
        if (trailCtx) trailCtx.clearRect(0, 0, innerWidth, innerHeight);
      }

      if (Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25 || trailPoints.length > 1) {
        rafId = requestAnimationFrame(tick);
      }
    }

    addEventListener(
      'pointermove',
      (e) => {
        if (e.pointerType !== 'mouse') return;
        mouseX = e.clientX;
        mouseY = e.clientY;
        lastTarget = e.target;

        if (!visible) {
          visible = true;
          curX = mouseX;
          curY = mouseY;
          trailPoints = [];
          dot.classList.remove('is-hidden');
        }

        syncCursorState();
        if (!rafId) rafId = requestAnimationFrame(tick);
      },
      { passive: true }
    );

    addEventListener('pointerdown', syncCursorState, { passive: true });
    addEventListener('pointerup', syncCursorState, { passive: true });
    addEventListener('scroll', () => {
      if (visible) syncCursorState();
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      visible = false;
      dot.classList.add('is-hidden');
    });

    finePointer.addEventListener('change', () => {
      document.documentElement.classList.toggle('custom-cursor', finePointer.matches);
      if (!finePointer.matches) {
        visible = false;
        trailPoints = [];
        if (trailCtx) trailCtx.clearRect(0, 0, innerWidth, innerHeight);
        dot.classList.add('is-hidden');
      }
    });
  }
})();
