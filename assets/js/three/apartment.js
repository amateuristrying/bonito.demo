// Procedural apartment generator: plan → walls → furnished rooms, styled per Bonito project style.
import * as THREE from 'three';
import * as F from './furniture.js';
import { rb, add } from './furniture.js';
import { woodTex, herringTex, marbleTex, tileTex, rng, plasterTex, boucleTex, grainTex } from './textures.js';

export const H = 2.85;      // ceiling height
const T = 0.12;              // wall thickness
const TI = T / 2;

export const STYLES = {
  Minimalist:   { wall: '#EEE9E1', accentWall: '#E0D6C8', floor: ['oak', '#D6BC98'], wood: '#CDAE86', woodDark: '#9B7A57', cabinet: '#E9E3D9', fabric: '#E4DDD1', fabric2: '#CBBFAE', accent: '#B89E7E', metal: ['#BDB6AC', 0.35], marble: ['#F2EEE7', '#CEC4B6'], rug: ['plain', '#DCD3C5', '#C6B9A6', '#ffffff'], art: ['#D8CBB8', '#B89E7E', '#8C7B67', '#F4EFE7'], head: 'channel', panel: 'fluted', fabricName: 'oat bouclé' },
  Modern:       { wall: '#E7E1D7', accentWall: '#CDBFAD', floor: ['marble', '#EEE8DE'], wood: '#8A5E3D', woodDark: '#5E3E28', cabinet: '#DCD4C8', fabric: '#BDB3A4', fabric2: '#6F2A22', accent: '#C2703D', metal: ['#BE9A62', 0.28], marble: ['#EFE9DF', '#C9BFB1'], rug: ['geo', '#D9CFC1', '#6F2A22', '#C2703D'], art: ['#6F2A22', '#C2703D', '#D8C3A5', '#F2ECE3'], head: 'channel', panel: 'fluted', chaise: true, fabricName: 'taupe performance weave' },
  Contemporary: { wall: '#EAE3D8', accentWall: '#8D9A86', floor: ['tile', '#DCD4C7'], wood: '#A57E58', woodDark: '#6E5038', cabinet: '#8D9A86', fabric: '#D8CCBA', fabric2: '#7D8A78', accent: '#C46A4A', metal: ['#2D2B29', 0.45], marble: ['#ECE6DD', '#A9A097'], rug: ['geo', '#E2D8C9', '#7D8A78', '#C46A4A'], art: ['#7D8A78', '#C46A4A', '#E2D3BD', '#F4EEE5'], head: 'panel', panel: 'marble', chaise: true, fabricName: 'sand chenille' },
  European:     { wall: '#F2ECE2', accentWall: '#DDE2E0', floor: ['herring', '#C29A6C'], wood: '#B8936A', woodDark: '#7E5E40', cabinet: '#EDE7DC', fabric: '#E8DFCF', fabric2: '#3E5266', accent: '#3E5266', metal: ['#C9A45C', 0.25], marble: ['#F3EFE8', '#C8BEB0'], rug: ['border', '#E6DCCB', '#3E5266', '#C9A45C'], art: ['#3E5266', '#C9A45C', '#D9CFC0', '#F5F0E8'], head: 'tufted', panel: 'marble', moulding: true, chandelier: true, fabricName: 'ivory linen' },
  Eclectic:     { wall: '#ECDCC4', accentWall: '#2F4B4A', floor: ['oak', '#B88B5D'], wood: '#94653F', woodDark: '#5F3E25', cabinet: '#2F4B4A', fabric: '#C99A3B', fabric2: '#2F4B4A', accent: '#B5523B', metal: ['#BE9A62', 0.3], marble: ['#EEE6DA', '#9F8F7C'], rug: ['persian', '#B5523B', '#2F4B4A', '#E6C98F'], art: ['#2F4B4A', '#C99A3B', '#B5523B', '#F1E6D3'], head: 'channel', panel: 'fluted', fabricName: 'mustard velvet' },
  Scandinavian: { wall: '#F5F2EC', accentWall: '#E6E1D8', floor: ['oak', '#E2CAA6'], wood: '#DBBE96', woodDark: '#A8865E', cabinet: '#F1EEE8', fabric: '#D3D0C8', fabric2: '#8FA69A', accent: '#D8A54A', metal: ['#2B2B2B', 0.5], marble: ['#F4F2EE', '#D7D1C8'], rug: ['stripe', '#ECE7DE', '#D6CFC3', '#ffffff'], art: ['#8FA69A', '#D8A54A', '#2B2B2B', '#F7F4EF'], head: 'panel', panel: 'fluted', fabricName: 'pebble wool' },
  Victorian:    { wall: '#E6D8C4', accentWall: '#2E4A3A', floor: ['herring', '#7A5233'], wood: '#6B4529', woodDark: '#4A2E1B', cabinet: '#E9DFCF', fabric: '#2E4A3A', fabric2: '#8A2E2A', accent: '#C9A45C', metal: ['#C9A45C', 0.25], marble: ['#EFE8DD', '#9C8C77'], rug: ['persian', '#8A2E2A', '#2E4A3A', '#C9A45C'], art: ['#2E4A3A', '#8A2E2A', '#C9A45C', '#EFE5D3'], head: 'tufted', panel: 'marble', moulding: true, chandelier: true, rolled: true, fabricName: 'emerald velvet' },
  Traditional:  { wall: '#EFE0CA', accentWall: '#B8683F', floor: ['oak', '#94623A'], wood: '#7A4A28', woodDark: '#55311A', cabinet: '#E6D7C0', fabric: '#7A2E28', fabric2: '#C9A45C', accent: '#C9A45C', metal: ['#C9A45C', 0.28], marble: ['#F0E9DC', '#A8987F'], rug: ['persian', '#7A2E28', '#C9A45C', '#EFE0CA'], art: ['#7A2E28', '#C9A45C', '#B8683F', '#F2E6D2'], head: 'panel', panel: 'jaali', rolled: true, fabricName: 'maroon silk-blend' },
};

export const UPHOLSTERY = ['#E4DDD1', '#BDB3A4', '#7D8A78', '#3E5266', '#6F2A22', '#C99A3B'];
export const WALLS = ['#EEE9E1', '#E7DCCB', '#DDE2E0', '#E3D4CB', '#D7DBCF'];

const phys = (o) => new THREE.MeshPhysicalMaterial(o);
function std(color, rough = 0.8, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });
}

