// DOM overlay reveal cards ("How AI made this" / "Weapon = AI model").
// Returns a promise that resolves when the user dismisses the card.
import { t } from "../i18n";

export interface CardMeta {
  k: string;
  v: string;
}
export interface CardOpts {
  tag: string;
  title: string;
  bodyHtml?: string;
  prompt?: string;
  meta?: CardMeta[];
}

const layer = () => document.getElementById("card-layer")!;
const host = () => document.getElementById("card-host")!;

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function showCard(o: CardOpts): Promise<void> {
  const metaHtml = (o.meta ?? [])
    .map((m) => `<span><b>${esc(m.k)}:</b> ${esc(m.v)}</span>`)
    .join("");
  host().innerHTML = `
    <div class="card">
      <div class="tag">${esc(o.tag)}</div>
      <h2>${o.title}</h2>
      ${o.bodyHtml ? `<p>${o.bodyHtml}</p>` : ""}
      ${o.prompt ? `<div class="prompt">${esc(o.prompt)}</div>` : ""}
      ${metaHtml ? `<div class="meta">${metaHtml}</div>` : ""}
      <button id="card-close">${esc(t("continue"))}</button>
    </div>`;
  layer().classList.add("show");

  return new Promise((res) => {
    const close = () => {
      layer().classList.remove("show");
      host().innerHTML = "";
      res();
    };
    document.getElementById("card-close")!.addEventListener("click", close, { once: true });
  });
}
