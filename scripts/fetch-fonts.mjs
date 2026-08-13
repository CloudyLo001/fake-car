/**
 * Downloads every typeface the page uses into src/assets/fonts/ and writes
 * src/styles/fonts.css to match. Run it again to refresh:
 *
 *   node scripts/fetch-fonts.mjs
 *
 * Why self-host rather than link the CDNs: the page claims "no trackers", and
 * an external font request is a request. Keeping the files local also means
 * type never flashes or vanishes because a third party is slow or blocked.
 *
 * The files land in src/ (not public/) on purpose — Vite then rewrites their
 * URLs relative to the emitted CSS, which is what keeps them resolving on a
 * GitHub Pages project subpath. An absolute /fonts/... path would 404 there.
 */
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

// Google serves woff2 only to a UA it believes supports it; curl's default
// identity gets legacy TTF instead.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FONT_DIR = "src/assets/fonts";
const CSS_OUT = "src/styles/fonts.css";

/** Google Fonts — query keeps only the weights/styles the page actually sets. */
const GOOGLE = [
  { family: "Cinzel", q: "Cinzel:wght@400..700" },
  { family: "Sorts Mill Goudy", q: "Sorts+Mill+Goudy:ital@0;1" },
  { family: "Bodoni Moda", q: "Bodoni+Moda:ital,opsz,wght@0,6..96,600..800;1,6..96,600..800" },
  { family: "Libre Caslon Text", q: "Libre+Caslon+Text:ital,wght@0,400;0,700;1,400" },
  { family: "Michroma", q: "Michroma" },
  { family: "IBM Plex Mono", q: "IBM+Plex+Mono:wght@400;500" },
  { family: "Source Sans 3", q: "Source+Sans+3:ital,wght@0,300..700;1,300..700" },
  { family: "Martian Mono", q: "Martian+Mono:wght@300..500" },
];

/**
 * Fontshare — ONE REQUEST PER FAMILY. The v2 API silently honours only the
 * first f[] parameter, so a combined URL quietly returns a single typeface.
 * It also bundles unrelated extra faces into a response (Zodiak arrives with
 * Gambetta), so responses are filtered back down to the family asked for.
 */
const FONTSHARE = [
  { family: "Zodiak", slug: "zodiak", weights: "300,400,700" },
  { family: "Satoshi", slug: "satoshi", weights: "300,400,500,700" },
  { family: "Clash Display", slug: "clash-display", weights: "200,300,400" },
];

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Pull @font-face blocks out of a Google/Fontshare stylesheet. */
function parseFaces(css) {
  const faces = [];
  for (const m of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const block = m[1];
    const get = (prop) => {
      const hit = block.match(new RegExp(`${prop}:\\s*([^;]+)`));
      return hit ? hit[1].trim().replace(/^['"]|['"]$/g, "") : null;
    };
    const url = block.match(/url\(([^)]+)\)\s*format\(['"]woff2['"]\)/);
    if (!url) continue;
    faces.push({
      family: get("font-family"),
      style: get("font-style") ?? "normal",
      weight: get("font-weight") ?? "400",
      range: get("unicode-range"),
      url: url[1].replace(/^['"]|['"]$/g, "").replace(/^\/\//, "https://"),
    });
  }
  return faces;
}

async function main() {
  await rm(FONT_DIR, { recursive: true, force: true });
  await mkdir(FONT_DIR, { recursive: true });

  const wanted = [];

  for (const { family, q } of GOOGLE) {
    const url = `https://fonts.googleapis.com/css2?family=${q}&display=swap`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Google CSS ${family}: HTTP ${res.status}`);
    const faces = parseFaces(await res.text());
    // Google splits each face by unicode-range; the page is Latin-only, so
    // keep just that slice and drop cyrillic/greek/vietnamese weight.
    const latin = faces.filter((f) => f.range?.includes("U+0000-00FF"));
    const use = latin.length ? latin : faces;
    if (!use.length) throw new Error(`Google CSS ${family}: no woff2 faces found`);
    use.forEach((f) => wanted.push(f));
    console.log(`google   ${family.padEnd(18)} ${use.length} face(s)`);
  }

  for (const { family, slug, weights } of FONTSHARE) {
    const url = `https://api.fontshare.com/v2/css?f[]=${slug}@${weights}&display=swap`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`Fontshare CSS ${family}: HTTP ${res.status}`);
    const faces = parseFaces(await res.text()).filter((f) => f.family === family);
    if (!faces.length) throw new Error(`Fontshare CSS ${family}: nothing returned`);
    faces.forEach((f) => wanted.push(f));
    console.log(`fontshare ${family.padEnd(17)} ${faces.length} face(s)`);
  }

  const rules = [];
  let bytes = 0;
  const seen = new Set();

  for (const f of wanted) {
    const base = `${slugify(f.family)}-${slugify(f.weight)}${f.style === "italic" ? "-italic" : ""}`;
    let name = `${base}.woff2`;
    let n = 2;
    while (seen.has(name)) name = `${base}-${n++}.woff2`;
    seen.add(name);

    const bin = Buffer.from(await (await fetch(f.url, { headers: { "User-Agent": UA } })).arrayBuffer());
    await writeFile(join(FONT_DIR, name), bin);
    bytes += bin.length;

    rules.push(
      [
        "@font-face {",
        `  font-family: "${f.family}";`,
        `  font-style: ${f.style};`,
        `  font-weight: ${f.weight};`,
        "  font-display: swap;",
        `  src: url("../assets/fonts/${name}") format("woff2");`,
        f.range ? `  unicode-range: ${f.range};` : null,
        "}",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const header = [
    "/*",
    " * GENERATED by scripts/fetch-fonts.mjs — do not edit by hand.",
    " * Self-hosted so the page makes no third-party requests.",
    " * Paths are relative on purpose: Vite rewrites them for the deploy base,",
    " * which is what keeps them working on the GitHub Pages subpath.",
    " */",
    "",
  ].join("\n");

  await writeFile(CSS_OUT, `${header}${rules.join("\n\n")}\n`);

  const files = await readdir(FONT_DIR);
  console.log(
    `\n${files.length} files, ${(bytes / 1024).toFixed(0)} KB total → ${FONT_DIR}\nwrote ${CSS_OUT}`,
  );
}

main().catch((e) => {
  console.error(`\nfetch-fonts failed: ${e.message}`);
  process.exit(1);
});
