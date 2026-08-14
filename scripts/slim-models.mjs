/**
 * Decimates the heavy car GLBs into lightweight web versions.
 *
 *   node scripts/slim-models.mjs            # default target
 *   node scripts/slim-models.mjs --target 15000
 *
 * Why this exists: Mint's "optimize" pass Draco-compresses a model but does
 * NOT reduce its polygon count, so those four cars arrived as ~9 MB files
 * holding ~1.45 MILLION triangles each — small on the wire, enormous on the
 * GPU. The fleet was drawing 5.8M triangles per frame (twice, counting the
 * shadow pass) and the page ran at 15 fps on integrated graphics. The two
 * cars that shipped as small originals are ~5k triangles and look great, so
 * this level of detail was never buying anything on screen.
 *
 * The source optimized_glb.glb files are left untouched as the master copies;
 * output goes to web_glb.glb beside them, so the target can be re-tuned at any
 * time without re-downloading anything from Mint. Runtime paths live in
 * src/scene/fleet-manifest.ts.
 */
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, simplify, dedup } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import draco3d from "draco3dgltf";
import { readFile, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";

/** cars whose geometry needs cutting; the 1965 and 2004 bodies are already ~5k */
const HEAVY = ["car-1948", "car-1987", "car-2026", "car-2040"];
const DIR = "public/assets/mint";

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? Number(process.argv[i + 1]) : fallback;
};

/** triangles to aim for per car */
const TARGET = arg("--target", 40000);
/**
 * Simplification error tolerance, as a fraction of mesh radius. meshoptimizer
 * treats this as a ceiling: it stops collapsing edges once further collapses
 * would exceed it, so an aggressive ratio can be refused. Loose enough here to
 * let a 36x reduction actually land.
 */
const ERROR = 0.01;

const countTris = (doc) => {
  let tris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute("POSITION");
      tris += (idx ? idx.getCount() : pos ? pos.getCount() : 0) / 3;
    }
  }
  return Math.round(tris);
};

const mb = (bytes) => `${(bytes / 1048576).toFixed(2)} MB`;

async function main() {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });
  await MeshoptSimplifier.ready;

  console.log(`target ${TARGET.toLocaleString()} triangles per car\n`);
  const rows = [];

  for (const era of HEAVY) {
    const src = `${DIR}/${era}-body/optimized_glb.glb`;
    const dst = `${DIR}/${era}-body/web_glb.glb`;

    const doc = await io.readBinary(new Uint8Array(await readFile(src)));
    const before = countTris(doc);
    const ratio = Math.min(1, TARGET / before);

    await doc.transform(
      weld(),
      simplify({ simplifier: MeshoptSimplifier, ratio, error: ERROR }),
      dedup(),
    );

    const after = countTris(doc);
    // Re-encode with Draco so the download stays as small as the source was.
    await writeFile(dst, await io.writeBinary(doc));

    const srcBytes = statSync(src).size;
    const dstBytes = statSync(dst).size;
    rows.push({ era, before, after, srcBytes, dstBytes });
    console.log(
      `${era.padEnd(10)} ${before.toLocaleString().padStart(10)} -> ` +
        `${after.toLocaleString().padStart(7)} tris   ` +
        `${mb(srcBytes)} -> ${mb(dstBytes)}`,
    );
  }

  const b = rows.reduce((s, r) => s + r.before, 0);
  const a = rows.reduce((s, r) => s + r.after, 0);
  console.log(
    `\nfleet ${b.toLocaleString()} -> ${a.toLocaleString()} triangles ` +
      `(${(b / a).toFixed(1)}x lighter)`,
  );
}

main().catch((e) => {
  console.error(`\nslim-models failed: ${e.message}`);
  process.exit(1);
});
