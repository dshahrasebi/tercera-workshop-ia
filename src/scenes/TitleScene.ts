import Phaser from "phaser";
import { GAME_W, GAME_H } from "../game/balance";
import { renderTitle, hideScreen } from "../ui/screens";
import { getPlayerName, setPlayerName } from "../net/api";
import { toggleLang, getLang } from "../i18n";
import { isMuted, toggleMuted, unlockAudio, play } from "../audio/sfx";

// Title screen: AI key-art background + a DOM overlay (name entry, play, leaderboard,
// language + sound toggles). The Phaser scene owns the art; the DOM owns the controls.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  create() {
    this.add.image(GAME_W / 2, GAME_H / 2, "title").setDisplaySize(GAME_W, GAME_H).setDepth(0);
    this.game.canvas.parentElement?.setAttribute("lang", getLang());
    this.renderUI();
    // Clean up the DOM overlay whenever this scene stops.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, hideScreen);
  }

  private renderUI() {
    renderTitle({
      name: getPlayerName(),
      muted: isMuted(),
      onPlay: (name) => {
        if (name) setPlayerName(name);
        unlockAudio();
        play("ui");
        hideScreen();
        this.scene.start("game");
      },
      onLeaderboard: () => {
        unlockAudio();
        play("ui");
        hideScreen();
        this.scene.start("result", { mode: "leaderboard" });
      },
      onToggleLang: () => {
        toggleLang();
        this.game.canvas.parentElement?.setAttribute("lang", getLang());
        play("ui");
        this.renderUI();
      },
      onToggleSound: () => {
        const muted = toggleMuted();
        if (!muted) unlockAudio();
        play("ui");
        this.renderUI();
      },
    });
  }
}
