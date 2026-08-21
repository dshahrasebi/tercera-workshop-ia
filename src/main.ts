import Phaser from "phaser";
import { GAME_W, GAME_H } from "./game/balance";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";
import { ResultScene } from "./scenes/ResultScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#0e0f1a",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { debug: false } },
  scene: [BootScene, TitleScene, GameScene, ResultScene],
});

// Expose the running game for debugging / smoke tests. Harmless (no secrets client-side).
(window as unknown as { game?: Phaser.Game }).game = game;
