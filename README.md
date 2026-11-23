# Bonito Designs — 3D & AR demo site

A premium concept rebuild of **bonito.in** that keeps the client's own copy, data and photography,
and adds a Three.js 3D layer: every signature project can be orbited as a dollhouse, walked through
at eye level, viewed as a plan, re-lit from day to evening, personalised, and placed in your room with AR.

## Run locally

```bash
python3 serve.py
```

Open http://localhost:5180 (home) and http://localhost:5180/design/ (signature projects).
No build step, no npm install — libraries load from jsDelivr (three 0.170, GSAP 3.13 + ScrollTrigger/SplitText/Flip, Lenis, model-viewer).

## What's inside

| Page | Highlights |
| --- | --- |
| `/` | Scroll-driven 3D story through a live-generated apartment (aerial → living room → bedroom → plan → dining at evening) narrating Bonito's *LifeDesign* philosophy; Gauri Khan, stats, Atelier Series hover list, process timeline, transformations, testimonials, press, cities, experience centre, FAQ, consultation form. |
| `/design/` | Original hero + Atelier intro, **Our Signature Projects** with City / Location / Typology / Room Type filters (all 26 real projects, 6 per page, 3×2 grid, Load More), home tours, The Bonito Way, showcase gallery. |
| 3D viewer (`/design/?project=<slug>&room=<id>`) | Orbit dollhouse, Point & Go walkthrough (click floor, drag to look, WASD), Plan view, room chips + minimap, furniture hotspots, real photographs per room, upholstery/wall recolouring, Day ↔ Evening lighting, share link, WebXR VR (on headsets), AR via model-viewer (hero piece at true scale or the whole home as a 1:25 tabletop model; QR hand-off from desktop). |

## Structure

```
index.html                 home
design/index.html          design page + viewer markup
assets/css/style.css       design system (cream / maroon / coral, Fraunces + Manrope + Caveat + JetBrains Mono)
assets/js/core.js          loader, header, menu, cursor, Lenis, reveals, footer, forms
assets/js/home.js          scroll story + home sections
assets/js/design.js        filters, cards (GSAP Flip), tours, way, showcase, deep links
assets/js/viewer.js        3D viewer UI, hotspots, minimap, AR/VR
assets/js/data-projects.js 26 signature projects extracted from bonito.in/design
assets/js/three/           stage (renderer, camera modes), apartment generator, furniture library, procedural textures
assets/img/                client imagery downloaded from bonito.in's CDN
```

## Notes

- 3D rooms are generated procedurally from each project's typology, room list and style
  (Minimalist, Modern, Contemporary, European, Eclectic, Scandinavian, Victorian, Traditional).
  They are faithful *concepts* in the project's style, not scans; swapping in real GLB models per
  project later only needs `buildApartment()` to load them instead.
- AR on phones needs HTTPS (any static host: Netlify, Vercel, Cloudflare Pages, S3). The QR code
  in the AR dialog points to the current host, so it works once deployed.
- Forms are demo-only and send nothing.
