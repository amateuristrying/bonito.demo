// Furniture library. Every piece: origin at floor centre, front faces +Z, units in metres.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { rng, artTex, jaaliTex, rugTex } from './textures.js';

const geoCache = new Map();
export function rb(w, h, d, r = 0.02, seg = 5) {
  r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const k = [w, h, d, r, seg].map((v) => +v.toFixed(3)).join('_');
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, seg, Math.max(r, 0.0005)));
  return geoCache.get(k);
}
const cyl = (rt, rb_, h, s = 40) => new THREE.CylinderGeometry(rt, rb_, h, s);

export function add(parent, geo, mat, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = opts.cast !== false;
  m.receiveShadow = true;
  if (opts.rx) m.rotation.x = opts.rx;
  if (opts.ry) m.rotation.y = opts.ry;
  if (opts.rz) m.rotation.z = opts.rz;
  parent.add(m);
  return m;
}
const G = (name) => { const g = new THREE.Group(); g.name = name || ''; return g; };

function legs(g, M, w, d, h, inset = 0.06, r = 0.018, mat) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    add(g, cyl(r, r * 0.8, h, 10), mat || M.metal, sx * (w / 2 - inset), h / 2, sz * (d / 2 - inset));
}

// ——— Seating ———
export function sofa(M, { w = 2.4, d = 0.95, chaise = false, rolled = false, fabric } = {}) {
  const g = G('sofa');
  const F = fabric || M.fabric;
  const lh = 0.09;
  legs(g, M, w, d, lh, 0.08, 0.02, M.woodDark);
  add(g, rb(w, 0.22, d, 0.04), F, 0, lh + 0.11, 0);
  const armW = rolled ? 0.22 : 0.18;
  const inner = w - armW * 2;
  const n = inner > 1.9 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    const cw = inner / n;
    add(g, rb(cw - 0.015, 0.16, d - 0.26, 0.06), F, -inner / 2 + cw * (i + 0.5), lh + 0.3, 0.11);
    const back = add(g, rb(cw - 0.02, 0.4, 0.2, 0.08), F, -inner / 2 + cw * (i + 0.5), lh + 0.52, -d / 2 + 0.2);
    back.rotation.x = -0.12;
  }
  add(g, rb(w, 0.5, 0.16, 0.05), F, 0, lh + 0.36, -d / 2 + 0.08);
  for (const s of [-1, 1]) {
    if (rolled) {
      add(g, rb(armW, 0.36, d, 0.05), F, s * (w / 2 - armW / 2), lh + 0.29, 0);
      add(g, cyl(0.12, 0.12, d, 20), F, s * (w / 2 - armW / 2), lh + 0.5, 0, { rx: Math.PI / 2 });
    } else add(g, rb(armW, 0.5, d, 0.06), F, s * (w / 2 - armW / 2), lh + 0.36, 0);
  }
  if (chaise) {
    const cd = 0.75;
    add(g, rb(0.9, 0.22, cd, 0.04), F, w / 2 - armW - 0.45 + armW, lh + 0.11, d / 2 + cd / 2 - 0.02);
    add(g, rb(0.86, 0.16, cd + 0.05, 0.06), F, w / 2 - armW - 0.45 + armW, lh + 0.3, d / 2 + cd / 2 - 0.05);
  }
  // cushions
  const pm = M.fabric2;
  add(g, rb(0.44, 0.42, 0.12, 0.06), pm, -inner / 2 + 0.3, lh + 0.56, -d / 2 + 0.36, { rx: -0.25, rz: 0.12 });
  add(g, rb(0.44, 0.42, 0.12, 0.06), pm, inner / 2 - 0.3, lh + 0.56, -d / 2 + 0.36, { rx: -0.25, rz: -0.12 });
  add(g, rb(0.36, 0.34, 0.11, 0.05), M.accentMat, inner / 2 - 0.62, lh + 0.52, -d / 2 + 0.38, { rx: -0.2 });
  return g;
}

export function armchair(M, { fabric, barrel = false } = {}) {
  const g = G('armchair');
  const F = fabric || M.fabric2;
  if (barrel) {
    add(g, cyl(0.38, 0.36, 0.34, 32), F, 0, 0.17, 0);
    add(g, cyl(0.34, 0.34, 0.12, 32), F, 0, 0.4, 0.02);
    const shell = new THREE.CylinderGeometry(0.4, 0.4, 0.42, 32, 1, true, Math.PI * 0.75, Math.PI * 1.5);
    const sm = F.clone(); sm.side = THREE.DoubleSide;
    add(g, shell, sm, 0, 0.55, 0);
    add(g, new THREE.TorusGeometry(0.4, 0.035, 10, 40, Math.PI * 1.5), F, 0, 0.76, 0, { rx: Math.PI / 2, rz: Math.PI * 0.75 });
    return g;
  }
  legs(g, M, 0.78, 0.8, 0.12, 0.08, 0.018, M.woodDark);
  add(g, rb(0.78, 0.2, 0.8, 0.05), F, 0, 0.22, 0);
  add(g, rb(0.56, 0.14, 0.62, 0.06), F, 0, 0.38, 0.06);
  add(g, rb(0.78, 0.5, 0.16, 0.06), F, 0, 0.5, -0.32, { rx: -0.1 });
  for (const s of [-1, 1]) add(g, rb(0.12, 0.32, 0.78, 0.05), F, s * 0.33, 0.44, 0);
  return g;
}

