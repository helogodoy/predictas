import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";
import api, { poll } from "../services/api";
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

function fmtDateTime(d: string | number | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false,
    timeZone: "America/Sao_Paulo"
  }).format(new Date(d));
}

export async function Alertas() {
  const rows = await api.alertas(50).catch(() => []);

  const body = (rows as any[]).map(r => {
    const sev = r.severidade === "alta" ? "err" : r.severidade === "media" ? "warn" : "ok";
    return `<tr>
      <td>MTR - ${r.motorId}</td>
      <td>${fmtDateTime(r.ts || (r as any).criado_em)}</td>
      <td><span class="badge ${sev}">${r.severidade[0].toUpperCase() + r.severidade.slice(1)}</span></td>
    </tr>`;
  }).join("");

  const html = `
    ${Sidebar("alertas")}
    ${Topbar(t("page_alertas"))}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div style="font-weight:800; margin-bottom:8px">${t("historico_alertas")}</div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Alerta</th>
                  <th>${t("data_hora")}</th>
                  <th>${t("criticidade")}</th>
                </tr>
              </thead>
              <tbody id="tb-alertas">
                ${body || `<tr><td colspan="3">${t("sem_alertas")}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    wireSidebar();
    const tb = document.getElementById("tb-alertas");

    // Atualiza automaticamente a cada 5s
    poll(() => api.alertas(50), 5000, (rows2) => {
      if (!tb) return;
      const htmlRows = (rows2 as any[]).map(r => {
        const sev = r.severidade === "alta" ? "err" : r.severidade === "media" ? "warn" : "ok";
        return `<tr>
          <td>MTR - ${r.motorId}</td>
          <td>${fmtDateTime(r.ts || (r as any).criado_em)}</td>
          <td><span class="badge ${sev}">${r.severidade[0].toUpperCase() + r.severidade.slice(1)}</span></td>
        </tr>`;
      }).join("");
      tb.innerHTML = htmlRows || `<tr><td colspan="3">${t("sem_alertas")}</td></tr>`;
    });
  }, 0);

  return html;
}
