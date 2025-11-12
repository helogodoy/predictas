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

export function Motores() {
  let stop: () => void = () => {};

  const view = `
    ${Sidebar("motores")}
    ${Topbar(t("page_motores"))}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div style="font-weight:800; margin-bottom:8px">${t("motores")}</div>
          <div class="table-wrap">
            <table style="width:100%; text-align:center; border-collapse:collapse;">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>${t("motores")}</th>
                  <th>Local</th>
                  <th>${t("data_hora")}</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="tb-motores">
                <tr><td colspan="6">${t("carregando")}...</td></tr>
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
        const motores = await api.motores().catch(() => []);
        const html = motores.map((m: any) => {
          const st = String(m.status || "online").toUpperCase();
          const statusClass = st === "ALERTA" ? "warn" : st === "OFFLINE" ? "err" : "ok";
          const tsRef = m.atualizado_em ?? m.ultimo_update ?? m.momento ?? m.ts;
          const when = tsRef
            ? new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "medium",
                hour12: false,
                timeZone: "America/Sao_Paulo",
              }).format(toBrasiliaTime(tsRef))
            : "-";
          return `<tr>
            <td>${m.id}</td>
            <td>${m.nome ?? `Motor ${m.id}`}</td>
            <td>${m.localizacao ?? "-"}</td>
            <td>${when}</td>
            <td><span class="badge ${statusClass}">${st}</span></td>
            <td><a class="link" href="#/motor/${m.id}">${t("abrir") ?? "Abrir"}</a></td>
          </tr>`;
        }).join("");
        $("tb-motores").innerHTML = html || `<tr><td colspan="6">${t("nenhum_dispositivo") ?? "Nenhum dispositivo"}</td></tr>`;
      } catch {
        $("tb-motores").innerHTML = `<tr><td colspan="6">${t("erro_carregar") ?? "Erro ao carregar"}</td></tr>`;
      }
    }

    await load();
    stop = poll(load, 5000, () => {});
  }, 0);

  return view;
}
