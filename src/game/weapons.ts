// Weapons = LLM grades. The whole educational hook lives here:
// cheap+weak  ->  expensive+strong. Cost is paid in tokens (your score),
// so the skill is picking the right "model" for each fight.
export interface Weapon {
  id: "nano" | "standard" | "frontier";
  sprite: string;
  color: number;
  cost: number; // tokens spent per attack
  damage: number;
  range: number;
  aoe: boolean;
  label: { es: string; en: string };
  tier: { es: string; en: string };
  // analogy shown in the "weapon = LLM" explainer card
  blurb: { es: string; en: string };
}

export const WEAPONS: Weapon[] = [
  {
    id: "nano",
    sprite: "weapon_nano",
    color: 0x7cff9b,
    cost: 1,
    damage: 5,
    range: 74,
    aoe: false,
    label: { es: "Nano", en: "Nano" },
    tier: { es: "Modelo pequeño", en: "Small model" },
    blurb: {
      es: "Barato y rápido. Gasta 1 token por golpe pero hace poco daño. Como un modelo pequeño: ideal para tareas simples sin quemar presupuesto.",
      en: "Cheap and fast. Spends 1 token per hit but deals little damage. Like a small model: great for simple tasks without burning budget.",
    },
  },
  {
    id: "standard",
    sprite: "weapon_standard",
    color: 0x5aa9ff,
    cost: 5,
    damage: 13,
    range: 88,
    aoe: false,
    label: { es: "Estándar", en: "Standard" },
    tier: { es: "Modelo intermedio", en: "Mid-tier model" },
    blurb: {
      es: "Equilibrado. 5 tokens por golpe, daño medio. Como un modelo intermedio: buen rendimiento por un coste razonable.",
      en: "Balanced. 5 tokens per hit, medium damage. Like a mid-tier model: solid performance for a reasonable cost.",
    },
  },
  {
    id: "frontier",
    sprite: "weapon_frontier",
    color: 0xffd65a,
    cost: 20,
    damage: 42,
    range: 116,
    aoe: true,
    label: { es: "Frontera", en: "Frontier" },
    tier: { es: "Modelo de gran escala", en: "Frontier model" },
    blurb: {
      es: "Potentísimo y en área, pero 20 tokens por golpe. Como un modelo de gran escala: resuelve todo, pero usarlo para tareas triviales arruina tu puntuación.",
      en: "Extremely powerful and hits an area, but 20 tokens per hit. Like a frontier model: solves anything, but using it on trivial tasks wrecks your score.",
    },
  },
];
