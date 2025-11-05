import "chart.js/auto";
import { Topbar } from "../components/topbar";
import { Sidebar } from "../components/sidebar";
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

let stopFns: Array<()=>void> = [];

export function Dashboard() {
  stopFns.forEach(f=>f()); stopFns = [];

  const main = `
    ${Sidebar("dashboard")}
    ${Topbar(t("page_dashboard"))}
    <div class="main-content">
      <div class="container">
        <div class="grid kpi">
          <div class="card"><div style="font-weight:800">${t("status_geral")}</div>
            <div class="grid" style="grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px">
              <div><div class="kpi-value" id="k-online">--</div><div class="kpi-sub">${t("online")}</div></div>
              <div><div class="kpi-value" id="k-offline">--</div><div class="kpi-sub">${t("offline")}</div></div>
              <div><div class="kpi-value" id="k-alerta">--</div><div class="kpi-sub">${t("alerta")}</div></div>
            </div>
          </div>

          <div class="card" style="text-align:center">
            <div style="font-weight:800">${t("temperatura_media")}</div>
            <div id="temp-media" style="font-size:48px; font-weight:800; margin-top:12px">-- °C</div>
            <div style="height:260px; margin-top:8px"><canvas id="chartTemp"></canvas></div>
          </div>

          <div class="card">
            <div style="font-weight:800">${t("vibracao_media")}</div>
            <div style="height:320px; margin-top:8px"><canvas id="chartVib"></canvas></div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns:.8fr 1.2fr; margin-top:18px">
          <div class="card">
            <div style="font-weight:800; margin-bottom:8px">${t("ultimos_alertas")}</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Alerta</th><th>${t("data_hora")}</th><th>${t("criticidade")}</th></tr></thead>
                <tbody id="tb-alertas"></tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div style="font-weight:800; margin-bottom:8px">${t("motores")}</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>${t("motores")}</th><th>Local</th><th>Status</th><th></th></tr></thead>
                <tbody id="tb-motores"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(async () => {
    wireSidebar();

    const $ = (id: string) => document.getElementById(id);
    const setText = (id: string, text: string) => { const el = $(id); if (el) el.textContent = text; };

    let tempChart: any = null;
    let vibChart: any = null;
    const tempCanvas = $("chartTemp") as HTMLCanvasElement | null;
    const vibCanvas = $("chartVib") as HTMLCanvasElement | null;

    if (tempCanvas) {
      // @ts-ignore
      tempChart = new Chart(tempCanvas, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Temperatura", data: [], tension: .3, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
    if (vibCanvas) {
      // @ts-ignore
      vibChart = new Chart(vibCanvas, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Vibração", data: [], tension: .3, borderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    stopFns.push(poll(api.status, 5000, s => {
      setText("k-online", String(s.online));
      setText("k-offline", String(s.offline));
      setText("k-alerta", String(s.alerta));
    }));

    stopFns.push(poll(() => api.ultimosAlertas(), 5000, rows => {
      const html = rows.map(r => {
        const sev = r.severidade === "alta" ? "err" : r.severidade === "media" ? "warn" : "ok";
        return `<tr>
          <td>MTR - ${r.motorId}</td>
          <td>${new Date(r.ts).toLocaleTimeString()}</td>
          <td><span class="badge ${sev}">${r.severidade[0].toUpperCase() + r.severidade.slice(1)}</span></td>
        </tr>`;
      }).join("");
      const tb = $("tb-alertas");
      if (tb) tb.innerHTML = html || `<tr><td colspan="3">${t("sem_alertas")}</td></tr>`;
    }));

    async function loadSerie() {
      const [tserie, vserie] = await Promise.all([
        api.temperaturaSerie(1, "1h"),
        api.vibracaoSerie(1, "1h"),
      ]);
      const labels = tserie.map(x => new Date(x.ts).toLocaleTimeString().slice(0, 5));
      const tvals = tserie.map(x => x.valor);
      const vvals = vserie.map(x => x.valor);

      if (tempChart) { tempChart.data.labels = labels; tempChart.data.datasets[0].data = tvals; tempChart.update(); }
      if (vibChart)  { vibChart.data.labels  = labels; vibChart.data.datasets[0].data  = vvals;  vibChart.update(); }

      const media = tvals.length ? (tvals.reduce((a, b) => a + b, 0) / tvals.length) : 0;
      setText("temp-media", (media ? media.toFixed(1) : "--") + " °C");
    }
    await loadSerie();
    stopFns.push(poll(loadSerie, 5000, () => { }));

    const motores = await api.motores().catch(() => []);
    const tbMotores = $("tb-motores");
    if (tbMotores) {
      tbMotores.innerHTML = motores.map(m => {
        const statusClass = m.status === "ALERTA" ? "warn" : m.status === "OFFLINE" ? "err" : "ok";
        return `<tr>
          <td>${m.id}</td><td>${m.nome}</td><td>${m.localizacao || "-"}</td>
          <td><span class="badge ${statusClass}">${m.status || "ONLINE"}</span></td>
          <td><a class="link" href="#/motor/${m.id}">${t("abrir")}</a></td>
        </tr>`;
      }).join("");
    }
  }, 0);

  return main;
}
