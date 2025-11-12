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
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

function toBrasiliaTime(ts: string | number | Date): Date {
  const d = new Date(ts);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000);
}

export function Alertas() {
  let stop: () => void = () => {};

  const view = `
    ${Sidebar("alertas")}
    ${Topbar(t("page_alertas"))}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div style="font-weight:800; margin-bottom:8px">${t("ultimos_alertas")}</div>
          <div class="table-wrap">
            <table style="width:100%; text-align:center; border-collapse:collapse;">
              <thead>
                <tr>
                  <th>${t("motores")}</th>
                  <th>${t("tipo")}</th>
                  <th>${t("valor")}</th>
                  <th>${t("data_hora")}</th>
                  <th>${t("criticidade")}</th>
                </tr>
              </thead>
              <tbody id="tb-alertas">
                <tr><td colspan="5">${t("carregando")}...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;

  setTimeout(async () => {
    wireSidebar();
    const $ = (id: string) => document.getElementById(id)!;

    async function load() {
      try {
        const rows = await api.ultimosAlertas().catch(() => []);
        const html = rows.map((r: any) => {
          const sev = r.severidade === "alta" ? "err" : r.severidade === "media" ? "warn" : "ok";
          const dt = toBrasiliaTime(r.ts ?? r.criado_em ?? r.data);
          const when = new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "medium",
            hour12: false,
            timeZone: "America/Sao_Paulo",
          }).format(dt);
          return `<tr>
            <td>${r.motorId ? `MTR - ${r.motorId}` : "-"}</td>
            <td>${r.tipo ?? "-"}</td>
            <td>${r.valor ?? "-"}</td>
            <td>${when}</td>
            <td><span class="badge ${sev}">${(r.severidade ?? "Baixa").charAt(0).toUpperCase() + (r.severidade ?? "Baixa").slice(1)}</span></td>
          </tr>`;
        }).join("");
        $("tb-alertas").innerHTML = html || `<tr><td colspan="5">${t("sem_alertas")}</td></tr>`;
      } catch (e) {
        $("tb-alertas").innerHTML = `<tr><td colspan="5">${t("erro_carregar") ?? "Erro ao carregar"}</td></tr>`;
      }
    }

    await load();
    stop = poll(load, 5000, () => {});
  }, 0);

  return view;
}
