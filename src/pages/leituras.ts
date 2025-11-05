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

function fmtDateTime(d: string | number | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
    timeZone: "America/Sao_Paulo"
  }).format(new Date(d));
}

export async function Leituras() {
  // Por enquanto: série de TEMPERATURA das últimas ~120 leituras
  const data = await api.leituras(1, "temperatura").catch(() => []);

  const body = (data as any[]).slice().reverse().map(l => `
    <tr>
      <td>${fmtDateTime(l.ts)}</td>
      <td>${Number(l.valor || 0).toFixed(1)}</td>
    </tr>
  `).join("");

  const html = `
    ${Sidebar("leituras")}
    ${Topbar(t("page_leituras"))}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <h3 style="margin-top:0">${t("leituras_sensor")}</h3>

          <div class="table-wrap" style="margin-top:8px">
            <table>
              <thead>
                <tr>
                  <th>${t("quando")}</th>
                  <th>${t("valor_c")}</th>
                </tr>
              </thead>
              <tbody id="tb-leituras">
                ${body || `<tr><td colspan="2">${t("sem_leituras")}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    wireSidebar();
    // Se quiser atualizar periodicamente essa tabela, descomente:
    // poll(() => api.leituras(1, "temperatura"), 5000, (rows) => {
    //   const tb = document.getElementById("tb-leituras");
    //   if (!tb) return;
    //   const htmlRows = (rows as any[]).slice().reverse().map(l => `
    //     <tr>
    //       <td>${fmtDateTime(l.ts)}</td>
    //       <td>${Number(l.valor || 0).toFixed(1)}</td>
    //     </tr>
    //   `).join("");
    //   tb.innerHTML = htmlRows || `<tr><td colspan="2">${t("sem_leituras")}</td></tr>`;
    // });
  }, 0);

  return html;
}