export function makeMaterials(styleName) {
  const S = STYLES[styleName] || STYLES.Modern;
  const emissives = [];
  const glowMat = (color, day, night) => {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: day, roughness: 0.5 });
    emissives.push({ mat: m, day, night });
    return m;
  };
  const boucle = boucleTex();
  const plaster = plasterTex();
  const white = new THREE.Color('#ffffff');
  // upholstery: physically based cloth with sheen — reads as bouclé / velvet under light
  const cloth = (color, { velvet = false } = {}) => phys({
    color, roughness: velvet ? 0.72 : 0.92, sheen: 1, sheenRoughness: velvet ? 0.35 : 0.7,
    sheenColor: new THREE.Color(color).lerp(white, velvet ? 0.5 : 0.3), bumpMap: boucle, bumpScale: velvet ? 0.6 : 1.6,
  });
  const velvet = /velvet|silk/.test(S.fabricName);
  // timber veneer with satin lacquer
  const timber = (color, rough = 0.48) => phys({ color: '#ffffff', map: grainTex(color, color.length * 7), bumpMap: grainTex(color, color.length * 7), bumpScale: 0.6, roughness: rough, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const stone = (map, rough = 0.22) => phys({ map, roughness: rough, clearcoat: 0.6, clearcoatRoughness: 0.12 });
  const wallMat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.93, bumpMap: plaster, bumpScale: 0.35 });
  const M = {
    S, emissives,
    wall: wallMat(S.wall),
    accentWallMat: wallMat(S.accentWall),
    ceiling: wallMat('#F6F2EA'),
    cap: std('#4A1D17', 0.7),
    skirting: phys({ color: S.moulding || S.rolled ? '#F3EEE6' : S.woodDark, roughness: 0.4, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
    cornice: std('#F7F3EC', 0.7),
    facade: std('#EDE6DA', 0.95),
    wood: timber(S.wood),
    woodDark: timber(S.woodDark, 0.42),
    cabinet: phys({ color: S.cabinet, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18 }),
    fabric: cloth(S.fabric, { velvet }),
    fabric2: cloth(S.fabric2, { velvet: true }),
    accentMat: cloth(S.accent, { velvet: true }),
    metal: phys({ color: S.metal[0], metalness: 1, roughness: S.metal[1] * 0.8, clearcoat: 0.3, clearcoatRoughness: 0.2 }),
    black: std('#1E1B19', 0.45),
    white: phys({ color: '#F7F4EE', roughness: 0.9, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color('#ffffff'), bumpMap: boucle, bumpScale: 0.5 }),
    ceramic: phys({ color: '#E9E2D6', roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.1 }),
    screen: phys({ color: '#0b0b0d', roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03 }),
    marbleMat: stone(marbleTex(S.marble[0], S.marble[1])),
    counter: stone(marbleTex(S.marble[0], S.marble[1], { seed: 21 }), 0.18),
    splash: stone(tileTex(S.marble[0], { cols: 8, rows: 4, seed: 9 }), 0.25),
    glassTint: phys({ color: '#d4dcda', transparent: true, opacity: 0.25, roughness: 0.04, metalness: 0, clearcoat: 1 }),
    glassRail: phys({ color: '#d6e2e2', transparent: true, opacity: 0.2, roughness: 0.03, clearcoat: 1 }),
    window: phys({ color: '#e6eeee', transparent: true, opacity: 0.12, roughness: 0.02, metalness: 0.1, clearcoat: 1, depthWrite: false }),
    frame: std('#2b2622', 0.45),
    winFrame: phys({ color: '#34302d', roughness: 0.35, metalness: 0.6 }),
    mirror: new THREE.MeshStandardMaterial({ color: '#eef2f2', metalness: 1, roughness: 0.02 }),
    curtain: phys({ color: '#F4EDE2', roughness: 0.95, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'), side: THREE.DoubleSide, transparent: true, opacity: 0.78, depthWrite: false }),
    rod: phys({ color: S.metal[0], metalness: 1, roughness: 0.3 }),
    doorMat: timber(S.woodDark, 0.45),
    pot: phys({ color: '#D9CBB7', roughness: 0.75, bumpMap: plaster, bumpScale: 1.5 }),
    leaf: phys({ color: '#4C6B42', roughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#9fbf8a'), side: THREE.DoubleSide }),
    pampas: std('#E6D3B3', 1),
    bedFrame: timber(S.woodDark, 0.5),
    headboard: cloth(S.fabric2, { velvet: true }),
    fruit: [std('#C8553D', 0.4), std('#E1A836', 0.4), std('#7E9A4B', 0.45)],
    rug: { kind: S.rug[0], c1: S.rug[1], c2: S.rug[2], c3: S.rug[3] },
    artPalette: S.art,
    fabricHex: S.fabric, fabric2Hex: S.fabric2, woodHex: S.wood, accent: S.accent,
  };
  M.shade = glowMat('#F3E6CF', 0.08, 1.1);
  M.bulb = glowMat('#FFE2B0', 0.6, 3.5);
  M.bulbGlass = glowMat('#FBEFD9', 0.25, 2.2);
  M.glow = glowMat('#FFD9A0', 0.2, 1.8);
  M.flame = glowMat('#FFB347', 1.5, 4);
  M.cove = glowMat('#FFE3B8', 0.15, 2.2);
  M.floor = floorMat(S.floor[0], S.floor[1]);
  M.kitchenFloor = tiled(tileTex('#D9D2C6', { cols: 2, rows: 2, seed: 4 }), 1 / 1.2, 0.3);
  M.deck = tiled(woodTex('#9C6B43', 8), 0.6, 0.7);
  M.utilFloor = tiled(tileTex('#CFCAC1', { cols: 4, rows: 4 }), 1 / 1.2, 0.45);
  return M;
}

function tiled(map, rep, rough, clear = 0.3) {
  map.repeat.set(rep, rep);
  return phys({ map, bumpMap: map, bumpScale: 1.2, roughness: rough, clearcoat: clear, clearcoatRoughness: 0.25 });
}

function floorMat(type, color) {
  if (type === 'oak') return tiled(woodTex(color), 0.5, 0.5, 0.45);
  if (type === 'herring') return tiled(herringTex(color), 0.7, 0.45, 0.5);
  if (type === 'marble') { const m = tiled(marbleTex(color, '#B9AE9F', { grout: 2, seed: 13 }), 1 / 2.4, 0.14, 0.9); m.bumpScale = 0.4; m.clearcoatRoughness = 0.06; return m; }
  return tiled(tileTex(color, { cols: 1, rows: 2 }), 1 / 1.2, 0.3, 0.5);
}

// ———————————————————————————————— Plan ————————————————————————————————
const WIDTH = { living: 5.6, dining: 3.4, foyer: 2.4, kitchen: 3.2, utility: 1.9, master: 4.4, bedroom: 3.8, study: 3.0 };

export function makePlan(project) {
  const rooms = project.rooms || [];
  const has = (r) => rooms.includes(r);
  const bedCount = { '2BHK': 2, '3BHK': 3, '4BHK': 4, Villa: 4 }[project.typology] || 3;
  const big = bedCount >= 4;
  const front = [], back = [];
  if (has('foyer')) front.push({ type: 'foyer' });
  front.push({ type: 'living' });
  front.push({ type: 'dining' });
  back.push({ type: 'kitchen' });
  if (has('utility')) back.push({ type: 'utility' });
  const extra = [];
  for (let i = 0; i < bedCount; i++) extra.push({ type: 'bedroom', variant: i === 0 ? 'master' : i === 1 ? 'kids' : 'guest', n: i });
  if (has('study')) extra.push({ type: 'study' });
  const wOf = (r) => (r.type === 'bedroom' ? (r.variant === 'master' ? WIDTH.master : WIDTH.bedroom) : WIDTH[r.type]) * (big && r.type === 'living' ? 1.15 : 1);
  const sum = (row) => row.reduce((a, r) => a + wOf(r), 0);
  for (const r of extra) (sum(front) + 1.5 < sum(back) ? front : back).push(r);
  const Db = big ? 4.6 : 4.3, Df = big ? 5.8 : 5.3;
  const layoutRow = (row, z, d) => {
    let x = 0;
    for (const r of row) { r.w = wOf(r); r.x = x; r.z = z; r.d = d; x += r.w; }
    return x;
  };
  const wf = layoutRow(front, Db, Df), wb = layoutRow(back, 0, Db);
  const W = Math.max(wf, wb);
  const stretch = (row, total) => { const extraW = W - total; if (extraW > 0.01) { const r = row[row.length - 1]; r.w += extraW; } };
  stretch(front, wf); stretch(back, wb);
  const all = [...back.map((r) => ({ ...r, row: 'back' })), ...front.map((r) => ({ ...r, row: 'front' }))];
  if (has('balcony')) {
    const lv = all.find((r) => r.type === 'living');
    all.push({ type: 'balcony', row: 'out', x: lv.x + 0.4, z: Db + Df, w: Math.min(lv.w - 0.8, 4.6), d: 1.8 });
  }
  const D = Db + Df;
  // centre plan on origin
  for (const r of all) { r.x -= W / 2; r.z -= D / 2; r.cx = r.x + r.w / 2; r.cz = r.z + r.d / 2; }
  const labels = { foyer: 'Foyer', living: 'Living Room', dining: 'Dining', kitchen: 'Kitchen', utility: 'Utility', study: 'Study', balcony: 'Balcony' };
  for (const r of all) {
    r.label = r.type === 'bedroom' ? ({ master: 'Master Bedroom', kids: "Kids' Bedroom", guest: r.n > 2 ? `Bedroom ${r.n + 1}` : 'Guest Bedroom' }[r.variant]) : labels[r.type];
    r.id = r.type === 'bedroom' ? `bedroom-${r.n}` : r.type;
    r.roomType = { living: 'living-room', kitchen: 'kitchen-room', bedroom: 'bedroom' }[r.type] || r.type;
  }
  return { rooms: all, W, D: D + (has('balcony') ? 1.8 : 0), Dmain: D, Db };
}

// ———————————————————————————————— Walls ————————————————————————————————
// Each wall: axis-aligned line, openings measured along it.
function buildWalls(plan, M, group) {
  const { rooms, W, Dmain } = plan;
    const main = rooms.filter((r) => r.row !== 'out');
  // build per-room edges and merge identical edges
  const edges = [];
  for (const r of main) {
    edges.push({ axis: 'z', c: r.z, a: r.x, b: r.x + r.w, room: r, side: 'back' });
    edges.push({ axis: 'z', c: r.z + r.d, a: r.x, b: r.x + r.w, room: r, side: 'front' });
    edges.push({ axis: 'x', c: r.x, a: r.z, b: r.z + r.d, room: r, side: 'left' });
    edges.push({ axis: 'x', c: r.x + r.w, a: r.z, b: r.z + r.d, room: r, side: 'right' });
  }
  // split edges along shared lines into atomic intervals
  const byLine = new Map();
  for (const e of edges) {
    const k = e.axis + '|' + e.c.toFixed(2);
    if (!byLine.has(k)) byLine.set(k, []);
    byLine.get(k).push(e);
  }
  const walls = [];
  for (const [, es] of byLine) {
    const pts = [...new Set(es.flatMap((e) => [+e.a.toFixed(3), +e.b.toFixed(3)]))].sort((p, q) => p - q);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const owners = es.filter((e) => e.a <= a + 1e-3 && e.b >= b - 1e-3);
      if (!owners.length) continue;
      walls.push({ axis: es[0].axis, c: es[0].c, a, b, owners, openings: [], exterior: owners.length === 1 });
    }
  }
  // ——— openings ———
  for (const w of walls) {
    const len = w.b - w.a;
    if (!w.exterior) {
      const [A, B] = w.owners.map((o) => o.room);
      const pair = new Set([A.type, B.type]);
      if (pair.has('living') && pair.has('dining')) w.open = true;
      else if (pair.has('living') && pair.has('foyer')) w.openings.push({ s: (w.a + w.b) / 2, w: Math.min(1.6, len - 0.6), top: 2.4, type: 'arch' });
      else if (w.axis === 'z') {
        // row divider: door near the left end of the shared interval
        if (len > 1.3) w.openings.push({ s: w.a + 0.75, w: 0.9, top: 2.1, type: 'door' });
      } else if (len > 1.3 && (pair.has('bedroom') || pair.has('study') || pair.has('utility') || pair.has('kitchen'))) {
        // side doors only between public rooms and private rooms in the front row
        const pub = ['dining', 'living', 'foyer'];
        if ((pub.includes(A.type) || pub.includes(B.type)) && A.row === 'front') w.openings.push({ s: w.a + 0.8, w: 0.9, top: 2.1, type: 'door' });
        if (A.type === 'kitchen' || B.type === 'kitchen') if (pair.has('utility')) w.openings.push({ s: w.b - 0.7, w: 0.85, top: 2.1, type: 'door' });
      }
    } else {
      const r = w.owners[0].room, side = w.owners[0].side;
      if (r.type === 'foyer' && side === 'front') w.openings.push({ s: (w.a + w.b) / 2, w: 1.05, top: 2.2, type: 'entry' });
      else if (side === 'front') {
        if (r.type === 'living' && plan.rooms.some((q) => q.type === 'balcony')) w.openings.push({ s: (w.a + w.b) / 2 - 0.2, w: Math.min(3.2, len - 1.4), bottom: 0, top: 2.4, type: 'slider' });
        else w.openings.push({ s: (w.a + w.b) / 2, w: Math.min(r.type === 'bedroom' ? 1.8 : 2.4, len - 1.2), bottom: 0.45, top: 2.35, type: 'window' });
      } else if (side === 'back') {
        if (r.type === 'kitchen') w.openings.push({ s: w.a + len * 0.25, w: 1.3, bottom: 1.05, top: 2.25, type: 'window' });
        else if (r.type === 'utility') w.openings.push({ s: (w.a + w.b) / 2, w: 0.9, bottom: 1.2, top: 2.2, type: 'window' });
        else if (r.type === 'bedroom' || r.type === 'study') w.openings.push({ s: (w.a + w.b) / 2, w: Math.min(1.8, len - 1.2), bottom: 1.55, top: 2.4, type: 'window' });
      } else if ((side === 'left' || side === 'right') && len > 2.4 && !['kitchen', 'living', 'dining', 'foyer'].includes(r.type)) {
        w.openings.push({ s: (w.a + w.b) / 2 + (r.row === 'front' ? 0.5 : 0), w: 1.4, bottom: 0.6, top: 2.3, type: 'window' });
      }
    }
  }
  // ——— build meshes ———
  const capMats = [M.wall, M.wall, M.cap, M.wall, M.wall, M.wall];
  const box = (axis, c, a, b, y0, y1, extA = 0, extB = 0) => {
    const len = b - a, h = y1 - y0;
    if (len < 0.01 || h < 0.01) return;
    const L = len + extA + extB;
    const mid = (a - extA + b + extB) / 2;
    const geo = metricUV(axis === 'z' ? new THREE.BoxGeometry(L, h, T) : new THREE.BoxGeometry(T, h, L));
    const m = new THREE.Mesh(geo, y1 >= H - 1e-3 ? capMats : M.wall);
    if (axis === 'z') m.position.set(mid, y0 + h / 2, c); else m.position.set(c, y0 + h / 2, mid);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
    // skirting board at the foot, cornice at the ceiling line — both faces of the wall
    const trim = (y, th, depth, mat) => {
      const tg = axis === 'z' ? new THREE.BoxGeometry(L, th, T + depth) : new THREE.BoxGeometry(T + depth, th, L);
      const t = new THREE.Mesh(tg, mat);
      if (axis === 'z') t.position.set(mid, y, c); else t.position.set(c, y, mid);
      t.receiveShadow = true; t.castShadow = false;
      group.add(t);
    };
    if (y0 === 0 && h > 0.3) trim(0.055, 0.11, 0.028, M.skirting);
    if (y1 >= H - 1e-3 && h > 0.15) { trim(H - 0.045, 0.05, 0.05, M.cornice); trim(H - 0.1, 0.025, 0.026, M.cornice); }
    return m;
  };
  for (const w of walls) {
    if (w.open) continue;
    const ops = w.openings.slice().sort((p, q) => p.s - q.s);
    const ext = w.axis === 'z' ? TI : 0;
    let cur = w.a;
    for (const o of ops) {
      const oa = o.s - o.w / 2, ob = o.s + o.w / 2;
      box(w.axis, w.c, cur, oa, 0, H, cur === w.a ? ext : 0, 0);
      const bottom = o.bottom || 0, top = o.top;
      if (bottom > 0) box(w.axis, w.c, oa, ob, 0, bottom);
      box(w.axis, w.c, oa, ob, top, H);
      openingDressing(group, M, w, o, oa, ob, bottom, top);
      cur = ob;
    }
    box(w.axis, w.c, cur, w.b, 0, H, cur === w.a ? ext : 0, ext);
  }
  return walls;
}

function openingDressing(group, M, w, o, oa, ob, bottom, top) {
  const len = ob - oa, h = top - bottom;
  const g = new THREE.Group();
  const s = (oa + ob) / 2;
  if (w.axis === 'z') g.position.set(s, 0, w.c); else { g.position.set(w.c, 0, s); g.rotation.y = Math.PI / 2; }
  if (o.type === 'window' || o.type === 'slider') {
    add(g, new THREE.PlaneGeometry(len, h), M.window, 0, bottom + h / 2, 0, { cast: false });
    for (const sx of [-1, 1]) add(g, rb(0.05, h, T + 0.01, 0.005), M.winFrame, sx * (len / 2 - 0.025), bottom + h / 2, 0);
    add(g, rb(len, 0.05, T + 0.01, 0.005), M.winFrame, 0, top - 0.025, 0);
    add(g, rb(len, 0.05, T + 0.04, 0.005), M.winFrame, 0, bottom + 0.025, 0);
    const n = Math.max(1, Math.round(len / 1.0));
    for (let i = 1; i < n; i++) add(g, rb(0.035, h, 0.05, 0.005), M.winFrame, -len / 2 + (len * i) / n, bottom + h / 2, 0);
    // sheer curtains on the room side of exterior windows
    if (w.exterior && bottom < 1.0) {
      const side = w.owners[0].side;
      const inward = side === 'back' || side === 'left' ? 1 : -1;
      const ch = H - 0.16;
      for (const sx of [-1, 1]) {
        const c = F.curtains(M, { w: 0.62, h: ch });
        c.position.set(sx * (len / 2 + 0.2), 0.02, inward * (T / 2 + 0.12));
        g.add(c);
      }
      add(g, new THREE.CylinderGeometry(0.012, 0.012, len + 1.0, 12), M.rod, 0, H - 0.12, inward * (T / 2 + 0.12), { rz: Math.PI / 2, cast: false });
    }
  } else if (o.type === 'door' || o.type === 'entry') {
    const dw = len - 0.04;
    if (o.type === 'entry') g.add(F.door(M, { w: dw, h: top - 0.02 }));
    for (const sx of [-1, 1]) add(g, rb(0.05, top, T + 0.03, 0.005), M.woodDark, sx * (len / 2), top / 2, 0);
    add(g, rb(len + 0.05, 0.05, T + 0.03, 0.005), M.woodDark, 0, top, 0);
  } else if (o.type === 'arch') {
    for (const sx of [-1, 1]) add(g, rb(0.04, top, T + 0.04, 0.005), M.metal, sx * (len / 2), top / 2, 0);
    add(g, rb(len + 0.04, 0.04, T + 0.04, 0.005), M.metal, 0, top, 0);
  }
  group.add(g);
}

// world-scaled UVs so wall textures keep a constant size regardless of wall length
function metricUV(geo) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ax > 0.5) uv.setXY(i, p.getZ(i), p.getY(i));
    else if (ay > 0.5) uv.setXY(i, p.getX(i), p.getZ(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
  return geo;
}

// ———————————————————————————————— Room helpers ————————————————————————————————
function roomFrame(r, walls) {
  // wall descriptors in room-local coords; s is along-wall coordinate centred on room
  const sides = {};
  const map = { back: ['z', r.z], front: ['z', r.z + r.d], left: ['x', r.x], right: ['x', r.x + r.w] };
  for (const [side, [axis, c]] of Object.entries(map)) {
    const ws = walls.filter((w) => w.axis === axis && Math.abs(w.c - c) < 1e-3 && w.b > (axis === 'z' ? r.x : r.z) + 1e-3 && w.a < (axis === 'z' ? r.x + r.w : r.z + r.d) - 1e-3);
    const origin = axis === 'z' ? r.cx : r.cz;
    const len = axis === 'z' ? r.w : r.d;
    const open = [];
    let exterior = false, isOpen = false;
    for (const w of ws) {
      if (w.open) { open.push({ s: (w.a + w.b) / 2 - origin, w: w.b - w.a + 0.3 }); isOpen = true; }
      if (w.exterior) exterior = true;
      for (const o of w.openings) {
        const s = o.s - origin;
        if (Math.abs(s) < len / 2 + o.w / 2) open.push({ s, w: o.w + 0.2, type: o.type, bottom: o.bottom || 0 });
      }
    }
    if (r.row === 'out') { exterior = side !== 'back'; }
    sides[side] = { len, open, exterior, isOpen };
  }
  return sides;
}

// place along wall: s along wall (centred), off = distance from wall face; returns local x,z,ry
function onWall(r, side, s, off) {
  const w = r.w, d = r.d;
  switch (side) {
    case 'back': return { x: s, z: -d / 2 + TI + off, ry: 0 };
    case 'front': return { x: s, z: d / 2 - TI - off, ry: Math.PI };
    case 'left': return { x: -w / 2 + TI + off, z: s, ry: Math.PI / 2 };
    case 'right': return { x: w / 2 - TI - off, z: s, ry: -Math.PI / 2 };
  }
}

function bestSpot(wall, itemW, { lowOK = false, bias = 0 } = {}) {
  const L = wall.len - 2 * TI;
  if (wall.isOpen && wall.open.some((o) => o.w > L * 0.6)) return null;
  let best = null, bestScore = -1e9;
  for (let s = -L / 2 + itemW / 2 + 0.05; s <= L / 2 - itemW / 2 - 0.05 + 1e-6; s += 0.05) {
    const blocked = wall.open.some((o) => (!lowOK || o.bottom < 0.9) && Math.abs(s - o.s) < itemW / 2 + o.w / 2);
    if (blocked) continue;
    const score = -Math.abs(s - bias);
    if (score > bestScore) { bestScore = score; best = s; }
  }
  return best;
}

function put(g, obj, p, extraRy = 0) {
  obj.position.set(p.x, p.y || 0, p.z);
  obj.rotation.y = p.ry + extraRy;
  g.add(obj);
  return obj;
}

function accentPanel(g, r, side, s, len, M, mat) {
  const p = onWall(r, side, s, 0.004);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, H - 0.02), mat || M.accentWallMat);
  m.position.set(p.x, H / 2, p.z); m.rotation.y = p.ry; m.receiveShadow = true;
  g.add(m);
  if (M.S.moulding) {
    const n = Math.max(1, Math.round(len / 1.2));
    const pw = len / n;
    for (let i = 0; i < n; i++) {
      const cx = s - len / 2 + pw * (i + 0.5);
      for (const [y0, y1] of [[0.2, 0.9], [1.1, 2.55]]) {
        const fg = new THREE.Group();
        const q = onWall(r, side, cx, 0.015);
        fg.position.set(q.x, 0, q.z); fg.rotation.y = q.ry;
        const iw = pw - 0.22;
        add(fg, rb(iw, 0.03, 0.025, 0.006), M.wall, 0, y0, 0, { cast: false });
        add(fg, rb(iw, 0.03, 0.025, 0.006), M.wall, 0, y1, 0, { cast: false });
        add(fg, rb(0.03, y1 - y0, 0.025, 0.006), M.wall, -iw / 2, (y0 + y1) / 2, 0, { cast: false });
        add(fg, rb(0.03, y1 - y0, 0.025, 0.006), M.wall, iw / 2, (y0 + y1) / 2, 0, { cast: false });
        g.add(fg);
      }
    }
  }
}

function hs(list, obj, title, text, opts = {}) { list.push({ obj, title, text, ...opts }); }

// ———————————————————————————————— Room furnishers ————————————————————————————————
function furnishLiving(g, r, W, M, out, seed) {
  const S = M.S;
  // TV wall: prefer a solid side wall
  const cands = ['left', 'right', 'back'].map((side) => ({ side, s: bestSpot(W[side], 3.0) })).filter((c) => c.s !== null);
  cands.sort((a, b) => (W[b.side].exterior - W[a.side].exterior) || (a.side === 'back') - (b.side === 'back'));
  const tv = cands[0] || { side: 'back', s: 0 };
  const across = tv.side === 'back' ? r.d : r.w;
  const tvP = onWall(r, tv.side, tv.s, 0);
  const tvU = put(g, F.tvUnit(M, { w: 2.4, panel: S.panel, wallH: H - 0.05 }), tvP);
  hs(out.hotspots, tvU, S.panel === 'fluted' ? 'Fluted media wall' : S.panel === 'jaali' ? 'Carved jaali media wall' : 'Statement media wall', 'Handle-less storage with concealed wiring — clean lines, no clutter.');
  const sofaDist = Math.min(3.3, across - T - 0.6);
  const sP = onWall(r, tv.side, tv.s, sofaDist);
  const sofa = put(g, F.sofa(M, { w: 2.5, chaise: S.chaise, rolled: S.rolled }), sP, Math.PI);
  out.hero = sofa; out.heroName = 'Sofa';
  hs(out.hotspots, sofa, `Bespoke ${S.chaise ? 'L-shaped ' : ''}sofa`, `Upholstered in ${S.fabricName} — scratch-resistant and pet-friendly for everyday paws and play.`, { swatch: 'fabric' });
  const ctP = onWall(r, tv.side, tv.s, sofaDist - 1.25);
  const ct = put(g, F.coffeeTable(M, { round: seed % 2 === 0 }), ctP);
  hs(out.hotspots, ct, 'Marble coffee table', 'Softened edges and stable bases — senior-safe comfort built into every corner.');
  const rgP = onWall(r, tv.side, tv.s, sofaDist - 1.1);
  put(g, F.rug(M, { w: 3.0, d: 2.3, seed }), rgP);
  // armchairs flank the coffee table
  const tangentSign = tv.s > 0 ? -1 : 1;
  for (const k of [1]) {
    const aP = onWall(r, tv.side, tv.s + tangentSign * 1.65 * k, sofaDist - 1.25);
    const ac = put(g, F.armchair(M, { barrel: seed % 3 === 0 }), aP);
    ac.rotation.y = Math.atan2(ctP.x - aP.x, ctP.z - aP.z);
    if (k === 1) hs(out.hotspots, ac, 'Accent lounge chair', `Contrast upholstery in ${S.fabric2 ? 'a deeper tone' : 'tone'} to anchor the conversation zone.`, { swatch: 'fabric2' });
  }
  const lampP = onWall(r, tv.side, tv.s - tangentSign * 1.6, sofaDist + 0.15);
  const lamp = put(g, F.floorLamp(M, { arc: true }), lampP);
  const tgt = new THREE.Vector3(sP.x - lampP.x, 0, sP.z - lampP.z);
  lamp.rotation.y = Math.atan2(tgt.x, tgt.z) - Math.PI / 4;
  out.lamps.push(lamp);
  hs(out.hotspots, lamp, 'Arc floor lamp', 'Layered lighting that tunes into your day — from morning light to evening calm.');
  // plants & art
  put(g, F.plant(M, { h: 1.5, seed }), { x: r.w / 2 - 0.5, z: r.d / 2 - 0.5, ry: 0 });
  const artSide = tv.side === 'back' ? (W.left.exterior ? 'right' : 'left') : 'back';
  const as = bestSpot(W[artSide], 1.4, { lowOK: false });
  if (as !== null) {
    const p = onWall(r, artSide, as, 0); p.y = 1.6;
    put(g, F.art(M, { w: 0.9, h: 1.1, seed: seed + 1 }), p);
    const sbP = onWall(r, artSide, as, 0.25);
    if (W[artSide].len > 3.2 && artSide === 'back') put(g, F.sideboard(M, { w: 1.6 }), sbP);
    if (M.S.moulding || W[artSide].len > 3) accentPanel(g, r, artSide, as, Math.min(2.4, W[artSide].len - 0.6), M);
  }
  out.walk = walkFrom(r, tv.side, tv.s, 0.6);
}

function furnishDining(g, r, W, M, out, seed) {
  const S = M.S;
  const along = r.d > r.w ? 'z' : 'x';
  const table = F.diningTable(M, { w: 2.0, d: 0.95, round: S.moulding && r.w < 3 });
  const ry = along === 'z' ? Math.PI / 2 : 0;
  const tz = 0.1;
  put(g, table, { x: 0, z: tz, ry });
  hs(out.hotspots, table, 'Six-seater dining', 'Proportions that gather the whole family — family-first design at the heart of the home.');
  out.hero = table; out.heroName = 'Dining set';
  const chairs = new THREE.Group();
  for (const s of [-1, 1]) for (const k of [-0.62, 0, 0.62]) {
    const c = F.diningChair(M, { fabric: M.fabric });
    if (along === 'x') put(chairs, c, { x: k, z: tz + s * 0.62, ry: s > 0 ? Math.PI : 0 });
    else put(chairs, c, { x: s * 0.62, z: tz + k, ry: s > 0 ? -Math.PI / 2 : Math.PI / 2 });
  }
  g.add(chairs);
  table.userData.extra = chairs;
  const pend = put(g, S.chandelier ? F.chandelier(M, { ceiling: H }) : F.linearPendant(M, { ceiling: H, w: 1.4 }), { x: 0, z: tz, ry });
  out.lamps.push(pend);
  hs(out.hotspots, pend, S.chandelier ? 'Crystal-tone chandelier' : 'Linear pendant', 'Dimmable warm-white lighting over the table for long dinners.');
  const sideW = bestSpot(W.back, 1.8) !== null ? 'back' : bestSpot(W.right, 1.8) !== null ? 'right' : 'left';
  const ss = bestSpot(W[sideW], 1.8);
  if (ss !== null) {
    const glass = seed % 2 === 1;
    const sb = put(g, F.sideboard(M, { w: 1.6, glass }), onWall(r, sideW, ss, 0.23));
    hs(out.hotspots, sb, glass ? 'Backlit crockery unit' : 'Buffet sideboard', glass ? 'Fluted glass shutters with warm internal lighting to display your finest.' : 'Soft-close drawers for serveware, with a styled top for décor.');
    if (!glass) { const p = onWall(r, sideW, ss, 0); p.y = 1.65; put(g, S.moulding ? F.mirror(M, { r: 0.5 }) : F.art(M, { w: 1.2, h: 0.8, seed: seed + 7 }), p); }
    accentPanel(g, r, sideW, ss, Math.min(2.6, W[sideW].len - 0.4), M);
  }
  put(g, F.plant(M, { h: 1.2, seed: seed + 2, pot: 0.18 }), { x: -r.w / 2 + 0.45, z: r.d / 2 - 0.45, ry: 0 });
  out.walk = { pos: new THREE.Vector3(r.w * 0.3, 1.6, r.d / 2 - 0.6), look: new THREE.Vector3(-r.w * 0.2, 1.0, -r.d * 0.25) };
}

function furnishBedroom(g, r, W, M, out, seed) {
  const S = M.S;
  const v = r.variant;
  const bw = v === 'master' ? 1.95 : v === 'kids' ? 1.35 : 1.75;
  const order = W.back.exterior ? ['back', 'left', 'right'] : ['back', 'right', 'left'];
  let side = null, s = null;
  for (const sd of order) { const sp = bestSpot(W[sd], bw + 1.3, { lowOK: true }); if (sp !== null && W[sd].len >= bw + 1.3) { side = sd; s = sp; break; } }
  if (side === null) { side = 'back'; s = 0; }
  const bp = onWall(r, side, s, 1.1);
  const bed = put(g, F.bed(M, { w: bw, head: v === 'kids' ? 'channel' : S.head, fabric: v === 'kids' ? M.white : undefined }), bp);
  out.hero = bed; out.heroName = 'Bed';
  hs(out.hotspots, bed, v === 'master' ? 'King bed with upholstered headboard' : v === 'kids' ? 'Kids’ bed with storage' : 'Queen bed', 'Hydraulic under-bed storage and soft headboard — built around how you rest.', { swatch: 'fabric2' });
  accentPanel(g, r, side, s, Math.min(bw + 1.6, W[side].len - 0.3), M);
  for (const k of [-1, 1]) {
    const np = onWall(r, side, s + k * (bw / 2 + 0.33), 0.2);
    put(g, F.nightstand(M), np);
    if (v === 'master' && !S.moulding) { const pp = onWall(r, side, s + k * (bw / 2 + 0.33), 0.2); const pd = put(g, F.pendant(M, { kind: 'globe', drop: 1.35, ceiling: H }), pp); out.lamps.push(pd); }
    else { const tl = put(g, F.tableLamp(M, { h: 0.5 }), { ...np, y: 0.54 }); out.lamps.push(tl); }
  }
  put(g, F.rug(M, { w: bw + 1.0, d: 2.0, seed: seed + 3, kind: S.rug[0] === 'persian' ? 'border' : S.rug[0] }), onWall(r, side, s, 1.75));
  if (v !== 'kids') put(g, F.bench(M, { w: bw - 0.4 }), onWall(r, side, s, 2.48));
  // wardrobe on a different wall
  const wsides = ['left', 'right', 'front', 'back'].filter((x) => x !== side);
  for (const ws of wsides) {
    const ww = Math.min(2.4, W[ws].len - 1.4);
    if (ww < 1.2) continue;
    const sp = bestSpot(W[ws], ww);
    if (sp === null) continue;
    // must not collide with bed footprint
    const p = onWall(r, ws, sp, 0.31);
    const dx = Math.abs(p.x - bp.x), dz = Math.abs(p.z - bp.z);
    if (dx < bw / 2 + 0.6 + 0.5 && dz < 1.2 + 0.4) continue;
    const wd = put(g, F.wardrobe(M, { w: ww, glass: v === 'master' }), p);
    hs(out.hotspots, wd, 'Floor-to-ceiling wardrobe', 'Soft-close hinges, profile handles and smart internals — backed by a 10+ year warranty.');
    break;
  }
  if (v === 'kids') {
    const ds = ['left', 'right', 'front'].find((x) => x !== side && bestSpot(W[x], 1.3) !== null);
    if (ds) { const p = onWall(r, ds, bestSpot(W[ds], 1.3), 0.33); const dk = put(g, F.desk(M, { w: 1.2 }), p); put(g, F.officeChair(M), onWall(r, ds, bestSpot(W[ds], 1.3) - 0.1, 0.95), Math.PI); hs(out.hotspots, dk, 'Study nook', 'A compact desk that grows with your child.'); }
  } else {
    const c = put(g, F.armchair(M, { barrel: true }), { x: r.w / 2 - 0.65, z: r.d / 2 - 0.7, ry: -Math.PI * 0.75 });
    if (r.w > 3.6) { const fl = put(g, F.floorLamp(M, { arc: false }), { x: r.w / 2 - 0.35, z: r.d / 2 - 1.3, ry: 0 }); out.lamps.push(fl); }
    void c;
  }
  put(g, F.plant(M, { h: 1.0, seed: seed + 5, pot: 0.16 }), { x: -r.w / 2 + 0.4, z: r.d / 2 - 0.4, ry: 0 });
  out.walk = walkFrom(r, side, s, 1.0);
}

function furnishKitchen(g, r, W, M, out, seed) {
  // L-shape: back wall run + one side run
  const backLen = r.w - T - 0.05;
  const run = put(g, F.kitchenRun(M, { len: backLen, sink: true, hob: false, uppers: false }), onWall(r, 'back', 0, 0.3));
  hs(out.hotspots, run, 'Modular L-shaped kitchen', 'Quartz counters, anti-fingerprint shutters and a sink set under natural light.');
  const side = W.left.open.length <= W.right.open.length ? 'left' : 'right';
  const sideLen = Math.min(r.d - 0.6 - 0.1 - 1.0, 2.6);
  if (sideLen > 1.2) {
    const s0 = -r.d / 2 + 0.6 + TI + sideLen / 2;
    const sr = put(g, F.kitchenRun(M, { len: sideLen, hob: true, uppers: true }), onWall(r, side, s0, 0.3));
    hs(out.hotspots, sr, 'Hob & chimney run', 'Auto-clean chimney, built-in hob and full-height uppers for everyday Indian cooking.');
    const tp = onWall(r, side, -r.d / 2 + 0.6 + TI + sideLen + 0.46, 0.31);
    if (tp && Math.abs(-r.d / 2 + 0.6 + sideLen + 0.9) < r.d / 2) put(g, F.tallUnit(M), tp);
  }
  if (r.w >= 3.0 && r.d >= 3.8) {
    const isl = put(g, F.island(M, { w: Math.min(2.0, r.w - 1.6) }), { x: side === 'left' ? 0.45 : -0.45, z: 0.35, ry: 0 });
    out.hero = isl; out.heroName = 'Kitchen island';
    hs(out.hotspots, isl, 'Breakfast island', 'Waterfall-edge counter with seating for three — the kitchen as a social space.');
    for (const k of [-0.55, 0.55]) { const pd = put(g, F.pendant(M, { kind: 'dome', drop: 1.0, ceiling: H }), { x: (side === 'left' ? 0.45 : -0.45) + k, z: 0.35, ry: 0 }); out.lamps.push(pd); }
  } else { out.hero = run; out.heroName = 'Kitchen run'; }
  out.walk = { pos: new THREE.Vector3(0.2, 1.6, r.d / 2 - 0.4), look: new THREE.Vector3(-0.2, 1.0, -r.d / 2) };
}

function furnishStudy(g, r, W, M, out, seed) {
  const side = ['back', 'left', 'right'].find((x) => bestSpot(W[x], 1.6, { lowOK: true }) !== null) || 'back';
  const s = bestSpot(W[side], 1.6, { lowOK: true }) ?? 0;
  const dk = put(g, F.desk(M, { w: 1.5 }), onWall(r, side, s, 0.33));
  out.hero = dk; out.heroName = 'Study desk';
  hs(out.hotspots, dk, 'Work-from-home desk', 'Cable-managed desktop with drawers — a focused corner within the home.');
  put(g, F.officeChair(M), onWall(r, side, s - 0.1, 0.95), Math.PI);
  const os = ['left', 'right', 'front'].filter((x) => x !== side).find((x) => bestSpot(W[x], 1.6) !== null);
  if (os) { const bs = put(g, F.bookshelf(M, { w: 1.6, seed }), onWall(r, os, bestSpot(W[os], 1.6), 0.17)); hs(out.hotspots, bs, 'Library wall', 'Open shelving styled with books and keepsakes.'); }
  const p = onWall(r, side, s, 0); p.y = 1.55;
  put(g, F.art(M, { w: 1.1, h: 0.7, seed: seed + 11 }), p);
  put(g, F.armchair(M, { barrel: true }), { x: r.w / 2 - 0.6, z: r.d / 2 - 0.6, ry: -Math.PI * 0.75 });
  put(g, F.rug(M, { w: 1.8, d: 1.4, seed: seed + 4, kind: 'plain' }), { x: 0, z: 0.2, ry: 0 });
  out.walk = { pos: new THREE.Vector3(r.w * 0.25, 1.6, r.d / 2 - 0.4), look: new THREE.Vector3(-r.w * 0.1, 1.0, -r.d / 2) };
}

function furnishFoyer(g, r, W, M, out, seed) {
  const pjSide = ['back', 'left', 'right'].find((x) => !W[x].isOpen && bestSpot(W[x], 1.1) !== null) || 'back';
  const pj = put(g, F.poojaUnit(M), onWall(r, pjSide, bestSpot(W[pjSide], 1.1) ?? 0, 0.23));
  hs(out.hotspots, pj, 'Jaali pooja unit', 'CNC-carved jaali shutters with a warm backlit glow and a brass diya ledge.');
  out.lamps.push(pj);
  const cSide = ['left', 'right', 'back'].find((x) => x !== pjSide && !W[x].isOpen && bestSpot(W[x], 1.3) !== null);
  if (cSide) {
    const s = bestSpot(W[cSide], 1.3);
    const ct = put(g, F.consoleTable(M), onWall(r, cSide, s, 0.2));
    const mp = onWall(r, cSide, s, 0); mp.y = 1.55; put(g, F.mirror(M, { r: 0.42 }), mp);
    out.hero = ct; out.heroName = 'Console';
    hs(out.hotspots, ct, 'Console & round mirror', 'A first impression in marble and brass — keys, mail and a moment to pause.');
  }
  const shSide = ['left', 'right'].find((x) => x !== cSide && x !== pjSide && bestSpot(W[x], 1.2) !== null);
  if (shSide) { const sc = put(g, F.shoeCabinet(M, { w: 1.2 }), onWall(r, shSide, bestSpot(W[shSide], 1.2), 0.19)); hs(out.hotspots, sc, 'Fluted shoe cabinet', 'Ventilated fluted shutters that keep the entrance clutter-free.'); }
  if (!out.hero) out.hero = pj, out.heroName = 'Pooja unit';
  put(g, F.rug(M, { w: 1.4, d: 1.0, seed: seed + 6, kind: 'border' }), { x: 0, z: r.d / 2 - 0.9, ry: 0 });
  out.walk = { pos: new THREE.Vector3(0, 1.6, r.d / 2 - 0.3), look: new THREE.Vector3(0, 1.2, -r.d / 2) };
}

function furnishBalcony(g, r, W, M, out, seed) {
  for (const [side, len] of [['front', r.w], ['left', r.d], ['right', r.d]]) {
    const p = onWall(r, side, 0, -TI + 0.03);
    put(g, F.railing(M, { len: len - 0.02 }), p);
  }
  const sw = put(g, F.swing(M, { ceiling: H }), { x: r.w / 2 - 0.95, z: 0.05, ry: -Math.PI / 2 });
  out.hero = sw; out.heroName = 'Jhoola swing';
  hs(out.hotspots, sw, 'Balcony jhoola', 'Weather-safe teak swing — an outdoor pause woven into daily rhythms.');
  put(g, F.lounge(M), { x: -r.w / 2 + 0.75, z: 0.1, ry: Math.PI / 5 });
  put(g, F.sideTable(M), { x: -r.w / 2 + 1.45, z: -0.1, ry: 0 });
  for (let i = 0; i < 3; i++) put(g, F.plant(M, { h: 0.7 + (i % 2) * 0.5, seed: seed + i, pot: 0.18 }), { x: -0.6 + i * 0.55, z: r.d / 2 - 0.35, ry: 0 });
  out.walk = { pos: new THREE.Vector3(-r.w * 0.3, 1.6, -r.d / 2 + 0.2), look: new THREE.Vector3(r.w * 0.3, 1.0, r.d / 2) };
}

function furnishUtility(g, r, W, M, out) {
  const side = W.left.exterior ? 'left' : 'right';
  const wa = put(g, F.washer(M), onWall(r, side, -r.d / 2 + 0.45 + TI, 0.32));
  out.hero = wa; out.heroName = 'Laundry stack';
  hs(out.hotspots, wa, 'Stacked laundry', 'Washer-dryer stack with a tall utility cabinet — chores, neatly tucked away.');
  const run = put(g, F.kitchenRun(M, { len: Math.min(r.w - 0.9, 1.4), sink: true, uppers: true }), onWall(r, 'back', (side === 'left' ? 0.35 : -0.35), 0.3));
  void run;
  const rk = put(g, F.dryingRack(M, { w: 1.0 }), { x: 0, z: 0.4, ry: 0, y: 2.3 });
  rk.position.y = 2.3;
}

function walkFrom(r, side, s0, lookOff = 0.9) {
  // stand near the opposite wall, slightly off-axis, looking back at the feature wall
  const across = side === 'back' || side === 'front' ? r.d : r.w;
  const along = side === 'back' || side === 'front' ? r.w : r.d;
  const lat = Math.min(0.9, along / 2 - 0.55) * (s0 > 0 ? -1 : 1);
  const p = onWall(r, side, THREE.MathUtils.clamp(s0 + lat, -along / 2 + 0.5, along / 2 - 0.5), across - T - 0.45);
  const l = onWall(r, side, s0, lookOff);
  return { pos: new THREE.Vector3(p.x, 1.6, p.z), look: new THREE.Vector3(l.x, 1.0, l.z) };
}

const FURNISH = { living: furnishLiving, dining: furnishDining, bedroom: furnishBedroom, kitchen: furnishKitchen, study: furnishStudy, foyer: furnishFoyer, balcony: furnishBalcony, utility: furnishUtility };

// ———————————————————————————————— Build ————————————————————————————————
export function buildApartment(project, { lights = true } = {}) {
  const M = makeMaterials(project.style);
  const plan = makePlan(project);
  const group = new THREE.Group();
  group.name = 'apartment';
  const wallGroup = new THREE.Group(); wallGroup.name = 'walls';
  group.add(wallGroup);
  const walls = buildWalls(plan, M, wallGroup);
  const seedBase = project.id || 7;
  const rooms = [];
  const pointLights = [];
  for (const [i, r] of plan.rooms.entries()) {
    const g = new THREE.Group();
    g.position.set(r.cx, 0, r.cz);
    g.name = 'room:' + r.id;
    group.add(g);
    // floor slab
    const fm = r.type === 'kitchen' ? M.kitchenFloor : r.type === 'balcony' ? M.deck : r.type === 'utility' ? M.utilFloor : M.floor;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.1, r.d), fm);
    floor.position.y = -0.05; floor.receiveShadow = true; floor.name = 'floor';
    floor.userData.roomId = r.id;
    // world-space uv so textures flow continuously
    const uv = floor.geometry.attributes.uv, pos = floor.geometry.attributes.position;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (pos.getX(k) + r.cx) , (pos.getZ(k) + r.cz));
    g.add(floor);
    // skirting + ceiling (ceiling faces down only → invisible from above, so the dollhouse reads naturally)
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(r.w, r.d), M.ceiling);
    ceil.rotation.x = Math.PI / 2; ceil.position.y = H; ceil.receiveShadow = false; ceil.name = 'ceiling';
    g.add(ceil);
    if (r.type !== 'balcony' && r.type !== 'utility') {
      for (const [sx, sz, w, d] of [[0, -r.d / 2 + 0.35, r.w - 0.7, 0.04], [0, r.d / 2 - 0.35, r.w - 0.7, 0.04], [-r.w / 2 + 0.35, 0, 0.04, r.d - 0.7], [r.w / 2 - 0.35, 0, 0.04, r.d - 0.7]]) {
        const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.cove);
        c.rotation.x = Math.PI / 2; c.position.set(sx, H - 0.01, sz); g.add(c);
      }
    }
    const W = roomFrame(r, walls);
    const out = { hotspots: [], lamps: [], hero: null, heroName: '', walk: null };
    try { FURNISH[r.type](g, r, W, M, out, seedBase + i * 13); } catch (e) { console.warn('furnish failed', r.type, e); }
    if (!out.walk) out.walk = { pos: new THREE.Vector3(0, 1.6, r.d / 2 - 0.5), look: new THREE.Vector3(0, 1.1, -r.d / 2) };
    // to world
    out.walk.pos.add(g.position); out.walk.look.add(g.position);
    if (lights && r.type !== 'balcony') {
      const pl = new THREE.PointLight('#ffd6a3', 0, Math.max(r.w, r.d) * 1.6, 1.6);
      pl.position.set(r.cx, H - 0.35, r.cz);
      group.add(pl); pointLights.push(pl);
    }
    for (const h of out.hotspots) h.room = r.id;
    rooms.push({ ...r, group: g, hotspots: out.hotspots, hero: out.hero, heroName: out.heroName, walk: out.walk, lamps: out.lamps });
  }
  // ground under balcony + plinth edge
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(plan.W + 0.3, 0.25, plan.Dmain + 0.3), M.cap);
  plinth.position.set(0, -0.225, 0);
  plinth.receiveShadow = true;
  group.add(plinth);
  group.traverse((o) => { if (o.isMesh && o.material && o.material.transparent) o.castShadow = false; });
  return { group, plan, rooms, M, pointLights, walls };
}

// Export a single furniture piece (e.g. sofa) as a standalone object for AR
export function cloneForAR(obj) {
  const g = new THREE.Group();
  const c = obj.clone(true);
  c.position.set(0, 0, 0); c.rotation.set(0, 0, 0);
  g.add(c);
  if (obj.userData.extra) { const e = obj.userData.extra.clone(true); e.position.sub(obj.position); g.add(e); }
  return g;
}
