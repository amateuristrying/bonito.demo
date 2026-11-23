// Full-screen 3D home viewer: orbit dollhouse, point-and-go walkthrough, plan view, AR + VR.
import * as THREE from 'three';
import { Stage } from './three/stage.js';
import { buildApartment, cloneForAR, H, UPHOLSTERY, WALLS } from './three/apartment.js';
import { ROOM_LABELS } from './data-projects.js';
import { lenis, cursorVisible, openModal, isTouch } from './core.js';

const { gsap } = window;
const $ = (s, r = document) => r.querySelector(s);

const HINTS = {
  orbit: 'Drag to orbit · Scroll to zoom · Tap a room to step inside',
  walk: 'Click the floor to move · Drag to look around · WASD / arrow keys',
  plan: 'Top-down floor plan · Tap a room to step inside',
};

function loadScript(src, type) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const s = document.createElement('script');
    s.src = src; if (type) s.type = type;
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

export class Viewer {
  constructor() {
    this.el = $('#viewer');
    this.canvas = $('[data-vcanvas]');
    this.pinsEl = $('[data-pins]');
    this.reticle = $('[data-reticle]');
    this.stage = null;
    this.apt = null;
    this.project = null;
    this.currentRoom = null;
    this.tod = 0;
    this.bind();
  }

  ensureStage() {
    if (this.stage) return;
    this.stage = new Stage(this.canvas, { background: '#EFE6D3', interactive: true });
    this.stage.bgDay = '#EFE6D3';
    this.stage.running = false;
    this.stage.ticks.add(() => this.tick());
    this.stage.onWalkStart = () => this.flashReticle();
    this.stage.controls.addEventListener('start', () => this.clearFocus());
  }

  // ——————————————————— open / close ———————————————————
  async open(project, { fromEl, room, ar } = {}) {
    this.ensureStage();
    this.project = project;
    if (!new URLSearchParams(location.search).get('project')) history.pushState({ project: project.slug }, '', `?project=${project.slug}${room ? '&room=' + room : ''}`);
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    cursorVisible(false);
    this.el.classList.add('is-open');
    this.el.setAttribute('aria-hidden', 'false');
    const loading = $('[data-vloading]');
    const cover = $('[data-cover]');
    gsap.set(loading, { autoAlpha: 1 });
    gsap.set('.vbar, .modes, .minimap, .rooms, .panel, .hint', { autoAlpha: 0 });
    // shared-element transition from the card image
    cover.innerHTML = '';
    if (fromEl) {
      const r = fromEl.getBoundingClientRect();
      const img = document.createElement('img');
      img.src = fromEl.currentSrc || fromEl.src;
      cover.appendChild(img);
      gsap.set(img, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: 24 });
      await gsap.to(img, { left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: 0, duration: 0.9, ease: 'expo.inOut' });
    }
    gsap.fromTo('[data-vloading] .loader__bar i', { scaleX: 0 }, { scaleX: 0.7, duration: 0.6, ease: 'power2.out' });
    await new Promise((r) => setTimeout(r, 40));
    // build the apartment
    if (this.apt) { this.stage.scene.remove(this.apt.group); this.disposeApt(this.apt); }
    this.apt = buildApartment(project);
    this.stage.setApartment(this.apt);
    this.tod = 0; this.stage.setTime(0, 0);
    this.prepareHotspots();
    this.renderUI();
    this.stage.running = true;
    const home = this.stage.orbitHome(this.apt);
    const { W, D } = this.apt.plan;
    this.stage.mode = 'orbit';
    this.stage.setMode('orbit', false);
    this.stage.camera.fov = 36; this.stage.camera.updateProjectionMatrix();
    this.stage.camera.position.set(0, Math.max(W, D) * 2.6, 0.5);
    this.stage.target.set(0, 0, 0);
    this.stage.camera.lookAt(this.stage.target);
    this.stage.controls.target.set(0, 0, 0);
    this.setModeUI('orbit');
    gsap.to('[data-vloading] .loader__bar i', { scaleX: 1, duration: 0.3 });
    const tl = gsap.timeline();
    tl.to(cover, { autoAlpha: 0, duration: 0.6, ease: 'power2.out' }, 0.15)
      .to(loading, { autoAlpha: 0, duration: 0.5 }, 0.1)
      .fromTo('.vbar', { y: -30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out' }, 0.6)
      .fromTo('.modes, .minimap', { x: -30, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.75)
      .fromTo('.rooms, .hint', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.08 }, 0.85)
      .fromTo('.panel', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, ease: 'power2.out' }, 0.9);
    $('[data-panel]').classList.toggle('is-collapsed', innerWidth < 1100);
    await this.stage.flyTo(home.pos, home.target, { duration: 2.2, ease: 'expo.inOut' });
    cover.innerHTML = ''; gsap.set(cover, { autoAlpha: 1 });
    if (room) {
      const r = this.apt.rooms.find((x) => x.roomType === room || x.id === room);
      if (r) await this.goRoom(r);
    }
    if (ar) this.openAR();
    this.checkVR();
  }

