# Upgrade Prompt — The Turntable & The Dioramas

Use mint-threejs-skills and Mint MCP to upgrade this existing Three.js app.

**Context:** This repo already contains the finished "Solvane Vela — One Car, Eighty Years" landing page built per `PROMPT.md`: six Mint-generated car generations assembled from part packs, a scroll timeline with pinned era chapters, per-era lighting grades, and working interactions. The existing architecture wins — this is a surgical upgrade, not a rebuild. Reuse the current owners:

- `src/scene/CarFleet.ts` — car state, part assemblies, and the exploded-view system whose per-part radial vectors are exactly the mechanism for the new assembly scrub (run it in reverse).
- `src/scene/assembly.ts` — hand-tuned per-era part fits, hinges, and explode multipliers. Do not retune the cars.
- `src/scene/Studio.ts` — the studio set; its plinth is replaced by the giant plate.
- `src/scroll/ScrollTimeline.ts` — the hold/handoff zone model; handoff zones now drive plate rotation + assembly scrub instead of the crossfade.
- `mint-assets.json` + the mint-threejs-skills sync pipeline and shared Draco loader — every new Mint artifact goes through the same registry with stable logical keys, in the existing "Car Evolution Landing" Mint Project.
- The `.debug-shots` offscreen-capture dev loop (`POST /__shot`) — use it to tune and verify every visual change.

**Goal:** Replace the in-place crossfade transition with a giant rotating turntable where each generation stands on its own landscape slice and assembles from parts as it arrives — and give the page Kage-level atmospheric life (falling leaves, rain, dust) per era.

## The Turntable

Replace the small plinth with one **giant circular plate** (~9 m radius) whose machined edge is visible at the bottom of frame — the cars all live on this plate, at six stations spaced 60° apart. The camera keeps its current near-locked hero framing; only the plate moves.

- Scroll now drives **plate rotation**: on screen the motion reads right → center → left. The next generation swings in from the right while the current one carries away to the left. Remove the crossfade/light-sweep swap entirely; cars no longer fade — they are always physically present on their stations.
- **Assembly on arrival:** while a station is rotating in, its car hangs in an exploded state — body floating slightly, hood, doors, and wheels offset outward along their existing explode vectors. The scroll scrubs these parts smoothly home so the car completes its assembly exactly as it reaches center. Reverse the existing exploded-view math; add staggered easing per part (wheels seat first, doors and hood last) so the convergence feels mechanical, not linear.
- The departing car stays assembled as it rotates away (a subtle panel-loosening on exit is welcome if it reads well, but never a full explode).
- The **hero** opens on the 1948 already at center mid-assembly, completing as the visitor first scrolls — the mechanic is taught in the first second.
- Rotation and assembly must be fully scroll-scrubbed (scrolling back up reverses everything), eased with the existing timeline's hold/handoff zones: hold = car centered and assembled, handoff = rotation + next car's assembly scrub.
- `prefers-reduced-motion`: instant station snaps, cars always assembled, no scrub.

## The Dioramas

Divide the plate into **six pie-slice dioramas** — each generation stands on its own landscape that rotates in with it. Terrain is procedural (displaced ground mesh, scatter, decals per slice); each slice gets a low parapet or natural edge so slices read as distinct worlds sharing one plate.

| Era | Slice | Weather layer |
| --- | --- | --- |
| 1948 | dusty village road: packed earth, cobble edge, split-rail fence | warm floating dust motes |
| 1965 | coastal cliff road: sun-washed asphalt curve, guard stones, sea-grass | falling autumn leaves drifting across frame |
| 1987 | rain-soaked neon asphalt: black wet ground with neon reflections, puddle decals | rain streaks + faint splash rings |
| 2004 | desert trail: rippled sand, cracked earth, tire tracks | blowing sand wisps + heat shimmer |
| 2026 | minimal forest clearing: moss, ferns, pale gravel pad | slow drifting pollen/light specks |
| 2040s | dark reflective pool: mirror-still black water the car appears to float on | aurora ribbon + rising light particles |

- Weather is a per-slice **particle layer** that fades in with slice proximity to center and follows the Kage reference's feel: sparse, slow, foreground-drifting, never confetti. Budget each system (≤ ~600 particles desktop, halved on mobile) and only simulate the centered slice and its two neighbors.
- Per-era lighting grades now also light the slice: the existing `EraGrades` values extend with slice-specific touches (neon reflections for 1987, water reflection for 2040s, warm bounce for 1948).
- The page's DOM chapters, editorial layers, rail, and era grade lerps stay exactly as they are — the world under the car is what changes.

## Assets — Mint MCP

- Generate **six small prop asset packs** (3–5 items each) in the existing "Car Evolution Landing" Mint Project — e.g. split-rail fence + milestone (1948), guard stones + windswept pine (1965), neon sign pylon + street lamp (1987), cactus + weathered signpost (2004), pine sapling + mossy boulder (2026), monolithic light stele (2040s). Style guides must match each era's slice palette; no text or real-brand likeness; clean real-time geometry.
- Register every prop under stable keys (`props-1948-fence`, `props-1965-pine`, …) via the existing sync script and asset root; load through the shared Draco loader. Instance and scatter props procedurally per slice.
- Cars are untouched: same packs, same registry keys, same tuned assemblies. Do not regenerate or re-model anything that already succeeded. No Mint worlds. Terrain, water, particles, and decals are procedural.

## Preserved Behavior

Everything that works today keeps working: drag-rotate on the centered car, door/hood hinges + hotspots, the explode toggle (it now simply drives the same scrub the arrival uses), the generation switcher and chapter rail (jumps animate the plate rotation), the compare mode, and the 2026 paint/trim customizer.

**Finale — aerial ring reveal:** replace the linear lineup. The closing chapter pulls the camera up and back — the one big camera move — to reveal the entire plate: six generations on six worlds arranged in a ring, plate slowly rotating, each slice under its own era-tinted pool of light. The finale DOM copy and footer stay.

## Quality and Verification

- 60 fps target on desktop: instance scatter geometry, cap particle counts, cull non-adjacent slices' particles and any per-frame work for far stations, keep the plate's added draw calls modest, reuse materials.
- No hitching during rotation: all six cars and slices stay resident (they already load up front); only simulation work is gated, not visibility.
- Mobile (~390×844): reduced particle budgets, touch behavior unchanged.
- Verify with the existing ladder: typecheck + production build, browser render, real-input interaction checks (scroll scrub forward and backward, switcher jump, doors, explode, compare, customizer, finale reveal), and screenshot/canvas evidence through the `.debug-shots` loop at hero, mid-rotation, each slice centered, and the aerial finale. Ask before extended desktop QA; mobile QA is a separate approval.
- Report: changed files, new `mint-assets.json` keys, Mint chat handoff links (report only, never in-app), performance evidence, and remaining risks.
