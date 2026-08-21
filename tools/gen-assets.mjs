// Dev-time asset generator. Calls Azure gpt-image-2, post-processes with sharp,
// writes PNGs + credits.json into public/assets/. NOT shipped, NOT run at runtime.
// Run: npm run gen                 (all assets)
//      npm run gen -- enemy chest  (only the named subset; merges credits.json)
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { removeBackground } from "./bg.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dir, "../public/assets");

const GEN_URL = process.env.AZURE_IMAGE_GENERATIONS_URL;
const KEY = process.env.AZURE_IMAGE_KEY;
const MODEL = "gpt-image-2";

// Locked style prefix — the single biggest lever for a cohesive look.
const STYLE =
  "Premium 2D pixel art game asset, top-down action-adventure, inspired by Hyper Light Drifter and classic Zelda, " +
  "clean limited cohesive palette, crisp readable pixels, soft rim lighting, high quality, no text, no watermark. ";

// Flat keyable backdrop for sprites: bright magenta so a border flood-fill lifts it
// cleanly, while interior same-hue details (e.g. glowing eyes) survive (not edge-connected).
const CHROMA =
  " Place the subject centered with margin on a solid flat uniform bright magenta (#ff00ff) background " +
  "that completely fills the frame; no gradient, no vignette, no shadow, no ground plane, dark crisp outline around the subject.";

// Approx credit cost per image by quality (USD) — for the "How AI made this" card.
const COST = { low: 0.02, medium: 0.07, high: 0.17 };

// Demo asset subset. chroma:true sprites get the magenta backdrop + flood-fill removal;
// the room is a full opaque painted scene.
const ASSETS = [
  { name: "hero", max: 160, quality: "high", chroma: true,
    prompt: "a single enlightened entity protagonist, a compact humanoid silhouette made of solid luminous teal energy with a bright white-gold core and glowing short sword, crisp dark outline, fully filled body with no transparent holes, front view, full body" },
  { name: "enemy", max: 150, quality: "high", chroma: true,
    prompt: "a single small menacing corrupted slime-bot creature with glowing magenta eyes and metal shards, front view" },
  { name: "weapon_nano", max: 96, quality: "medium", chroma: true,
    prompt: "a single tiny simple dagger item icon with a faint green glow, blade pointing up" },
  { name: "weapon_standard", max: 96, quality: "medium", chroma: true,
    prompt: "a single balanced steel sword item icon glowing blue, blade pointing up" },
  { name: "weapon_frontier", max: 96, quality: "medium", chroma: true,
    prompt: "a single ornate powerful greatsword item icon radiating golden energy, blade pointing up" },
  { name: "token", max: 72, quality: "medium", chroma: true,
    prompt: "a single glowing golden coin token stamped with a small circuit / AI chip motif, front view" },
  { name: "chest", max: 140, quality: "medium", chroma: true,
    prompt: "a single closed ornate wooden treasure chest with gold trim and a keyhole, three-quarter front view" },
  { name: "boss", max: 320, quality: "high", chroma: true,
    prompt: "a single large menacing dungeon boss, a towering corrupted guardian golem fused with glowing circuitry and a single great glowing magenta eye, stone and metal body, front view, full body" },
  { name: "room", max: 1024, quality: "high", background: "opaque",
    prompt: "top-down dungeon chamber floor of cracked stone tiles with moss and a glowing rune circle in the center, stone walls framing all four edges, atmospheric torch lighting, full-screen scene background" },
  { name: "title", max: 1024, quality: "high", background: "opaque",
    prompt: "epic key-art title screen for a top-down pixel adventure, a lone hooded hero with a glowing teal sword standing before a vast ancient dungeon gate crackling with magenta energy, dramatic atmospheric lighting, cinematic, no text" },
];

async function generate(a) {
  const body = {
    prompt: STYLE + a.prompt + (a.chroma ? CHROMA : ""),
    size: "1024x1024",
    quality: a.quality,
    output_format: "png",
    n: 1,
  };
  if (a.background) body.background = a.background;

  const res = await fetch(GEN_URL, {
    method: "POST",
    headers: { "api-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${a.name}: HTTP ${res.status} ${await res.text()}`);

  const json = await res.json();
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error(`${a.name}: no image in response`);
  const rawBuf = Buffer.from(b64, "base64");

  let img = sharp(rawBuf);
  if (a.chroma) {
    // Lift the flat magenta backdrop via edge-connected flood-fill, then trim + downscale.
    const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    removeBackground(data, info.width, info.height);
    img = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).trim();
  }
  img = img.resize({ width: a.max, height: a.max, fit: "inside", withoutEnlargement: true });
  await img.png().toFile(resolve(OUT, `${a.name}.png`));

  return {
    name: a.name,
    model: MODEL,
    prompt: STYLE + a.prompt + (a.chroma ? CHROMA : ""),
    quality: a.quality,
    size: "1024x1024",
    approxCostUsd: COST[a.quality] ?? null,
  };
}

async function main() {
  if (!GEN_URL || !KEY) {
    console.error("Missing AZURE_IMAGE_GENERATIONS_URL or AZURE_IMAGE_KEY. Copy .env.example -> .env.");
    process.exit(1);
  }
  await mkdir(OUT, { recursive: true });

  const only = process.argv.slice(2);
  const targets = only.length ? ASSETS.filter((a) => only.includes(a.name)) : ASSETS;
  if (only.length && targets.length !== only.length) {
    const known = new Set(ASSETS.map((a) => a.name));
    const bad = only.filter((n) => !known.has(n));
    console.error(`Unknown asset(s): ${bad.join(", ")}`);
    process.exit(1);
  }

  // Merge with existing credits so a subset run keeps the others.
  const byName = new Map();
  try {
    for (const c of JSON.parse(await readFile(resolve(OUT, "credits.json"), "utf8"))) byName.set(c.name, c);
  } catch { /* first run */ }

  for (const a of targets) {
    process.stdout.write(`Generating ${a.name} (${a.quality})... `);
    try {
      byName.set(a.name, await generate(a));
      console.log("ok");
    } catch (e) {
      console.log("FAILED");
      console.error("  " + e.message);
    }
  }

  const credits = ASSETS.map((a) => byName.get(a.name)).filter(Boolean);
  await writeFile(resolve(OUT, "credits.json"), JSON.stringify(credits, null, 2));
  const total = credits.reduce((s, c) => s + (c.approxCostUsd ?? 0), 0);
  console.log(`\nWrote ${credits.length} assets to credits.json  (~$${total.toFixed(2)} total)`);
}

main();
