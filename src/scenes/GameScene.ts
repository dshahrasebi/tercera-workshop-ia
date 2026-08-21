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
  ENEMY_LUNGE_RANGE,
  ENEMY_LUNGE_INTERVAL_MS,
  ENEMY_LUNGE_TELEGRAPH_MS,
  ENEMY_LUNGE_SPEED,
  ENEMY_LUNGE_DURATION_MS,
  DASH_SPEED,
  DASH_DURATION_MS,
  DASH_COOLDOWN_MS,
  DASH_IFRAMES_MS,
  COMBO_WINDOW_MS,
  COMBO_BONUS_TOKENS,
  CHEST_REWARD,
  WALL_INSET,
  PLAYER_RADIUS,
  ENEMY_RADIUS,
  BOSS_RADIUS,
  ORB_RADIUS,
  PLAYER_HURT_KNOCKBACK,
  ENEMY_HIT_KNOCKBACK,
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
import { play } from "../audio/sfx";
import type { Credit } from "./BootScene";

type Sprite = Phaser.Physics.Arcade.Sprite;
type Phase = "guardians" | "boss" | "done";
type BossState = "chase" | "telegraph" | "charge";

export class GameScene extends Phaser.Scene {
  private player!: Sprite;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerGlow!: Phaser.GameObjects.Image;
  private playerPlate!: Phaser.GameObjects.Ellipse;
  private playerCore!: Phaser.GameObjects.Ellipse;
  private playerTrail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private guardians!: Sprite[];
  private boss?: Sprite;
  private bossTelegraph?: Phaser.GameObjects.Ellipse;
  private orbs: Sprite[] = [];
  private layoutWalls: Phaser.GameObjects.Rectangle[] = [];
  private bars = new WeakMap<Sprite, Phaser.GameObjects.Graphics>();
  private auras = new WeakMap<Sprite, Phaser.GameObjects.Ellipse>();
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

  // Dash/dodge state.
  private dashDir = new Phaser.Math.Vector2(0, 1);
  private dashUntil = 0;
  private nextDashAt = 0;

  // Kill-streak state.
  private combo = 0;
  private comboUntil = 0;

  // In-game notification banners (non-blocking; replace the old dark modal cards).
  private notes: Array<{ tag: string; title: string; body?: string; color?: number; hold?: number }> = [];
  private noteActive = false;
  private noteBox?: Phaser.GameObjects.Container;
  private noteState: "entering" | "holding" | "leaving" | "none" = "none";
  private noteW = 0;
  private noteH = 0;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  // HUD
  private hudTokens!: Phaser.GameObjects.Text;
  private hudHearts!: Phaser.GameObjects.Text;
  private hudWeaponIcon!: Phaser.GameObjects.Image;
  private hudWeapon!: Phaser.GameObjects.Text;
  private hudMission!: Phaser.GameObjects.Text;
  private hudStreak!: Phaser.GameObjects.Text;
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
    this.layoutWalls = [];
    this.boss = undefined;
    this.startTime = this.time.now;
    this.dashUntil = 0;
    this.nextDashAt = 0;
    this.combo = 0;
    this.comboUntil = 0;
    this.notes = [];
    this.noteActive = false;
    this.noteBox = undefined;
    this.noteState = "none";

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

