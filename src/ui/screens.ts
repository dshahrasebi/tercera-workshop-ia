// DOM overlays for the Title and Result/Leaderboard screens (drawn over the canvas art).
// Kept separate from the reveal cards so both can coexist.
import { t, getLang } from "../i18n";
import type { ScoreRow } from "../net/api";
import { WEAPONS } from "../game/weapons";

const layer = () => document.getElementById("screen-layer")!;
const host = () => document.getElementById("screen-host")!;

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
function show() {
  layer().classList.add("show");
}
export function hideScreen(): void {
  layer().classList.remove("show");
  host().innerHTML = "";
}

function topbar(sound?: { muted: boolean }): string {
  const s = sound ? `<button id="sc-sound">${sound.muted ? t("sound_off") : t("sound_on")}</button>` : "";
  return `<div class="topbar"><button id="sc-lang">${t("title_lang")}</button>${s}</div>`;
}
function wireTopbar(onLang: () => void, onSound?: () => void) {
  document.getElementById("sc-lang")?.addEventListener("click", onLang);
  if (onSound) document.getElementById("sc-sound")?.addEventListener("click", onSound);
}

export interface TitleOpts {
  name: string;
  muted: boolean;
  onPlay: (name: string) => void;
  onLoad: () => void;
  onLeaderboard: () => void;
  onToggleLang: () => void;
  onToggleSound: () => void;
}

export function renderTitle(o: TitleOpts): void {
  host().innerHTML = `
    <div class="screen">
      ${topbar({ muted: o.muted })}
      <div class="tag">${esc(t("title_tag"))}</div>
      <div class="brand">Token Quest</div>
      <p class="tagline">${esc(t("title_tagline"))}</p>
      <label class="field-label" for="sc-name">${esc(t("title_name_label"))}</label>
      <input id="sc-name" maxlength="24" placeholder="${esc(t("title_name_ph"))}" value="${esc(o.name)}" />
      <div class="btnrow">
        <button class="primary" id="sc-play">${esc(t("title_play"))}</button>
        <button class="ghost" id="sc-load" disabled title="${esc(t("title_load_empty"))}">${esc(t("title_load"))}</button>
      </div>
      <button class="ghost menu-secondary" id="sc-lb">${esc(t("title_leaderboard"))}</button>
    </div>`;
  show();
  wireTopbar(o.onToggleLang, o.onToggleSound);
  const input = document.getElementById("sc-name") as HTMLInputElement;
  const play = () => o.onPlay(input.value.trim());
  document.getElementById("sc-play")?.addEventListener("click", play);
  document.getElementById("sc-load")?.addEventListener("click", o.onLoad);
  document.getElementById("sc-lb")?.addEventListener("click", o.onLeaderboard);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") play();
  });
  setTimeout(() => input.focus(), 30);
}

export interface ResultState {
  mode: "victory" | "defeat" | "leaderboard";
  tokens: number;
  usage: Record<string, number>;
  costText: string | null;
  statusKey: "result_submitting" | "result_submit_ok" | "result_submit_fail" | null;
  leaderboard: ScoreRow[] | null; // null = loading
  offline: boolean;
  youId: number | null;
  onPrimary: () => void;
  onMenu: () => void;
  onToggleLang: () => void;
}

function usageHtml(usage: Record<string, number>): string {
  const parts = WEAPONS.map((w) => {
    const n = usage[w.id] ?? 0;
    return `<span><b>${esc(w.label[getLang()])}</b> ×${n}</span>`;
  });
  return `<div class="usage">${parts.join("")}</div>`;
}

function leaderboardHtml(s: ResultState): string {
  if (s.offline) return `<p class="foot-note">${esc(t("lb_offline"))}</p>`;
  if (s.leaderboard === null) return `<p class="foot-note">${esc(t("lb_loading"))}</p>`;
  if (s.leaderboard.length === 0) return `<p class="foot-note">${esc(t("lb_empty"))}</p>`;
  const head = `<div class="lb-row head"><span class="rank">#</span><span class="name">${esc(t("lb_title"))}</span><span class="tok">${esc(t("hud_tokens"))}</span></div>`;
  const rows = s.leaderboard
    .map((r, i) => {
      const you = s.youId != null && r.id === s.youId;
      const cls = `lb-row${i % 2 ? " odd" : ""}${you ? " you" : ""}`;
      const name = esc(r.name) + (you ? ` <b style="color:#8ff0d4">· ${esc(t("lb_you"))}</b>` : "");
      return `<div class="${cls}"><span class="rank">${i + 1}</span><span class="name">${name}</span><span class="tok">${r.tokens}</span></div>`;
    })
    .join("");
  return `<div class="lb">${head}${rows}</div>`;
}

export function renderResult(s: ResultState): void {
  const isLb = s.mode === "leaderboard";
  const tag = s.mode === "victory" ? t("result_victory_tag") : s.mode === "defeat" ? t("result_defeat_tag") : t("lb_title");
  const title = s.mode === "victory" ? t("result_victory_title") : s.mode === "defeat" ? t("result_defeat_title") : t("lb_title");

  const tally = isLb
    ? ""
    : `<div class="bignum"><span class="lbl">${esc(t("result_final_tokens"))}</span>${s.tokens}</div>
       ${usageHtml(s.usage)}
       <p>${s.mode === "defeat" ? t("result_defeat_body") : t("result_lesson")}</p>`;

  const status = s.statusKey
    ? `<div class="status ${s.statusKey === "result_submit_fail" ? "fail" : s.statusKey === "result_submit_ok" ? "ok" : ""}">${esc(t(s.statusKey))}</div>`
    : "";

  const cost = s.costText && !isLb ? `<p class="foot-note">${esc(t("made_with_ai_cost").replace("{cost}", s.costText))}</p>` : "";

  host().innerHTML = `
    <div class="screen wide">
      ${topbar()}
      <div class="tag">${esc(tag)}</div>
      <h2>${esc(title)}</h2>
      ${tally}
      ${status}
      ${leaderboardHtml(s)}
      ${cost}
      <div class="btnrow">
        <button class="primary" id="sc-primary">${esc(isLb ? t("title_play") : s.mode === "victory" ? t("result_play_again") : t("result_retry"))}</button>
        <button class="ghost" id="sc-menu">${esc(t("result_menu"))}</button>
      </div>
    </div>`;
  show();
  wireTopbar(s.onToggleLang);
  document.getElementById("sc-primary")?.addEventListener("click", s.onPrimary);
  document.getElementById("sc-menu")?.addEventListener("click", s.onMenu);
}
