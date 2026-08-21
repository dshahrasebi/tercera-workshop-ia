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
  BOSS_HP,
  BOSS_SPEED,
  BOSS_REWARD,
  BOSS_CHARGE_INTERVAL_MS,
  BOSS_CHARGE_SPEED,
  BOSS_PROJECTILE_INTERVAL_MS,
  BOSS_PROJECTILE_SPEED,
} from "../game/balance";
import { WEAPONS, Weapon } from "../game/weapons";
import { getLang, toggleLang, t } from "../i18n";
import { showCard } from "../ui/cards";
import { play } from "../audio/sfx";
import type { Credit } from "./BootScene";

type Sprite = Phaser.Physics.Arcade.Sprite;
type Phase = "guardians" | "boss" | "done";
type BossState = "chase" | "telegraph" | "charge";

export class GameScene extends Phaser.Scene {
  private player!: Sprite;
  private guardians!: Sprite[];
  private boss?: Sprite;
  private orbs: Sprite[] = [];
  private bars = new WeakMap<Sprite, Phaser.GameObjects.Graphics>();
  private chest!: Phaser.GameObjects.Image;
  private chestOpened = false;

  private tokens = START_TOKENS;
  private hearts = PLAYER_MAX_HEARTS;
  private weaponIndex = 0;
  private seenWeapons = new Set<string>();

  private phase: Phase = "guardians";
  private weaponUsage: Record<string, number> = { nano: 0, standard: 0, frontier: 0 };
  private startTime = 0;

  // Boss timing/state.
  private bossState: BossState = "chase";
  private bossStateUntil = 0;
  private bossNextChargeAt = 0;
  private bossNextShotAt = 0;

  private facing = new Phaser.Math.Vector2(0, 1);
  private nextAttackAt = 0;
  private invulnUntil = 0;
  private locked = false; // true while a reveal card is open or the run is ending

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // HUD
  private hudTokens!: Phaser.GameObjects.Text;
  private hudHearts!: Phaser.GameObjects.Text;
  private hudWeaponIcon!: Phaser.GameObjects.Image;
  private hudWeapon!: Phaser.GameObjects.Text;
  private hudMission!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  constructor() {
    super("game");
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
    this.phase = "guardians";
    this.weaponIndex = 0;
    this.seenWeapons.clear();
    this.weaponUsage = { nano: 0, standard: 0, frontier: 0 };
    this.orbs = [];
    this.boss = undefined;
    this.startTime = this.time.now;

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

    // Guardians (mission 1).
    this.guardians = [];
    const spots = [
      { x: GAME_W / 2, y: WALL_INSET + 80 },
      { x: WALL_INSET + 140, y: GAME_H / 2 },
      { x: GAME_W - WALL_INSET - 140, y: GAME_H / 2 },
    ];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const s = spots[i % spots.length];
      this.spawnGuardian(s.x, s.y);
    }

    this.buildHud();
    this.bindInput();
    this.refreshHud();