    // Player. Luminous entity treatment contrasts with solid enemies without a fake blob.
    this.playerShadow = this.add.ellipse(0, 0, 46, 16, 0x000000, 0.33).setDepth(2);
    this.playerGlow = this.add
      .image(0, 0, "glow")
      .setTint(0x8affe0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(10)
      .setDisplaySize(150, 150)
      .setAlpha(0.24);
    this.tweens.add({ targets: this.playerGlow, alpha: 0.34, yoyo: true, repeat: -1, duration: 900, ease: "Sine.inOut" });
    this.playerTrail = this.add
      .particles(0, 0, "spark", {
        speed: { min: 8, max: 28 },
        angle: { min: 0, max: 360 },
        lifespan: 360,
        frequency: 32,
        scale: { start: 0.9, end: 0 },
        alpha: { start: 0.85, end: 0 },
        tint: 0x8affe0,
        blendMode: Phaser.BlendModes.ADD,
        maxParticles: 80,
        emitting: false,
      })
      .setDepth(9);
    this.playerCore = this.add
      .ellipse(0, 0, 66, 78, 0x8affe0, 0.1)
      .setStrokeStyle(2, 0xc9fff3, 0.86)
      .setDepth(11);
    this.tweens.add({ targets: this.playerCore, alpha: 0.2, scale: 1.06, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.inOut" });
    this.playerPlate = this.add
      .ellipse(0, 0, 66, 22, 0x8affe0, 0.18)
      .setStrokeStyle(2, 0x8affe0, 0.8)
      .setDepth(11.5);
    this.player = this.physics.add.sprite(GAME_W / 2, GAME_H - WALL_INSET - 40, "hero");
    this.player.setDepth(12).setCollideWorldBounds(true).setAlpha(1);
    fitHeight(this.player, 88);
    this.player.setData("radius", PLAYER_RADIUS);
    if (this.renderer.type === Phaser.WEBGL) {
      this.player.postFX.addGlow(0x8affe0, 4, 0, false, 0.1, 14);
    }

    this.buildLayout();
    this.addLayoutColliders(this.player);

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
    e.setData("radius", ENEMY_RADIUS);
    e.setData("state", "chase");
    e.setData("stateUntil", 0);
    e.setData("nextLungeAt", this.time.now + ENEMY_LUNGE_INTERVAL_MS + Math.random() * 1400);
    this.addLayoutColliders(e);

    // Menacing aura rides behind the guardian and flares red just before it lunges.
    const aura = this.add.ellipse(x, y, 58, 58, 0xff2fb0, 0.22).setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: aura, scale: 1.16, alpha: 0.3, yoyo: true, repeat: -1, duration: 680 + this.guardians.length * 70, ease: "Sine.inOut" });
    this.auras.set(e, aura);

    // Spawn pop, then a slow breathing pulse.
    const baseX = e.scaleX;
    const baseY = e.scaleY;
    e.setScale(baseX * 0.3, baseY * 0.3);
    this.tweens.add({
      targets: e,
      scaleX: baseX,
      scaleY: baseY,
      duration: 240,
      ease: "Back.out",
      onComplete: () => {
        this.tweens.add({
          targets: e,
          scaleX: baseX * 1.05,
          scaleY: baseY * 0.95,
          yoyo: true,
          repeat: -1,
          duration: 620 + this.guardians.length * 90,
          ease: "Sine.inOut",
        });
      },
    });
    if (this.renderer.type === Phaser.WEBGL) e.postFX.addGlow(0xff4bd8, 3, 0, false, 0.08, 10);
    this.bars.set(e, this.add.graphics().setDepth(40));
    this.guardians.push(e);
  }

