# Build Prompt — One Car, Eighty Years

Use mint-threejs-skills and Mint MCP to build this Three.js app.

**App type and user goal:** A single-page scroll-driven WebGL landing page for an entirely fictional automotive brand. One car sits perfectly centered in a studio; scrolling transforms it through six design generations while everything around it — lighting, typography, advertisements, graphic design — evolves era by era. The camera barely moves; the car is the constant.

**Stack:** Vite + TypeScript + vanilla Three.js modules. Static deployable build.

**Target devices:** Desktop-first, fully usable on mobile (~390 × 844).

**Visual reference:** The motion and editorial language of MengTo's Kage (https://mengto.github.io/kage/ — see https://github.com/MengTo/kage/blob/main/PROMPT.md): a fixed WebGL viewport behind pinned scroll chapters, oversized left-aligned headlines, a numbered chapter rail, small technical annotations, foreground layers that arrive at full opacity, remain pinned while their section is active, then fade and blur away during the handoff.

## Brand

Invent a complete fictional marque — do not reference or resemble any real automaker, logo, or model name.

- Name the company, found it around 1946, and write an 80-year fictional history with one flagship model line spanning six generations: **1948 → 1965 → 1987 → 2004 → 2026 → 2040s concept**.
- Give each generation its own model designation, one-line positioning statement, three era-plausible spec figures, and a short piece of advertising copy written the way ads were actually written in that decade.
- Evolve the wordmark and logo across eras (SVG): a stately 40s crest, a 60s script or bold serif, an 80s chrome-geometric mark, a 2000s glossy 3D-bevel refresh, a flat minimal modern mark, and a futuristic reduction for the concept.
- The design DNA must read as one lineage: a recurring silhouette cue, grille motif, or proportion that survives all six generations.

## Experience

Construct a fixed full-viewport Three.js layer. Build one procedural studio set — seamless floor, curved cyclorama wall, and a lighting rig — that never changes geometry but fully restyles per era: light color and placement, floor reflectivity, palette, subtle props, and post-processing grade. The car stands centered on a low turntable plinth at the same world position in every era.

The camera holds an almost identical three-quarter hero framing across all six generations — small, eased drifts only — so the scroll-scrubbed transformation between cars is the signature moment. Transition between generation models with a scroll-scrubbed handoff (crossfade with scale/position continuity, a light-sweep wipe, or a particle dissolve — pick one mechanic and use it consistently).

Grade each era with restrained post-processing:

- **1948** — warm monochrome tint, film grain, soft vignette, tungsten key light.
- **1965** — saturated Kodachrome warmth, sun-through-window key, print-halftone hints in the DOM layer.
- **1987** — neon magenta/cyan rim lights, gridded floor glow, mild bloom.
- **2004** — cool glossy showroom, high floor reflectivity, chrome highlights, lens flare restraint.
- **2026** — clean neutral minimal, soft-box lighting, near-white cyc, no grain.
- **Concept** — dark void studio, volumetric accent light, subtle holographic UI shimmer.

## Layout

Structure the page as: hero → six era chapters → lineage finale → footer. Number chapters in a persistent rail (01–06) synchronized to scroll, Kage-style. Each chapter carries a DOM/CSS/SVG editorial layer over the WebGL viewport, designed as if a designer from that decade made it:

- **1948** — letterpress serif, cream paper tones, engraved rules, formal announcement copy.
- **1965** — full-bleed magazine advertisement: big friendly headline, italic body copy, price in the corner, halftone texture.
- **1987** — neon geometric shapes, chrome gradient type, diagonal grids, spec callouts styled like a brochure of the period.
- **2004** — glossy gradients, bevels and lens flares, wide chrome wordmark, "innovation" copywriting.
- **2026** — minimal grotesque type, generous whitespace, thin rules, quiet spec annotations.
- **Concept** — HUD-like micro-typography, holographic accents, engineering-diagram callouts.

Use oversized left-aligned headlines, small technical annotations, delicate rules, and ample whitespace throughout. Embed each era's fake advertisement and spec sheet as editorial cards. Typography ships locally (system stacks or bundled open-license fonts — no remote typefaces).