export function lounge(M) { // slatted lounge chair (balcony / reading)
  const g = G('lounge');
  add(g, rb(0.7, 0.05, 0.75, 0.02), M.wood, 0, 0.36, 0);
  add(g, rb(0.7, 0.62, 0.05, 0.02), M.wood, 0, 0.66, -0.35, { rx: -0.32 });
  add(g, rb(0.62, 0.1, 0.62, 0.05), M.fabric, 0, 0.43, 0.03);
  for (const s of [-1, 1]) {
    add(g, rb(0.05, 0.05, 0.8, 0.02), M.wood, s * 0.34, 0.56, 0);
    add(g, rb(0.04, 0.56, 0.04, 0.01), M.wood, s * 0.34, 0.28, 0.33);
    add(g, rb(0.04, 0.56, 0.04, 0.01), M.wood, s * 0.34, 0.28, -0.3, { rx: -0.2 });
  }
  return g;
}

export function diningChair(M, { fabric } = {}) {
  const g = G('chair');
  legs(g, M, 0.46, 0.48, 0.45, 0.04, 0.016, M.woodDark);
  add(g, rb(0.48, 0.08, 0.5, 0.03), fabric || M.fabric, 0, 0.49, 0);
  add(g, rb(0.48, 0.44, 0.07, 0.03), fabric || M.fabric, 0, 0.74, -0.23, { rx: -0.08 });
  return g;
}

export function stool(M) {
  const g = G('stool');
  add(g, cyl(0.19, 0.19, 0.07, 24), M.fabric2, 0, 0.76, 0);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    add(g, cyl(0.013, 0.013, 0.76, 8), M.metal, Math.cos(a) * 0.13, 0.37, Math.sin(a) * 0.13, { rz: Math.cos(a) * 0.1, rx: -Math.sin(a) * 0.1 });
  }
  add(g, new THREE.TorusGeometry(0.15, 0.01, 8, 28), M.metal, 0, 0.28, 0, { rx: Math.PI / 2 });
  return g;
}

export function officeChair(M) {
  const g = G('officeChair');
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(g, rb(0.3, 0.03, 0.04, 0.01), M.black, Math.cos(a) * 0.15, 0.06, Math.sin(a) * 0.15, { ry: -a });
    add(g, new THREE.SphereGeometry(0.025, 10, 8), M.black, Math.cos(a) * 0.29, 0.025, Math.sin(a) * 0.29);
  }
  add(g, cyl(0.025, 0.025, 0.36, 10), M.metal, 0, 0.25, 0);
  add(g, rb(0.5, 0.08, 0.48, 0.03), M.fabric2, 0, 0.47, 0);
  add(g, rb(0.46, 0.55, 0.06, 0.03), M.fabric2, 0, 0.8, -0.24, { rx: -0.12 });
  return g;
}

// ——— Tables ———
export function coffeeTable(M, { round = true } = {}) {
  const g = G('coffeeTable');
  if (round) {
    add(g, cyl(0.5, 0.5, 0.04, 48), M.marbleMat, 0, 0.4, 0);
    add(g, cyl(0.28, 0.32, 0.38, 32), M.woodDark, 0, 0.19, 0);
    add(g, cyl(0.3, 0.3, 0.03, 40), M.metal, 0.62, 0.3, 0.18);
    add(g, cyl(0.02, 0.02, 0.29, 8), M.metal, 0.62, 0.145, 0.18);
    add(g, cyl(0.12, 0.12, 0.015, 24), M.metal, 0.62, 0.008, 0.18);
  } else {
    add(g, rb(1.2, 0.05, 0.62, 0.015), M.marbleMat, 0, 0.4, 0);
    add(g, rb(1.1, 0.2, 0.52, 0.02), M.woodDark, 0, 0.18, 0);
    add(g, rb(1.1, 0.02, 0.52, 0.01), M.woodDark, 0, 0.02, 0);
  }
  // books + vase decor
  add(g, rb(0.26, 0.04, 0.2, 0.004), M.accentMat, -0.12, 0.44, 0.05, { ry: 0.3 });
  add(g, rb(0.22, 0.035, 0.17, 0.004), M.white, -0.12, 0.475, 0.05, { ry: 0.2 });
  g.add(vase(M, 0.22, M.ceramic).translateX(0.18).translateY(0.42));
  return g;
}

export function sideTable(M) {
  const g = G('sideTable');
  add(g, cyl(0.24, 0.24, 0.03, 32), M.marbleMat, 0, 0.56, 0);
  add(g, cyl(0.025, 0.025, 0.54, 10), M.metal, 0, 0.28, 0);
  add(g, cyl(0.16, 0.16, 0.02, 24), M.metal, 0, 0.01, 0);
  return g;
}

