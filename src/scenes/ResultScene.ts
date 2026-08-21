import Phaser from "phaser";
import { GAME_W, GAME_H } from "../game/balance";
import { renderResult, hideScreen, ResultState } from "../ui/screens";
import { submitScore, fetchLeaderboard, getPlayerName } from "../net/api";
import { toggleLang, getLang } from "../i18n";
import { play } from "../audio/sfx";
import type { Credit } from "./BootScene";

interface ResultData {
  mode?: "victory" | "defeat" | "leaderboard";
  tokens?: number;
  durationMs?: number;
  weaponUsage?: Record<string, number>;
}

// End-of-run screen: final tally + weapon usage + "made with AI" cost, then submits the
// score (on victory) and shows the shared leaderboard. Fails soft to an offline message.
export class ResultScene extends Phaser.Scene {
  private state!: ResultState;
  private submitted = false;

  constructor() {
    super("result");
  }

  create(data: ResultData) {
    const bgKey = this.textures.exists("room") ? "room" : "title";
    this.add.image(GAME_W / 2, GAME_H / 2, bgKey).setDisplaySize(GAME_W, GAME_H).setDepth(0).setTint(0x55627a);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x05060f, 0.5).setOrigin(0, 0).setDepth(1);

    const mode = data.mode ?? "leaderboard";
    this.submitted = false;

    this.state = {
      mode,
      tokens: data.tokens ?? 0,
      usage: data.weaponUsage ?? {},
      costText: this.costText(),
      statusKey: null,
      leaderboard: null,
      offline: false,
      youId: null,
      onPrimary: () => {
        play("ui");
        hideScreen();
        this.scene.start("game");
      },
      onMenu: () => {
        play("ui");
        hideScreen();
        this.scene.start("title");
      },
      onToggleLang: () => {
        toggleLang();
        this.game.canvas.parentElement?.setAttribute("lang", getLang());
        play("ui");
        this.render();
      },
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, hideScreen);

    this.render();
    void this.flow(data);
  }

  private costText(): string | null {
    const credits = (this.registry.get("credits") as Credit[]) ?? [];
    const total = credits.reduce((sum, c) => sum + (c.approxCostUsd ?? 0), 0);
    return total > 0 ? `$${total.toFixed(2)}` : null;
  }

  private async flow(data: ResultData) {
    if (data.mode === "victory" && !this.submitted) {
      this.submitted = true;
      this.state.statusKey = "result_submitting";
      this.render();
      try {
        const row = await submitScore({
          name: getPlayerName() || "Anon",
          tokens: data.tokens ?? 0,
          durationMs: data.durationMs ?? 0,
          weaponUsage: data.weaponUsage ?? {},
        });
        this.state.statusKey = "result_submit_ok";
        this.state.youId = row.id;
      } catch {
        this.state.statusKey = "result_submit_fail";
        this.state.offline = true;
      }
      this.render();
    }

    if (!this.state.offline) {
      try {
        this.state.leaderboard = await fetchLeaderboard(20);
      } catch {
        this.state.offline = true;
      }
    }
    this.render();
  }

  private render() {
    renderResult(this.state);
  }
}