  close(fromPop) {
    if (!this.el.classList.contains('is-open')) return;
    this.closeAR();
    gsap.to(this.el, { autoAlpha: 0, duration: 0.5, ease: 'power2.inOut', onComplete: () => {
      this.el.classList.remove('is-open');
      this.el.setAttribute('aria-hidden', 'true');
      gsap.set(this.el, { clearProps: 'all' });
      this.stage.running = false;
      if (this.stage.mode === 'walk') this.stage.mode = 'orbit';
    } });
    document.documentElement.style.overflow = '';
    lenis?.start();
    cursorVisible(true);
    if (!fromPop) history.pushState({}, '', location.pathname + '#projects');
  }

  disposeApt(apt) {
    apt.group.traverse((o) => { if (o.geometry && !o.geometry.parameters?.cached) o.geometry.dispose?.(); });
  }

  // ——————————————————— UI ———————————————————
  bind() {
    this.el.addEventListener('click', (e) => {
      const t = e.target;
      if (t.closest('[data-close]')) this.close();
      else if (t.closest('[data-mode]')) this.setMode(t.closest('[data-mode]').dataset.mode);
      else if (t.closest('[data-room]')) this.goRoom(this.apt.rooms.find((r) => r.id === t.closest('[data-room]').dataset.room));
      else if (t.closest('[data-tod]')) this.setTod(this.tod ? 0 : 1);
      else if (t.closest('[data-todtoggle] button')) this.setTod(+t.closest('button').dataset.t);
      else if (t.closest('[data-share]')) this.share();
      else if (t.closest('[data-ar], [data-ar2]')) this.openAR();
      else if (t.closest('[data-vr]')) this.enterVR();
      else if (t.closest('[data-collapse]')) $('[data-panel]').classList.add('is-collapsed');
      else if (t.closest('[data-expand]')) $('[data-panel]').classList.remove('is-collapsed');
      else if (t.closest('[data-hs]')) this.focusHotspot(+t.closest('[data-hs]').dataset.hs);
      else if (t.closest('[data-photo]')) openModal(`<img src="${t.closest('[data-photo]').dataset.photo}" alt="Project photograph">`);
      else if (t.closest('[data-fabric]')) this.recolor('fabric', t.closest('[data-fabric]'));
      else if (t.closest('[data-wall]')) this.recolor('wall', t.closest('[data-wall]'));
      else if (t.closest('[data-close-book]')) { e.preventDefault(); this.close(); setTimeout(() => lenis ? lenis.scrollTo('#book', { duration: 1.6 }) : $('#book').scrollIntoView(), 500); }
    });
    addEventListener('keydown', (e) => {
      if (!this.el.classList.contains('is-open')) return;
      if (e.key === 'Escape') { $('[data-armodal]').classList.contains('is-open') ? this.closeAR() : this.close(); }
    });
    $('[data-minimap]').addEventListener('click', (e) => this.minimapClick(e));
    $('[data-armodal]').addEventListener('click', (e) => {
      if (e.target.closest('[data-arclose]') || e.target === e.currentTarget) this.closeAR();
      const w = e.target.closest('[data-arwhat]');
      if (w) { this.arWhat = w.dataset.arwhat; document.querySelectorAll('[data-arwhat]').forEach((b) => b.classList.toggle('is-on', b === w)); this.loadARModel(); }
    });
    // reticle follows the floor under the pointer in walk mode
    let raf = 0;
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.stage?.mode !== 'walk' || isTouch) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const hit = this.stage.pickFloor(e);
        this.reticle.classList.toggle('is-on', !!hit && !this.stage.flying);
        if (hit) { const r = this.canvas.getBoundingClientRect(); this.reticle.style.transform = `translate(${e.clientX - r.left}px, ${e.clientY - r.top}px) perspective(300px) rotateX(62deg)`; }
      });
    });
    this.canvas.addEventListener('pointerleave', () => this.reticle.classList.remove('is-on'));
  }

  renderUI() {
    const p = this.project;
    $('[data-vtitle]').textContent = `${p.name} · ${p.typology}`;
    $('[data-vmeta]').textContent = `${p.location}, ${p.city} · ${p.style} · ${p.price}`;
    // room chips
    const photoRooms = new Set(p.gallery.map((g) => g.room));
    $('[data-rooms]').innerHTML = `<button data-mode="orbit" class="is-on" data-allhome>Whole home</button>` + this.apt.rooms.map((r) => `<button data-room="${r.id}" class="${photoRooms.has(r.roomType) ? 'has-photos' : ''}" title="${photoRooms.has(r.roomType) ? 'Has real photographs' : ''}"><i></i>${r.label}</button>`).join('');
    // minimap
    const { W, D, Dmain } = this.apt.plan;
    const pad = 0.4;
    const svg = $('[data-minimap]');
    svg.setAttribute('viewBox', `${-W / 2 - pad} ${-Dmain / 2 - pad} ${W + pad * 2} ${D + pad * 2}`);
    svg.innerHTML = this.apt.rooms.map((r) => `<g data-mm="${r.id}"><rect class="mm-room" x="${r.x}" y="${r.z}" width="${r.w}" height="${r.d}" rx="0.08"/><text x="${r.cx}" y="${r.cz + 0.15}" text-anchor="middle">${r.label.replace(' Bedroom', '').replace("'", '’')}</text></g>`).join('') +
      `<g data-me style="display:none"><path d="M0 0 L-1.2 -2.4 A2.7 2.7 0 0 1 1.2 -2.4 Z" fill="rgba(232,101,90,.35)"/><circle r="0.28" fill="#5F1B15" stroke="#FBF3DC" stroke-width="0.08"/></g>`;
    // swatches
    $('[data-sw-fabric]').innerHTML = [this.apt.M.S.fabric, ...UPHOLSTERY.filter((c) => c !== this.apt.M.S.fabric)].slice(0, 6).map((c, i) => `<button data-fabric="${c}" class="${i ? '' : 'is-on'}" style="background:${c}" aria-label="Upholstery ${c}"></button>`).join('');
    $('[data-sw-wall]').innerHTML = [this.apt.M.S.wall, ...WALLS.filter((c) => c !== this.apt.M.S.wall)].slice(0, 5).map((c, i) => `<button data-wall="${c}" class="${i ? '' : 'is-on'}" style="background:${c}" aria-label="Wall ${c}"></button>`).join('');
    this.setTodUI();
    this.panelFor(null);
  }

  panelFor(room) {
    const p = this.project;
    $('[data-pkicker]').textContent = room ? 'You are in' : 'Whole home';
    $('[data-proom]').textContent = room ? room.label : p.name;
    $('[data-pstyle]').innerHTML = [p.style, p.typology, p.location, p.price].map((t) => `<span class="tag">${t}</span>`).join('');
    const hot = room ? room.hotspots : this.apt.rooms.flatMap((r) => r.hotspots.slice(0, 1));
    $('[data-hot]').innerHTML = hot.map((h) => `<button data-hs="${h.idx}"><b>${h.title}</b><span>${room ? h.text : this.apt.rooms.find((r) => r.id === h.room).label}</span></button>`).join('');
    $('[data-psection-hot] h4 span').textContent = room ? 'tap to focus' : 'tap to visit';
    $('[data-psection-hot] h4').firstChild.textContent = room ? 'In this room ' : 'Highlights ';
    const photos = room ? p.gallery.filter((g) => g.room === room.roomType) : p.gallery;
    $('[data-pcount]').textContent = photos.length ? `${photos.length}` : '';
    $('[data-photos]').innerHTML = photos.length ? photos.map((g) => `<button data-photo="${g.src}"><img src="${g.src}" alt="${ROOM_LABELS[g.room] || g.room} photograph" loading="lazy"></button>`).join('') : `<p class="photos__none">This room is shown as a 3D concept in the project’s ${p.style.toLowerCase()} language — photographs are available for ${[...new Set(p.gallery.map((g) => (ROOM_LABELS[g.room] || g.room).toLowerCase()))].join(', ')}.</p>`;
    const heroRoom = room || this.apt.rooms.find((r) => r.type === 'living');
    $('[data-heroname]').textContent = (heroRoom?.heroName || 'this piece').toLowerCase();
    document.querySelectorAll('[data-rooms] button').forEach((b) => b.classList.toggle('is-on', room ? b.dataset.room === room.id : b.hasAttribute('data-allhome')));
    document.querySelectorAll('[data-mm]').forEach((g) => g.querySelector('rect').classList.toggle('is-on', room && g.dataset.mm === room.id));
    $('[data-mmroom]').textContent = room ? room.label : '';
  }

  setModeUI(mode) {
    document.querySelectorAll('.modes [data-mode]').forEach((b) => b.classList.toggle('is-on', b.dataset.mode === mode));
    const h = $('[data-hint]');
    h.textContent = HINTS[mode];
    $('[data-me]') && ($('[data-me]').style.display = mode === 'walk' ? '' : 'none');
    if (mode !== 'walk') this.reticle.classList.remove('is-on');
    this.canvas.dataset.mode = mode;
  }

  async setMode(mode) {
    if (!this.apt) return;
    this.clearFocus();
    this.setModeUI(mode);
    if (mode === 'walk') {
      const r = this.currentRoom || this.apt.rooms.find((x) => x.type === 'living');
      return this.goRoom(r);
    }
    this.currentRoom = null;
    this.panelFor(null);
    await this.stage.setMode(mode);
  }

  async goRoom(r) {
    if (!r) return;
    this.clearFocus();
    this.setModeUI('walk');
    this.currentRoom = r;
    this.panelFor(r);
    const fromOrbit = this.stage.mode !== 'walk';
    if (fromOrbit) {
      // swoop: hover above the room first, then descend to eye level
      const above = new THREE.Vector3(r.cx, H + 4.5, r.cz + 3.2);
      await this.stage.flyTo(above, new THREE.Vector3(r.cx, 0, r.cz), { duration: 1.1, ease: 'power2.inOut' });
    } else {
      const mid = this.stage.camera.position.clone().lerp(r.walk.pos, 0.5); mid.y = H + 2.2;
      await this.stage.flyTo(mid, new THREE.Vector3(r.cx, 0.6, r.cz), { duration: 0.9, ease: 'power2.in' });
    }
    await this.stage.walkTo(r.walk.pos, r.walk.look, 1.5);
    history.replaceState(history.state, '', `?project=${this.project.slug}&room=${r.id}`);
  }

  setTod(t) {
    this.tod = t;
    this.stage.setTime(t, 1.4);
    this.setTodUI();
  }
  setTodUI() {
    document.querySelectorAll('[data-todtoggle] button').forEach((b) => b.classList.toggle('is-on', +b.dataset.t === this.tod));
    const b = $('[data-tod]');
    b.querySelector('span').textContent = this.tod ? 'Day' : 'Evening';
  }

  recolor(kind, btn) {
    const col = new THREE.Color(kind === 'fabric' ? btn.dataset.fabric : btn.dataset.wall);
    const mat = kind === 'fabric' ? this.apt.M.fabric : this.apt.M.wall;
    gsap.to(mat.color, { r: col.r, g: col.g, b: col.b, duration: 0.8, ease: 'power2.inOut' });
    btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.toggle('is-on', b === btn));
    this.toast(kind === 'fabric' ? 'Upholstery updated across the home' : 'Wall colour updated');
  }

  toast(msg) {
    const t = $('[data-toast]');
    t.textContent = msg;
    gsap.killTweensOf(t);
    gsap.fromTo(t, { autoAlpha: 0, y: -10 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'expo.out' });
    gsap.to(t, { autoAlpha: 0, delay: 2.2, duration: 0.4 });
  }

  async share() {
    const url = location.href;
    try {
      if (navigator.share && isTouch) await navigator.share({ title: `${this.project.name} · Bonito Designs`, url });
      else { await navigator.clipboard.writeText(url); this.toast('Link copied — share this exact view'); }
    } catch (e) { this.toast('Copy this page’s URL to share'); }
  }

  // ——————————————————— hotspots & pins ———————————————————
  prepareHotspots() {
    const all = [];
    const box = new THREE.Box3();
    this.apt.group.updateMatrixWorld(true);
    for (const r of this.apt.rooms) for (const h of r.hotspots) {
      box.setFromObject(h.obj);
      const c = box.getCenter(new THREE.Vector3());
      h.anchor = new THREE.Vector3(c.x, Math.min(box.max.y + 0.12, 2.2), c.z);
      h.center = c;
      h.size = box.getSize(new THREE.Vector3()).length();
      h.idx = all.length;
      all.push(h);
    }
    this.hotspots = all;
    this.pinsEl.innerHTML = all.map((h) => `<div class="pin" data-pin="${h.idx}" style="display:none"><button class="pin__dot" data-hs="${h.idx}" aria-label="${h.title}">+</button><div class="pin__card glass"><b>${h.title}</b><span>${h.text}</span></div></div>`).join('') +
      this.apt.rooms.map((r) => `<div class="pin pin--room" data-rpin="${r.id}" style="display:none"><button class="pin__dot" data-room="${r.id}">${r.label}<em>${(r.w * r.d * 10.764).toFixed(0)} sq ft</em></button></div>`).join('');
    this.pinEls = [...this.pinsEl.querySelectorAll('[data-pin]')];
    this.roomPinEls = [...this.pinsEl.querySelectorAll('[data-rpin]')];
  }

  focusHotspot(i) {
    const h = this.hotspots[i];
    if (!h) return;
    const room = this.apt.rooms.find((r) => r.id === h.room);
    if (this.currentRoom !== room || this.stage.mode !== 'walk') {
      this.goRoom(room).then(() => this.focusHotspot(i));
      return;
    }
    // frame the piece from inside the room
    const cam = this.stage.camera.position.clone();
    const dir = cam.clone().sub(h.center).setY(0).normalize();
    const dist = THREE.MathUtils.clamp(h.size * 0.9, 1.6, 3.0);
    const pos = h.center.clone().addScaledVector(dir, dist);
    pos.x = THREE.MathUtils.clamp(pos.x, room.x + 0.35, room.x + room.w - 0.35);
    pos.z = THREE.MathUtils.clamp(pos.z, room.z + 0.35, room.z + room.d - 0.35);
    pos.y = 1.45;
    this.stage.flyTo(pos, h.center.clone().setY(Math.min(h.center.y, 1.1)), { duration: 1.3, ease: 'power3.inOut' });
    this.focused = i;
    this.pinEls.forEach((p) => p.classList.toggle('is-on', +p.dataset.pin === i));
    document.querySelectorAll('[data-hot] button').forEach((b) => b.classList.toggle('is-on', +b.dataset.hs === i));
  }
  clearFocus() {
    this.focused = null;
    this.pinEls?.forEach((p) => p.classList.remove('is-on'));
    document.querySelectorAll('[data-hot] button').forEach((b) => b.classList.remove('is-on'));
  }

  flashReticle() { this.reticle.classList.remove('is-on'); }

  tick() {
    if (!this.apt || !this.stage.running) return;
    const st = this.stage;
    const rect = this.canvas.getBoundingClientRect();
    const mode = st.mode;
    // track the room the walker is in
    if (mode === 'walk' && !st.flying) {
      const p = st.camera.position;
      const r = this.apt.rooms.find((q) => p.x >= q.x && p.x <= q.x + q.w && p.z >= q.z && p.z <= q.z + q.d);
      if (r && r !== this.currentRoom) { this.currentRoom = r; this.panelFor(r); }
    }
    // furniture pins (walk, current room)
    const showRoomId = mode === 'walk' ? this.currentRoom?.id : null;
    const camDir = new THREE.Vector3(); st.camera.getWorldDirection(camDir);
    for (const el of this.pinEls) {
      const h = this.hotspots[+el.dataset.pin];
      if (h.room !== showRoomId) { el.style.display = 'none'; continue; }
      const toP = h.anchor.clone().sub(st.camera.position);
      if (toP.dot(camDir) < 0.2) { el.style.display = 'none'; continue; }
      const s = st.project(h.anchor);
      if (!s.visible || s.x < 10 || s.y < 70 || s.x > rect.width - 10 || s.y > rect.height - 10) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
      el.classList.toggle('flip', s.x > rect.width * 0.62);
    }
    // room labels (orbit / plan)
    for (const el of this.roomPinEls) {
      const r = this.apt.rooms.find((q) => q.id === el.dataset.rpin);
      if (mode === 'walk' || st.flying) { el.style.display = 'none'; continue; }
      const s = st.project(new THREE.Vector3(r.cx, mode === 'plan' ? 0.2 : H + 0.2, r.cz));
      if (!s.visible) { el.style.display = 'none'; continue; }
      el.style.display = '';
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -50%)`;
    }
    // minimap marker
    const me = document.querySelector('[data-me]');
    if (me && mode === 'walk') {
      const p = st.camera.position;
      me.setAttribute('transform', `translate(${p.x.toFixed(2)} ${p.z.toFixed(2)}) rotate(${(-st.yaw * 180 / Math.PI).toFixed(1)}) scale(0.55)`);
    }
  }

  minimapClick(e) {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const r = this.apt.rooms.find((q) => p.x >= q.x && p.x <= q.x + q.w && p.y >= q.z && p.y <= q.z + q.d);
    if (!r) return;
    if (this.stage.mode === 'walk' && this.currentRoom === r) {
      const dest = new THREE.Vector3(p.x, 1.6, p.y);
      const look = dest.clone().add(new THREE.Vector3(r.cx - p.x, -0.3, r.cz - p.y).normalize());
      this.stage.flyTo(dest, look, { duration: 1.2 });
    } else this.goRoom(r);
  }

  // ——————————————————— AR ———————————————————
  async openAR() {
    const m = $('[data-armodal]');
    m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false');
    this.arWhat = this.arWhat || 'piece';
    const room = this.currentRoom || this.apt.rooms.find((r) => r.type === 'living');
    this.arRoom = room;
    $('[data-arpiece]').textContent = `${room.heroName} · ${room.label}`;
    $('[data-artitle]').textContent = this.arWhat === 'home' ? `${this.project.name}, tabletop` : room.heroName;
    // QR for desktop → open this exact view on a phone
    const url = `${location.origin}/design/?project=${this.project.slug}&room=${room.id}&ar=1`;
    try {
      await loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
      const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      $('[data-qr]').innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true }).replace(/fill="#000000"|fill="black"/g, 'fill="#3E120E"');
    } catch (e) { $('[data-qr]').textContent = ''; }
    await this.loadARModel();
  }

  async loadARModel() {
    const stage = $('[data-arstage]');
    $('[data-archip]').textContent = this.arWhat === 'home' ? 'Tabletop · 1:25' : 'True scale · 1:1';
    $('[data-artitle]').textContent = this.arWhat === 'home' ? `${this.project.name}, tabletop` : this.arRoom.heroName;
    stage.querySelector('model-viewer')?.remove();
    stage.querySelector('.ar__wait')?.remove();
    stage.insertAdjacentHTML('beforeend', '<div class="ar__wait"><span class="hand">crafting your 3D model…</span></div>');
    const token = (this.arToken = (this.arToken || 0) + 1);
    await new Promise((r) => setTimeout(r, 60));
    await loadScript('https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js', 'module');
    const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
    let obj;
    if (this.arWhat === 'home') {
      obj = new THREE.Group();
      const c = this.apt.group.clone(true);
      c.traverse((o) => { if (o.isLight) o.visible = false; });
      c.scale.setScalar(1 / 25);
      obj.add(c);
    } else obj = cloneForAR(this.arRoom.hero);
    const glb = await new GLTFExporter().parseAsync(obj, { binary: true, onlyVisible: true });
    if (token !== this.arToken) return;
    if (this.arUrl) URL.revokeObjectURL(this.arUrl);
    const url = (this.arUrl = URL.createObjectURL(new Blob([glb], { type: 'model/gltf-binary' })));
    stage.querySelector('.ar__wait')?.remove();
    stage.insertAdjacentHTML('beforeend', `<model-viewer src="${url}" ar ar-modes="webxr scene-viewer quick-look" ar-scale="${this.arWhat === 'home' ? 'auto' : 'fixed'}" camera-controls auto-rotate auto-rotate-delay="0" rotation-per-second="18deg" shadow-intensity="1.1" shadow-softness="0.9" exposure="1.05" environment-image="neutral" camera-orbit="${this.arWhat === 'home' ? '25deg 40deg auto' : '35deg 70deg auto'}" interaction-prompt="none" alt="${this.arRoom.heroName} in 3D"><button slot="ar-button" class="btn ar__btn-native">View in your space <span class="arr">→</span></button></model-viewer>`);
  }

  closeAR() {
    const m = $('[data-armodal]');
    if (!m.classList.contains('is-open')) return;
    m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true');
  }

  // ——————————————————— VR ———————————————————
  async checkVR() {
    const b = $('[data-vr]');
    const ok = navigator.xr && (await navigator.xr.isSessionSupported('immersive-vr').catch(() => false));
    b.dataset.supported = ok ? '1' : '0';
    b.title = ok ? 'Enter VR' : 'VR headset not detected';
  }
  async enterVR() {
    if ($('[data-vr]').dataset.supported !== '1') { this.toast('VR not supported on this device — open on a Quest or Vision Pro browser'); return; }
    const r = this.currentRoom || this.apt.rooms.find((x) => x.type === 'living');
    await this.stage.enterVR(r.walk.pos);
  }
}