export function diningTable(M, { w = 2.0, d = 0.95, round = false } = {}) {
  const g = G('diningTable');
  if (round) {
    add(g, cyl(0.65, 0.65, 0.05, 48), M.marbleMat, 0, 0.75, 0);
    add(g, cyl(0.18, 0.35, 0.72, 32), M.woodDark, 0, 0.36, 0);
  } else {
    add(g, rb(w, 0.05, d, 0.015), M.marbleMat, 0, 0.75, 0);
    for (const s of [-1, 1]) add(g, rb(0.08, 0.72, d * 0.7, 0.02), M.woodDark, s * (w / 2 - 0.3), 0.36, 0);
    add(g, rb(w - 0.6, 0.06, 0.08, 0.02), M.woodDark, 0, 0.2, 0);
  }
  g.add(vase(M, 0.3, M.ceramic).translateY(0.775));
  add(g, cyl(0.2, 0.12, 0.06, 28), M.woodDark, 0.45, 0.805, 0);
  return g;
}

export function desk(M, { w = 1.4 } = {}) {
  const g = G('desk');
  add(g, rb(w, 0.04, 0.65, 0.01), M.wood, 0, 0.74, 0);
  add(g, rb(0.42, 0.7, 0.6, 0.01), M.wood, w / 2 - 0.23, 0.35, 0);
  for (const s of [-1, 1]) add(g, rb(0.035, 0.72, 0.035, 0.01), M.metal, -w / 2 + 0.05, 0.36, s * 0.28);
  for (let i = 0; i < 3; i++) add(g, rb(0.2, 0.012, 0.01, 0.003), M.metal, w / 2 - 0.23, 0.15 + i * 0.22, 0.305);
  // laptop
  add(g, rb(0.34, 0.015, 0.24, 0.005), M.metal, -0.1, 0.77, 0.08);
  add(g, rb(0.34, 0.22, 0.012, 0.005), M.metal, -0.1, 0.88, -0.04, { rx: -0.25 });
  g.add(tableLamp(M, { h: 0.42 }).translateX(w / 2 - 0.2).translateY(0.76).translateZ(-0.15));
  add(g, rb(0.16, 0.24, 0.03, 0.004), M.accentMat, -w / 2 + 0.25, 0.88, -0.25, { rz: 0.15 });
  return g;
}

// ——— Storage & units ———
export function tvUnit(M, { w = 2.6, panel = 'fluted', wallH = 2.7 } = {}) {
  const g = G('tvUnit');
  const pw = w + 0.6;
  if (panel === 'fluted') {
    add(g, rb(pw, wallH, 0.03, 0.005), M.wood, 0, wallH / 2, 0.015);
    const n = Math.floor(pw / 0.045);
    const inst = new THREE.InstancedMesh(cyl(0.02, 0.02, wallH, 8), M.wood, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m.makeTranslation(-pw / 2 + 0.022 + i * 0.045, wallH / 2, 0.035); inst.setMatrixAt(i, m); }
    inst.castShadow = inst.receiveShadow = true;
    g.add(inst);
  } else if (panel === 'marble') {
    add(g, rb(pw * 0.6, wallH, 0.04, 0.005), M.marbleMat, 0, wallH / 2, 0.02);
    for (const s of [-1, 1]) add(g, rb(pw * 0.2, wallH, 0.04, 0.005), M.wood, s * pw * 0.4, wallH / 2, 0.02);
  } else if (panel === 'jaali') {
    add(g, rb(pw, wallH, 0.03, 0.005), M.woodDark, 0, wallH / 2, 0.015);
  }
  add(g, rb(w, 0.36, 0.42, 0.015), M.woodDark, 0, 0.42, 0.25);
  for (let i = 1; i < 4; i++) add(g, rb(0.006, 0.3, 0.005, 0.002), M.black, -w / 2 + (w * i) / 4, 0.42, 0.462);
  add(g, rb(w + 0.02, 0.02, 0.44, 0.005), M.metal, 0, 0.61, 0.25);
  const tv = add(g, rb(1.55, 0.88, 0.035, 0.008), M.screen, 0, 1.32, 0.07);
  tv.name = 'tv';
  g.add(vase(M, 0.32, M.ceramic).translateX(-w / 2 + 0.3).translateY(0.62).translateZ(0.25));
  add(g, rb(0.3, 0.05, 0.22, 0.005), M.accentMat, w / 2 - 0.4, 0.645, 0.25);
  add(g, new THREE.SphereGeometry(0.07, 20, 16), M.metal, w / 2 - 0.4, 0.74, 0.25);
  return g;
}

export function sideboard(M, { w = 1.8, glass = false } = {}) {
  const g = G('sideboard');
  if (glass) {
    add(g, rb(w, 2.1, 0.45, 0.01), M.woodDark, 0, 1.05, 0);
    add(g, rb(w - 0.08, 1.1, 0.02, 0.005), M.glassTint, 0, 1.4, 0.225, { cast: false });
    add(g, rb(w - 0.1, 1.05, 0.02, 0.005), M.glow, 0, 1.4, -0.2, { cast: false });
    for (let i = 0; i < 3; i++) add(g, rb(w - 0.1, 0.015, 0.38, 0.004), M.glassTint, 0, 1.0 + i * 0.36, 0, { cast: false });
    const r = rng(9);
    for (let i = 0; i < 9; i++) g.add(vase(M, 0.12 + r() * 0.12, r() > 0.5 ? M.ceramic : M.metal).translateX(-w / 2 + 0.2 + r() * (w - 0.4)).translateY(1.01 + (i % 3) * 0.36).translateZ(0.02));
  } else {
    add(g, rb(w, 0.7, 0.45, 0.015), M.woodDark, 0, 0.45, 0);
    for (let i = 1; i < 3; i++) add(g, rb(0.006, 0.6, 0.005, 0.002), M.black, -w / 2 + (w * i) / 3, 0.45, 0.227);
    for (const s of [-1, 1]) add(g, cyl(0.015, 0.015, 0.1, 8), M.metal, s * (w / 2 - 0.08), 0.05, 0);
    g.add(vase(M, 0.42, M.ceramic).translateX(-w / 2 + 0.3).translateY(0.8));
    g.add(tableLamp(M, { h: 0.55 }).translateX(w / 2 - 0.3).translateY(0.8));
  }
  return g;
}

