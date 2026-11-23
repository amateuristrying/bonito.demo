// Procedural canvas textures — no external image loads, so every room renders instantly.
import * as THREE from 'three';

const cache = new Map();

export function rng(seed = 1) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 1000003) / 1000003;
  };
}

function cvs(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

export function tint(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return '#' + c.getHexString();
}

function finish(canvas, { repeat = [1, 1], key, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (key) cache.set(key, t);
  return t;
}

function cached(key, make) {
  if (cache.has(key)) return cache.get(key);
  const t = make();
  cache.set(key, t);
  return t;
}

// Wood planks (straight) — 1 texture tile = 2m x 2m
export function woodTex(base, seed = 3) {
  return cached('wood' + base + seed, () => {
    const [c, g] = cvs(1024);
    const r = rng(seed);
    const rows = 8, rh = 1024 / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 400;
      while (x < 1024) {
        const len = 260 + r() * 300;
        g.fillStyle = tint(base, (r() - 0.5) * 0.08);
        g.fillRect(x, i * rh, len, rh);
        // grain
        g.globalAlpha = 0.09;
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = r() > 0.5 ? tint(base, -0.18) : tint(base, 0.1);
          g.lineWidth = 0.6 + r() * 1.4;
          g.beginPath();
          const y0 = i * rh + r() * rh;
          g.moveTo(x, y0);
          for (let s = 0; s <= 8; s++) g.lineTo(x + (len * s) / 8, y0 + Math.sin(s * 0.9 + k) * (2 + r() * 3));
          g.stroke();
        }
        g.globalAlpha = 1;
        g.fillStyle = tint(base, -0.22);
        g.fillRect(x, i * rh, 2, rh);
        x += len;
      }
      g.fillStyle = tint(base, -0.25);
      g.fillRect(0, i * rh, 1024, 2);
    }
    return finish(c);
  });
}

// Herringbone / chevron parquet
export function herringTex(base, seed = 5) {
  return cached('herr' + base + seed, () => {
    const [c, g] = cvs(1024);
    const r = rng(seed);
    const cw = 128, ph = 48;
    for (let col = 0; col < 1024 / cw; col++) {
      const dir = col % 2 ? 1 : -1;
      for (let y = -cw; y < 1024 + cw; y += ph) {
        g.save();
        g.beginPath();
        const x0 = col * cw;
        g.moveTo(x0, y);
        g.lineTo(x0 + cw, y + dir * cw * 0.5);
        g.lineTo(x0 + cw, y + dir * cw * 0.5 + ph);
        g.lineTo(x0, y + ph);
        g.closePath();
        g.fillStyle = tint(base, (r() - 0.5) * 0.1);
        g.fill();
        g.strokeStyle = tint(base, -0.22);
        g.lineWidth = 1.5;
        g.stroke();
        g.restore();
      }
    }
    return finish(c);
  });
}

