// Renderer, lighting, camera modes (orbit dollhouse / walk / plan), time of day, XR.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const lerp = THREE.MathUtils.lerp;
const EYE = 1.6;

export class Stage {
  constructor(canvas, { background = null, interactive = true, shadows = true } = {}) {
    this.canvas = canvas;
    const mobile = matchMedia('(max-width: 760px)').matches;
    this.mobile = mobile;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: background === null, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.92;
    r.shadowMap.enabled = shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.xr.enabled = true;
    const scene = (this.scene = new THREE.Scene());
    if (background) scene.background = new THREE.Color(background);
    const pmrem = new THREE.PMREMGenerator(r);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.38;
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 300);
    this.camera.position.set(14, 16, 18);
    this.target = new THREE.Vector3();
    this.hemi = new THREE.HemisphereLight('#fff6ea', '#b9a283', 0.75);
    scene.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight('#fff1dc', 2.8));
    sun.position.set(7, 14, 9);
    sun.castShadow = shadows;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 4;
    scene.add(sun, sun.target);
    this.timeOfDay = 0;
    this.mode = 'orbit';
    this.apartment = null;
    this.ticks = new Set();
    this.yaw = 0; this.pitch = 0;
    this.keys = {};
    this.flying = false;
    if (interactive) {
      this.controls = new OrbitControls(this.camera, canvas);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.minPolarAngle = 0.12;
      this.controls.maxPolarAngle = 1.1;
      this.controls.screenSpacePanning = false;
      this.controls.rotateSpeed = 0.6;
      this._bindWalk();
    }
    this.raycaster = new THREE.Raycaster();
    this._resize = this.resize.bind(this);
    new ResizeObserver(this._resize).observe(canvas.parentElement || canvas);
    this.resize();
    this.clock = new THREE.Clock();
    this.running = true;
    r.setAnimationLoop(() => this.frame());
  }

  resize() {
    const el = this.canvas.parentElement || this.canvas;
    const w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
    if (this.renderer.xr.isPresenting) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setApartment(apt) {
    if (this.apartment) { this.scene.remove(this.apartment.group); }
    this.apartment = apt;
    this.scene.add(apt.group);
    const { W, D } = apt.plan;
    const s = Math.max(W, D) * 0.62 + 1;
    const c = this.sun.shadow.camera;
    c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 60;
    c.updateProjectionMatrix();
    this.sun.target.position.set(0, 0, 0);
    this.floors = [];
    apt.group.traverse((o) => { if (o.name === 'floor') this.floors.push(o); });
    if (this.controls) {
      this.controls.minDistance = 4;
      this.controls.maxDistance = Math.max(W, D) * 2.4;
    }
    this.bounds = { minX: -W / 2 + 0.3, maxX: W / 2 - 0.3, minZ: -apt.plan.Dmain / 2 + 0.3, maxZ: D - apt.plan.Dmain / 2 - 0.3 };
    this.setTime(this.timeOfDay, 0);
  }

  orbitHome(apt = this.apartment) {
    const { W, D } = apt.plan;
    const m = Math.max(W, D) * Math.max(1, 1.5 / this.camera.aspect);
    return { pos: new THREE.Vector3(m * 0.32, m * 1.32, m * 0.86), target: new THREE.Vector3(0, -0.4, 0.6) };
  }

  // ——— time of day: 0 = day, 1 = evening ———
  setTime(t, dur = 1.2) {
    const o = { v: this.timeOfDay };
    const apply = (v) => {
      this.timeOfDay = v;
      this.sun.intensity = lerp(2.8, 0.05, v);
      this.sun.color.set('#fff1dc').lerp(new THREE.Color('#ff9d5c'), Math.min(1, v * 1.4));
      this.sun.position.set(lerp(7, 12, v), lerp(14, 5, v), lerp(9, 4, v));
      this.hemi.intensity = lerp(0.75, 0.18, v);
      this.hemi.color.set('#fff6ea').lerp(new THREE.Color('#5b6b8c'), v);
      this.scene.environmentIntensity = lerp(0.38, 0.1, v);
      this.renderer.toneMappingExposure = lerp(0.92, 1.1, v);
      if (this.scene.background?.isColor) this.scene.background.set(this.bgDay || '#EFE6D3').lerp(new THREE.Color('#1f1a22'), v * 0.9);
      if (this.apartment) {
        for (const e of this.apartment.M.emissives) e.mat.emissiveIntensity = lerp(e.day, e.night, v);
        for (const l of this.apartment.pointLights) l.intensity = lerp(0, this.mobile ? 6 : 9, v);
      }
    };
    if (!dur || !window.gsap) return apply(t);
    gsap.to(o, { v: t, duration: dur, ease: 'power2.inOut', onUpdate: () => apply(o.v) });
  }

  // ——— camera choreography ———
  flyTo(pos, target, { duration = 1.6, ease = 'power3.inOut', mode, fov } = {}) {
    if (mode) this.setMode(mode, false);
    if (fov && Math.abs(fov - this.camera.fov) > 0.5) gsap.to(this.camera, { fov, duration, ease, onUpdate: () => this.camera.updateProjectionMatrix() });
    this.flying = true;
    if (this.controls) this.controls.enabled = false;
    const from = { p: this.camera.position.clone(), t: this.target.clone() };
    const o = { k: 0 };
    const mid = from.p.clone().lerp(pos, 0.5);
    const arc = Math.min(4, from.p.distanceTo(pos) * 0.15);
    mid.y += mode === 'walk' && this.mode === 'walk' ? 0 : arc;
    return new Promise((res) => {
      gsap.to(o, {
        k: 1, duration, ease,
        onUpdate: () => {
          const k = o.k;
          // quadratic bezier for a gentle arc
          const a = from.p.clone().lerp(mid, k), b = mid.clone().lerp(pos, k);
          this.camera.position.copy(a.lerp(b, k));
          this.target.copy(from.t.clone().lerp(target, k));
          this.camera.lookAt(this.target);
        },
        onComplete: () => {
          this.flying = false;
          if (this.mode === 'walk') this._syncYawPitch();
          else if (this.controls) { this.controls.target.copy(this.target); this.controls.enabled = true; this.controls.update(); }
          res();
        },
      });
    });
  }

  setMode(mode, fly = true) {
    this.mode = mode;
    if (!this.controls) return;
    this.controls.enabled = mode !== 'walk';
    this.canvas.dataset.mode = mode;
    if (mode === 'plan') { this.controls.minPolarAngle = 0; this.controls.maxPolarAngle = 0.05; this.controls.enableRotate = true; }
    else { this.controls.minPolarAngle = 0.12; this.controls.maxPolarAngle = 1.1; }
    if (!fly) return;
    if (mode === 'orbit') { const h = this.orbitHome(); return this.flyTo(h.pos, h.target, { fov: 36 }); }
    if (mode === 'plan') { const { W, D } = this.apartment.plan; return this.flyTo(new THREE.Vector3(0, Math.max(W, D) * 1.9, 0.01), new THREE.Vector3(0, 0, 0), { fov: 36 }); }
  }

  walkTo(pos, look, duration = 1.8) {
    this.mode = 'walk';
    if (this.controls) this.controls.enabled = false;
    this.canvas.dataset.mode = 'walk';
    return this.flyTo(pos, look, { duration, fov: this.mobile ? 72 : 62 });
  }

  _syncYawPitch() {
    const d = this.target.clone().sub(this.camera.position).normalize();
    this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
  }

  _applyLook() {
    const d = new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
    this.target.copy(this.camera.position).add(d);
    this.camera.lookAt(this.target);
  }

  _bindWalk() {
    const c = this.canvas;
    let down = null, moved = 0;
    c.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; moved = 0; });
    addEventListener('pointerup', (e) => {
      if (!down) return;
      const wasClick = moved < 6;
      down = null;
      if (this.mode === 'walk' && wasClick && !this.flying && e.target === c) {
        const hit = this.pickFloor(e);
        if (hit) {
          const p = hit.point;
          const dest = new THREE.Vector3(p.x, EYE, p.z);
          const dir = dest.clone().sub(this.camera.position).setY(0).normalize();
          const look = dest.clone().add(dir.multiplyScalar(2)).setY(EYE - 0.15);
          this.onWalkStart?.(p);
          this.flyTo(dest, look, { duration: Math.min(2, 0.6 + this.camera.position.distanceTo(dest) * 0.22), ease: 'power2.inOut' });
        }
      }
    });
    addEventListener('pointermove', (e) => {
      this.pointer = e;
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      moved += Math.abs(dx) + Math.abs(dy);
      if (this.mode === 'walk' && !this.flying) {
        this.yaw += dx * 0.0042;
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.0035, -1.1, 1.1);
        this._applyLook();
      }
      down = { x: e.clientX, y: e.clientY };
    });
    addEventListener('keydown', (e) => { if (!e.target.closest?.('input,textarea,select')) this.keys[e.key.toLowerCase()] = true; });
    addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    c.addEventListener('wheel', (e) => {
      if (this.mode !== 'walk') return;
      e.preventDefault();
      this.camera.fov = THREE.MathUtils.clamp(this.camera.fov + e.deltaY * 0.02, 30, 75);
      this.camera.updateProjectionMatrix();
    }, { passive: false });
  }

  pickFloor(e) {
    const rect = this.canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(v, this.camera);
    const all = this.raycaster.intersectObjects(this.apartment.group.children, true);
    const first = all.find((h) => h.object.visible && h.object.material && !h.object.material.transparent);
    if (first && first.object.name === 'floor') return first;
    return null;
  }

  project(v3) {
    const p = v3.clone().project(this.camera);
    const rect = this.canvas.getBoundingClientRect();
    return { x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height, visible: p.z < 1 && p.z > -1 };
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.mode === 'walk' && !this.flying && !this.renderer.xr.isPresenting) {
      const k = this.keys;
      const f = (k.w || k.arrowup ? 1 : 0) - (k.s || k.arrowdown ? 1 : 0);
      const s = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
      if (f || s) {
        const sp = 2.0 * dt;
        const fw = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const rt = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        const p = this.camera.position;
        p.addScaledVector(fw, f * sp).addScaledVector(rt, s * sp);
        if (this.bounds) { p.x = THREE.MathUtils.clamp(p.x, this.bounds.minX, this.bounds.maxX); p.z = THREE.MathUtils.clamp(p.z, this.bounds.minZ, this.bounds.maxZ); }
        this._applyLook();
      }
    } else if (this.controls?.enabled && !this.flying) {
      this.controls.update();
      this.target.copy(this.controls.target);
    }
    for (const fn of this.ticks) fn(dt);
    if (this.running || this.renderer.xr.isPresenting) this.renderer.render(this.scene, this.camera);
  }

  async enterVR(startPos) {
    if (!navigator.xr || !(await navigator.xr.isSessionSupported('immersive-vr').catch(() => false))) return false;
    const session = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    const rig = (this.rig = new THREE.Group());
    rig.position.set(startPos.x, 0, startPos.z);
    this.scene.add(rig); rig.add(this.camera);
    this.renderer.xr.setReferenceSpaceType('local-floor');
    await this.renderer.xr.setSession(session);
    session.addEventListener('end', () => { this.scene.remove(rig); this.scene.add(this.camera); this.camera.position.copy(rig.position).setY(EYE); this.resize(); });
    return true;
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.renderer.dispose();
  }
}