export function wardrobe(M, { w = 2.4, h = 2.55, glass = false } = {}) {
  const g = G('wardrobe');
  add(g, rb(w, h, 0.62, 0.01), M.cabinet, 0, h / 2, 0);
  const doors = Math.round(w / 0.6);
  for (let i = 1; i < doors; i++) add(g, rb(0.006, h - 0.08, 0.005, 0.002), M.black, -w / 2 + (w * i) / doors, h / 2, 0.312);
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + (w * (i + 0.5)) / doors + (i % 2 ? -1 : 1) * (w / doors / 2 - 0.05);
    add(g, rb(0.015, 0.9, 0.025, 0.005), M.metal, x, 1.15, 0.33);
  }
  if (glass) {
    add(g, rb(w / doors - 0.04, h - 0.2, 0.012, 0.004), M.glassTint, -w / 2 + w / doors / 2, h / 2, 0.315, { cast: false });
    add(g, rb(w / doors - 0.08, h - 0.3, 0.01, 0.004), M.glow, -w / 2 + w / doors / 2, h / 2, 0.2, { cast: false });
  }
  return g;
}

export function bookshelf(M, { w = 1.6, h = 2.2, seed = 3 } = {}) {
  const g = G('bookshelf');
  const sh = 5;
  for (const s of [-1, 1]) add(g, rb(0.03, h, 0.34, 0.006), M.woodDark, s * (w / 2 - 0.015), h / 2, 0);
  for (let i = 0; i <= sh; i++) add(g, rb(w, 0.03, 0.34, 0.006), M.woodDark, 0, 0.05 + (i * (h - 0.1)) / sh, 0);
  const r = rng(seed);
  const cols = [M.accent, M.fabricHex, M.fabric2Hex, '#efe7da', '#2c2c2c', M.woodHex];
  const books = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 160);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  let k = 0;
  for (let i = 0; i < sh; i++) {
    let x = -w / 2 + 0.05;
    const y0 = 0.065 + (i * (h - 0.1)) / sh;
    while (x < w / 2 - 0.12 && k < 160) {
      if (r() < 0.12) { x += 0.18; continue; }
      const bw = 0.025 + r() * 0.03, bh = 0.2 + r() * 0.12;
      m4.compose(new THREE.Vector3(x + bw / 2, y0 + bh / 2, 0.02), new THREE.Quaternion(), new THREE.Vector3(bw, bh, 0.22));
      books.setMatrixAt(k, m4);
      books.setColorAt(k, col.set(cols[Math.floor(r() * cols.length)]));
      x += bw + 0.003; k++;
    }
  }
  books.count = k; books.castShadow = true; books.receiveShadow = true;
  g.add(books);
  return g;
}

export function shoeCabinet(M, { w = 1.4 } = {}) {
  const g = G('shoeCabinet');
  add(g, rb(w, 0.95, 0.38, 0.01), M.cabinet, 0, 0.55, 0);
  const n = Math.floor(w / 0.04);
  const inst = new THREE.InstancedMesh(cyl(0.017, 0.017, 0.85, 8), M.cabinet, n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) { m.makeTranslation(-w / 2 + 0.02 + i * 0.04, 0.55, 0.19); inst.setMatrixAt(i, m); }
  inst.castShadow = true; g.add(inst);
  return g;
}

export function consoleTable(M, { w = 1.3 } = {}) {
  const g = G('console');
  add(g, rb(w, 0.04, 0.38, 0.01), M.marbleMat, 0, 0.82, 0);
  for (const s of [-1, 1]) add(g, rb(0.03, 0.8, 0.32, 0.01), M.metal, s * (w / 2 - 0.08), 0.4, 0);
  add(g, rb(w - 0.2, 0.025, 0.3, 0.005), M.woodDark, 0, 0.18, 0);
  g.add(vase(M, 0.45, M.ceramic, true).translateX(-w / 2 + 0.25).translateY(0.84));
  add(g, cyl(0.12, 0.08, 0.06, 24), M.metal, 0.25, 0.87, 0);
  return g;
}

export function mirror(M, { r = 0.45 } = {}) {
  const g = G('mirror');
  add(g, new THREE.CircleGeometry(r, 48), M.mirror, 0, 0, 0.012, { cast: false });
  add(g, new THREE.TorusGeometry(r, 0.022, 12, 64), M.metal, 0, 0, 0.012);
  return g;
}

