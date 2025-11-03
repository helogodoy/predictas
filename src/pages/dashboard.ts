import "chart.js/auto";
import api, { poll } from "../services/api";
import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";

let stopFns: Array<() => void> = [];

export function Dashboard() {
  // encerra pollings anteriores
  stopFns.forEach(f => f()); stopFns = [];

  // tenta derivar nome da empresa do usuário logado
  let company = "Predictas";
  try{
    const raw = localStorage.getItem("predictas_user");
    if (raw) {
      const u = JSON.parse(raw);
      company = (u.company || u.nome || u.email || company).toString();
    }
  }catch{}

  const main = `
    ${Sidebar("dashboard")}
    ${Topbar("Dashboard", company)}
    <div class="main-content">
      <div class="container">
        <div class="grid kpi">
          <div class="card"><div style="font-weight:800">Status Geral</div>
            <div class="grid" style="grid-template-columns:repeat(3,1fr); gap:8px; margin-top:10px">
              <div><div class="kpi-value" id="k-online">--</div><div class="kpi-sub" style="color:#98e19a">ONLINE</div></div>
              <div><div class="kpi-value" id="k-offline">--</div><div class="kpi-sub" style="color:#ffa0a0">OFFLINE</div></div>
              <div><div class="kpi-value" id="k-alerta">--</div><div class="kpi-sub" style="color:#ffd37a">ALERTA</div></div>
            </div>
          </div>

          <div class="card" style="text-align:center">
            <div style="font-weight:800">Temperatura Média (°C) – Últimas 24h</div>
            <div id="temp-media" style="font-size:48px; font-weight:800; margin-top:12px">-- °C</div>
            <div style="height:260px; margin-top:8px"><canvas id="chartTemp"></canvas></div>
          </div>

          <div class="card">
            <div style="font-weight:800">Vibração Média (mm/s)</div>
            <div style="height:320px; margin-top:8px"><canvas id="chartVib"></canvas></div>
          </div>
        </div>

        <div class="grid" style="grid-template-columns: .8fr 1.2fr; margin-top:18px">
          <div class="card">
            <div style="font-weight:800; margin-bottom:8px">Últimos alertas</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Alerta</th><th>Horário</th><th>Criticidade</th></tr></thead>
                <tbody id="tb-alertas"></tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div style="font-weight:800; margin-bottom:8px">Motores</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Nome</th><th>Local</th><th>Status</th><th></th></tr></thead>
                <tbody id="tb-motores"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(async () => {
    // ---- toggle do menu off-canvas ----
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebarOverlay");
    const btnOpen = document.getElementById("btnMenu");
    const btnClose = document.getElementById("btnCloseSidebar");

    const openSidebar = () => {
      sidebar?.classList.add("open");
      overlay?.classList.add("show");
      sidebar?.setAttribute("aria-hidden","false");
      overlay?.setAttribute("aria-hidden","false");
    };
    const closeSidebar = () => {
      sidebar?.classList.remove("open");
      overlay?.classList.remove("show");
      sidebar?.setAttribute("aria-hidden","true");
      overlay?.setAttribute("aria-hidden","true");
    };

    btnOpen?.addEventListener("click", openSidebar);
    btnClose?.addEventListener("click", closeSidebar);
    overlay?.addEventListener("click", closeSidebar);
    document.querySelectorAll('[data-close-sidebar="1"]').forEach(a=>{
      a.addEventListener("click", closeSidebar);
    });
    window.addEventListener("keydown", (e)=>{
      if(e.key === "Escape") closeSidebar();
    });

    // ---- resto do dashboard ----
    const $ = (id:string) => document.getElementById(id);
    const setText = (id:string, text:string) => { const el = $(id); if(el) el.textContent = text; };

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

    stopFns.push(poll(api.status, 5000, s=>{
      setText("k-online", String(s.online));
      setText("k-offline", String(s.offline));
      setText("k-alerta", String(s.alerta));
    }));

    stopFns.push(poll(()=>api.ultimosAlertas(), 5000, rows=>{
      const html = rows.map(r=>{
        const sev = r.severidade==="alta" ? "err" : r.severidade==="media" ? "warn":"ok";
        return `<tr>
          <td>MTR - ${r.motorId}</td>
          <td>${new Date(r.ts).toLocaleTimeString()}</td>
          <td><span class="badge ${sev}">${r.severidade[0].toUpperCase()+r.severidade.slice(1)}</span></td>
        </tr>`;
      }).join("");
      const tb = $("tb-alertas");
      if (tb) tb.innerHTML = html || `<tr><td colspan="3">Sem alertas</td></tr>`;
    }));

    async function loadSerie(){
      const [t,v] = await Promise.all([
        api.temperaturaSerie(1,"1h"),
        api.vibracaoSerie(1,"1h"),
      ]);
      const labels = t.map(x=>new Date(x.ts).toLocaleTimeString().slice(0,5));
      const tvals  = t.map(x=>x.valor);
      const vvals  = v.map(x=>x.valor);
      if (tempChart) { tempChart.data.labels = labels; tempChart.data.datasets[0].data = tvals; tempChart.update(); }
      if (vibChart)  { vibChart.data.labels  = labels; vibChart.data.datasets[0].data = vvals;  vibChart.update(); }

      const media = tvals.length ? (tvals.reduce((a,b)=>a+b,0)/tvals.length) : 0;
      setText("temp-media", (media ? media.toFixed(1) : "--")+" °C");
    }
    await loadSerie();
    stopFns.push(poll(loadSerie, 5000, ()=>{}));

    const motores = await api.motores().catch(()=>[]);
    const tbMotores = $("tb-motores");
    if (tbMotores) {
      tbMotores.innerHTML = motores.map((m:any)=>{
        const statusClass = m.status==="ALERTA" ? "warn" : m.status==="OFFLINE" ? "err" : "ok";
        return `<tr>
          <td>${m.id}</td><td>${m.nome}</td><td>${m.localizacao||"-"}</td>
          <td><span class="badge ${statusClass}">${m.status||"ONLINE"}</span></td>
          <td><a class="link" href="#/motor/${m.id}">Abrir</a></td>
        </tr>`;
      }).join("");
    }
  }, 0);

  return main;
}
