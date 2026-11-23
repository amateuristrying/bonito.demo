import * as THREE from 'three';
import { init, isTouch, reduced, lenis } from './core.js';
import { Stage } from './three/stage.js';
import { buildApartment, H } from './three/apartment.js';

const { gsap, ScrollTrigger } = window;

// A showcase home in Bonito's Modern palette, generated live in the browser.
const SHOWCASE = { id: 101, style: 'Modern', typology: '3BHK', rooms: ['living-room', 'kitchen-room', 'bedroom', 'dining', 'foyer', 'balcony'] };

function story() {
  const canvas = document.getElementById('story-canvas');
  const stage = new Stage(canvas, { background: '#EFE6D3', interactive: false });
  stage.bgDay = '#EFE6D3';
  const apt = buildApartment(SHOWCASE);
  stage.setApartment(apt);
  const { W, D } = apt.plan;
  const m = Math.max(W, D);
  const R = (t) => apt.rooms.find((r) => r.type === t) || apt.rooms[0];
  const L = R('living'), Dn = R('dining'), B = apt.rooms.find((r) => r.variant === 'master') || R('bedroom');
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const home = stage.orbitHome(apt);

  // pet-friendly framing: close on the sofa
  const sofa = new THREE.Vector3(); L.hero?.getWorldPosition(sofa);
  const toWalk = L.walk.pos.clone().sub(sofa).setY(0).normalize();
  const side = new THREE.Vector3(-toWalk.z, 0, toWalk.x);
  const petPos = sofa.clone().addScaledVector(toWalk, 2.1).addScaledVector(side, 1.1).setY(1.25);
  petPos.x = THREE.MathUtils.clamp(petPos.x, L.x + 0.4, L.x + L.w - 0.4);
  petPos.z = THREE.MathUtils.clamp(petPos.z, L.z + 0.4, L.z + L.d - 0.4);

  const S = [
    { p: 0.0, pos: v(-m * 0.28, m * 1.35, m * 1.05), look: v(0, -0.6, 0.4), tod: 0, aerial: true },
    { p: 0.075, pos: v(L.cx + 3.2, 10.5, L.cz + 8.5), look: v(L.cx + 0.6, 0, L.cz), tod: 0, aerial: true },
    { p: 0.15, pos: v(L.cx + 1.6, 9.5, L.cz + 7.2), look: v(L.cx + 0.6, 0, L.cz - 0.2), tod: 0, aerial: true },
    { p: 0.23, pos: L.walk.pos.clone(), look: L.walk.look.clone(), tod: 0, hop: true },
    { p: 0.31, pos: L.walk.pos.clone().lerp(L.walk.look.clone().setY(1.6), 0.12), look: L.walk.look.clone(), tod: 0.08 },
    { p: 0.36, pos: petPos, look: sofa.clone().setY(0.55), tod: 0.12 },
    { p: 0.43, pos: petPos.clone().add(v(0.2, -0.15, 0.2)), look: sofa.clone().setY(0.5), tod: 0.15 },
    { p: 0.505, pos: B.walk.pos.clone(), look: B.walk.look.clone(), tod: 0.2, hop: true },
    { p: 0.58, pos: B.walk.pos.clone().lerp(B.walk.look.clone().setY(1.6), 0.15), look: B.walk.look.clone(), tod: 0.28 },
    { p: 0.645, pos: v(0.3, m * 1.55, 1.2), look: v(0, 0, 0.6), tod: 0.4, aerial: true },
    { p: 0.72, pos: v(-0.3, m * 1.45, 1.0), look: v(0, 0, 0.6), tod: 0.55, aerial: true },
    { p: 0.8, pos: Dn.walk.pos.clone(), look: Dn.walk.look.clone(), tod: 0.95 },
    { p: 0.88, pos: Dn.walk.pos.clone().lerp(Dn.walk.look.clone().setY(1.6), 0.15), look: Dn.walk.look.clone(), tod: 1 },
    { p: 0.96, pos: home.pos.clone().multiplyScalar(1.08), look: home.target.clone(), tod: 1, hop: true, aerial: true },
    { p: 1.0, pos: home.pos.clone().multiplyScalar(1.1), look: home.target.clone(), tod: 1, aerial: true },
  ];
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const bez = (a, c, b, t) => a.clone().multiplyScalar((1 - t) ** 2).addScaledVector(c, 2 * (1 - t) * t).addScaledVector(b, t * t);

  const state = { p: 0, mx: 0, my: 0, t: 0 };
  let lastTod = -1;
  // portrait screens: pull aerial shots back so the whole plan fits
  const fit = (k) => ({ ...k, pos: k.aerial ? k.look.clone().add(k.pos.clone().sub(k.look).multiplyScalar(Math.max(1, 1.45 / stage.camera.aspect) ** 0.85)) : k.pos });
  const camAt = (p) => {
    let i = 0;
    while (i < S.length - 2 && p > S[i + 1].p) i++;
    const a = fit(S[i]), b = fit(S[i + 1]);
    const k = ease(THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1));
    let pos, look;
    if (b.hop) {
      const c = a.pos.clone().lerp(b.pos, 0.5); c.y = Math.max(a.pos.y, b.pos.y, H) + 6.5;
      const cl = a.look.clone().lerp(b.look, 0.5); cl.y = 0;
      pos = bez(a.pos, c, b.pos, k); look = bez(a.look, cl, b.look, k);
    } else { pos = a.pos.clone().lerp(b.pos, k); look = a.look.clone().lerp(b.look, k); }
    const tod = THREE.MathUtils.lerp(a.tod, b.tod, k);
    return { pos, look, tod };
  };

  const fovFor = (p) => {
    // interiors read better wide; aerials tighter
    const inside = (p > 0.2 && p < 0.6) || (p > 0.76 && p < 0.92);
    return inside ? 60 : 38;
  };
  let fovCur = 38;
  stage.camera.fov = 38; stage.camera.updateProjectionMatrix();

  stage.ticks.add((dt) => {
    state.t += dt;
    const p = state.p;
    const { pos, look, tod } = camAt(p);
    // idle drift at the top of the page
    const idle = Math.max(0, 1 - p / 0.06);
    if (idle > 0 && !reduced) {
      const ang = Math.sin(state.t * 0.12) * 0.35 * idle;
      const c = Math.cos(ang), s = Math.sin(ang);
      const x = pos.x * c - pos.z * s, z = pos.x * s + pos.z * c;
      pos.x = x; pos.z = z;
    }
    look.x += state.mx * 0.35; look.y += -state.my * 0.25;
    stage.camera.position.copy(pos);
    stage.camera.lookAt(look);
    const f = fovFor(p);
    fovCur += (f - fovCur) * Math.min(1, dt * 3);
    if (Math.abs(stage.camera.fov - fovCur) > 0.01) { stage.camera.fov = fovCur; stage.camera.updateProjectionMatrix(); }
    if (Math.abs(tod - lastTod) > 0.002) { stage.setTime(tod, 0); lastTod = tod; }
  });
  if (!isTouch) addEventListener('pointermove', (e) => { gsap.to(state, { mx: e.clientX / innerWidth - 0.5, my: e.clientY / innerHeight - 0.5, duration: 1.2, ease: 'power2.out', overwrite: true }); });

  // ——— frame + hero choreography ———
  const frame = document.querySelector('.story__frame');
  const h1 = document.querySelector('.hero h1');
  const insetStart = () => {
    const top = Math.max(innerHeight * (innerWidth < 760 ? 0.26 : 0.4), h1.getBoundingClientRect().bottom + 22);
    const sidePx = innerWidth < 760 ? 16 : innerWidth * 0.04;
    return `inset(${top}px ${sidePx}px ${innerHeight * 0.03}px ${sidePx}px round 28px)`;
  };
  gsap.set(frame, { clipPath: insetStart() });
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.story', start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true, onUpdate: (self) => { state.p = self.progress; chapters(self.progress); } } });
  tl.fromTo(frame, { clipPath: () => insetStart() }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.07 }, 0)
    .to('.hero', { yPercent: -60, opacity: 0, duration: 0.05 }, 0)
    .to('.scroll-hint', { opacity: 0, duration: 0.02 }, 0)
    .to('.story__shade', { opacity: 1, duration: 0.05 }, 0.02)
    .to('.story__progress, .story__clock', { opacity: 1, duration: 0.03 }, 0.16)
    .to('.story__progress, .story__clock', { opacity: 0, duration: 0.03 }, 0.9)
    .set({}, {}, 1);

  const cards = [...document.querySelectorAll('[data-ch]')];
  const win = [[-1, 0.02], [0.075, 0.15], [0.235, 0.31], [0.36, 0.43], [0.51, 0.58], [0.65, 0.72], [0.8, 0.88], [0.955, 1.01]];
  const shown = new Set();
  const bars = [...document.querySelectorAll('.story__progress i')];
  const clock = document.querySelector('.story__clock');
  function chapters(p) {
    cards.forEach((c) => {
      const i = +c.dataset.ch;
      const [a, b] = win[i];
      const on = p >= a && p <= b;
      if (on && !shown.has(i)) { shown.add(i); gsap.to(c, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out', overwrite: true }); }
      else if (!on && shown.has(i)) { shown.delete(i); gsap.to(c, { autoAlpha: 0, y: i === 0 ? 0 : 24, duration: 0.4, ease: 'power2.in', overwrite: true }); }
    });
    bars.forEach((b, i) => { const [a, e] = win[i + 2]; b.style.setProperty('--p', THREE.MathUtils.clamp((p - a + 0.06) / (e - a + 0.06), 0, 1)); });
    const tod = camAt(p).tod;
    clock.textContent = tod < 0.15 ? '☀ Morning light' : tod < 0.5 ? '◐ Afternoon' : tod < 0.85 ? '◑ Golden hour' : '☾ Evening calm';
  }
  cards.forEach((c) => { if (+c.dataset.ch !== 0) gsap.set(c, { autoAlpha: 0, y: 24 }); });
  gsap.set(cards.find((c) => c.dataset.ch === '0'), { autoAlpha: 0, y: 20 });
  shown.clear();

  // ——— Chapter stepper: one gesture = one chapter, with a hold at every stop ———
  // Each stop is the middle of a chapter's "hold" window, so the camera parks and the card reads.
  const STOPS = [0, 0.112, 0.272, 0.395, 0.545, 0.685, 0.84, 0.985];
  const trig = tl.scrollTrigger;
  const yAt = (p) => trig.start + p * (trig.end - trig.start);
  const curY = () => (lenis ? lenis.scroll : window.scrollY);
  const inStory = () => { const y = curY(); return y >= trig.start - 2 && y <= trig.end + 2; };
  const TRAVEL = 2.1; // seconds of camera travel between chapters
  const DWELL = 650;  // ms the chapter must stay parked before the next step is accepted
  let busy = false, lastInput = 0, arrivedAt = 0, settleTimer = 0;
  const targetFor = (dir) => {
    const y = curY();
    if (dir > 0) { const s = STOPS.find((p) => yAt(p) > y + 4); return s === undefined ? null : s; }
    const s = [...STOPS].reverse().find((p) => yAt(p) < y - 4); return s === undefined ? null : s;
  };
  const release = () => {
    // input has gone quiet and the dwell is over → the next gesture may move again
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (performance.now() - lastInput < 260 || performance.now() - arrivedAt < DWELL) return release();
      busy = false;
    }, 120);
  };
  const go = (p) => {
    busy = true;
    const done = () => { arrivedAt = performance.now(); release(); };
    if (lenis) lenis.scrollTo(yAt(p), { duration: TRAVEL, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), lock: true, force: true, onComplete: done });
    else { const o = { y: scrollY }; gsap.to(o, { y: yAt(p), duration: TRAVEL, ease: 'power3.inOut', onUpdate: () => scrollTo(0, o.y), onComplete: done }); }
  };
  // returns true when the story consumed the gesture
  const step = (dir) => {
    lastInput = performance.now();
    if (!inStory()) return false;
    if (busy) return true;
    const p = targetFor(dir);
    if (p === null) return false; // before the first / after the last chapter → normal page scroll
    go(p);
    return true;
  };
  if (!reduced) {
    addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaY) < 2 || e.ctrlKey) return;
      if (step(Math.sign(e.deltaY))) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, { capture: true, passive: false });
    let ty = null, used = false;
    addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; used = false; }, { capture: true, passive: true });
    addEventListener('touchmove', (e) => {
      if (ty === null) return;
      const dy = ty - e.touches[0].clientY;
      if (!inStory() || (!busy && Math.abs(dy) < 8)) return;
      if (used || busy) { e.preventDefault(); return; }
      if (Math.abs(dy) > 24 && step(Math.sign(dy))) { used = true; e.preventDefault(); }
      else if (targetFor(Math.sign(dy)) !== null) e.preventDefault();
    }, { capture: true, passive: false });
    addEventListener('touchend', () => { ty = null; }, { capture: true });
    addEventListener('keydown', (e) => {
      if (e.target.closest?.('input,textarea,select,button,a')) return;
      const dir = { ArrowDown: 1, PageDown: 1, ' ': e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1 }[e.key];
      if (dir && step(dir)) e.preventDefault();
    }, { capture: true });
    // scrollbar drags / anchor jumps still settle on the nearest chapter
    ScrollTrigger.create({ trigger: '.story', start: 'top top', end: 'bottom bottom', snap: { snapTo: [...STOPS, 1], duration: { min: 0.6, max: 1.6 }, delay: 0.25, ease: 'power2.inOut', inertia: false } });
  }

  // pause rendering offscreen
  ScrollTrigger.create({ trigger: '.story', start: 'top bottom', end: 'bottom top', onToggle: (s) => (stage.running = s.isActive) });
  addEventListener('resize', () => ScrollTrigger.refresh());
  return { intro: () => {
    gsap.from('.hero .line-mask > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.12 });
    gsap.from('.hero__note', { opacity: 0, y: 10, rotate: -12, duration: 1, delay: 0.7, ease: 'expo.out' });
    gsap.fromTo(frame, { clipPath: `inset(${innerHeight}px 4vw 3vh 4vw round 28px)` }, { clipPath: insetStart(), duration: 1.6, ease: 'expo.out', delay: 0.15 });
    gsap.to(cards.find((c) => c.dataset.ch === '0'), { autoAlpha: 1, y: 0, duration: 1, delay: 0.9, ease: 'expo.out', onComplete: () => shown.add(0) });
  } };
}