export function poojaUnit(M, { w = 1.1, h = 2.2 } = {}) {
  const g = G('pooja');
  add(g, rb(w, h, 0.45, 0.01), M.woodDark, 0, h / 2, 0);
  add(g, rb(w - 0.1, h - 0.6, 0.02, 0.005), M.glow, 0, h / 2 + 0.15, -0.18, { cast: false });
  const jm = M.woodDark.clone();
  jm.alphaMap = jaaliTex(); jm.transparent = false; jm.alphaTest = 0.5; jm.side = THREE.DoubleSide;
  for (const s of [-1, 1]) add(g, new THREE.PlaneGeometry(w / 2 - 0.06, h - 0.65), jm, s * (w / 4 - 0.01), h / 2 + 0.15, 0.226, { cast: false });
  add(g, rb(w - 0.1, 0.03, 0.36, 0.005), M.metal, 0, 0.82, 0);
  add(g, cyl(0.04, 0.02, 0.04, 16), M.metal, 0, 0.86, 0.05);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), M.flame);
  flame.scale.y = 1.8; flame.position.set(0, 0.9, 0.05); g.add(flame);
  return g;
}

// ——— Beds ———
export function bed(M, { w = 1.9, l = 2.15, head = 'channel', fabric } = {}) {
  const g = G('bed');
  const F = fabric || M.fabric;
  add(g, rb(w, 0.32, l, 0.03), M.bedFrame, 0, 0.2, 0);
  add(g, rb(w - 0.1, 0.22, l - 0.12, 0.06), M.white, 0, 0.46, 0.02);
  add(g, rb(w - 0.04, 0.07, l * 0.62, 0.035), F, 0, 0.6, l / 2 - (l * 0.62) / 2 + 0.02);
  add(g, rb(w + 0.04, 0.06, 0.42, 0.03), M.fabric2, 0, 0.64, l / 2 - 0.35);
  for (const s of [-1, 1]) {
    add(g, rb(0.62, 0.17, 0.42, 0.08), M.white, s * (w / 4 + 0.02), 0.66, -l / 2 + 0.36, { rx: -0.35 });
    add(g, rb(0.5, 0.36, 0.13, 0.06), M.fabric2, s * (w / 4), 0.74, -l / 2 + 0.6, { rx: -0.3 });
  }
  add(g, rb(0.4, 0.3, 0.12, 0.05), M.accentMat, 0, 0.72, -l / 2 + 0.72, { rx: -0.25 });
  const hh = 1.25;
  if (head === 'channel') {
    const n = Math.round((w + 0.2) / 0.17);
    for (let i = 0; i < n; i++) add(g, rb((w + 0.2) / n - 0.01, hh, 0.1, 0.045), M.headboard, -(w + 0.2) / 2 + ((w + 0.2) / n) * (i + 0.5), hh / 2 + 0.05, -l / 2 - 0.02);
  } else if (head === 'tufted') {
    add(g, rb(w + 0.2, hh, 0.12, 0.05), M.headboard, 0, hh / 2 + 0.05, -l / 2 - 0.02);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) add(g, new THREE.SphereGeometry(0.018, 8, 6), M.metal, -w / 2 + 0.05 + (i * (w + 0.1)) / 6, 0.5 + j * 0.22, -l / 2 + 0.045, { cast: false });
  } else {
    add(g, rb(w + 1.8, 1.4, 0.06, 0.01), M.wood, 0, 0.7, -l / 2 - 0.05);
    add(g, rb(w + 0.1, 0.9, 0.09, 0.04), M.headboard, 0, 0.75, -l / 2);
  }
  return g;
}

export function nightstand(M) {
  const g = G('nightstand');
  add(g, rb(0.5, 0.42, 0.4, 0.015), M.woodDark, 0, 0.33, 0);
  add(g, rb(0.006, 0.006, 0.005, 0.002), M.black, 0, 0.33, 0.2);
  add(g, rb(0.18, 0.015, 0.02, 0.005), M.metal, 0, 0.42, 0.205);
  for (const s of [-1, 1]) add(g, cyl(0.012, 0.012, 0.12, 8), M.metal, s * 0.2, 0.06, 0);
  return g;
}

export function bench(M, { w = 1.3 } = {}) {
  const g = G('bench');
  add(g, rb(w, 0.14, 0.42, 0.05), M.fabric2, 0, 0.42, 0);
  legs(g, M, w, 0.42, 0.36, 0.06, 0.015, M.metal);
  return g;
}

