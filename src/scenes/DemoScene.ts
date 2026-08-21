import Phaser from "phaser";
import {
  GAME_W,
  GAME_H,
  PLAYER_SPEED,
  PLAYER_MAX_HEARTS,
  PLAYER_IFRAMES_MS,
  ATTACK_COOLDOWN_MS,
  START_TOKENS,
  ENEMY_HP,
  ENEMY_SPEED,
  ENEMY_COUNT,
  ENEMY_KILL_REWARD,
  CHEST_REWARD,
  WALL_INSET,
} from "../game/balance";
import { WEAPONS, Weapon } from "../game/weapons";
import { getLang, toggleLang, t } from "../i18n";
import { showCard } from "../ui/cards";
import type { Credit } from "./BootScene";

type Sprite = Phaser.Physics.Arcade.Sprite;

export class DemoScene extends Phaser.Scene {
  private player!: Sprite;
  private enemies!: Sprite[];
  private bars = new WeakMap<Sprite, Phaser.GameObjects.Graphics>();
  private chest!: Phaser.GameObjects.Image;
  private chestOpened = false;

  private tokens = START_TOKENS;
  private hearts = PLAYER_MAX_HEARTS;
  private weaponIndex = 0;
  private seenWeapons = new Set<string>();

  private facing = new Phaser.Math.Vector2(0, 1);
  private nextAttackAt = 0;
  private invulnUntil = 0;
  private locked = false; // true while a reveal card is open

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // HUD
  private hudTokens!: Phaser.GameObjects.Text;
  private hudHearts!: Phaser.GameObjects.Text;
  private hudWeaponIcon!: Phaser.GameObjects.Image;
  private hudWeapon!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("demo");
  }

  private get weapon(): Weapon {
    return WEAPONS[this.weaponIndex];
  }

  create() {
    // Reset (scene can restart).
    this.tokens = START_TOKENS;
    this.hearts = PLAYER_MAX_HEARTS;
    this.weaponIndex = 0;
    this.chestOpened = false;
    this.locked = false;
    this.seenWeapons.clear();

    // Room background.
    this.add.image(GAME_W / 2, GAME_H / 2, "room").setDisplaySize(GAME_W, GAME_H).setDepth(0);

    // Keep the player off the painted walls.
    this.physics.world.setBounds(
      WALL_INSET,
      WALL_INSET,
      GAME_W - 2 * WALL_INSET,
      GAME_H - 2 * WALL_INSET
    );

    // Chest (top-left area).
    this.chest = this.add.image(WALL_INSET + 70, WALL_INSET + 60, "chest").setDepth(10);
    fitHeight(this.chest, 66);

    // Player.
    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H - WALL_INSET - 40, "hero");
    this.player.setDepth(12).setCollideWorldBounds(true);
    fitHeight(this.player, 78);

    // Enemies.
    this.enemies = [];
    const spots = [
      { x: GAME_W / 2, y: WALL_INSET + 80 },
      { x: WALL_INSET + 140, y: GAME_H / 2 },
      { x: GAME_W - WALL_INSET - 140, y: GAME_H / 2 },
    ];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const s = spots[i % spots.length];
      this.spawnEnemy(s.x, s.y);
    }

    this.buildHud();
    this.bindInput();
    this.refreshHud();

    // Intro reveal card.
    this.showIntro();
  }

  // ---------- setup helpers ----------

  private spawnEnemy(x: number, y: number) {
    const e = this.physics.add.sprite(x, y, "enemy").setDepth(11);
    fitHeight(e, 64);
    e.setData("hp", ENEMY_HP);
    this.bars.set(e, this.add.graphics().setDepth(40));
    this.enemies.push(e);
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    kb.addCapture(["SPACE", "TAB", "ONE", "TWO", "THREE"]);
    this.keys = kb.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT"
    ) as Record<string, Phaser.Input.Keyboard.Key>;

    kb.on("keydown-SPACE", () => this.attack());
    this.input.on("pointerdown", () => this.attack());
    kb.on("keydown-ONE", () => this.selectWeapon(0));
    kb.on("keydown-TWO", () => this.selectWeapon(1));
    kb.on("keydown-THREE", () => this.selectWeapon(2));
    kb.on("keydown-E", () => this.tryOpenChest());
    kb.on("keydown-TAB", () => {
      toggleLang();
      this.refreshTexts();
      this.refreshHud();
    });
  }

  private buildHud() {
    this.add.rectangle(0, 0, GAME_W, 44, 0x0a0b16, 0.72).setOrigin(0, 0).setDepth(90);

    this.hudHearts = this.add
      .text(16, 22, "", { fontFamily: "system-ui", fontSize: "22px", color: "#ff5d7a" })
      .setOrigin(0, 0.5)
      .setDepth(100);

    this.add.image(210, 22, "token").setDepth(100).setDisplaySize(24, 24);
    this.hudTokens = this.add
      .text(228, 22, "", {
        fontFamily: "system-ui",
        fontSize: "20px",
        color: "#ffd65a",
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5)
      .setDepth(100);

    this.hudWeaponIcon = this.add.image(430, 22, "weapon_nano").setDepth(100).setDisplaySize(26, 26);
    this.hudWeapon = this.add
      .text(450, 22, "", { fontFamily: "system-ui", fontSize: "16px", color: "#e8e9f3" })
      .setOrigin(0, 0.5)
      .setDepth(100);

    this.hintText = this.add
      .text(GAME_W / 2, GAME_H - 18, "", {
        fontFamily: "system-ui",
        fontSize: "13px",
        color: "#aab0d8",
      })
      .setOrigin(0.5)
      .setDepth(100);

    this.refreshTexts();
  }

  private refreshTexts() {
    this.hintText.setText(t("hint"));
    this.game.canvas.parentElement?.setAttribute("lang", getLang());
  }

  private refreshHud() {
    this.hudHearts.setText("♥".repeat(this.hearts) + "♡".repeat(PLAYER_MAX_HEARTS - this.hearts));
    this.hudTokens.setText(`${this.tokens}`);
    const w = this.weapon;
    this.hudWeaponIcon.setTexture(w.sprite);
    this.hudWeaponIcon.setScale(26 / (this.hudWeaponIcon.height || 26)); // keep height, preserve aspect
    this.hudWeapon.setText(`${w.label[getLang()]}  ·  ${t("hud_cost")} ${w.cost}  ·  ${w.tier[getLang()]}`);
    this.hudWeapon.setColor(hex(w.color));
  }

  // ---------- gameplay ----------

  update(time: number) {
    if (this.locked) {
      this.player.setVelocity(0, 0);
      return;
    }

    // Movement.
    const k = this.keys;
    let vx = 0;
    let vy = 0;
    if (k.A.isDown || k.LEFT.isDown) vx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) vx += 1;
    if (k.W.isDown || k.UP.isDown) vy -= 1;
    if (k.S.isDown || k.DOWN.isDown) vy += 1;
    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.lengthSq() > 0) {
      v.normalize();
      this.facing.copy(v);
      if (vx !== 0) this.player.setFlipX(vx < 0);
    }
    this.player.setVelocity(v.x * PLAYER_SPEED, v.y * PLAYER_SPEED);

    // Enemies chase + touch damage + hp bars.
    for (const e of this.enemies) {
      if (!e.active) continue;
      this.physics.moveToObject(e, this.player, ENEMY_SPEED);
      this.drawHpBar(e);
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < e.displayHeight * 0.45 + this.player.displayHeight * 0.4) {
        this.hurtPlayer(e, time);
      }
    }
  }

  private selectWeapon(i: number) {
    if (this.locked || i === this.weaponIndex) {
      this.weaponIndex = i;
      this.refreshHud();
      return;
    }
    this.weaponIndex = i;
    this.refreshHud();
    this.floating(this.player.x, this.player.y - 54, this.weapon.label[getLang()], hex(this.weapon.color));
    if (!this.seenWeapons.has(this.weapon.id)) {
      this.seenWeapons.add(this.weapon.id);
      this.showWeaponCard(this.weapon);
    }
  }

  private attack() {
    if (this.locked || this.time.now < this.nextAttackAt) return;
    const w = this.weapon;
    if (this.tokens < w.cost) {
      this.cameras.main.flash(120, 90, 0, 0);
      this.floating(this.player.x, this.player.y - 50, t("no_tokens"), "#ff6b6b");
      return;
    }
    this.nextAttackAt = this.time.now + ATTACK_COOLDOWN_MS;
    this.tokens -= w.cost;
    this.refreshHud();

    this.spawnSlash(w);
    this.tweens.add({ targets: this.player, scaleX: this.player.scaleX * 1.08, yoyo: true, duration: 80 });

    // Resolve hits.
    const hit = this.enemiesInReach(w);
    for (const e of hit) this.damageEnemy(e, w.damage);
    if (hit.length) {
      this.hitStop();
      this.cameras.main.shake(120, 0.006);
    }
  }

  private enemiesInReach(w: Weapon): Sprite[] {
    const out: Sprite[] = [];
    let nearest: Sprite | null = null;
    let nearestD = Infinity;
    for (const e of this.enemies) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d > w.range) continue;
      if (w.aoe) {
        out.push(e);
      } else {
        const to = new Phaser.Math.Vector2(e.x - this.player.x, e.y - this.player.y).normalize();
        if (to.dot(this.facing) > 0.25 && d < nearestD) {
          nearest = e;
          nearestD = d;
        }
      }
    }
    if (!w.aoe && nearest) out.push(nearest);
    return out;
  }

  private damageEnemy(e: Sprite, dmg: number) {
    const hp = (e.getData("hp") as number) - dmg;
    e.setData("hp", hp);
    this.floating(e.x, e.y - e.displayHeight * 0.5, `-${dmg}`, "#ffffff");
    this.burst(e.x, e.y, this.weapon.color, 8);
    e.setTintFill(0xffffff);
    this.time.delayedCall(60, () => e.active && e.clearTint());
    // Knockback.
    const kb = new Phaser.Math.Vector2(e.x - this.player.x, e.y - this.player.y).normalize().scale(220);
    e.setVelocity(kb.x, kb.y);
    if (hp <= 0) this.killEnemy(e);
  }

  private killEnemy(e: Sprite) {
    this.tokens += ENEMY_KILL_REWARD;
    this.refreshHud();
    this.floating(e.x, e.y - 20, `+${ENEMY_KILL_REWARD}`, "#ffd65a");
    this.burst(e.x, e.y, 0xffd65a, 20);
    this.cameras.main.shake(160, 0.008);
    this.bars.get(e)?.destroy();
    e.disableBody(true, true);
    if (this.enemies.every((x) => !x.active)) {
      this.time.delayedCall(500, () => this.onVictory());
    }
  }

  private hurtPlayer(from: Sprite, time: number) {
    if (time < this.invulnUntil) return;
    this.invulnUntil = time + PLAYER_IFRAMES_MS;
    this.hearts = Math.max(0, this.hearts - 1);
    this.refreshHud();
    this.cameras.main.shake(120, 0.006);
    const kb = new Phaser.Math.Vector2(this.player.x - from.x, this.player.y - from.y).normalize().scale(260);
    this.player.setVelocity(kb.x, kb.y);
    this.tweens.add({ targets: this.player, alpha: 0.35, yoyo: true, repeat: 3, duration: 100, onComplete: () => this.player.setAlpha(1) });
    if (this.hearts <= 0) this.onDefeat();
  }

  private tryOpenChest() {
    if (this.locked || this.chestOpened) return;
    const d = Phaser.Math.Distance.Between(this.chest.x, this.chest.y, this.player.x, this.player.y);
    if (d > 90) return;
    this.chestOpened = true;
    this.tokens += CHEST_REWARD;
    this.refreshHud();
    this.floating(this.chest.x, this.chest.y - 40, `+${CHEST_REWARD}`, "#ffd65a");
    this.burst(this.chest.x, this.chest.y, 0xffd65a, 24);
    this.chest.setTint(0x8a8a8a);
    this.tweens.add({ targets: this.chest, scaleX: this.chest.scaleX * 1.15, scaleY: this.chest.scaleY * 1.15, yoyo: true, duration: 120 });
    this.showChestCard();
  }

  // ---------- fx ----------

  private spawnSlash(w: Weapon) {
    const off = w.range * 0.5;
    const s = this.add
      .image(this.player.x + this.facing.x * off, this.player.y + this.facing.y * off, "slash")
      .setDepth(20)
      .setTint(w.color)
      .setRotation(Math.atan2(this.facing.y, this.facing.x))
      .setScale(w.range / 55);
    this.tweens.add({ targets: s, alpha: 0, scale: s.scale * 1.25, duration: 180, onComplete: () => s.destroy() });
  }

  private burst(x: number, y: number, color: number, qty: number) {
    const p = this.add.particles(x, y, "spark", {
      speed: { min: 40, max: 180 },
      lifespan: 360,
      quantity: qty,
      scale: { start: 0.9, end: 0 },
      tint: color,
      emitting: false,
    });
    p.setDepth(30);
    p.explode(qty);
    this.time.delayedCall(420, () => p.destroy());
  }

  private floating(x: number, y: number, text: string, color: string) {
    const tx = this.add
      .text(x, y, text, { fontFamily: "system-ui", fontSize: "16px", color, stroke: "#000", strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({ targets: tx, y: y - 34, alpha: 0, duration: 720, ease: "Cubic.out", onComplete: () => tx.destroy() });
  }

  private hitStop() {
    this.physics.world.isPaused = true;
    this.time.delayedCall(55, () => (this.physics.world.isPaused = false));
  }

  private drawHpBar(e: Sprite) {
    const g = this.bars.get(e);
    if (!g) return;
    const hp = Math.max(0, e.getData("hp") as number);
    const w = 44;
    const x = e.x - w / 2;
    const y = e.y - e.displayHeight * 0.5 - 12;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle(0xff4bd8, 1).fillRect(x, y, (w * hp) / ENEMY_HP, 4);
  }

  // ---------- cards (pause while open) ----------

  private async withCard(fn: () => Promise<void>) {
    this.locked = true;
    this.player.setVelocity(0, 0);
    await fn();
    this.locked = false;
  }

  private showIntro() {
    this.withCard(() =>
      showCard({ tag: t("intro_tag"), title: t("intro_title"), bodyHtml: t("intro_body") })
    );
  }

  private showWeaponCard(w: Weapon) {
    this.withCard(() =>
      showCard({
        tag: t("weapon_tag"),
        title: `${w.label[getLang()]} — ${w.tier[getLang()]}`,
        bodyHtml: w.blurb[getLang()],
        meta: [{ k: t("hud_cost"), v: `${w.cost} tokens` }],
      })
    );
  }

  private showChestCard() {
    const credit = (this.registry.get("credits") as Credit[]).find((c) => c.name === "chest");
    this.withCard(() =>
      showCard({
        tag: t("chest_tag"),
        title: t("chest_title"),
        bodyHtml: t("chest_body"),
        prompt: credit?.prompt,
        meta: credit
          ? [
              { k: t("meta_model"), v: credit.model },
              { k: t("meta_quality"), v: credit.quality },
              { k: t("meta_cost"), v: credit.approxCostUsd != null ? `$${credit.approxCostUsd}` : "—" },
            ]
          : [],
      })
    );
  }

  private onVictory() {
    this.withCard(async () => {
      await showCard({
        tag: t("victory_tag"),
        title: t("victory_title"),
        bodyHtml: t("victory_body_pre").replace("{tokens}", `${this.tokens}`),
      });
      this.scene.restart();
    });
  }

  private onDefeat() {
    this.withCard(async () => {
      await showCard({
        tag: t("victory_tag"),
        title: getLang() === "es" ? "Te quedaste sin corazones" : "You ran out of hearts",
        bodyHtml:
          getLang() === "es"
            ? "Pero conservaste tus tokens. Vuelve a intentarlo y gasta con criterio."
            : "But you kept your tokens. Try again and spend deliberately.",
      });
      this.scene.restart();
    });
  }
}

// Scale a game object to a target on-screen height, preserving aspect.
function fitHeight(obj: Phaser.GameObjects.Components.Transform & { height: number }, target: number) {
  const s = target / obj.height;
  obj.setScale(s);
}

function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}
