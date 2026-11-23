import { init, isTouch } from './core.js';
import { PROJECTS, FILTERS, ROOM_LABELS } from './data-projects.js';
import { Viewer } from './viewer.js';

const { gsap, ScrollTrigger, Flip } = window;
gsap.registerPlugin(Flip);
const $ = (s, r = document) => r.querySelector(s);

const LOC_BY_CITY = { Mumbai: ['Central Mumbai', 'Western Mumbai', 'Navi Mumbai', 'Thane'], Bengaluru: ['North Bengaluru', 'South Bengaluru'] };
const PAGE = 6;
const state = { city: '', location: '', typology: '', room: '', shown: PAGE };
const viewer = new Viewer();

// ——————————————— Filters ———————————————
const DEFS = [
  { key: 'city', label: 'City', opts: () => FILTERS.city },
  { key: 'location', label: 'Location', opts: () => (state.city ? LOC_BY_CITY[state.city] : FILTERS.location) },
  { key: 'typology', label: 'Typology', opts: () => FILTERS.typology },
  { key: 'room', label: 'Room Type', opts: () => FILTERS.room },
];
const match = (p, s = state) => (!s.city || p.city === s.city) && (!s.location || p.location === s.location) && (!s.typology || p.typology === s.typology) && (!s.room || p.rooms.includes(s.room));
const labelOf = (key, v) => (key === 'room' ? ROOM_LABELS[v] : v);

function renderFilters() {
  const host = $('[data-filters]');
  host.innerHTML = DEFS.map((d) => {
    const cur = state[d.key];
    const items = ['', ...d.opts()].map((v) => {
      const n = PROJECTS.filter((p) => match(p, { ...state, [d.key]: v })).length;
      return `<button data-v="${v}" class="${v === cur ? 'is-on' : ''}" ${n === 0 && v ? 'style="opacity:.4"' : ''}>${v ? labelOf(d.key, v) : 'All'} <em>${n}</em></button>`;
    }).join('');
    return `<div class="dd" data-key="${d.key}"><button class="dd__btn" aria-haspopup="listbox"><small>${d.label} :</small><span>${cur ? labelOf(d.key, cur) : 'All'}</span></button><div class="dd__menu" role="listbox">${items}</div></div>`;
  }).join('') + `<button class="filters__reset" data-reset>Reset</button>`;
}

function bindFilters() {
  const host = $('[data-filters]');
  host.addEventListener('click', (e) => {
    const dd = e.target.closest('.dd');
    if (e.target.closest('[data-reset]')) { Object.assign(state, { city: '', location: '', typology: '', room: '', shown: PAGE }); renderFilters(); renderGrid(); return; }
    if (!dd) return;
    if (e.target.closest('.dd__btn')) {
      const open = !dd.classList.contains('is-open');
      host.querySelectorAll('.dd.is-open').forEach((d) => d.classList.remove('is-open'));
      dd.classList.toggle('is-open', open);
      return;
    }
    const opt = e.target.closest('.dd__menu button');
    if (opt) {
      state[dd.dataset.key] = opt.dataset.v;
      if (dd.dataset.key === 'city' && state.location && !(LOC_BY_CITY[state.city] || []).includes(state.location)) state.location = '';
      if (dd.dataset.key === 'location' && opt.dataset.v) state.city = Object.keys(LOC_BY_CITY).find((c) => LOC_BY_CITY[c].includes(opt.dataset.v));
      state.shown = PAGE;
      renderFilters();
      renderGrid();
    }
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.dd')) host.querySelectorAll('.dd.is-open').forEach((d) => d.classList.remove('is-open')); });
}

// ——————————————— Cards ———————————————
const cardCache = new Map();
const ICON3D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l8 4.5v11L12 22l-8-4.5v-11z"/><path d="M12 22V12M20 6.5L12 12 4 6.5"/></svg>';
function card(p) {
  if (cardCache.has(p.id)) return cardCache.get(p.id);
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.flipId = p.id;
  el.dataset.cursor = 'Enter 3D';
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `Open ${p.title} in 3D`);
  const rooms = p.rooms.map((r) => ROOM_LABELS[r]).filter(Boolean);
  el.innerHTML = `
    <div class="card__media"><img src="${p.cover}" alt="${p.title}" loading="lazy">
      <div class="card__tags"><span class="tag">${p.style}</span><span class="tag dark">${ICON3D} 3D · AR</span></div>
      <span class="card__enter"><i>→</i>Step inside</span></div>
    <div class="card__body">
      <div class="card__row"><h3 class="card__name">${p.name}</h3><span class="card__price">${p.price}</span></div>
      <div class="card__meta">${p.location}, ${p.city} · ${p.typology}</div>
      <div class="card__rooms">${rooms.slice(0, 4).map((r) => `<span>${r}</span>`).join('')}${rooms.length > 4 ? `<span>+${rooms.length - 4}</span>` : ''}</div>
    </div>`;
  const go = () => viewer.open(p, { fromEl: el.querySelector('img'), room: state.room || undefined });
  el.addEventListener('click', go);
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  if (!isTouch) {
    const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
    el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 6); rx(-((e.clientY - r.top) / r.height - 0.5) * 6); });
    el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    gsap.set(el, { transformPerspective: 1000 });
  }
  cardCache.set(p.id, el);
  return el;
}