function sections() {
  // Gauri name
  gsap.from('[data-gk]', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.gauri__name', start: 'top 85%', once: true } });
  // Count-ups
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = +el.dataset.count;
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-IN')) });
  });
  // Atelier hover image
  const hi = document.querySelector('.hover-img');
  if (hi && !isTouch) {
    const img = hi.querySelector('img');
    const xTo = gsap.quickTo(hi, 'x', { duration: 0.6, ease: 'power3' });
    const yTo = gsap.quickTo(hi, 'y', { duration: 0.6, ease: 'power3' });
    const rTo = gsap.quickTo(hi, 'rotation', { duration: 0.8, ease: 'power3' });
    let lx = 0;
    addEventListener('pointermove', (e) => { xTo(e.clientX - 170); yTo(e.clientY - 128); rTo(THREE.MathUtils.clamp((e.clientX - lx) * 0.4, -8, 8)); lx = e.clientX; });
    document.querySelectorAll('.theme').forEach((t) => {
      t.addEventListener('pointerenter', () => { img.src = t.dataset.img; gsap.to(hi, { opacity: 1, scale: 1, duration: 0.5, ease: 'expo.out' }); });
      t.addEventListener('pointerleave', () => gsap.to(hi, { opacity: 0, scale: 0.6, duration: 0.4, ease: 'power2.in' }));
    });
  }
  gsap.from('.theme', { opacity: 0, y: 40, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.themes', start: 'top 85%', once: true } });
  // Process line
  gsap.to('.steps__line i', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 60%', end: 'bottom 60%', scrub: true } });
  document.querySelectorAll('.step').forEach((s) => {
    gsap.from(s.querySelectorAll('.step__tag, h3, p, .link-u'), { opacity: 0, y: 30, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 75%', once: true } });
    gsap.fromTo(s.querySelector('.step__dot'), { scale: 0.6, backgroundColor: '#F4EBD8', color: '#5F1B15' }, { scale: 1, backgroundColor: '#5F1B15', color: '#FBF3DC', duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: s, start: 'top 60%', toggleActions: 'play none none reverse' } });
  });
  // Rail
  const track = document.querySelector('[data-rail-track]');
  document.querySelectorAll('[data-rail]').forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: +b.dataset.rail * Math.min(480, innerWidth * 0.8), behavior: 'smooth' })));
  let drag = null;
  track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, s: track.scrollLeft }; });
  addEventListener('pointermove', (e) => { if (drag) track.scrollLeft = drag.s - (e.clientX - drag.x); });
  addEventListener('pointerup', () => (drag = null));
  gsap.from('.story-card', { opacity: 0, x: 80, stagger: 0.08, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: track, start: 'top 85%', once: true } });
  // FAQ
  document.querySelectorAll('.qa').forEach((q) => {
    const a = q.querySelector('.qa__a');
    q.querySelector('button').addEventListener('click', () => {
      const open = !q.classList.contains('is-open');
      document.querySelectorAll('.qa.is-open').forEach((o) => { if (o !== q) { o.classList.remove('is-open'); gsap.to(o.querySelector('.qa__a'), { height: 0, duration: 0.5, ease: 'expo.inOut' }); } });
      q.classList.toggle('is-open', open);
      gsap.to(a, { height: open ? 'auto' : 0, duration: 0.6, ease: 'expo.inOut', onComplete: () => ScrollTrigger.refresh() });
    });
  });
  // Experience centre selects
  const centers = { mumbai: ['Mumbai - Andheri', 'Mumbai - Thane'], bengaluru: ['Bengaluru - HSR', 'Bengaluru - HRBR'], hyderabad: ['Hyderabad - Gachibowli'] };
  const cs = document.querySelector('[data-city]'), cc = document.querySelector('[data-center]');
  cs?.addEventListener('change', () => { cc.disabled = false; cc.innerHTML = '<option value="" disabled selected></option>' + centers[cs.value].map((c) => `<option>${c}</option>`).join(''); });
  // Autoplay videos in view
  document.querySelectorAll('video[data-autoplay]').forEach((vd) => ScrollTrigger.create({ trigger: vd, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? vd.play().catch(() => {}) : vd.pause()) }));
  // Teaser cards tilt in
  gsap.from('.tease__stack figure', { y: 120, rotate: 0, opacity: 0, stagger: 0.12, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.tease__stack', start: 'top 80%', once: true } });
}

let st;
try { st = story(); } catch (e) { console.error(e); }
init({ onReady: () => { st?.intro(); sections(); } });
