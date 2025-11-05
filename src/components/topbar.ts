import { t } from "../i18n";

export function Topbar(title: string, company?: string) {
  return `
  <div class="topbar">
    <div class="topbar-inner">
      <button id="btnMenu" aria-label="Abrir menu" class="icon">☰</button>
      <div style="font-weight:800; font-size:18px; display:flex; gap:10px; align-items:center">
        <span>${title}</span>
        ${company ? `<span style="opacity:.85">| ${company}</span>` : ""}
      </div>
    </div>
  </div>
  `;
}