let firstRender = true;
function renderGrid() {
  const grid = $('[data-grid]');
  const list = PROJECTS.filter((p) => match(p));
  const visible = list.slice(0, state.shown);
  const flipState = Flip.getState(grid.querySelectorAll('.card'));
  grid.querySelectorAll('.empty').forEach((e) => e.remove());
  const keep = new Set(visible.map((p) => p.id));
  [...grid.querySelectorAll('.card')].forEach((c) => { if (!keep.has(+c.dataset.flipId)) c.remove(); });
  visible.forEach((p) => grid.appendChild(card(p)));
  if (!visible.length) grid.insertAdjacentHTML('beforeend', `<div class="empty"><span class="hand">no homes match… yet!</span>Try widening a filter — or <a href="#book" data-book style="color:var(--maroon);text-decoration:underline">book a consultation</a> and we’ll design the first one.</div>`);
  $('[data-count]').textContent = `Showing ${visible.length} of ${list.length} homes`;
  $('[data-more]').style.display = list.length > state.shown ? '' : 'none';
  if (firstRender) {
    firstRender = false;
    gsap.from(grid.querySelectorAll('.card'), { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: { each: 0.08, grid: 'auto' }, scrollTrigger: { trigger: grid, start: 'top 85%', once: true } });
    return;
  }
  Flip.from(flipState, {
    duration: 0.8, ease: 'expo.inOut', absolute: true, stagger: 0.03, scale: true,
    onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.9, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.05 }),
    onLeave: (els) => gsap.to(els, { opacity: 0, scale: 0.9, duration: 0.4 }),
    onComplete: () => ScrollTrigger.refresh(),
  });
}

// ——————————————— Tours / way / showcase ———————————————
const TOURS = [
  { t: 'Inside Mehreen Pirzada’s Dream Space | Celebrity House Tour', d: 'Step inside the stunning home of actress Mehreen Pirzada, a space that reflects elegance, warmth, and thoughtful design, brought to life by Bonito Designs.', type: '3BHK', city: 'Mumbai', sq: 1200, poster: 'mehreen-p.webp', v: 'mehreen-pirzada.mp4' },
  { t: 'Modern 3BHK Home Tour in Bangalore', d: 'Bonito Designs understood our expectations, our requirements and brought our thoughts into reality!', type: '3BHK', city: 'Bengaluru, HRBR', sq: 1650, poster: 'koul-family.webp', v: 'shaswat-koul.mp4' },
  { t: 'Inside the Raghavan Family’s 4BHK', d: 'Bonito Designs transformed our home with thoughtful, personalised design and a smooth, collaborative process. The result reflects our style perfectly and we’d happily recommend them.', type: '4BHK', city: 'Bengaluru, HRBR', sq: 1200, poster: 'raghvan-family.webp', v: 'raghavan-1.mp4' },
  { t: 'Inside the Arora Family Home', d: 'Take a tour inside the Arora family home, where Bonito Designs transformed a new property into a warm, functional, and contemporary space for Madhumita, Dheeraj, their daughter Khushi, and pet Astro. From the first meeting to the final handover, the Aroras found the process collaborative, transparent, and stress-free, with their priorities of premium quality, timely delivery, and lifestyle-matching design beautifully fulfilled.', type: '4 BHK (Villa)', city: 'Bengaluru, HRBR', sq: 3640, poster: 'arora-family.webp', v: 'madhumita-arora.mp4' },
  { t: 'Inside a Luxurious 4BHK Home | Pandey Family', d: 'Varun wanted a home that blends modern luxury with everyday comfort. At Bonito Designs, we brought that vision to life with elegant finishes and unique fluted panels that add warmth, texture, and character to his 4BHK home.', type: '4BHK', city: 'Thane', sq: 1200, poster: 'pandey-family.webp', v: 'varun-pandey.mp4' },
  { t: 'Modern 3 BHK Bangalore Home Interior | Joshi Family', d: 'Bonito Designs delivered a timeless, premium home with flawless detail and a smooth, on-time experience. It exceeded our expectations.', type: '3BHK', city: 'Bengaluru, HRBR', sq: 1300, poster: 'joshi-family.webp', v: 'chandrashekhar-joshi.mp4' },
];
function tours() {
  $('[data-tours]').innerHTML = TOURS.map((t, i) => `
    <article class="tour" data-reveal data-delay="${(i % 3) * 0.08}" data-cursor="Play" data-video="https://d3pc8mc492u0e.cloudfront.net/${t.v}" data-poster="/assets/img/${t.poster}">
      <div class="tour__media"><img src="/assets/img/${t.poster}" alt="${t.t}" loading="lazy"><span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg></span></div>
      <h3>${t.t}</h3><p>${t.d}</p>
      <div class="tour__meta"><span class="tag">${t.type}</span><span class="tag">${t.city}</span><span class="tag">${t.sq} Sq. Ft</span></div>
    </article>`).join('');
}