## Motion

Drive everything from one scroll timeline with pinned sections. Reveal text sequentially; ease era transitions slowly with subtle parallax between the DOM layer and the WebGL scene. Foreground editorial layers pin while active, then blur and fade during handoff. Synchronize the chapter rail, navigation, era grade, and car swap to the active section state. Preserve the complete reading experience under `prefers-reduced-motion`: instant era swaps, no scroll scrubbing, all content reachable.

## Interaction — all required

1. **Rotate:** drag (and touch-drag) to rotate the active car on its plinth; eased spring return to hero angle when scrolling resumes.
2. **Doors and hood:** click/tap hotspots to swing doors and hood open on real hinges. This requires part-separated geometry — see Assets.
3. **Generation switcher:** a manual timeline control (era years) that jumps between generations independent of scroll.
4. **Compare mode:** pick any two generations and view them side-by-side on the studio floor with their spec sheets facing off.
5. **Exploded view:** a toggle that translates the car's named parts outward along radial vectors with staggered easing, annotated with thin callout lines.
6. **Customizer:** on the 2026 model, a paint/trim configurator (curated palette of era-plausible colors plus wheel option) — an explicit user-facing recolor feature.
7. **Lineage finale:** the closing chapter arranges all six generations side-by-side in one wide shot, each under its own era-tinted pool of light, with the camera pulling back for the first and only big camera move of the page.

Every interaction needs visible feedback (cursor changes, hotspot affordances, eased responses) and must work with both pointer and touch.

## Assets — Mint MCP

Mint MCP is the only generated-asset pipeline. Keep MCP calls in agent tooling, never browser runtime code.

- Resolve or create **one Mint Project** for this codebase per `references/mint-project-workspaces.md`, persist it in `mint-assets.json`, and reuse it for every generation.
- Generate **each of the six cars as a coherent Mint asset pack** with part-separated items: body shell, hood, left door, right door, and wheels, generated to assemble into one vehicle. State the shared brand DNA (silhouette cue, grille motif, proportions) and the era's design language in every pack prompt so the six generations read as one lineage. Doors/hood/explode are hinged and offset in Three.js from the delivered parts — never re-model a part procedurally that Mint delivered successfully. If a delivered pack's parts cannot assemble cleanly, use the pack's failed-item regeneration path or revise the pack prompt before falling back.
- Sync every manifest through `scripts/sync-mint-assets.mjs` with stable logical keys (e.g. `car-1948`, `car-1965`, …) into a project-root `mint-assets.json`.
- Load all GLBs through the shared Draco-capable loader per `references/gltf-runtime-compatibility.md` — Mint-optimized GLBs do not load in a bare `GLTFLoader`.
- Everything that is not a car is procedural or authored: studio set, lighting, era graphics, logos, ads, and UI are Three.js / CSS / SVG / Canvas. Do **not** generate Mint worlds.
- Mind the credit budget: plan the six pack prompts carefully before generating; prefer revising a preview over regenerating from scratch.

## Quality and Verification

- Loading experience: branded preloader with real progress across the six packs; graceful error state if an asset fails.
- Performance: 60 fps target on desktop; cap device pixel ratio, reuse geometries/materials, dispose swapped-out resources, keep only adjacent generations resident, and degrade post-processing on weak GPUs.
- Semantic HTML, accessible labels on all controls, keyboard-reachable era switcher, alt text on editorial imagery.
- Responsive breakpoints down to ~390 × 844; touch affordances replace hover-dependent ones on mobile.
- No analytics, trackers, remote typefaces, placeholder lorem copy, or decorative motion without narrative function.
- Verification: run the production build, then browser render, real-input interaction checks (rotate, doors, switcher, compare, explode, customizer), and screenshot/canvas evidence per `references/verification-policy.md`. Ask before extended desktop QA; treat mobile QA as a separate approval.
- Report: controls and state ownership, changed files, `mint-assets.json` keys and sync status, Mint chat handoff links (in the report only — never in the app UI), verification evidence, and remaining risks.
