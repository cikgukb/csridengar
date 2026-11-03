/* I Dengar — interaksi & scroll-world */
(function () {
  'use strict';

  const root = document.documentElement;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 900px)').matches;

  /* ---------- Tahun ---------- */
  const tahun = document.getElementById('tahun');
  if (tahun) tahun.textContent = new Date().getFullYear();

  /* ---------- Saiz teks ---------- */
  const btnTeks = document.getElementById('btnTeks');
  const simpanTeks = (() => { try { return localStorage.getItem('idengar-teks') === 'besar'; } catch (e) { return false; } })();
  if (simpanTeks) { root.classList.add('teks-besar'); btnTeks && btnTeks.setAttribute('aria-pressed', 'true'); }
  btnTeks && btnTeks.addEventListener('click', () => {
    const on = root.classList.toggle('teks-besar');
    btnTeks.setAttribute('aria-pressed', String(on));
    try { localStorage.setItem('idengar-teks', on ? 'besar' : 'biasa'); } catch (e) { /* abaikan */ }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  });

  /* ---------- Nav ---------- */
  const nav = document.getElementById('nav');
  const burger = document.getElementById('burger');
  const mobile = document.getElementById('mobileMenu');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  if (burger && mobile) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Buka menu' : 'Tutup menu');
      mobile.hidden = open;
    });
    mobile.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      burger.setAttribute('aria-expanded', 'false');
      mobile.hidden = true;
    }));
  }

  /* ---------- Reveal ---------- */
  const reveals = document.querySelectorAll('[data-reveal]');
  if (prefersReduced || !('IntersectionObserver' in window)) {
    root.classList.add('no-anim');
    reveals.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en, i) => {
        if (en.isIntersecting) {
          const siblings = Array.from(en.target.parentElement.querySelectorAll(':scope > [data-reveal]'));
          const idx = Math.max(0, siblings.indexOf(en.target));
          en.target.style.transitionDelay = (Math.min(idx, 5) * 90) + 'ms';
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  }

  /* ---------- Kaunter ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const runCounter = (el) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    if (prefersReduced) { el.textContent = target.toLocaleString('ms-MY'); return; }
    const dur = 1600; const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ms-MY');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver((entries) => {
      entries.forEach(en => { if (en.isIntersecting) { runCounter(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.5 });
    counters.forEach(c => cio.observe(c));
  } else { counters.forEach(runCounter); }

  /* ---------- Cerita: scroll world (GSAP ScrollTrigger) ---------- */
  const cerita = document.getElementById('cerita');
  const scenes = cerita ? Array.from(cerita.querySelectorAll('.scene')) : [];
  const imgs = cerita ? Array.from(cerita.querySelectorAll('.cerita__img')) : [];
  const bars = cerita ? Array.from(cerita.querySelectorAll('.cerita__progress i')) : [];
  let active = 0;

  const setScene = (n) => {
    n = Math.max(0, Math.min(scenes.length - 1, n));
    if (n === active && scenes[n].classList.contains('is-active')) return;
    active = n;
    scenes.forEach((s, i) => s.classList.toggle('is-active', i === n));
    imgs.forEach((im, i) => im.classList.toggle('is-active', i === n));
    bars.forEach((b, i) => b.classList.toggle('is-done', i <= n));
  };

  const initScrollWorld = () => {
    if (!cerita || !window.gsap || !window.ScrollTrigger) return;
    if (prefersReduced || !isDesktop()) return; // mobile: susunan statik dalam CSS
    gsap.registerPlugin(ScrollTrigger);

    const spacer = document.createElement('div');
    spacer.className = 'cerita__spacer';
    cerita.appendChild(spacer);

    ScrollTrigger.create({
      trigger: cerita,
      start: 'top top',
      end: () => '+=' + (spacer.offsetHeight),
      pin: cerita.querySelector('.cerita__pin'),
      pinSpacing: false,
      scrub: true,
      onUpdate: (self) => {
        const n = Math.min(scenes.length - 1, Math.floor(self.progress * scenes.length));
        setScene(n);
      }
    });

    // Parallax ringan hero
    const heroImg = document.querySelector('.hero__media img');
    if (heroImg) {
      gsap.to(heroImg, {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }
    // Blob hero melayang
    gsap.to('.hero__blob--1', { y: 40, x: -30, duration: 9, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to('.hero__blob--2', { y: -40, x: 30, duration: 11, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  };

  // GSAP dimuat dengan defer selepas skrip ini; tunggu window load
  if (window.gsap && window.ScrollTrigger) initScrollWorld();
  else window.addEventListener('load', initScrollWorld);

  // Fallback tanpa GSAP: tukar babak ikut IntersectionObserver pada setiap scene (mobile juga)
  if (!isDesktop() || prefersReduced) {
    setScene(0);
  }

  /* ---------- Borang permohonan ---------- */
  const form = document.getElementById('borangMohon');
  const status = document.getElementById('statusBorang');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'form__status';
      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = 'Sila lengkapkan ruangan bertanda * sebelum menghantar.';
        status.classList.add('is-err');
        return;
      }
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const btn = form.querySelector('.form__submit');
      const asal = btn.textContent;
      btn.disabled = true; btn.textContent = 'Menghantar…';
      try {
        const res = await fetch('/api/mohon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.mesej || 'Permohonan tidak dapat dihantar.');
        form.classList.add('is-sent');
        status.textContent = 'Terima kasih! Permohonan anda telah diterima (rujukan ' + out.rujukan + '). Pasukan I Dengar akan menghubungi anda dalam 5 hari bekerja.';
        status.classList.add('is-ok');
        form.reset();
      } catch (err) {
        status.textContent = (err && err.message) || 'Maaf, berlaku ralat. Sila cuba lagi atau WhatsApp kami.';
        status.classList.add('is-err');
      } finally {
        btn.disabled = false; btn.textContent = asal;
      }
    });
  }
})();
