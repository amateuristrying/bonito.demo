// Shared chrome + motion system: loader, header, menu, cursor, Lenis, reveals, footer, forms.
const { gsap, ScrollTrigger, SplitText } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);
document.documentElement.classList.remove('no-js');

export const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const BONITO = 'https://bonito.in';

// ——— Logo (inline so it can recolour) ———
let logoSVG = '';
export async function logo() {
  if (logoSVG) return logoSVG;
  const t = await fetch('/assets/img/logo.svg').then((r) => r.text()).catch(() => '');
  logoSVG = t.replace(/fill="#142533"/g, 'fill="currentColor"').replace(/<svg /, '<svg aria-label="Bonito Designs" role="img" ');
  return logoSVG;
}

const NAV = [
  ['Design', '/design/'],
  ['Our Expertise', '/#process'],
  ['Cities', '/#cities'],
  ['Why Bonito', '/#why'],
  ['Inspiration', '/#atelier'],
  ['Workspaces', BONITO + '/commercial-interior-designers/', true],
  ['Refer and Earn', BONITO + '/refer-and-earn/', true],
];

function chrome() {
  const here = location.pathname;
  const nav = NAV.map(([t, h, ext]) => `<a href="${h}"${ext ? ' target="_blank" rel="noopener"' : ''} class="${h === here ? 'is-active' : ''}">${t}</a>`).join('');
  document.body.insertAdjacentHTML('afterbegin', `
  <div class="loader" aria-hidden="true"><div class="loader__inner"><div class="loader__logo" data-logo></div><div class="loader__bar"><i></i></div><div class="loader__count">000</div></div><div class="loader__tag">celebrity-curated homes</div></div>
  <header class="hdr"><div class="hdr__bar">
    <a href="/" class="hdr__logo" data-logo aria-label="Bonito Designs home"></a>
    <nav class="hdr__nav" aria-label="Primary">${nav}</nav>
    <div class="hdr__cta"><a href="#book" class="btn sm" data-book>Book Consultation <span class="arr">→</span></a><button class="hdr__burger" aria-label="Open menu"><span></span></button></div>
  </div></header>
  <div class="menu" aria-hidden="true"><nav>${NAV.map(([t, h, ext]) => `<a class="menu__item" href="${h}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`).join('')}</nav>
    <div class="menu__foot"><span>hello@bonito.in</span><span>080-6845-5000 (Mumbai) · 080-6845-5090 (Bengaluru)</span></div></div>
  <div class="cursor" aria-hidden="true"><div class="cursor__ring"><span></span></div><div class="cursor__dot"></div></div>
  <div class="modal" data-modal><div class="modal__box"><button class="modal__x" aria-label="Close">✕</button><div data-modal-body></div></div></div>
  <div class="demo-tag">Demo concept · Bonito Designs</div>`);
  document.body.insertAdjacentHTML('beforeend', footerHTML());
}

function footerHTML() {
  const city = `<select required><option value="" disabled selected></option><option>Mumbai</option><option>Bengaluru</option><option>Hyderabad</option></select>`;
  const ic = {
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4 1.7-4 4.2V10H7v4h3v7h4v-7h3l1-4h-4V8.6c0-.4.2-.6.6-.6z"/></svg>',
    li: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9h3.5v11H4zM5.7 3.5a2 2 0 110 4 2 2 0 010-4zM10 9h3.3v1.6c.5-.9 1.7-1.9 3.5-1.9 3.6 0 4.2 2.3 4.2 5.4V20h-3.5v-5.2c0-1.3 0-2.9-1.8-2.9s-2.1 1.4-2.1 2.8V20H10z"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2a3 3 0 00-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 002 8.2 31 31 0 001.6 12 31 31 0 002 15.8a3 3 0 002.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 002.1-2.1c.4-1.2.4-3.8.4-3.8s0-2.6-.4-3.8zM10 15V9l5.2 3z"/></svg>',
    pi: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 2 1.6 2 1.9 0 3.4-2 3.4-5 0-2.6-1.9-4.4-4.5-4.4-3.1 0-4.9 2.3-4.9 4.7 0 .9.4 1.9.8 2.5.1.1.1.2.1.3l-.3 1.2c0 .2-.2.3-.4.2-1.4-.7-2.3-2.7-2.3-4.3 0-3.5 2.6-6.8 7.4-6.8 3.9 0 6.9 2.8 6.9 6.5 0 3.9-2.4 7-5.8 7-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.2-1.4 2.9A10 10 0 1012 2z"/></svg>',
  };
  return `
  <section class="book" id="book"><div class="wrap"><div class="book__card"><div class="book__deco"></div>
    <div><span class="hand">your home makeover starts here</span><h2 class="h-l" style="margin-top:10px">Book a consultation call</h2><p class="lead" style="margin-top:18px">Begin your home design journey with a dedicated Bonito expert.</p></div>
    <form class="form" data-form novalidate>
      <div class="field"><input placeholder=" " required name="name" autocomplete="name"><label>Your Name</label></div>
      <div class="field"><input placeholder=" " required name="mobile" inputmode="tel" autocomplete="tel"><label>Mobile No.</label></div>
      <div class="field"><input placeholder=" " name="email" type="email" autocomplete="email"><label>Email ID</label></div>
      <div class="field">${city}<label>Choose City *</label></div>
      <div class="field full"><input placeholder=" " name="pincode" inputmode="numeric"><label>Pincode</label></div>
      <button class="btn light full" type="submit" style="justify-content:center">Submit <span class="arr">→</span></button>
      <div class="form__done">Thank you — a Bonito design expert will call you shortly. <em style="opacity:.6">(Demo form: nothing was sent.)</em></div>
    </form>
  </div></div></section>
  <footer class="ftr"><div class="wrap">
    <div class="ftr__top">
      <div><div data-logo style="width:150px;color:var(--ink)"></div><p class="lead" style="font-size:15px;margin-top:18px;max-width:30ch">India's largest full-home-only interior design brand. Born in Bengaluru. Trusted across India.</p>
        <div class="ftr__social" style="margin-top:20px"><a href="https://www.instagram.com/bonitodesigns_official/" target="_blank" rel="noopener" aria-label="Instagram">${ic.ig}</a><a href="https://www.facebook.com/bonitodesigns" target="_blank" rel="noopener" aria-label="Facebook">${ic.fb}</a><a href="https://www.linkedin.com/company/bonito-designs/" target="_blank" rel="noopener" aria-label="LinkedIn">${ic.li}</a><a href="https://www.youtube.com/bonitodesigns" target="_blank" rel="noopener" aria-label="YouTube">${ic.yt}</a><a href="https://in.pinterest.com/bonito_designs/" target="_blank" rel="noopener" aria-label="Pinterest">${ic.pi}</a></div></div>
      <div><h5>Quick Links</h5><ul><li><a href="${BONITO}/about-us/" target="_blank" rel="noopener">About Us</a></li><li><a href="${BONITO}/contact-us/" target="_blank" rel="noopener">Contact Us</a></li><li><a href="/design/">Design</a></li><li><a href="${BONITO}/blog/" target="_blank" rel="noopener">Blogs</a></li><li><a href="/#why">Why Bonito</a></li><li><a href="/#atelier">Atelier Series</a></li><li><a href="${BONITO}/careers/" target="_blank" rel="noopener">Careers</a></li><li><a href="${BONITO}/investor-relations/" target="_blank" rel="noopener">Investor Relations</a></li></ul></div>
      <div><h5>Resources</h5><ul><li><a href="${BONITO}" target="_blank" rel="noopener">Download Brochure</a></li><li><a href="/#faq">FAQs</a></li></ul><h5 style="margin-top:28px">Press &amp; Media</h5><ul><li><a href="/#press">Press Releases</a></li></ul></div>
      <div><h5>Contact</h5><ul><li><a href="tel:08068455000">080-6845-5000 (Mumbai)</a></li><li><a href="tel:08068455090">080-6845-5090 (Bengaluru)</a></li><li><a href="tel:08065381590">080-6538-1590 (Hyderabad)</a></li><li><a href="mailto:hello@bonito.in">hello@bonito.in</a></li></ul></div>
      <div><h5>Legal</h5><ul><li><a href="${BONITO}/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a></li><li><a href="${BONITO}/cookies-policy/" target="_blank" rel="noopener">Cookies Policy</a></li></ul></div>
    </div>
    <div class="ftr__addr">
      <div><b>Bengaluru - HSR</b>Building No. 1182, 5th Main Road, 7th Sector HSR Layout, Bengaluru – 560102</div>
      <div><b>Bengaluru - HRBR</b>13,14 &amp; 15 Shakthi Nagar, ORR, Horamavu Cross, Banaswadi, Bengaluru – 560043</div>
      <div><b>Mumbai - Andheri</b>6th floor, Viraj Towers, Western Express Hwy, next to Andheri Flyover, Mumbai - 400093</div>
      <div><b>Mumbai - Thane</b>4th Floor, Vibgyor, A- Wing, Ghodbunder Rd, Patlipada, Thane West, 400607</div>
      <div><b>Hyderabad</b>Ground Floor, Vasavi Sky City, Gachibowli Circle, Telecom Nagar, Gachibowli, Hyderabad</div>
    </div>
    <div class="ftr__big" aria-hidden="true"><span>bonito</span><span class="italic" style="color:var(--coral)">.</span></div>
    <div class="ftr__bottom"><span>© Copyright 2026, Bonito Designs. All rights reserved.</span><span>Demo concept — 3D &amp; AR experience</span></div>
  </div></footer>`;
}

// ——— Lenis ———
export let lenis = null;
function smooth() {
  if (reduced || !window.Lenis) return;
  lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const el = document.querySelector(url.hash);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(el, { offset: -20, duration: 1.6 });
  });
}

// ——— Header behaviour + menu ———
let menuTl;
function closeMenu() { if (menuTl && menuTl.progress() > 0) menuTl.reverse(); document.querySelector('.menu')?.classList.remove('is-open'); }
function header() {
  const hdr = document.querySelector('.hdr');
  let last = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      hdr.classList.toggle('is-hidden', y > 300 && y > last && !document.querySelector('.menu.is-open'));
      last = y;
    },
  });
  const menu = document.querySelector('.menu');
  menuTl = gsap.timeline({ paused: true })
    .to(menu, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.inOut' })
    .from('.menu__item', { yPercent: 100, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'expo.out' }, '-=0.3');
  document.querySelector('.hdr__burger').addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open);
    open ? menuTl.play() : menuTl.reverse();
    lenis && (open ? lenis.stop() : lenis.start());
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.classList.remove('is-open'); menuTl.reverse(); lenis?.start(); } });
}

// ——— Cursor ———
function cursor() {
  if (isTouch) return;
  const c = document.querySelector('.cursor');
  const label = c.querySelector('span');
  const x = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' });
  const y = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
  let seen = false;
  addEventListener('pointermove', (e) => { x(e.clientX); y(e.clientY); if (!seen) { seen = true; gsap.to(c, { opacity: 1, duration: 0.4 }); } });
  document.addEventListener('pointerover', (e) => {
    const l = e.target.closest('[data-cursor]');
    const h = e.target.closest('a, button, [role="button"], input, select');
    if (l) { label.textContent = l.dataset.cursor; c.classList.add('is-label'); c.classList.remove('is-hover'); }
    else { c.classList.remove('is-label'); c.classList.toggle('is-hover', !!h); }
  });
  document.addEventListener('pointerleave', () => gsap.to(c, { opacity: 0 }));
  document.addEventListener('pointerenter', () => gsap.to(c, { opacity: 1 }));
}
export function cursorVisible(v) { const c = document.querySelector('.cursor'); if (c) c.style.display = v ? '' : 'none'; }

// ——— Reveals ———
export function reveals(root = document) {
  root.querySelectorAll('[data-split]:not(.is-split)').forEach((el) => {
    el.classList.add('is-split');
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'ln',
      onSplit: (self) => gsap.from(self.lines, { yPercent: 110, duration: 1.15, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
    });
  });
  root.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', delay: +(el.dataset.delay || 0), scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  root.querySelectorAll('.img-reveal').forEach((el) => {
    const img = el.querySelector('img');
    gsap.fromTo(el, { clipPath: 'inset(18% 10% 18% 10% round 26px)' }, { clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
    if (img) gsap.to(img, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  root.querySelectorAll('[data-speed]').forEach((el) => {
    gsap.fromTo(el, { yPercent: -(+el.dataset.speed) * 10 }, { yPercent: +el.dataset.speed * 10, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  root.querySelectorAll('.ftr__big span').forEach((el, i) => gsap.from(el, { yPercent: 100, duration: 1.4, ease: 'expo.out', delay: i * 0.1, scrollTrigger: { trigger: '.ftr__big', start: 'top 95%', once: true } }));
}

// ——— Magnetic buttons ———
function magnetic() {
  if (isTouch) return;
  document.querySelectorAll('.btn, .rail-nav button, .theme__go').forEach((b) => {
    const xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.22); yTo((e.clientY - r.top - r.height / 2) * 0.3); });
    b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

// ——— Forms ———
function forms() {
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    const req = [...f.querySelectorAll('[required]')];
    const bad = req.find((i) => !i.value.trim());
    if (bad) { bad.focus(); gsap.fromTo(bad.closest('.field') || bad, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' }); return; }
    f.classList.add('is-done');
  });
}

// ——— Video / image modal ———
export function openModal(html) {
  const m = document.querySelector('[data-modal]');
  m.querySelector('[data-modal-body]').innerHTML = html;
  m.classList.add('is-open');
  lenis?.stop();
}
function modal() {
  const m = document.querySelector('[data-modal]');
  const close = () => { m.classList.remove('is-open'); setTimeout(() => (m.querySelector('[data-modal-body]').innerHTML = ''), 400); lenis?.start(); };
  m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.modal__x')) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && m.classList.contains('is-open')) close(); });
  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-video]');
    if (v) { e.preventDefault(); openModal(`<video src="${v.dataset.video}" controls autoplay playsinline poster="${v.dataset.poster || ''}"></video>`); }
  });
}

// ——— Loader ———
function loader(onDone) {
  const el = document.querySelector('.loader');
  const bar = el.querySelector('.loader__bar i');
  const count = el.querySelector('.loader__count');
  const imgs = [...document.images].filter((i) => i.loading !== 'lazy').slice(0, 12);
  let loaded = 0;
  const total = imgs.length + 1;
  const prog = { v: 0 };
  const tick = () => { const p = loaded / total; gsap.to(prog, { v: p, duration: 0.6, ease: 'power2.out', onUpdate: () => { bar.style.transform = `scaleX(${prog.v})`; count.textContent = String(Math.round(prog.v * 100)).padStart(3, '0'); } }); };
  imgs.forEach((i) => { if (i.complete) { loaded++; } else { i.addEventListener('load', () => { loaded++; tick(); }, { once: true }); i.addEventListener('error', () => { loaded++; tick(); }, { once: true }); } });
  const fontReady = document.fonts ? document.fonts.ready : Promise.resolve();
  fontReady.then(() => { loaded++; tick(); });
  tick();
  const finish = () => {
    gsap.timeline()
      .to(prog, { v: 1, duration: 0.5, onUpdate: () => { bar.style.transform = `scaleX(${prog.v})`; count.textContent = String(Math.round(prog.v * 100)).padStart(3, '0'); } })
      .to('.loader__inner, .loader__tag', { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1.0, ease: 'expo.inOut' }, '-=0.1')
      .add(() => { el.remove(); onDone && onDone(); }, '-=0.45');
  };
  const minTime = new Promise((r) => setTimeout(r, sessionStorageSafe('bonito-seen') ? 500 : 1400));
  Promise.all([minTime, Promise.race([Promise.all(imgs.map((i) => (i.complete ? 1 : new Promise((r) => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })))).then(() => fontReady), new Promise((r) => setTimeout(r, 4500))])]).then(finish);
  try { sessionStorage.setItem('bonito-seen', '1'); } catch (e) { /* ignore */ }
}
function sessionStorageSafe(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

// ——— Init ———
export async function init({ onReady } = {}) {
  chrome();
  const svg = await logo();
  document.querySelectorAll('[data-logo]').forEach((el) => (el.innerHTML = svg));
  smooth();
  header();
  cursor();
  forms();
  modal();
  document.querySelectorAll('[data-book]').forEach((a) => a.addEventListener('click', (e) => { const b = document.getElementById('book'); if (b) { e.preventDefault(); lenis ? lenis.scrollTo(b, { duration: 1.8 }) : b.scrollIntoView({ behavior: 'smooth' }); } }));
  loader(() => { reveals(); magnetic(); onReady && onReady(); ScrollTrigger.refresh(); });
}
