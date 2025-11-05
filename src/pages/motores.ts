import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";
import api from "../services/api";
import { t } from "../i18n";

function wireSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const btnOpen = document.getElementById("btnMenu");
  const btnClose = document.getElementById("btnCloseSidebar");
  const open = () => { sidebar?.classList.add("open"); overlay?.classList.add("show"); };
  const close = () => { sidebar?.classList.remove("open"); overlay?.classList.remove("show"); };
  btnOpen?.addEventListener("click", open);
  btnClose?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  document.querySelectorAll('[data-close-sidebar="1"]').forEach(a => a.addEventListener("click", close));
  window.addEventListener("keydown", (e)=>{ if(e.key==="Escape") close(); });
}

export async function Motores() {
  const motores = await api.motores();

  const body = motores.map(m => {
    const statusClass = m.status === "ALERTA" ? "warn" : m.status === "OFFLINE" ? "err" : "ok";
    return `<tr>
      <td>${m.id}</td>
      <td>${m.nome}</td>
      <td>${m.localizacao || "-"}</td>
      <td><span class="badge ${statusClass}">${m.status || "ONLINE"}</span></td>
      <td><a class="link" href="#/motor/${m.id}">${t("abrir")}</a></td>
    </tr>`;
  }).join("");

  const html = `
    ${Sidebar("motores")}
    ${Topbar(t("page_motores"))}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div style="font-weight:800; margin-bottom:8px">${t("dispositivos")}</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>${t("motores")}</th><th>Local</th><th>Status</th><th></th></tr></thead>
              <tbody>${body || `<tr><td colspan="5">${t("nenhum_dispositivo")}</td></tr>`}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(wireSidebar, 0);
  return html;
}