// ——— Kitchen ———
export function kitchenRun(M, { len = 3, uppers = true, sink = false, hob = false, h = 2.7 } = {}) {
  const g = G('kitchenRun');
  add(g, rb(len, 0.1, 0.55, 0.005), M.black, 0, 0.05, -0.03);
  add(g, rb(len, 0.76, 0.6, 0.008), M.cabinet, 0, 0.48, 0);
  const n = Math.round(len / 0.6);
  for (let i = 1; i < n; i++) add(g, rb(0.006, 0.72, 0.005, 0.002), M.black, -len / 2 + (len * i) / n, 0.48, 0.302);
  add(g, rb(len, 0.006, 0.005, 0.002), M.black, 0, 0.66, 0.302);
  for (let i = 0; i < n; i++) add(g, rb(0.22, 0.012, 0.02, 0.004), M.metal, -len / 2 + (len * (i + 0.5)) / n, 0.8, 0.31);
  add(g, rb(len + 0.02, 0.04, 0.63, 0.006), M.counter, 0, 0.88, 0.01);
  add(g, rb(len, 0.6, 0.015, 0.003), M.splash, 0, 1.2, -0.29, { cast: false });
  if (uppers) {
    add(g, rb(len, 0.72, 0.35, 0.008), M.cabinet, 0, 1.9, -0.125);
    for (let i = 1; i < n; i++) add(g, rb(0.006, 0.68, 0.005, 0.002), M.black, -len / 2 + (len * i) / n, 1.9, 0.052);
    add(g, rb(len - 0.04, 0.02, 0.04, 0.005), M.glow, 0, 1.53, -0.02, { cast: false });
  }
  if (sink) {
    add(g, rb(0.6, 0.012, 0.42, 0.004), M.black, -len / 4, 0.902, 0.03, { cast: false });
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.32, 0), new THREE.Vector3(0, 0.38, 0.12), new THREE.Vector3(0, 0.3, 0.2)]);
    add(g, new THREE.TubeGeometry(curve, 20, 0.014, 8), M.metal, -len / 4, 0.9, -0.2);
  }
  if (hob) {
    add(g, rb(0.62, 0.012, 0.5, 0.004), M.screen, len / 4, 0.905, 0.03, { cast: false });
    for (const [dx, dz] of [[-0.15, -0.1], [0.15, -0.1], [-0.15, 0.14], [0.15, 0.14]]) add(g, new THREE.TorusGeometry(0.07, 0.006, 6, 24), M.metal, len / 4 + dx, 0.915, 0.03 + dz, { rx: Math.PI / 2, cast: false });
    if (uppers) add(g, rb(0.7, 0.4, 0.45, 0.01), M.metal, len / 4, 1.85, -0.05);
  }
  // countertop decor
  add(g, rb(0.34, 0.02, 0.24, 0.006), M.wood, -len / 2 + 0.4, 0.91, -0.1, { ry: 0.1 });
  for (let i = 0; i < 3; i++) add(g, cyl(0.05, 0.05, 0.14 + i * 0.03, 16), M.glassTint, len / 2 - 0.2 - i * 0.12, 0.97 + i * 0.015, -0.18);
  return g;
}

export function tallUnit(M, { w = 0.9, h = 2.4 } = {}) {
  const g = G('tallUnit');
  add(g, rb(w, h, 0.62, 0.008), M.metal, 0, h / 2, 0);
  add(g, rb(0.006, h - 0.1, 0.005, 0.002), M.black, 0, h / 2, 0.312);
  for (const s of [-1, 1]) add(g, rb(0.02, 1.0, 0.03, 0.006), M.black, s * 0.06, 1.2, 0.33);
  return g;
}

export function island(M, { w = 2.0 } = {}) {
  const g = G('island');
  add(g, rb(w, 0.86, 0.85, 0.01), M.cabinet, 0, 0.43, 0);
  add(g, rb(w + 0.04, 0.05, 1.0, 0.008), M.counter, 0, 0.885, 0.07);
  add(g, rb(0.05, 0.86, 1.0, 0.006), M.counter, w / 2 + 0.005, 0.43, 0.07);
  const bowl = add(g, new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.ceramic, -0.3, 1.06, 0);
  bowl.scale.y = 0.5;
  const r = rng(4);
  for (let i = 0; i < 5; i++) add(g, new THREE.SphereGeometry(0.04, 12, 10), M.fruit[i % M.fruit.length], -0.3 + (r() - 0.5) * 0.14, 0.99, (r() - 0.5) * 0.14);
  for (let i = 0; i < 3; i++) g.add(stool(M).translateX(-w / 2 + 0.4 + i * ((w - 0.8) / 2)).translateZ(0.75));
  return g;
}

// ——— Utility ———
export function washer(M) {
  const g = G('washer');
  for (let k = 0; k < 2; k++) {
    add(g, rb(0.6, 0.84, 0.6, 0.02), M.white, 0, 0.42 + k * 0.86, 0);
    add(g, new THREE.TorusGeometry(0.17, 0.025, 10, 32), M.metal, 0, 0.4 + k * 0.86, 0.305);
    add(g, new THREE.CircleGeometry(0.16, 32), M.screen, 0, 0.4 + k * 0.86, 0.302, { cast: false });
    add(g, rb(0.5, 0.06, 0.01, 0.004), M.screen, 0, 0.75 + k * 0.86, 0.302, { cast: false });
  }
  return g;
}

export function dryingRack(M, { w = 1.2 } = {}) {
  const g = G('rack');
  for (let i = 0; i < 4; i++) add(g, cyl(0.01, 0.01, w, 8), M.metal, 0, 0, i * 0.12, { rz: Math.PI / 2 });
  const r = rng(5);
  for (let i = 0; i < 4; i++) add(g, new THREE.PlaneGeometry(0.3, 0.5), [M.white, M.fabric2, M.accentMat][i % 3], -w / 2 + 0.2 + i * 0.27, -0.25, (i % 4) * 0.12, { cast: true }).material.side = THREE.DoubleSide;
  return g;
}

