(function(){
  // Utility
  const J = (s,f)=>{ try{ return JSON.parse(s); }catch{ return f; } };

  // Feature modal elements
  const fc = document.getElementById('featureCenter');
  const fm = fc.querySelector('.feature-modal');
  const fcTitle = document.getElementById('fcTitle');
  const fcBadge = document.getElementById('fcBadge');
  const fcDesc  = document.getElementById('fcDesc');
  const fcList  = document.getElementById('fcList');
  const fcMetrics = document.getElementById('fcMetrics');

  function openModalFromCard(card){
    fcTitle.textContent = card.dataset.title || card.querySelector('h3')?.textContent || 'الميزة';
    fcBadge.textContent = card.dataset.badge || '';
    fcDesc.textContent  = card.dataset.desc || card.querySelector('p')?.textContent || '';

    fcList.innerHTML = '';
    J(card.dataset.points, []).forEach(pt=>{
      const li=document.createElement('li'); li.textContent=pt; fcList.appendChild(li);
    });

    fcMetrics.innerHTML = '';
    J(card.dataset.metrics, []).forEach(m=>{
      const el=document.createElement('div'); el.className='metric';
      el.innerHTML = `<div class="k">${m.k}</div><div class="v">${m.v}</div>`;
      fcMetrics.appendChild(el);
    });

    fc.classList.add('show');
    requestAnimationFrame(()=> fm.classList.add('show'));
  }
  function closeModal(){
    fm.classList.remove('show');
    setTimeout(()=> fc.classList.remove('show'), 160);
  }
  // Close on outside or Esc
  fc.addEventListener('click', (e)=>{ if(e.target === fc) closeModal(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && fc.classList.contains('show')) closeModal(); });

  // Hover/tap to open modal
  const stack = document.getElementById('featuresStack');
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;

  if (!isTouch){
    // Desktop: open on hover, close when mouse leaves card or modal
    stack.addEventListener('mouseover', (e)=>{
      const card = e.target.closest('.info');
      if(!card) return;
      openModalFromCard(card);
    });
    // Close when pointer leaves both the stack and modal
    stack.addEventListener('mouseleave', ()=>{
      if (!fc.matches(':hover')) closeModal();
    });
    fm.addEventListener('mouseleave', closeModal);
  } else {
    // Mobile: tap to open, tap outside to close
    stack.addEventListener('click', (e)=>{
      const card = e.target.closest('.info');
      if(!card) return;
      openModalFromCard(card);
    });
  }

  // Image Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbTitle = document.getElementById('lightboxTitle');
  const lbClose = document.getElementById('lbClose');

  function openLightbox(src, title){
    lbImg.src = src; lbImg.alt = title || ''; lbTitle.textContent = title || 'عرض الصورة';
    lb.style.display = 'flex';
    requestAnimationFrame(()=>{ lb.classList.add('show'); lb.setAttribute('aria-hidden','false'); });
  }
  function closeLightbox(){
    lb.classList.remove('show');
    setTimeout(()=>{ lb.style.display='none'; lb.setAttribute('aria-hidden','true'); lbImg.src=''; }, 200);
  }
  lbClose?.addEventListener('click', closeLightbox);
  lb?.addEventListener('click', (e)=>{ if(e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && lb?.classList.contains('show')) closeLightbox(); });

  document.querySelectorAll('.brand-image').forEach(img=>{
    img.addEventListener('click', ()=>{
      openLightbox(img.src, img.getAttribute('data-lightbox') || img.alt || 'الصورة');
    });
  });

  // Reveal animations
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add('reveal'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -10% 0px' });
  document.querySelectorAll('.hero-shot, .info').forEach(el=> io.observe(el));

  // Parallax
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) {
    let lastY = 0;
    window.addEventListener('scroll', ()=>{
      const y = window.scrollY || 0;
      const delta = Math.min(24, Math.max(-24, (y - lastY) * 0.08));
      lastY = y;
      const bg = document.querySelector('.bg-logo img');
      if (bg) bg.style.transform = `translateY(${2 - delta}px) scale(1.005)`;
      document.querySelectorAll('.hero-shot').forEach((s, i)=>{
        s.style.transform = `translateY(${Math.sin((y/220)+(i*0.7))*4 + 0}px)`;
      });
    }, { passive:true });
  }
})();