    this.showIntro();
  }

  // ---------- setup helpers ----------

  private spawnGuardian(x: number, y: number) {
    const e = this.physics.add.sprite(x, y, "enemy").setDepth(11);
    fitHeight(e, 64);
    e.setData("hp", ENEMY_HP);
    e.setData("maxHp", ENEMY_HP);
    e.setData("barW", 44);
    this.bars.set(e, this.add.graphics().setDepth(40));
    this.guardians.push(e);
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    kb.addCapture(["SPACE", "TAB", "ONE", "TWO", "THREE"]);
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;

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

    this.hudMission = this.add
      .text(GAME_W - 16, 22, "", { fontFamily: "system-ui", fontSize: "14px", color: "#8ff0d4" })
      .setOrigin(1, 0.5)
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
    this.refreshMission();
  }

  private refreshMission() {
    if (!this.hudMission) return;
    if (this.phase === "boss") {
      this.hudMission.setText(`${t("mission_label")}: ${t("mission_boss")}`);
    } else {
      const left = this.guardians.filter((g) => g.active).length;
      this.hudMission.setText(`${t("mission_label")}: ${t("mission_guardians")} (${left})`);
    }
  }

  private refreshHud() {
    this.hudHearts.setText("♥".repeat(this.hearts) + "♡".repeat(PLAYER_MAX_HEARTS - this.hearts));
    this.hudTokens.setText(`${this.tokens}`);
    const w = this.weapon;
    this.hudWeaponIcon.setTexture(w.sprite);
    this.hudWeaponIcon.setScale(26 / (this.hudWeaponIcon.height || 26)); // keep height, preserve aspect
    this.hudWeapon.setText(`${w.label[getLang()]}  ·  ${t("hud_cost")} ${w.cost}  ·  ${w.tier[getLang()]}`);
    this.hudWeapon.setColor(hex(w.color));
    this.refreshMission();
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

    // Guardians chase + touch damage + hp bars.
    for (const e of this.guardians) {
      if (!e.active) continue;
      this.physics.moveToObject(e, this.player, ENEMY_SPEED);
      this.drawHpBar(e);
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < e.displayHeight * 0.45 + this.player.displayHeight * 0.4) {
        this.hurtPlayer(e, time);
      }
    }

    if (this.boss && this.boss.active) this.updateBoss(time);
    this.updateOrbs(time);
  }

  // ---------- boss ----------

  private startBoss() {
    if (this.phase !== "guardians") return;
    this.phase = "boss";
    play("boss");
    this.withCard(async () => {
      await showCard({
        tag: t("boss_appears_tag"),
        title: t("boss_appears_title"),
        bodyHtml: t("boss_appears_body"),
      });
      this.spawnBoss();
    });
  }

  private spawnBoss() {
    const b = this.physics.add.sprite(GAME_W / 2, WALL_INSET + 120, "boss").setDepth(11);
    fitHeight(b, 150);
    b.setCollideWorldBounds(true);
    b.setData("hp", BOSS_HP);
    b.setData("maxHp", BOSS_HP);
    b.setData("barW", 130);
    b.setData("boss", true);
    this.bars.set(b, this.add.graphics().setDepth(40));
    this.boss = b;
    const now = this.time.now;
    this.bossState = "chase";
    this.bossNextChargeAt = now + BOSS_CHARGE_INTERVAL_MS;
    this.bossNextShotAt = now + BOSS_PROJECTILE_INTERVAL_MS;
    // Dramatic entrance.
    b.setScale(b.scale * 0.2);
    this.tweens.add({ targets: b, scale: fitScale(b, 150), duration: 420, ease: "Back.out" });
    this.cameras.main.shake(300, 0.01);
    this.refreshMission();
  }

  private updateBoss(time: number) {
    const b = this.boss!;
    this.drawHpBar(b);

    if (this.bossState === "chase") {
      this.physics.moveToObject(b, this.player, BOSS_SPEED);
      if (time >= this.bossNextChargeAt) {
        // Telegraph the charge.
        this.bossState = "telegraph";
        this.bossStateUntil = time + 650;
        b.setVelocity(0, 0);
        b.setTint(0xff3030);
        this.tweens.add({ targets: b, scaleX: b.scaleX * 1.12, scaleY: b.scaleY * 1.12, yoyo: true, repeat: 2, duration: 200 });
      } else if (time >= this.bossNextShotAt) {
        this.fireOrb();
        this.bossNextShotAt = time + BOSS_PROJECTILE_INTERVAL_MS;
      }
    } else if (this.bossState === "telegraph") {
      b.setVelocity(0, 0);
      if (time >= this.bossStateUntil) {
        const dir = new Phaser.Math.Vector2(this.player.x - b.x, this.player.y - b.y).normalize();
        b.setVelocity(dir.x * BOSS_CHARGE_SPEED, dir.y * BOSS_CHARGE_SPEED);
        b.clearTint();
        play("boss");
        this.bossState = "charge";
        this.bossStateUntil = time + 480;
      }
    } else {
      // charge
      if (time >= this.bossStateUntil) {
        this.bossState = "chase";
        this.bossNextChargeAt = time + BOSS_CHARGE_INTERVAL_MS;
        b.setVelocity(0, 0);
      }
    }

    const d = Phaser.Math.Distance.Between(b.x, b.y, this.player.x, this.player.y);
    if (d < b.displayHeight * 0.42 + this.player.displayHeight * 0.4) this.hurtPlayer(b, time);
  }

  private fireOrb() {
    const b = this.boss!;
    const orb = this.physics.add.sprite(b.x, b.y, "orb").setDepth(15);
    const dir = new Phaser.Math.Vector2(this.player.x - b.x, this.player.y - b.y).normalize();
    orb.setVelocity(dir.x * BOSS_PROJECTILE_SPEED, dir.y * BOSS_PROJECTILE_SPEED);
    orb.setData("dieAt", this.time.now + 4200);
    this.orbs.push(orb);
    play("attack");
  }

  private updateOrbs(time: number) {
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      if (time >= (orb.getData("dieAt") as number)) {
        orb.destroy();
        continue;
      }
      const d = Phaser.Math.Distance.Between(orb.x, orb.y, this.player.x, this.player.y);
      if (d < 16 + this.player.displayHeight * 0.34) {
        this.burst(orb.x, orb.y, 0xff8cf0, 8);
        orb.destroy();
        this.hurtPlayer(orb, time);
      }
    }
    this.orbs = this.orbs.filter((o) => o.active);
  }

  // ---------- combat ----------

  private selectWeapon(i: number) {
    this.weaponIndex = i;
    this.refreshHud();
    play("ui");
    if (this.locked) return;
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
      play("deny");
      return;
    }
    this.nextAttackAt = this.time.now + ATTACK_COOLDOWN_MS;
    this.tokens -= w.cost;
    this.weaponUsage[w.id] = (this.weaponUsage[w.id] ?? 0) + 1;
    this.refreshHud();
    play("attack");

    this.spawnSlash(w);
    this.tweens.add({ targets: this.player, scaleX: this.player.scaleX * 1.08, yoyo: true, duration: 80 });

    const hit = this.enemiesInReach(w);
    for (const e of hit) this.damageEnemy(e, w.damage);
    if (hit.length) {
      this.hitStop();
      this.cameras.main.shake(120, 0.006);
      play("hit");
    }
  }

  private activeTargets(): Sprite[] {
    const a: Sprite[] = this.guardians.filter((g) => g.active);
    if (this.boss && this.boss.active) a.push(this.boss);
    return a;
  }

  private enemiesInReach(w: Weapon): Sprite[] {
    const out: Sprite[] = [];
    let nearest: Sprite | null = null;
    let nearestD = Infinity;
    for (const e of this.activeTargets()) {
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
    this.time.delayedCall(60, () => {
      if (e.active) e.clearTint();
    });
    if (!e.getData("boss")) {
      const kb = new Phaser.Math.Vector2(e.x - this.player.x, e.y - this.player.y).normalize().scale(220);
      e.setVelocity(kb.x, kb.y);
    }
    if (hp <= 0) this.killTarget(e);
  }

  private killTarget(e: Sprite) {
    const isBoss = !!e.getData("boss");
    const reward = isBoss ? BOSS_REWARD : ENEMY_KILL_REWARD;
    this.tokens += reward;
    this.refreshHud();
    this.floating(e.x, e.y - 20, `+${reward}`, "#ffd65a");
    this.burst(e.x, e.y, 0xffd65a, isBoss ? 42 : 20);
    this.cameras.main.shake(isBoss ? 380 : 160, isBoss ? 0.014 : 0.008);
    play("coin");
    this.bars.get(e)?.destroy();
    e.disableBody(true, true);

    if (isBoss) {
      this.onVictory();
      return;
    }
    this.refreshMission();
    if (this.phase === "guardians" && this.guardians.every((g) => !g.active)) {
      this.time.delayedCall(500, () => this.startBoss());
    }
  }

  private hurtPlayer(from: Sprite, time: number) {
    if (time < this.invulnUntil || this.locked) return;
    this.invulnUntil = time + PLAYER_IFRAMES_MS;
    this.hearts = Math.max(0, this.hearts - 1);
    this.refreshHud();
    this.cameras.main.shake(120, 0.006);
    play("hurt");
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
    play("coin");
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
    const max = (e.getData("maxHp") as number) || ENEMY_HP;
    const w = (e.getData("barW") as number) || 44;
    const x = e.x - w / 2;
    const y = e.y - e.displayHeight * 0.5 - 12;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle(e.getData("boss") ? 0xff5d3a : 0xff4bd8, 1).fillRect(x, y, (w * hp) / max, 4);
  }

  // ---------- cards (pause while open) ----------

  private async withCard(fn: () => Promise<void>) {
    this.locked = true;
    this.player.setVelocity(0, 0);
    await fn();
    if (this.phase !== "done") this.locked = false;
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
    if (this.phase === "done") return;
    this.phase = "done";
    this.locked = true;
    play("victory");
    this.cameras.main.flash(300, 120, 255, 200);
    const durationMs = Math.round(this.time.now - this.startTime);
    this.time.delayedCall(700, () =>
      this.scene.start("result", { mode: "victory", tokens: this.tokens, durationMs, weaponUsage: { ...this.weaponUsage } })
    );
  }

  private onDefeat() {
    if (this.phase === "done") return;
    this.phase = "done";
    this.locked = true;
    const durationMs = Math.round(this.time.now - this.startTime);
    this.time.delayedCall(800, () =>
      this.scene.start("result", { mode: "defeat", tokens: this.tokens, durationMs, weaponUsage: { ...this.weaponUsage } })
    );
  }
}

// Scale a game object to a target on-screen height, preserving aspect.
function fitHeight(obj: Phaser.GameObjects.Components.Transform & { height: number }, target: number) {
  obj.setScale(fitScale(obj, target));
}
function fitScale(obj: { height: number }, target: number): number {
  return target / obj.height;
}

function hex(n: number): string {
  return "#" + n.toString(16).padStart(6, "0");
}
