// src/components/sidebar.ts
import { t } from "../i18n";

export function Sidebar(active: "dashboard" | "motores" | "leituras" | "alertas" | "perfil") {
  const li = (hash: string, label: string, key: typeof active) =>
    `<li><a href="${hash}" class="${active===key?"active":""}" data-close-sidebar="1">${label}</a></li>`;

  return `
  <div id="sidebarOverlay" class="sidebar-overlay"></div>
  <aside id="sidebar" class="sidebar">
    <div class="sidebar-head">
      <div class="brand">${t("app_name")}</div>
      <button id="btnCloseSidebar" aria-label="Fechar menu">✕</button>
    </div>
    <nav>
      <ul>
        ${li("#/dashboard", t("nav_dashboard"), "dashboard")}
        ${li("#/motores",   t("nav_motores"),   "motores")}
        ${li("#/leituras",  t("nav_leituras"),  "leituras")}
        ${li("#/alertas",   t("nav_alertas"),   "alertas")}
        <hr/>
        ${li("#/profile",   t("nav_perfil"),    "perfil")}
        ${li("#/login",     t("nav_sair"),      "perfil")}
      </ul>
    </nav>
  </aside>
  `;
}