// Marble / stone with veins (optionally with tile grout)
export function marbleTex(base, vein, { grout = 0, seed = 7 } = {}) {
  return cached('marble' + base + vein + grout + seed, () => {
    const [c, g] = cvs(1024);
    const r = rng(seed);
    const grd = g.createLinearGradient(0, 0, 1024, 1024);
    grd.addColorStop(0, tint(base, 0.02));
    grd.addColorStop(1, tint(base, -0.03));
    g.fillStyle = grd;
    g.fillRect(0, 0, 1024, 1024);
    for (let pass = 0; pass < 2; pass++) {
      g.filter = pass === 0 ? 'blur(6px)' : 'blur(0.6px)';
      for (let i = 0; i < (pass ? 26 : 10); i++) {
        g.strokeStyle = vein;
        g.globalAlpha = pass ? 0.06 + r() * 0.2 : 0.1;
        g.lineWidth = pass ? 0.6 + r() * 1.8 : 10 + r() * 16;
        let x = r() * 1024, y = r() * 1024;
        const a = r() * Math.PI * 2;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 40; s++) {
          x += Math.cos(a + (r() - 0.5) * 1.6) * 26;
          y += Math.sin(a + (r() - 0.5) * 1.6) * 26;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    g.filter = 'none';
    g.globalAlpha = 1;
    if (grout) {
      g.fillStyle = tint(base, -0.12);
      for (let i = 0; i < grout; i++) {
        g.fillRect((i * 1024) / grout, 0, 2, 1024);
        g.fillRect(0, (i * 1024) / grout, 1024, 2);
      }
    }
    return finish(c);
  });
}

export function tileTex(base, { cols = 2, rows = 2, grout, seed = 2 } = {}) {
  return cached('tile' + base + cols + rows + seed, () => {
    const [c, g] = cvs(512);
    const r = rng(seed);
    const w = 512 / cols, h = 512 / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      g.fillStyle = tint(base, (r() - 0.5) * 0.04);
      g.fillRect(i * w, j * h, w, h);
    }
    g.fillStyle = grout || tint(base, -0.14);
    for (let i = 0; i <= cols; i++) g.fillRect(i * w - 1.5, 0, 3, 512);
    for (let j = 0; j <= rows; j++) g.fillRect(0, j * h - 1.5, 512, 3);
    return finish(c);
  });
}

// Subtle woven noise — used as bumpMap for fabric/plaster
export function noiseTex(scale = 1) {
  return cached('noise' + scale, () => {
    const [c, g] = cvs(256);
    const img = g.createImageData(256, 256);
    const r = rng(11);
    for (let i = 0; i < img.data.length; i += 4) {
      const p = i / 4, x = p % 256, y = (p / 256) | 0;
      const v = 128 + (r() - 0.5) * 90 + Math.sin(x * 1.6) * 14 + Math.sin(y * 1.6) * 14;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return finish(c, { repeat: [scale, scale], srgb: false });
  });
}

export function rugTex(kind, c1, c2, c3 = '#ffffff', seed = 4) {
  return cached('rug' + kind + c1 + c2 + c3 + seed, () => {
    const [c, g] = cvs(1024, 768);
    const r = rng(seed);
    g.fillStyle = c1;
    g.fillRect(0, 0, 1024, 768);
    if (kind === 'border' || kind === 'plain') {
      g.strokeStyle = c2; g.lineWidth = kind === 'plain' ? 10 : 26;
      g.strokeRect(40, 40, 944, 688);
      if (kind === 'border') { g.lineWidth = 6; g.strokeRect(90, 90, 844, 588); }
    } else if (kind === 'geo') {
      g.globalAlpha = 0.85;
      for (let i = 0; i < 7; i++) {
        g.fillStyle = [c2, c3, tint(c1, -0.1)][i % 3];
        g.beginPath();
        g.arc(r() * 1024, r() * 768, 80 + r() * 260, r() * 6, r() * 6 + 2.4);
        g.lineTo(512, 384);
        g.fill();
      }
      g.globalAlpha = 1;
    } else if (kind === 'stripe') {
      for (let x = 0; x < 1024; x += 64) { g.fillStyle = (x / 64) % 2 ? c2 : c1; g.fillRect(x, 0, 32, 768); }
    } else if (kind === 'persian') {
      g.strokeStyle = c2; g.lineWidth = 34; g.strokeRect(30, 30, 964, 708);
      g.strokeStyle = c3; g.lineWidth = 6; g.strokeRect(70, 70, 884, 628);
      g.save(); g.translate(512, 384);
      for (let k = 6; k > 0; k--) {
        g.fillStyle = k % 2 ? c2 : c3;
        g.beginPath();
        g.moveTo(0, -k * 50); g.lineTo(k * 80, 0); g.lineTo(0, k * 50); g.lineTo(-k * 80, 0);
        g.closePath(); g.globalAlpha = 0.55; g.fill();
      }
      g.restore(); g.globalAlpha = 1;
      for (let i = 0; i < 70; i++) {
        g.fillStyle = r() > 0.5 ? c2 : c3;
        g.globalAlpha = 0.5;
        g.beginPath(); g.arc(110 + r() * 804, 110 + r() * 548, 4 + r() * 8, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }
    // pile noise
    g.globalAlpha = 0.06;
    for (let i = 0; i < 6000; i++) { g.fillStyle = r() > 0.5 ? '#000' : '#fff'; g.fillRect(r() * 1024, r() * 768, 2, 2); }
    g.globalAlpha = 1;
    return finish(c);
  });
}

// Abstract artwork — the Bonito/illoca shape language
export function artTex(palette, seed = 1) {
  return cached('art' + palette.join() + seed, () => {
    const [c, g] = cvs(512, 640);
    const r = rng(seed);
    g.fillStyle = palette[3] || '#f3ede3';
    g.fillRect(0, 0, 512, 640);
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      g.fillStyle = palette[i % 3];
      g.globalAlpha = 0.9;
      const t = r();
      if (t < 0.4) { g.beginPath(); g.arc(80 + r() * 350, 100 + r() * 440, 50 + r() * 120, 0, Math.PI * (1 + r())); g.fill(); }
      else if (t < 0.7) g.fillRect(40 + r() * 300, 40 + r() * 400, 80 + r() * 200, 60 + r() * 220);
      else { g.strokeStyle = palette[i % 3]; g.lineWidth = 6 + r() * 10; g.beginPath(); g.moveTo(r() * 512, r() * 640); g.bezierCurveTo(r() * 512, r() * 640, r() * 512, r() * 640, r() * 512, r() * 640); g.stroke(); }
    }
    g.globalAlpha = 1;
    return finish(c);
  });
}

export function jaaliTex() {
  return cached('jaali', () => {
    const [c, g] = cvs(256);
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#000';
    const s = 64;
    for (let x = 0; x < 256; x += s) for (let y = 0; y < 256; y += s) {
      for (const [dx, dy] of [[0.5, 0.25], [0.75, 0.5], [0.5, 0.75], [0.25, 0.5]]) {
        g.beginPath(); g.arc(x + dx * s, y + dy * s, s * 0.17, 0, 7); g.fill();
      }
    }
    return finish(c, { repeat: [3, 5], srgb: false });
  });
}

export function skyTex(top = '#bcd3df', bottom = '#f4ead7') {
  return cached('sky' + top + bottom, () => {
    const [c, g] = cvs(64, 256);
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, top); grd.addColorStop(1, bottom);
    g.fillStyle = grd; g.fillRect(0, 0, 64, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// soft radial blob used for fake contact shadows + floor glow
export function blobTex() {
  return cached('blob', () => {
    const [c, g] = cvs(128);
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    return t;
  });
}

// ——— Premium detail maps ———
// Fine plaster for walls/ceilings (used as a bump map)
export function plasterTex() {
  return cached('plaster', () => {
    const [c, g] = cvs(512);
    g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
    const r = rng(17);
    // each layer is drawn sharp on its own canvas, then blurred ONCE when composited
    for (const [n, size, a, blur] of [[700, 40, 0.06, 12], [4000, 6, 0.08, 2], [12000, 1.6, 0.1, 0]]) {
      const [lc, lg] = cvs(512);
      for (let i = 0; i < n; i++) {
        lg.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
        lg.beginPath(); lg.arc(r() * 512, r() * 512, size * (0.5 + r()), 0, 7); lg.fill();
      }
      g.filter = blur ? `blur(${blur}px)` : 'none';
      g.drawImage(lc, 0, 0);
    }
    g.filter = 'none';
    return finish(c, { repeat: [2, 2], srgb: false });
  });
}

// Bouclé / woven upholstery (bump + subtle colour variation)
export function boucleTex() {
  return cached('boucle', () => {
    const [c, g] = cvs(512);
    g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, 512, 512);
    const r = rng(23);
    for (let i = 0; i < 9000; i++) {
      const x = r() * 512, y = r() * 512, s = 1.5 + r() * 3.2;
      g.strokeStyle = r() > 0.4 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)';
      g.lineWidth = 0.8 + r();
      g.beginPath(); g.arc(x, y, s, r() * 6, r() * 6 + 4.5); g.stroke();
    }
    // weave rows
    g.globalAlpha = 0.12;
    for (let y = 0; y < 512; y += 4) { g.fillStyle = (y / 4) % 2 ? '#fff' : '#000'; g.fillRect(0, y, 512, 2); }
    g.globalAlpha = 1;
    return finish(c, { repeat: [3, 3], srgb: false });
  });
}

// Continuous wood grain (veneer, no plank joints) for furniture
export function grainTex(base, seed = 31) {
  return cached('grain' + base + seed, () => {
    const [c, g] = cvs(1024);
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, 1024, 1024);
    for (let k = 0; k < 220; k++) {
      const y0 = r() * 1024;
      g.strokeStyle = r() > 0.55 ? tint(base, -0.12 - r() * 0.1) : tint(base, 0.06);
      g.globalAlpha = 0.08 + r() * 0.22;
      g.lineWidth = 0.6 + r() * 2.4;
      g.beginPath(); g.moveTo(0, y0);
      const f = 0.004 + r() * 0.01, a = 3 + r() * 14, ph = r() * 6;
      for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y0 + Math.sin(x * f + ph) * a + Math.sin(x * f * 3.1) * a * 0.25);
      g.stroke();
    }
    g.globalAlpha = 1;
    return finish(c);
  });
}

// What you see through the windows: soft sky, warm haze and a distant city line
export function skyViewTex() {
  return cached('skyview', () => {
    const [c, g] = cvs(2048, 1024);
    const grd = g.createLinearGradient(0, 0, 0, 1024);
    grd.addColorStop(0, '#9DB7C8'); grd.addColorStop(0.38, '#CFDCE0'); grd.addColorStop(0.5, '#F1E7D6'); grd.addColorStop(0.53, '#D9CDBA'); grd.addColorStop(1, '#BFB3A0');
    g.fillStyle = grd; g.fillRect(0, 0, 2048, 1024);
    const r = rng(41);
    const layer = (blur, draw) => { const [lc, lg] = cvs(2048, 1024); draw(lg); g.filter = `blur(${blur}px)`; g.drawImage(lc, 0, 0); g.filter = 'none'; };
    // clouds
    layer(18, (lg) => { for (let i = 0; i < 26; i++) { lg.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.3})`; lg.beginPath(); lg.ellipse(r() * 2048, 120 + r() * 300, 80 + r() * 200, 18 + r() * 30, 0, 0, 7); lg.fill(); } });
    // two skyline layers
    for (const [col, hMax, blur] of [['rgba(150,160,170,0.55)', 120, 3], ['rgba(120,128,136,0.7)', 70, 1]]) {
      layer(blur, (lg) => { lg.fillStyle = col; let x = 0; while (x < 2048) { const w = 8 + r() * 26, h = 4 + r() * hMax * 0.45; lg.fillRect(x, 512 - h, w, h + 3); x += w + r() * 6; } });
    }
    // tree line
    layer(2, (lg) => { for (let i = 0; i < 700; i++) { lg.fillStyle = `rgba(${90 + r() * 30},${110 + r() * 30},${90 + r() * 20},0.75)`; lg.beginPath(); lg.arc(r() * 2048, 514 + r() * 8, 3 + r() * 6, 0, 7); lg.fill(); } });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}