  private updateGuardian(e: Sprite, time: number) {
    this.auras.get(e)?.setPosition(e.x, e.y);
    const state = e.getData("state") as string;
    const until = e.getData("stateUntil") as number;

    if (state === "telegraph") {
      e.setVelocity(0, 0); // freeze during the wind-up so the tell is readable
      if (time >= until) {
        const dir = new Phaser.Math.Vector2(this.player.x - e.x, this.player.y - e.y).normalize();
        e.setVelocity(dir.x * ENEMY_LUNGE_SPEED, dir.y * ENEMY_LUNGE_SPEED);
        e.setData("state", "lunge");
        e.setData("stateUntil", time + ENEMY_LUNGE_DURATION_MS);
        this.auras.get(e)?.setFillStyle(0xff2fb0, 0.24);
        this.impact(e.x, e.y, 0xff3a3a, this.radiusOf(e) + 12);
        play("attack");
      }
      return;
    }

    if (state === "lunge") {
      if (time >= until) {
        e.setData("state", "chase");
        e.setData("nextLungeAt", time + ENEMY_LUNGE_INTERVAL_MS + Math.random() * 1400);
      }
      return; // ride the committed lunge velocity
    }

    // chase: hunt the player, wind up a lunge when close and off cooldown
    const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
    if (d <= ENEMY_LUNGE_RANGE && time >= (e.getData("nextLungeAt") as number)) {
      e.setData("state", "telegraph");
      e.setData("stateUntil", time + ENEMY_LUNGE_TELEGRAPH_MS);
      e.setVelocity(0, 0);
      this.auras.get(e)?.setFillStyle(0xff3a3a, 0.55);
      this.tweens.add({ targets: e, scaleX: e.scaleX * 1.28, scaleY: e.scaleY * 1.28, yoyo: true, duration: ENEMY_LUNGE_TELEGRAPH_MS / 2, ease: "Quad.out" });
      return;
    }
    this.physics.moveToObject(e, this.player, ENEMY_SPEED);
    e.setFlipX(this.player.x < e.x);
  }

  private buildLayout() {
    const wallY = 270;
    const wallHeight = 18;
    const walls = [
      { x: 350, y: 180, width: 18, height: 180 },
      { x: 610, y: 180, width: 18, height: 180 },
      { x: 157.5, y: wallY, width: 115, height: wallHeight },
      { x: 342.5, y: wallY, width: 25, height: wallHeight },
      { x: 385, y: wallY, width: 70, height: wallHeight },
      { x: 575, y: wallY, width: 70, height: wallHeight },
      { x: 627.5, y: wallY, width: 35, height: wallHeight },
      { x: 812.5, y: wallY, width: 95, height: wallHeight },
    ];
    for (const s of walls) this.buildWall(s.x, s.y, s.width, s.height);

    // Three lit doorways connect left, center, and right upper rooms.
    for (const x of [275, 480, 705]) this.buildDoorway(x, wallY);
  }

  // A carved stone barrier that matches the painted dungeon: cast shadow, dark body,
  // a lit bevel + deep shade for volume, a glowing rune seam, and stone studs.
  private buildWall(x: number, y: number, w: number, h: number) {
    const vertical = h > w;
    this.add.rectangle(x + 5, y + 7, w, h, 0x05080c, 0.42).setDepth(6); // floor shadow

    const body = this.add.rectangle(x, y, w, h, 0x16212e, 1).setDepth(8); // physics body
    this.physics.add.existing(body, true);
    this.layoutWalls.push(body);

    if (vertical) {
      this.add.rectangle(x - w / 2 + 2, y, 3, h - 4, 0x44586e, 0.9).setDepth(9); // lit edge
      this.add.rectangle(x + w / 2 - 1, y, 2, h - 4, 0x05080c, 0.85).setDepth(9); // deep shade
    } else {
      this.add.rectangle(x, y - h / 2 + 2, w - 4, 3, 0x44586e, 0.9).setDepth(9); // lit top
      this.add.rectangle(x, y + h / 2 - 1, w - 4, 2, 0x05080c, 0.85).setDepth(9); // base shade
    }

    const seam = vertical
      ? this.add.rectangle(x, y, 2, h - 14, 0x66f0d8, 0.5)
      : this.add.rectangle(x, y, w - 14, 2, 0x66f0d8, 0.5);
    seam.setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: seam, alpha: 0.16, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.inOut" });

    const studs = Math.max(2, Math.floor((vertical ? h : w) / 42));
    for (let i = 0; i < studs; i++) {
      const f = studs === 1 ? 0.5 : i / (studs - 1);
      const sx = vertical ? x : x - w / 2 + 8 + f * (w - 16);
      const sy = vertical ? y - h / 2 + 8 + f * (h - 16) : y;
      this.add.circle(sx, sy, 1.6, 0x2b3c4e, 0.9).setDepth(9);
    }
  }

