(function () {
  // ===== Mobile Navbar Toggle =====
  const btn = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('mobileNav');

  function setOpen(open) {
    if (!drawer) return;
    drawer.setAttribute('data-open', String(open));
    if (btn) btn.setAttribute('aria-expanded', String(open));
    // lock scroll when drawer open
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (btn && drawer) {
    btn.addEventListener('click', () => {
      const open = drawer.getAttribute('data-open') === 'true';
      setOpen(!open);
    });

    drawer.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !btn.contains(e.target)) {
        if (drawer.getAttribute('data-open') === 'true') setOpen(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.getAttribute('data-open') === 'true') setOpen(false);
    });
  }

  // ===== Route Badge from URL path + highlight current nav =====
  const badge = document.getElementById('routeBadge');
  if (badge) {
    const labels = {
      'about': 'من نحن',
      'products': 'المنتجات',
      'locations': 'فروعنا',
      'contact': 'تواصل',
      'privacy': 'الخصوصية',
      'terms': 'الشروط'
    };
    const seg = (location.pathname.replace(/^\/+/, '').split('/')[0] || '').toLowerCase();
    if (labels[seg]) {
      badge.innerHTML = '<span class="dot" aria-hidden="true"></span>' + labels[seg];
      badge.hidden = false;
      const match = document.querySelector('.nav-links a[href^="/' + seg + '"]');
      if (match) match.setAttribute('aria-current', 'page');
    } else {
      badge.hidden = true;
    }
  }

  // ===== Reveal animations for hero and cards =====
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('reveal'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });

  document.querySelectorAll('.hero-shot, .info').forEach((el) => io.observe(el));

  // ===== Lightbox =====
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbTitle = document.getElementById('lightboxTitle');
  const lbClose = document.getElementById('lbClose');

  function openLightbox(src, title) {
    if (!lb || !lbImg || !lbTitle) return;
    lbImg.src = src; lbImg.alt = title || '';
    lbTitle.textContent = title || 'عرض الصورة';
    lb.style.display = 'flex';
    requestAnimationFrame(() => {
      lb.classList.add('show');
      lb.setAttribute('aria-hidden', 'false');
    });
  }

  function closeLightbox() {
    if (!lb || !lbImg) return;
    lb.classList.remove('show');
    setTimeout(() => {
      lb.style.display = 'none';
      lb.setAttribute('aria-hidden', 'true');
      lbImg.src = '';
    }, 200);
  }

  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lb) {
    lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lb.classList.contains('show')) closeLightbox();
    });
  }

  document.querySelectorAll('.brand-image').forEach((img) => {
    img.addEventListener('click', () => {
      openLightbox(img.src, img.getAttribute('data-lightbox') || img.alt || 'الصورة');
    });
  });

  // ===== Feature Modal (optional cards -> modal) =====
  const fc = document.getElementById('featureCenter');
  const fm = fc ? fc.querySelector('.feature-modal') : null;
  const fcTitle = document.getElementById('fcTitle');
  const fcBadge = document.getElementById('fcBadge');
  const fcDesc = document.getElementById('fcDesc');
  const fcList = document.getElementById('fcList');
  const fcMetrics = document.getElementById('fcMetrics');

  const J = (s, f) => { try { return JSON.parse(s); } catch { return f; } };

  function openModalFromCard(card) {
    if (!fc || !fm) return;
    fcTitle.textContent = card.dataset.title || card.querySelector('h3')?.textContent || 'الميزة';
    fcBadge.textContent = card.dataset.badge || '';
    fcDesc.textContent = card.dataset.desc || card.querySelector('p')?.textContent || '';

    fcList.innerHTML = '';
    J(card.dataset.points, []).forEach((pt) => {
      const li = document.createElement('li'); li.textContent = pt; fcList.appendChild(li);
    });

    fcMetrics.innerHTML = '';
    J(card.dataset.metrics, []).forEach((m) => {
      const el = document.createElement('div');
      el.className = 'metric';
      el.innerHTML = `<div class="k">${m.k}</div><div class="v">${m.v}</div>`;
      fcMetrics.appendChild(el);
    });

    fc.classList.add('show');
    requestAnimationFrame(() => fm.classList.add('show'));
  }

  function closeModal() {
    if (!fc || !fm) return;
    fm.classList.remove('show');
    setTimeout(() => fc.classList.remove('show'), 160);
  }

  const stack = document.getElementById('featuresStack');
  if (stack) {
    stack.addEventListener('click', (e) => {
      const card = e.target.closest('.info');
      if (card) openModalFromCard(card);
    });
  }
  if (fc) {
    fc.addEventListener('click', (e) => { if (e.target === fc) closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fc.classList.contains('show')) closeModal();
    });
  }
})();

(function () {
  // Mobile drawer
  const btn = document.querySelector('.nav-toggle');
  const drawer = document.getElementById('mobileNav');
  function setOpen(open) {
    if (!drawer) return;
    drawer.setAttribute('data-open', String(open));
    if (btn) btn.setAttribute('aria-expanded', String(open));
    document.documentElement.style.overflow = open ? 'hidden' : '';
    document.body.style.overflow = open ? 'hidden' : '';
  }
  if (btn && drawer) {
    btn.addEventListener('click', () => setOpen(drawer.getAttribute('data-open') !== 'true'));
    drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('click', (e) => { if (!drawer.contains(e.target) && !btn.contains(e.target) && drawer.getAttribute('data-open') === 'true') setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.getAttribute('data-open') === 'true') setOpen(false); });
  }

  // Route badge + nav highlight
  const badge = document.getElementById('routeBadge');
  if (badge) {
    const labels = { about:'من نحن', products:'المنتجات', locations:'فروعنا', contact:'تواصل', privacy:'الخصوصية', terms:'الشروط' };
    const seg = (location.pathname.replace(/^\/+/, '').split('/')[0] || '').toLowerCase();
    if (labels[seg]) {
      badge.innerHTML = '<span class="dot" aria-hidden="true"></span>' + labels[seg];
      badge.hidden = false;
      const link = document.querySelector('.nav-links a[href^="/' + seg + '"]');
      if (link) link.setAttribute('aria-current', 'page');
    } else badge.hidden = true;
  }
})();