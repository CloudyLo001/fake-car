/**
 * Browser-facing map from era key to part GLB URLs. Populated from the
 * synchronized mint-assets.json registry (public/assets/mint/...). An era
 * with `parts: null` has no delivered generation yet — the fleet renders a
 * clearly-labeled placeholder proxy until the Mint pack is synced.
 *
 * Every era now ships as one complete assembly, so each entry carries a lone
 * `body`. The five-part shape (hood, doors, wheel) is still supported by the
 * loader and the types — an era generated as a part pack drops straight in.
 */
import { assetUrl } from "./gltf-runtime";

export type PartName = "body" | "hood" | "doorL" | "doorR" | "wheel";

export interface EraParts {
  parts: Partial<Record<PartName, string>> | null;
}

/** eras delivered as one complete mesh: no doors or hood to open */
export const isSingleMesh = (era: string) => {
  const parts = FLEET_MANIFEST[era]?.parts;
  return !!parts && !parts.doorL && !parts.doorR && !parts.hood;
};

/**
 * `web_glb` is the decimated build produced by scripts/slim-models.mjs. Mint's
 * "optimize" only Draco-compresses — it leaves the polygon count alone — so
 * those four bodies arrived at ~1.45M triangles each and the fleet drew 5.8M
 * per frame. The 1965 and 2004 bodies came in around 5k already and are used
 * as delivered.
 */
export const FLEET_MANIFEST: Record<string, EraParts> = {
  // user-supplied brass-era touring car, delivered as ONE complete assembly
  // (body, top, brass lamps and spoke wheels in a single mesh)
  "car-1948": { parts: { body: assetUrl("/assets/mint/car-1948-body/web_glb.glb") } },
  // user-supplied candy-red porthole convertible, delivered as ONE complete
  // assembly (body, chrome and wheels in a single mesh) — no panels to fit
  "car-1965": { parts: { body: assetUrl("/assets/mint/car-1965-body/original_glb.glb") } },
  // delivered as ONE complete assembly — no panels to fit
  "car-1987": { parts: { body: assetUrl("/assets/mint/car-1987-body/web_glb.glb") } },
  // user-supplied silver sedan, delivered as ONE complete assembly
  "car-2004": { parts: { body: assetUrl("/assets/mint/car-2004-body/original_glb.glb") } },
  // delivered as ONE complete assembly (body, glass and wheels in a single
  // mesh) — nothing to fit, so it has no separate panels
  "car-2026": { parts: { body: assetUrl("/assets/mint/car-2026-body/web_glb.glb") } },
  // user-supplied wheel-less hover GT with neon streaks, delivered as ONE
  // complete assembly — it floats, so it has no wheels by design
  "car-2040": { parts: { body: assetUrl("/assets/mint/car-2040-body/web_glb.glb") } },
};