  private buildDoorway(x: number, y: number) {
    const glow = this.add.rectangle(x, y, 96, 16, 0x66f0d8, 0.14).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: glow, alpha: 0.3, yoyo: true, repeat: -1, duration: 1600, ease: "Sine.inOut" });
    for (const dx of [-56, 56]) {
      this.add.rectangle(x + dx, y, 10, 40, 0x1a2635, 1).setDepth(9);
      this.add.rectangle(x + dx, y - 18, 12, 5, 0x44586e, 0.95).setDepth(9); // stone cap
      const flame = this.add.circle(x + dx, y - 23, 4, 0xffd27a, 0.9).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: flame, scale: 1.55, alpha: 0.5, yoyo: true, repeat: -1, duration: 240 + Math.random() * 160, ease: "Sine.inOut" });
    }
  }

  private addLayoutColliders(sprite: Sprite) {
    for (const wall of this.layoutWalls) this.physics.add.collider(sprite, wall);
  }

  private bindInput() {
    const kb = this.input.keyboard!;
    // Capture movement/action keys so arrows & space don't scroll the page.
    kb.addCapture(["SPACE", "TAB", "ONE", "TWO", "THREE", "SHIFT", "UP", "DOWN", "LEFT", "RIGHT"]);
    this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as Record<string, Phaser.Input.Keyboard.Key>;

    // SPACE attacks in the direction you're facing; click/tap attacks toward the cursor
    // (full 360° — diagonal and sideways included).
    kb.on("keydown-SPACE", () => this.attack());
    kb.on("keydown-SHIFT", () => this.dash());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const dir = new Phaser.Math.Vector2(p.worldX - this.player.x, p.worldY - this.player.y);
      this.attack(dir.lengthSq() > 4 ? dir : undefined);
    });
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

    this.hudStreak = this.add
      .text(GAME_W / 2, 22, "", {
        fontFamily: "system-ui",
        fontSize: "17px",
        color: "#8affe0",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
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
    // Keep the shadow, aura, and plate glued to the hero (also while paused on a card).
    this.playerShadow.setPosition(this.player.x, this.player.y + this.player.displayHeight * 0.38);
    this.playerGlow.setPosition(this.player.x, this.player.y);
    this.playerCore.setPosition(this.player.x, this.player.y);
    this.playerPlate.setPosition(this.player.x, this.player.y + this.player.displayHeight * 0.38);
    this.player.setAngle(Math.sin(time * 0.004) * 1.4);

    if (this.locked) {
      this.playerTrail.stop();
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
    this.playerTrail.setPosition(this.player.x, this.player.y + this.player.displayHeight * 0.2);
    if (v.lengthSq() > 0) {
      v.normalize();
      this.facing.copy(v);
      if (vx !== 0) this.player.setFlipX(vx < 0);
      if (!this.playerTrail.emitting) this.playerTrail.start();
    } else {
      this.playerTrail.stop();
    }
    if (time < this.dashUntil) {
      // Dash overrides normal movement for its short burst.
      this.player.setVelocity(this.dashDir.x * DASH_SPEED, this.dashDir.y * DASH_SPEED);
    } else {
      this.player.setVelocity(v.x * PLAYER_SPEED, v.y * PLAYER_SPEED);
    }

    // Guardians hunt (chase + telegraphed lunges) + touch damage + hp bars.
    for (const e of this.guardians) {
      if (!e.active) continue;
      this.updateGuardian(e, time);
      this.drawHpBar(e);
      const d = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      if (d < this.radiusOf(e) + PLAYER_RADIUS) {
        this.hurtPlayer(e, time);
      }
    }

    // Kill streak decays if you stop killing.
    if (this.combo > 0 && time > this.comboUntil) {
      this.combo = 0;
      this.updateStreakHud();
    }

    // Fade a resting banner out of the way when the hero walks under it, restore on exit.
    if (this.noteState === "holding" && this.noteBox) {
      const b = this.noteBox;
      const r = 46;
      const under =
        this.player.x > b.x - this.noteW / 2 - r &&
        this.player.x < b.x + this.noteW / 2 + r &&
        this.player.y > b.y - r &&
        this.player.y < b.y + this.noteH + r;
      const targetAlpha = under ? 0.14 : 1;
      b.alpha += (targetAlpha - b.alpha) * 0.15;
    }

    if (this.boss && this.boss.active) this.updateBoss(time);
    this.updateOrbs(time);
  }

  private dash() {
    const time = this.time.now;
    if (this.locked || time < this.nextDashAt) return;
    const dir = this.facing.clone();
    if (dir.lengthSq() === 0) dir.set(0, 1);
    dir.normalize();
    this.dashDir.copy(dir);
    this.dashUntil = time + DASH_DURATION_MS;
    this.nextDashAt = time + DASH_COOLDOWN_MS;
    this.invulnUntil = Math.max(this.invulnUntil, time + DASH_IFRAMES_MS);
    this.player.setVelocity(dir.x * DASH_SPEED, dir.y * DASH_SPEED);
    this.playerTrail.start();
    this.burst(this.player.x, this.player.y, 0x8affe0, 12);
    this.impact(this.player.x, this.player.y, 0x8affe0, 46);

    // Fading afterimage sells the speed.
    const ghost = this.add
      .image(this.player.x, this.player.y, "hero")
      .setDepth(11)
      .setAlpha(0.5)
      .setTint(0x8affe0)
      .setScale(this.player.scaleX, this.player.scaleY)
      .setFlipX(this.player.flipX);
    this.tweens.add({ targets: ghost, alpha: 0, duration: 240, onComplete: () => ghost.destroy() });
    play("dash");
  }

  private updateStreakHud() {
    this.hudStreak.setText(this.combo >= 2 ? `🔥 x${this.combo}` : "");
  }

  // ---------- boss ----------

  private startBoss() {
    if (this.phase !== "guardians") return;
    this.phase = "boss";
    play("boss");
    this.refreshMission();
    this.notify({
      tag: t("boss_appears_tag"),
      title: t("boss_appears_title"),
      body: stripTags(t("boss_appears_body")),
      color: 0xff5d3a,
      hold: 5200,
    });
    this.spawnBoss();
  }

  private spawnBoss() {
    const b = this.physics.add.sprite(GAME_W / 2, WALL_INSET + 120, "boss").setDepth(11);
    fitHeight(b, 150);
    b.setCollideWorldBounds(true);
    b.setData("hp", BOSS_HP);
    b.setData("maxHp", BOSS_HP);
    b.setData("barW", 130);
    b.setData("radius", BOSS_RADIUS);
    b.setData("boss", true);
    this.addLayoutColliders(b);
    this.bars.set(b, this.add.graphics().setDepth(40));
    this.bossTelegraph = this.add
      .ellipse(b.x, b.y, 172, 172, 0xff3030, 0.04)
      .setStrokeStyle(3, 0xff5d3a, 0.78)
      .setDepth(9)
      .setVisible(false);
    this.tweens.add({
      targets: this.bossTelegraph,
      scale: 1.12,
      alpha: 0.34,
      yoyo: true,
      repeat: -1,
      duration: 240,
      ease: "Sine.inOut",
    });
    if (this.renderer.type === Phaser.WEBGL) b.postFX.addGlow(0xff4bd8, 5, 0, false, 0.12, 12);
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
    this.bossTelegraph?.setPosition(b.x, b.y).setVisible(this.bossState === "telegraph");

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
    if (d < BOSS_RADIUS + PLAYER_RADIUS) this.hurtPlayer(b, time);
  }

  private fireOrb() {
    const b = this.boss!;
    const orb = this.physics.add.sprite(b.x, b.y, "orb").setDepth(15);
    const dir = new Phaser.Math.Vector2(this.player.x - b.x, this.player.y - b.y).normalize();
    orb.setVelocity(dir.x * BOSS_PROJECTILE_SPEED, dir.y * BOSS_PROJECTILE_SPEED);
    orb.setData("dieAt", this.time.now + 4200);
    this.orbs.push(orb);
    this.impact(b.x, b.y, 0xff8cf0, 26);
    if (this.renderer.type === Phaser.WEBGL) orb.postFX.addGlow(0xff8cf0, 4, 0, false, 0.1, 10);
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
      if (d < ORB_RADIUS + PLAYER_RADIUS) {
        this.burst(orb.x, orb.y, 0xff8cf0, 8);
        orb.destroy();
        this.hurtPlayer(orb, time);
      }
    }
    this.orbs = this.orbs.filter((o) => o.active);
  }

  // ---------- combat ----------

  private selectWeapon(i: number) {
    if (this.locked) return;
    this.weaponIndex = i;
    this.refreshHud();
    play("ui");
    this.floating(this.player.x, this.player.y - 54, this.weapon.label[getLang()], hex(this.weapon.color));
    if (!this.seenWeapons.has(this.weapon.id)) {
      this.seenWeapons.add(this.weapon.id);
      this.showWeaponCard(this.weapon);
    }
  }

  private attack(aim?: Phaser.Math.Vector2) {
    if (this.locked || this.time.now < this.nextAttackAt) return;
    const w = this.weapon;
    if (this.tokens < w.cost) {
      this.cameras.main.flash(120, 90, 0, 0);
      this.floating(this.player.x, this.player.y - 50, t("no_tokens"), "#ff6b6b");
      play("deny");
      return;
    }
    // Aim toward the cursor when clicking, else the way you're moving/facing.
    const dir = aim && aim.lengthSq() > 0 ? aim.clone().normalize() : this.facing.clone().normalize();
    this.facing.copy(dir);
    this.player.setFlipX(dir.x < -0.05);

    this.nextAttackAt = this.time.now + ATTACK_COOLDOWN_MS;
    this.tokens -= w.cost;
    this.weaponUsage[w.id] = (this.weaponUsage[w.id] ?? 0) + 1;
    this.refreshHud();
    play("attack");

    this.spawnSlash(w, dir);
    this.tweens.add({ targets: this.player, scaleX: this.player.scaleX * 1.08, yoyo: true, duration: 80 });

    const hit = this.enemiesInReach(w, dir);
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

  private radiusOf(e: Sprite): number {
    return (e.getData("radius") as number) || ENEMY_RADIUS;
  }

  private enemiesInReach(w: Weapon, dir: Phaser.Math.Vector2): Sprite[] {
    const out: Sprite[] = [];
    let nearest: Sprite | null = null;
    let nearestD = Infinity;
    for (const e of this.activeTargets()) {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d > w.range + this.radiusOf(e)) continue;
      if (w.aoe) {
        out.push(e);
      } else {
        // ~200° arc toward the aim — diagonal & sideways hits register, only your back is safe.
        const to = new Phaser.Math.Vector2(e.x - this.player.x, e.y - this.player.y).normalize();
        if (to.dot(dir) >= -0.2 && d < nearestD) {
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
    this.impact(e.x, e.y, this.weapon.color, this.radiusOf(e) + 12);
    e.setTintFill(0xffffff);
    this.time.delayedCall(60, () => {
      if (e.active) e.clearTint();
    });
    if (!e.getData("boss")) {
      const kb = new Phaser.Math.Vector2(e.x - this.player.x, e.y - this.player.y).normalize().scale(ENEMY_HIT_KNOCKBACK);
      e.setVelocity(kb.x, kb.y);
    }
    if (hp <= 0) this.killTarget(e);
  }

  private killTarget(e: Sprite) {
    const isBoss = !!e.getData("boss");
    const reward = isBoss ? BOSS_REWARD : ENEMY_KILL_REWARD;
    this.tokens += reward;
    this.floating(e.x, e.y - 20, `+${reward}`, "#ffd65a");
    this.burst(e.x, e.y, 0xffd65a, isBoss ? 42 : 20);
    this.impact(e.x, e.y, 0xffd65a, isBoss ? 92 : 38);
    this.cameras.main.shake(isBoss ? 380 : 160, isBoss ? 0.014 : 0.008);
    play("coin");
    this.bars.get(e)?.destroy();
    const aura = this.auras.get(e);
    if (aura) {
      this.tweens.killTweensOf(aura);
      aura.destroy();
    }
    this.tweens.killTweensOf(e);
    if (isBoss && this.bossTelegraph) {
      this.tweens.killTweensOf(this.bossTelegraph);
      this.bossTelegraph.destroy();
    }

    // Kill streak: chain guardians for bonus tokens (rewards decisive, efficient clears).
    if (!isBoss) {
      this.combo = this.time.now < this.comboUntil ? this.combo + 1 : 1;
      this.comboUntil = this.time.now + COMBO_WINDOW_MS;
      if (this.combo >= 2) {
        const bonus = (this.combo - 1) * COMBO_BONUS_TOKENS;
        this.tokens += bonus;
        this.floating(e.x, e.y - 44, `x${this.combo}  +${bonus}`, "#8affe0");
      }
      this.updateStreakHud();
    }
    this.refreshHud();
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
    this.impact(this.player.x, this.player.y, 0xff5d7a, 30);
    const kb = new Phaser.Math.Vector2(this.player.x - from.x, this.player.y - from.y).normalize().scale(PLAYER_HURT_KNOCKBACK);
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

  private spawnSlash(w: Weapon, dir: Phaser.Math.Vector2) {
    const off = w.range * 0.5;
    const angle = Math.atan2(dir.y, dir.x);
    const s = this.add
      .image(this.player.x + dir.x * off, this.player.y + dir.y * off, "slash")
      .setDepth(20)
      .setTint(w.color)
      .setRotation(angle)
      .setScale(w.range / 55);
    this.tweens.add({ targets: s, alpha: 0, scale: s.scale * 1.25, duration: 180, onComplete: () => s.destroy() });

    const edge = this.add
      .ellipse(
        this.player.x + dir.x * w.range * 0.34,
        this.player.y + dir.y * w.range * 0.34,
        w.range * (w.aoe ? 1.15 : 0.9),
        w.aoe ? 52 : 22,
        w.color,
        0.12
      )
      .setRotation(angle)
      .setDepth(19)
      .setBlendMode(Phaser.BlendModes.ADD);
    edge.setStrokeStyle(w.aoe ? 5 : 4, 0xffffff, 0.96);
    this.tweens.add({ targets: edge, scale: 1.24, alpha: 0, duration: 180, onComplete: () => edge.destroy() });
    if (w.aoe) this.impact(this.player.x + dir.x * off, this.player.y + dir.y * off, w.color, w.range * 0.9);
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

  private impact(x: number, y: number, color: number, radius: number) {
    const ring = this.add
      .circle(x, y, radius * 0.42, color, 0.08)
      .setStrokeStyle(2, color, 0.9)
      .setDepth(18)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: ring,
      scale: 1.8,
      alpha: 0,
      duration: 220,
      ease: "Cubic.out",
      onComplete: () => ring.destroy(),
    });
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

  // ---------- in-game notifications (non-blocking banners) ----------
  // Slide-in banner rendered inside the canvas; the game keeps running so the
  // player never loses attention (replaces the old dark full-screen modal cards).

  private notify(o: { tag: string; title: string; body?: string; color?: number; hold?: number }) {
    this.notes.push(o);
    if (!this.noteActive) this.showNextNote();
  }

  private showNextNote() {
    const o = this.notes.shift();
    if (!o) {
      this.noteActive = false;
      this.noteState = "none";
      this.noteBox = undefined;
      return;
    }
    this.noteActive = true;
    const color = o.color ?? 0x8ff0d4;
    const W = 600;
    const pad = 16;
    const inner = W - pad * 2;

    const tag = this.add
      .text(0, pad, o.tag.toUpperCase(), { fontFamily: "system-ui", fontSize: "11px", color: hex(color) })
      .setOrigin(0.5, 0);
    const title = this.add
      .text(0, 0, o.title, { fontFamily: "system-ui", fontSize: "18px", color: "#ffffff", fontStyle: "bold", align: "center", wordWrap: { width: inner } })
      .setOrigin(0.5, 0);
    const body = o.body
      ? this.add
          .text(0, 0, o.body, { fontFamily: "system-ui", fontSize: "13px", color: "#c7c9e0", align: "center", wordWrap: { width: inner }, lineSpacing: 4 })
          .setOrigin(0.5, 0)
      : null;

    let y = pad + tag.height + 5;
    title.setY(y);
    y += title.height;
    if (body) {
      y += 7;
      body.setY(y);
      y += body.height;
    }
    const H = y + pad;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0f18, 0.92).fillRoundedRect(-W / 2, 0, W, H, 14);
    bg.lineStyle(2, color, 0.85).strokeRoundedRect(-W / 2, 0, W, H, 14);
    bg.fillStyle(color, 1).fillRect(-W / 2 + 3, 12, 4, H - 24); // accent stripe

    const kids: Phaser.GameObjects.GameObject[] = body ? [bg, tag, title, body] : [bg, tag, title];
    const box = this.add.container(GAME_W / 2, 46, kids).setDepth(120).setAlpha(0);
    this.noteBox = box;
    this.noteW = W;
    this.noteH = H;
    this.noteState = "entering";

    const hold = o.hold ?? 4200;
    this.tweens.add({
      targets: box,
      y: 58,
      alpha: 1,
      duration: 240,
      ease: "Back.out",
      onComplete: () => {
        this.noteState = "holding";
        this.time.delayedCall(hold, () => this.leaveNote(box));
      },
    });
  }

  private leaveNote(box: Phaser.GameObjects.Container) {
    if (this.noteBox !== box) return;
    this.noteState = "leaving";
    this.tweens.add({
      targets: box,
      y: 44,
      alpha: 0,
      duration: 260,
      ease: "Quad.in",
      onComplete: () => {
        box.destroy();
        if (this.noteBox === box) this.noteBox = undefined;
        this.showNextNote();
      },
    });
  }

  private showIntro() {
    this.notify({ tag: t("intro_tag"), title: t("intro_title"), body: stripTags(t("intro_body")), hold: 7000 });
  }

  private showWeaponCard(w: Weapon) {
    this.notify({
      tag: t("weapon_tag"),
      title: `${w.label[getLang()]} — ${w.tier[getLang()]}`,
      body: `${stripTags(w.blurb[getLang()])}\n${t("hud_cost")} ${w.cost} tokens`,
      color: w.color,
      hold: 4600,
    });
  }

  private showChestCard() {
    const credit = (this.registry.get("credits") as Credit[]).find((c) => c.name === "chest");
    const lines = [stripTags(t("chest_body"))];
    if (credit) {
      if (credit.prompt) lines.push(`“${credit.prompt.slice(0, 150)}${credit.prompt.length > 150 ? "…" : ""}”`);
      lines.push(`${t("meta_model")}: ${credit.model} · ${t("meta_cost")}: ${credit.approxCostUsd != null ? `$${credit.approxCostUsd}` : "—"}`);
    }
    this.notify({ tag: t("chest_tag"), title: t("chest_title"), body: lines.join("\n"), hold: 6500 });
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

// The i18n bodies carry <b> tags for the DOM screens; strip them for canvas text.
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}
