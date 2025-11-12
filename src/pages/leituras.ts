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

// === Mesmo esquema do dashboard.ts ===
function toBrasiliaTime(ts: string | number | Date): Date {
  const d = new Date(ts);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000);
}

export function Leituras() {
  let stop: () => void = () => {};

  const view = `
    ${Sidebar("leituras")}
    ${Topbar(t("page_leituras"))}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div style="font-weight:800; margin-bottom:8px">${t("leituras_recentes") ?? "Leituras recentes"}</div>
          <div class="table-wrap">
            <table style="width:100%; text-align:center; border-collapse:collapse;">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>${t("motores")}</th>
                  <th>${t("temperatura")}</th>
                  <th>${t("vibracao")}</th>
                  <th>${t("data_hora")}</th>
                </tr>
              </thead>
              <tbody id="tb-leituras">
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
        // 1) Lista de motores
        const motores: any[] = await api.motores().catch(() => []);

        // 2) Para cada motor, buscar séries (1h) e pegar o último valor de cada
        const linhas = await Promise.all(
          motores.map(async (m: any) => {
            const tSerie: any[] = await api.temperaturaSerie(m.id, "1h").catch(() => []);
            const vSerie: any[] = await api.vibracaoSerie(m.id, "1h").catch(() => []);

            const lastT = tSerie.length ? tSerie[tSerie.length - 1] : null;
            const lastV = vSerie.length ? vSerie[vSerie.length - 1] : null;

            const temp = lastT ? Number(lastT.valor) : null;
            const vib  = lastV ? Number(lastV.valor)  : null;

            // timestamp preferencial: o mais recente entre T e V
            const lastTsMs = Math.max(
              lastT ? new Date(lastT.ts).getTime() : 0,
              lastV ? new Date(lastV.ts).getTime() : 0
            );
            const when = lastTsMs
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "medium",
                  hour12: false,
                  timeZone: "America/Sao_Paulo",
                }).format(toBrasiliaTime(new Date(lastTsMs)))
              : "-";

            return `
              <tr>
                <td>${m.id}</td>
                <td>${m.nome ?? `Motor ${m.id}`}</td>
                <td>${temp != null ? `${temp.toFixed(1)} °C` : "-"}</td>
                <td>${vib  != null ? `${vib.toFixed(2)}`     : "-"}</td>
                <td>${when}</td>
              </tr>`;
          })
        );

        $("tb-leituras").innerHTML = linhas.join("") || `<tr><td colspan="5">${t("sem_dados") ?? "Sem dados"}</td></tr>`;
      } catch (e) {
        $("tb-leituras").innerHTML = `<tr><td colspan="5">${t("erro_carregar") ?? "Erro ao carregar"}</td></tr>`;
        console.warn("Falha ao carregar leituras:", e);
      }
    }

    await load();
    stop = poll(load, 5000, () => {});
  }, 0);

  return view;
}
