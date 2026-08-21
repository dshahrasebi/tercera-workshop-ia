// One-off: strip opaque backgrounds from already-generated sprite PNGs in place.
// (background:transparent was ignored by this api-version, so sprites came back opaque.)
import sharp from "sharp";
import { removeBackground } from "./bg.mjs";

const SPRITES = ["hero", "enemy", "weapon_nano", "weapon_standard", "weapon_frontier", "token", "chest"];
const dir = "public/assets";

for (const name of SPRITES) {
  const file = `${dir}/${name}.png`;
  const src = sharp(file).ensureAlpha();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  removeBackground(data, info.width, info.height);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png()
    .toFile(`${dir}/${name}.tmp.png`);
  const { renameSync } = await import("node:fs");
  renameSync(`${dir}/${name}.tmp.png`, file);
  const meta = await sharp(file).metadata();
  console.log(`${name}: ${meta.width}x${meta.height} alpha=${meta.hasAlpha}`);
}
console.log("done");
