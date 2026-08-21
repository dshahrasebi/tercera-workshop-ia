import Phaser from "phaser";
import { GAME_W, GAME_H } from "../game/balance";
import { getLang, t } from "../i18n";

type MapId = "village" | "plains" | "forest" | "desert" | "mountain" | "fortress";
type Exit = "north" | "south" | "east" | "west";

const MAPS: Record<MapId, { title: string; exits: Partial<Record<Exit, MapId>> }> = {
  village: { title: "Aldea del Alba", exits: { north: "forest", east: "plains", west: "mountain", south: "desert" } },
  plains: { title: "Llanuras Doradas", exits: { west: "village", north: "forest", east: "fortress" } },
  forest: { title: "Bosque Susurrante", exits: { south: "village", east: "plains" } },
  desert: { title: "Oasis de Cristal", exits: { north: "village", east: "fortress" } },
  mountain: { title: "Picos del Eco", exits: { east: "village", north: "fortress" } },
  fortress: { title: "Fortaleza Corrupta", exits: { west: "plains", south: "desert", north: "mountain" } },
};

export class WorldScene extends Phaser.Scene {
  private mapId: MapId = "village";
  private hero!: Phaser.Physics.Arcade.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private title!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super("world");
  }

  create(data: { map?: MapId; entry?: Exit } = {}) {
    this.mapId = data.map ?? "village";
    const entry = data.entry;
    this.add.image(GAME_W / 2, GAME_H / 2, this.mapId).setDisplaySize(GAME_W, GAME_H);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x071018, 0.12).setOrigin(0);

    this.hero = this.physics.add.image(this.entryX(entry), this.entryY(entry), "hero").setDisplaySize(58, 72).setDepth(5);
    this.hero.setCollideWorldBounds(false);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys("W,A,S,D") as Record<string, Phaser.Input.Keyboard.Key>;
    this.title = this.add.text(24, 22, "", { fontFamily: "system-ui", fontSize: "22px", color: "#ffffff", fontStyle: "bold", stroke: "#071018", strokeThickness: 5 }).setDepth(10);
    this.hint = this.add.text(GAME_W / 2, GAME_H - 24, "", { fontFamily: "system-ui", fontSize: "13px", color: "#d7f7ec", align: "center" }).setOrigin(0.5).setDepth(10);
    this.refreshLabels();
  }

  update() {
    const speed = 190;
    const x = (this.cursors.left.isDown || this.keys.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0);
    const y = (this.cursors.up.isDown || this.keys.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0);
    this.hero.setVelocity(x * speed, y * speed);
    if (this.hero.x < -20) this.changeMap("west");
    else if (this.hero.x > GAME_W + 20) this.changeMap("east");
    else if (this.hero.y < -20) this.changeMap("north");
    else if (this.hero.y > GAME_H + 20) this.changeMap("south");
  }

  private changeMap(exit: Exit) {
    const next = MAPS[this.mapId].exits[exit];
    if (!next) {
      this.hero.setPosition(Phaser.Math.Clamp(this.hero.x, 34, GAME_W - 34), Phaser.Math.Clamp(this.hero.y, 70, GAME_H - 55));
      return;
    }
    const opposite: Record<Exit, Exit> = { north: "south", south: "north", east: "west", west: "east" };
    this.scene.restart({ map: next, entry: opposite[exit] });
  }

  private entryX(entry?: Exit) {
    return entry === "west" ? GAME_W - 70 : entry === "east" ? 70 : GAME_W / 2;
  }

  private entryY(entry?: Exit) {
    return entry === "north" ? GAME_H - 105 : entry === "south" ? 95 : GAME_H / 2;
  }

  private refreshLabels() {
    const map = MAPS[this.mapId];
    this.title.setText(`${map.title}  ·  ${getLang() === "es" ? "Exploración" : "Exploration"}`);
    this.hint.setText(`${t("hint")}  ·  ${getLang() === "es" ? "Cruza los bordes para explorar" : "Cross the edges to explore"}`);
  }
}
