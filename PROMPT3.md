# Upgrade Prompt — Per-Era Vibe Correction

Use mint-threejs-skills and Mint MCP to art-direct this existing Three.js app, era by era.

**Context:** The Solvane Vela turntable site (built per `PROMPT.md` + `PROMPT2.md`) works — six generations on a rotating plate with diorama slices, weather, and props. This pass corrects the *feel* of each era to the owner's direction, including regenerating three cars on Mint. It is surgical: the turntable, scroll timeline, interactions, DOM chapters, finale, and always-assembled cars are untouched. Reuse the existing owners:

- `src/scene/EraGrades.ts` — all lighting/grade values (already dark-and-saturated by direction; adjust, don't reset).
- `src/scene/Dioramas.ts` — slice terrain, decals, parapets.
- `src/scene/props.ts` — prop scatter (era, position, yaw, scale per placement).
- `src/scene/assembly.ts` + the `.debug-shots` `POST /__shot` tuning loop — fit the three new cars. Capture via `stage.composer.render()` (a raw `renderer.render()` bypasses the grade and reads black outside rAF).
- Mint pipeline + `mint-assets.json` — regenerated cars sync under their **existing keys** (`car-1987-*`, `car-2004-*`, `car-2040-*`) so files replace in place and `fleet-manifest.ts` barely changes.

## Reference images

Three reference photos live in `refs/` (public equivalents of the owner's screenshots): `1987-supra.jpg` (white 80s wedge liftback, black trim — Super White A60), `2004-civic.jpg` (silver early-2000s compact sedan, plain and unadorned), `2026-tesla.jpg` (white electric SUV — grade/vibe reference only, the 2026 car is not regenerated). The owner's fourth screenshot (a wheel-less hovering concept) has no freely licensed equivalent, so the 2040 regeneration follows the written description below instead of an image. For the 1987 and 2004 regenerations, upload the matching file with `upload_reference_image` and pass the returned URL as `image_url`. References guide body shape, stance, and palette ONLY — never reproduce badges, logos, or lettering; all cars remain the fictional Solvane marque with its Twin Meridian grille / light-blade DNA.

## Era 1 — 1948 · dust-bowl desert

The first car in an old, dusty world. The desert moves here from 2004.

- **Slice:** sandy rippled terrain (reuse the 2004 desert terrain treatment: sand color, high noise amp, tire-track decal). Props become a blended Americana desert trail: keep the split-rail fence + telegraph pole + milestone, add the red desert rock and weathered signpost (cactus optional, at most one, far from center). Retire nothing — reassign.
- **Grade:** keep the warm sepia mono mix but lift the key ~20% so the ivory car glows against the dust; drifting dust motes stay.

## Era 2 — 1965 · old money

- **Grade only:** noticeably brighter than now — warm champagne/golden-hour key (+~35%), fill up so the teal body and chrome read rich, not murky. Saturation stays high; think polished wood, brass, Riviera afternoon. Slice and props unchanged; leaves stay.

## Era 3 — 1987 · white wedge under neon

The car must clearly read; neon becomes an accent, not the atmosphere.

- **Regenerate the car pack** (same 5 parts: body shell sans hood/doors/wheels, hood, left door, right door, wheel) as a **bright white boxy 80s wedge liftback** per `refs/1987-supra.jpg`: sharp flat panels, black beltline trim and lower cladding, black louvered details, flat nose with flush rectangular lamps, simple deep-dish alloys. White paint #f0f0ec, satin black trim.
- **Grade:** roughly double key and fill from current values, ease the vignette, keep the magenta/cyan rims but capped so they accent the white panels instead of swallowing them. Rain and wet asphalt stay.
- Tune the new parts flush with the debug-shot loop; sync over the `car-1987-*` keys.

## Era 4 — 2004 · simple silver sedan on a Japanese road

Simplicity is the brief. The current car is mis-mounted and badly rendered — replace it.

- **Regenerate the car pack** (same 5 parts) as a **simple silver early-2000s compact sedan** per `refs/2004-civic.jpg`: soft unadorned surfaces, modest clear-lens lamps, plain 15" alloys, nothing sporty or ornamental. Liquid silver #c8ccd2. Doors MUST be generated in clean installed orientation and tuned flush — the old pack's door fit was the failure.
- **Slice:** remove the desert entirely → a clean modern Japanese two-lane road: smooth near-black asphalt across the slice, crisp white edge lines and a dashed center line, low flat shoulders. One small new Mint prop pack (2–3 items): galvanized guardrail section, concrete utility pole (blank transformer box, no text), optional slim blank road sign. Sparse placement — mostly empty, clean air (no sand weather here; that layer moves to 1948's slot if the weather order is retuned, otherwise disable it for this era).
- **Grade:** clean daylight neutral with a cool touch — bright enough to feel modern, still saturated.

## Era 5 — 2026 · Tesla studio

- **Slice:** perfectly **flat** (noise amp 0), a uniform light-grey seamless studio floor edge to edge per `refs/2026-tesla.jpg` — no gravel pad, no terrain. Remove the saplings and boulder placements.
- **Grade:** bright white-grey studio — clearly lighter than every other era, soft even shadows, but controlled: cap it well below the blown-out white the owner already rejected (surfaces must never clip; the white car keeps visible form and shading). Pollen layer off or nearly invisible.
- Car unchanged — it already fits the brief.

## Era 6 — 2040s · visible neon hover car

Keep the neon vibe, but the car must be clearly visible — and it flies.

- **Regenerate the car as a wheel-less hover GT**, **4 parts only** (body shell, front access panel in the hood slot, left door, right door — NO wheel item) per `refs/2040-hover.jpg`: one seamless low teardrop with a sealed smooth underside, wraparound canopy, thin neon light streaks tracing the body lines (teal #5de0c8 with a magenta counter-streak allowed). Dark iridescent body, but mid-dark — not black-hole black.
- **Runtime:** the assembly hovers ~0.45 m above the mirror pool (raise the era's assembly rest height; no ground contact), with a soft additive teal under-glow disc on the pool surface beneath it and its reflection intact. A slow ±3 cm vertical idle bob is welcome (disabled under reduced motion). `CarFleet` already tolerates missing parts — the era's `wheels` array becomes empty and hinges keep working for the two doors.
- **Grade:** lift key/rims/ambient further so the body form clearly reads at a glance; neon streaks and pool ring may bloom, panels may not. Aurora stays.

## Quality and Verification

- All three new packs generate in the existing "Car Evolution Landing" Mint Project, auto mode, with the reference images attached; failed items follow the known recovery path (approve survivors + standalone model in the same chat). Optimize new models and sync optimized GLBs over the same keys.
- Assembly-tune each new car with the debug-shot loop (probe bounding boxes first; part orientations vary randomly). Doors flush, wheels seated (1987/2004), hover height verified (2040).
- Re-verify every era with `composer.render()` captures: the six slices centered, one mid-rotation, the finale ring. The finale must show the white wedge, silver sedan, and hovering pod correctly.
- Build + typecheck green; report changed files, replaced registry keys, Mint links, and per-era before/after captures.