// ——— Lighting ———
export function tableLamp(M, { h = 0.5 } = {}) {
  const g = G('tableLamp');
  const prof = [[0, 0], [0.07, 0], [0.09, h * 0.2], [0.08, h * 0.45], [0.02, h * 0.62], [0.012, h * 0.66], [0, h * 0.66]].map(([x, y]) => new THREE.Vector2(x, y));
  add(g, new THREE.LatheGeometry(prof, 24), M.ceramic, 0, 0, 0);
  add(g, new THREE.CylinderGeometry(0.11, 0.15, h * 0.4, 28, 1, true), M.shade, 0, h * 0.8, 0, { cast: false });
  g.userData.light = { y: h * 0.78 };
  return g;
}

export function floorLamp(M, { arc = true } = {}) {
  const g = G('floorLamp');
  add(g, cyl(0.17, 0.17, 0.04, 32), M.marbleMat, 0, 0.02, 0);
  if (arc) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1.4, 0), new THREE.Vector3(0.25, 1.95, 0.25), new THREE.Vector3(0.75, 1.95, 0.75), new THREE.Vector3(1.0, 1.75, 1.0)]);
    add(g, new THREE.TubeGeometry(curve, 48, 0.014, 8), M.metal, 0, 0.04, 0);
    const shade = add(g, new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.metal, 1.0, 1.72, 1.0);
    shade.material = M.metal;
    add(g, new THREE.SphereGeometry(0.05, 12, 10), M.bulb, 1.0, 1.7, 1.0, { cast: false });
    g.userData.light = { x: 1.0, y: 1.6, z: 1.0 };
  } else {
    add(g, cyl(0.012, 0.012, 1.45, 8), M.metal, 0, 0.75, 0);
    add(g, new THREE.CylinderGeometry(0.16, 0.2, 0.32, 28, 1, true), M.shade, 0, 1.55, 0, { cast: false });
    g.userData.light = { y: 1.5 };
  }
  return g;
}

export function pendant(M, { drop = 0.8, kind = 'globe', ceiling = 2.8 } = {}) {
  const g = G('pendant');
  add(g, cyl(0.004, 0.004, drop, 6), M.black, 0, ceiling - drop / 2, 0, { cast: false });
  if (kind === 'globe') add(g, new THREE.SphereGeometry(0.13, 24, 16), M.bulbGlass, 0, ceiling - drop - 0.1, 0, { cast: false });
  else if (kind === 'dome') {
    const d = new THREE.SphereGeometry(0.22, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = M.metal.clone(); m.side = THREE.DoubleSide;
    add(g, d, m, 0, ceiling - drop - 0.15, 0, { cast: false });
    add(g, new THREE.SphereGeometry(0.05, 10, 8), M.bulb, 0, ceiling - drop - 0.17, 0, { cast: false });
  } else if (kind === 'cone') {
    add(g, new THREE.ConeGeometry(0.12, 0.22, 24, 1, true), M.metal, 0, ceiling - drop - 0.1, 0, { cast: false }).material.side = THREE.DoubleSide;
    add(g, new THREE.SphereGeometry(0.04, 10, 8), M.bulb, 0, ceiling - drop - 0.18, 0, { cast: false });
  }
  g.userData.light = { y: ceiling - drop - 0.25 };
  return g;
}

export function linearPendant(M, { w = 1.6, ceiling = 2.8, drop = 1.15 } = {}) {
  const g = G('linear');
  for (const s of [-1, 1]) add(g, cyl(0.003, 0.003, drop, 6), M.black, s * (w / 2 - 0.1), ceiling - drop / 2, 0, { cast: false });
  add(g, rb(w, 0.04, 0.06, 0.01), M.metal, 0, ceiling - drop, 0, { cast: false });
  add(g, rb(w - 0.04, 0.01, 0.04, 0.004), M.bulb, 0, ceiling - drop - 0.022, 0, { cast: false });
  g.userData.light = { y: ceiling - drop - 0.1 };
  return g;
}

export function chandelier(M, { ceiling = 2.8 } = {}) {
  const g = G('chandelier');
  const y = ceiling - 0.75;
  add(g, cyl(0.006, 0.006, 0.6, 6), M.metal, 0, ceiling - 0.3, 0, { cast: false });
  add(g, new THREE.TorusGeometry(0.45, 0.014, 8, 48), M.metal, 0, y, 0, { rx: Math.PI / 2, cast: false });
  add(g, new THREE.TorusGeometry(0.25, 0.012, 8, 40), M.metal, 0, y + 0.18, 0, { rx: Math.PI / 2, cast: false });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    add(g, cyl(0.016, 0.016, 0.08, 8), M.white, Math.cos(a) * 0.45, y + 0.05, Math.sin(a) * 0.45, { cast: false });
    add(g, new THREE.SphereGeometry(0.022, 8, 8), M.bulb, Math.cos(a) * 0.45, y + 0.11, Math.sin(a) * 0.45, { cast: false }).scale.y = 1.6;
  }
  g.userData.light = { y };
  return g;
}

