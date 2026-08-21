import Phaser from "phaser";
import { GAME_W, GAME_H } from "./game/balance";
import { BootScene } from "./scenes/BootScene";
import { DemoScene } from "./scenes/DemoScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#0e0f1a",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, DemoScene],
});