function way() {
  const track = $('[data-way]');
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const dist = () => track.scrollWidth - innerWidth + 40;
    gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '#way', start: 'top top', end: () => '+=' + dist(), pin: '.way__pin', scrub: 0.8, invalidateOnRefresh: true } });
    gsap.from('.way__n', { yPercent: 60, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '#way', start: 'top 60%', once: true } });
  });
}

function showcase() {
  const host = $('[data-show]');
  const render = (type) => {
    const imgs = PROJECTS.filter((p) => p.typology === type).flatMap((p) => p.gallery.map((g) => ({ ...g, p }))).slice(0, 9);
    host.innerHTML = imgs.map((g) => `<figure data-photo-open="${g.src}"><img src="${g.src}" alt="${g.p.name} ${ROOM_LABELS[g.room] || g.room}" loading="lazy"><figcaption><span class="tag">${g.p.name} · ${ROOM_LABELS[g.room] || g.room}</span></figcaption></figure>`).join('');
    gsap.from(host.children, { opacity: 0, y: 40, stagger: 0.05, duration: 0.9, ease: 'expo.out' });
    host.querySelectorAll('img').forEach((i) => i.addEventListener('load', () => ScrollTrigger.refresh(), { once: true }));
  };
  $('[data-tabs]').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $('[data-tabs]').querySelectorAll('button').forEach((x) => x.classList.toggle('is-on', x === b));
    render(b.textContent.trim());
  });
  host.addEventListener('click', (e) => { const f = e.target.closest('[data-photo-open]'); if (f) import('./core.js').then((m) => m.openModal(`<img src="${f.dataset.photoOpen}" alt="">`)); });
  render('2BHK');
}

function hero() {
  gsap.from('.dhero h1 .line-mask > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12 });
  gsap.from('[data-hero-sub]', { opacity: 0, y: 30, duration: 1.1, ease: 'expo.out', delay: 0.35, stagger: 0.1 });
  gsap.from('.crumbs', { opacity: 0, y: 10, duration: 0.8, delay: 0.2 });
  const media = $('.dhero__media');
  gsap.to(media, { clipPath: 'inset(0% 0% 0% 0% round 32px)', ease: 'none', scrollTrigger: { trigger: media, start: 'top 85%', end: 'top 15%', scrub: true } });
  gsap.to('.dhero__media img', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.dhero__pill span', { opacity: 0, y: 20, stagger: 0.08, duration: 1, ease: 'expo.out', delay: 0.8 });
}

// ——————————————— Deep links ———————————————
function fromURL() {
  const q = new URLSearchParams(location.search);
  const slug = q.get('project');
  if (!slug) return viewer.close(true);
  const p = PROJECTS.find((x) => x.slug === slug);
  if (p) viewer.open(p, { room: q.get('room') || undefined, ar: q.get('ar') === '1' });
}
addEventListener('popstate', fromURL);

renderFilters();
bindFilters();
renderGrid();
tours();
$('[data-more]').addEventListener('click', () => { state.shown += PAGE; renderGrid(); });
init({ onReady: () => { hero(); way(); showcase(); fromURL(); } });