// ——— Decor ———
export function vase(M, h = 0.3, mat, pampas = false) {
  const g = G('vase');
  const prof = [[0, 0], [h * 0.22, 0], [h * 0.32, h * 0.35], [h * 0.22, h * 0.75], [h * 0.1, h * 0.9], [h * 0.12, h], [h * 0.1, h]].map(([x, y]) => new THREE.Vector2(x, y));
  add(g, new THREE.LatheGeometry(prof, 24), mat || M.ceramic, 0, 0, 0);
  if (pampas) {
    const r = rng(Math.round(h * 100));
    for (let i = 0; i < 9; i++) {
      const s = add(g, cyl(0.004, 0.004, 0.5, 4), M.woodDark, 0, h + 0.2, 0, { rz: (r() - 0.5) * 0.7, rx: (r() - 0.5) * 0.7, cast: false });
      const plume = add(g, new THREE.SphereGeometry(0.05, 8, 6), M.pampas, Math.sin(s.rotation.z) * -0.3, h + 0.48, Math.sin(s.rotation.x) * 0.3, { cast: false });
      plume.scale.set(0.6, 2.2, 0.6);
    }
  }
  return g;
}

export function plant(M, { h = 1.4, seed = 1, pot = 0.22 } = {}) {
  const g = G('plant');
  const prof = [[0, 0], [pot * 0.8, 0], [pot, pot * 1.6], [pot * 0.95, pot * 1.65], [0, pot * 1.6]].map(([x, y]) => new THREE.Vector2(x, y));
  add(g, new THREE.LatheGeometry(prof, 28), M.pot, 0, 0, 0);
  const r = rng(seed);
  const n = 46;
  const leaf = new THREE.SphereGeometry(1, 10, 6);
  const inst = new THREE.InstancedMesh(leaf, M.leaf, n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const y = pot * 1.6 + 0.15 + t * (h - pot * 1.6);
    const a = r() * Math.PI * 2, rad = 0.08 + (1 - Math.abs(t - 0.6)) * 0.28 * r();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((r() - 0.5) * 1.2, a, 0.6 + r() * 0.6));
    m4.compose(new THREE.Vector3(Math.cos(a) * rad, y, Math.sin(a) * rad), q, new THREE.Vector3(0.14 + r() * 0.06, 0.012, 0.07 + r() * 0.03));
    inst.setMatrixAt(i, m4);
  }
  inst.castShadow = true;
  g.add(inst);
  add(g, cyl(0.012, 0.016, h - pot, 6), M.woodDark, 0, pot + (h - pot) / 2, 0);
  return g;
}

export function rug(M, { w = 2.6, d = 1.9, kind, seed = 1 } = {}) {
  const g = G('rug');
  const mat = new THREE.MeshStandardMaterial({ map: rugTex(kind || M.rug.kind, M.rug.c1, M.rug.c2, M.rug.c3, seed), roughness: 1 });
  add(g, rb(w, 0.012, d, 0.004), mat, 0, 0.006, 0, { cast: false });
  return g;
}

export function art(M, { w = 0.8, h = 1.0, seed = 1, frame = true } = {}) {
  const g = G('art');
  const mat = new THREE.MeshStandardMaterial({ map: artTex(M.artPalette, seed), roughness: 0.85 });
  if (frame) add(g, rb(w + 0.05, h + 0.05, 0.03, 0.005), M.frame, 0, 0, 0.015);
  add(g, new THREE.PlaneGeometry(w, h), mat, 0, 0, 0.032, { cast: false });
  return g;
}

export function curtains(M, { w = 1.0, h = 2.6 } = {}) {
  const geo = new THREE.PlaneGeometry(w, h, 64, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 30) * 0.03 * (1 + (0.5 - y / h) * 0.4) + Math.sin(x * 11 + 1.3) * 0.012); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, M.curtain);
  m.castShadow = true; m.receiveShadow = true;
  m.position.y = h / 2;
  const g = G('curtain'); g.add(m);
  return g;
}

export function swing(M, { ceiling = 2.8 } = {}) {
  const g = G('swing');
  add(g, rb(1.3, 0.08, 0.55, 0.02), M.wood, 0, 0.48, 0);
  add(g, rb(1.2, 0.1, 0.5, 0.05), M.fabric, 0, 0.56, 0.02);
  add(g, rb(1.3, 0.4, 0.05, 0.02), M.wood, 0, 0.75, -0.25, { rx: -0.1 });
  for (const s of [-1, 1]) for (const z of [-0.22, 0.22]) add(g, cyl(0.008, 0.008, ceiling - 0.5, 6), M.metal, s * 0.63, 0.5 + (ceiling - 0.5) / 2, z, { cast: false });
  add(g, rb(0.42, 0.36, 0.12, 0.06), M.accentMat, -0.35, 0.72, -0.12, { rx: -0.2 });
  return g;
}

export function railing(M, { len = 4 } = {}) {
  const g = G('railing');
  add(g, rb(len, 0.9, 0.015, 0.004), M.glassRail, 0, 0.55, 0, { cast: false });
  add(g, rb(len, 0.05, 0.06, 0.01), M.metal, 0, 1.05, 0);
  add(g, rb(len, 0.08, 0.08, 0.01), M.metal, 0, 0.06, 0);
  return g;
}

export function door(M, { w = 0.9, h = 2.1 } = {}) {
  const g = G('door');
  add(g, rb(w, h, 0.045, 0.006), M.doorMat, 0, h / 2, 0);
  for (let i = 0; i < 4; i++) add(g, rb(w - 0.12, 0.006, 0.005, 0.002), M.woodDark, 0, 0.4 + i * 0.45, 0.025, { cast: false });
  add(g, rb(0.02, 0.3, 0.03, 0.005), M.metal, w / 2 - 0.1, 1.05, 0.04);
  return g;
}
