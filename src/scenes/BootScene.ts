import Phaser from "phaser";

export interface Credit {
  name: string;
  model: string;
  prompt: string;
  quality: string;
  size: string;
  approxCostUsd: number | null;
}

const IMAGE_KEYS = [
  "hero",
  "enemy",
  "weapon_nano",
  "weapon_standard",
  "weapon_frontier",
  "token",
  "chest",
  "room",
];

// Fallback tints if an asset failed to generate — game still runs.
const PLACEHOLDER: Record<string, number> = {
  hero: 0x36d1b0,
  enemy: 0xff4bd8,
  weapon_nano: 0x7cff9b,
  weapon_standard: 0x5aa9ff,
  weapon_frontier: 0xffd65a,
  token: 0xffcf3f,
  chest: 0xc98a3a,
  room: 0x1a2033,
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    for (const k of IMAGE_KEYS) this.load.image(k, `assets/${k}.png`);
    this.load.json("credits", "assets/credits.json");
    this.load.on("loaderror", (f: Phaser.Loader.File) =>
      console.warn(`asset missing: ${f.key} — using placeholder`)
    );
  }

  create() {
    // Placeholders for any asset that didn't load.
    for (const k of IMAGE_KEYS) {
      if (!this.textures.exists(k)) {
        const size = k === "room" ? 256 : 48;
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(PLACEHOLDER[k] ?? 0x888888, 1);
        g.fillRect(0, 0, size, size);
        g.generateTexture(k, size, size);
        g.destroy();
      }
    }

    // Procedural FX textures (spark + slash crescent).
    const spark = this.make.graphics({ x: 0, y: 0 }, false);
    spark.fillStyle(0xffffff, 1);
    spark.fillCircle(5, 5, 5);
    spark.generateTexture("spark", 10, 10);
    spark.destroy();

    const slash = this.make.graphics({ x: 0, y: 0 }, false);
    slash.fillStyle(0xffffff, 1);
    slash.slice(32, 32, 30, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60), false);
    slash.fillPath();
    slash.generateTexture("slash", 64, 64);
    slash.destroy();

    this.registry.set("credits", (this.cache.json.get("credits") as Credit[]) ?? []);
    this.scene.start("demo");
  }
}
