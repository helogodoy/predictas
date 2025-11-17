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
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

// Pequeno beep para alertas críticos
function beep(f = 880, ms = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "square"; o.frequency.value = f;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.01);
  } catch {}
}

let stopFns: Array<() => void> = [];

// util para converter UTC → horário de Brasília
function toBrasiliaTime(ts: string | number | Date): Date {
  const d = new Date(ts);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000);
}

export function Dashboard() {
  // limpa pools anteriores
  stopFns.forEach(f => f());
  stopFns = [];

  const main = `
    ${Sidebar("dashboard")}
    ${Topbar(t("page_dashboard"))}
    <div id="statusBar" style="
      width:100%; padding:6px 0;
      background:rgba(50,200,100,.3);
      text-align:center;
      font-weight:700;
      font-size:15px;
      letter-spacing:.5px;
      transition:all .3s ease;
    ">SISTEMA NORMAL</div>

    <div class="main-content">
      <div class="container">

        <!-- LINHA 1: Status Geral + Motores (visão de parque) -->
        <div class="grid" style="grid-template-columns:0.9fr 2.1fr; gap:16px; margin-bottom:18px">
          
          <!-- STATUS GERAL -->
          <div class="card">
            <div style="font-weight:800">${t("status_geral")}</div>
            <div class="grid" style="grid-template-columns:repeat(3,1fr); gap:8px; margin-top:18px">
              <div style="text-align:center">
                <div class="kpi-value" id="k-online">--</div>
                <div class="kpi-sub" style="color:#5CFF8A; font-weight:700">${t("online")}</div>
              </div>
              <div style="text-align:center">
                <div class="kpi-value" id="k-offline">—</div>
                <div class="kpi-sub" style="opacity:.8">${t("offline")}</div>
              </div>
              <div style="text-align:center">
                <div class="kpi-value" id="k-alerta">0</div>
                <div class="kpi-sub" style="color:#ffdd57; font-weight:700">${t("alerta")}</div>
              </div>
            </div>
          </div>

          <!-- MOTORES -->
          <div class="card">
            <div style="font-weight:800; margin-bottom:8px">${t("motores")}</div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>${t("motores")}</th>
                    <th>Local</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody id="tb-motores">
                  <tr><td colspan="5">${t("carregando")}...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- LINHA 2: Sensores (3 cards, gráficos maiores) -->
        <div class="grid kpi" style="grid-template-columns:repeat(3, minmax(0,1fr)); gap:16px">
          
          <!-- TEMPERATURA -->
          <div class="card" style="text-align:center">
            <div style="font-weight:800">Temperatura</div>
            <div id="temp-atual" style="font-size:48px; font-weight:800; margin-top:12px">-- °C</div>
            <div style="margin-top:6px; opacity:.9; font-size:14px">
              Média 24h: <span id="temp-media" style="font-weight:700">-- °C</span>
              &nbsp;|&nbsp;
              Máx 24h: <span id="temp-max" style="font-weight:700">-- °C</span>
            </div>
            <div style="height:260px; margin-top:8px"><canvas id="chartTemp"></canvas></div>
          </div>

          <!-- UMIDADE -->
          <div class="card" style="text-align:center">
            <div style="font-weight:800">Umidade</div>
            <div id="umi-atual" style="font-size:42px; font-weight:800; margin-top:12px">-- %</div>
            <div style="margin-top:6px; opacity:.9; font-size:14px">
              Média 24h: <span id="umi-media" style="font-weight:700">-- %</span>
              &nbsp;|&nbsp;
              Máx 24h: <span id="umi-max" style="font-weight:700">-- %</span>
            </div>
            <div style="height:260px; margin-top:8px"><canvas id="chartUmi"></canvas></div>
          </div>

          <!-- VIBRAÇÃO -->
          <div class="card" style="text-align:center">
            <div style="font-weight:800">Vibração</div>
            <div id="vib-atual" style="font-size:36px; font-weight:800; margin-top:12px">--</div>
            <div style="margin-top:6px; opacity:.9; font-size:14px">
              Média 24h: <span id="vib-media" style="font-weight:700">--</span>
              &nbsp;|&nbsp;
              Máx 24h: <span id="vib-max" style="font-weight:700">--</span>
            </div>
            <div style="height:260px; margin-top:8px"><canvas id="chartVib"></canvas></div>
          </div>
        </div>

      </div>
    </div>
  `;

  setTimeout(async () => {
    wireSidebar();

    const $ = (id: string) => document.getElementById(id);
    const setText = (id: string, text: string) => {
      const el = $(id);
      if (el) el.textContent = text;
    };

    const statusBar = $("statusBar")!;
    let blinkTimer: number | null = null;
    let lastBeep = 0;

    function updateStatusVisual(level: "normal" | "atencao" | "critico") {
      let bg = "rgba(50,200,100,.3)";
      let text = "SISTEMA NORMAL";
      if (level === "atencao") { bg = "rgba(255,180,40,.7)"; text = "ATENÇÃO: verifique leituras"; }
      if (level === "critico") { bg = "rgba(255,50,50,.85)"; text = "⚠️ ALERTA CRÍTICO DETECTADO ⚠️"; }

      (statusBar as HTMLElement).style.background = bg;
      statusBar.textContent = text;

      if (blinkTimer) { clearInterval(blinkTimer); blinkTimer = null; (statusBar as HTMLElement).style.opacity = "1"; }
      if (level === "critico") {
        let on = false;
        blinkTimer = window.setInterval(() => {
          on = !on;
          (statusBar as HTMLElement).style.opacity = on ? "1" : "0.45";
        }, 600);
        const now = Date.now();
        if (now - lastBeep > 5000) { beep(900, 160); lastBeep = now; }
      }
    }

    let tempChart: any = null;
    let umiChart: any = null;
    let vibChart: any = null;
    const tempCanvas = $("chartTemp") as HTMLCanvasElement | null;
    const umiCanvas  = $("chartUmi") as HTMLCanvasElement | null;
    const vibCanvas  = $("chartVib") as HTMLCanvasElement | null;

    const commonOpts = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "nearest" as const },
      plugins: { legend: { display: false }, decimation: { enabled: true } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.1)" } }
      },
      elements: { point: { radius: 0 } }
    };

    if (tempCanvas) {
      // @ts-ignore
      tempChart = new Chart(tempCanvas, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Temperatura (°C)", data: [], tension: .35, borderWidth: 2, fill: false }] },
        options: commonOpts
      });
    }
    if (umiCanvas) {
      // @ts-ignore
      umiChart = new Chart(umiCanvas, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Umidade (%)", data: [], tension: .35, borderWidth: 2, fill: false }] },
        options: commonOpts
      });
    }
    if (vibCanvas) {
      // @ts-ignore
      vibChart = new Chart(vibCanvas, {
        type: "line",
        data: { labels: [], datasets: [{ label: "Vibração (mm/s)", data: [], tension: .35, borderWidth: 2, fill: false }] },
        options: commonOpts
      });
    }

    // STATUS GERAL
    stopFns.push(poll(api.statusGeral, 5000, (s) => {
      setText("k-online", String(s.dispositivos ?? s.sensores ?? "--"));
      setText("k-offline", "—");
      setText("k-alerta", String(s.alertas ?? 0));
      if ((s.alertas ?? 0) > 0) updateStatusVisual("atencao");
      else updateStatusVisual("normal");
    }));

    // SÉRIES (atual, média e máx 24h)
    async function loadSerie() {
      const [tserie, userie, vserie] = await Promise.all([
        api.temperaturaSerie(1, "24h"),
        api.umidadeSerie(1, "24h"),
        api.vibracaoSerie(1, "24h"),
      ]);

      const labels = tserie.map(x =>
        new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo"
        }).format(toBrasiliaTime(x.ts))
      );

      const tvals = tserie.map(x => Number(x.valor) || 0);
      const uvals = userie.map(x => Number(x.valor) || 0);
      const vvals = vserie.map(x => Number(x.valor) || 0);

      if (tempChart) {
        tempChart.data.labels = labels;
        tempChart.data.datasets[0].data = tvals;
        (tempChart.options.scales as any).y.suggestedMax =
          Math.max(Math.ceil((Math.max(...tvals, 0) + 5) / 5) * 5, 10);
        tempChart.update();
      }
      if (umiChart) {
        umiChart.data.labels = labels;
        umiChart.data.datasets[0].data = uvals;
        (umiChart.options.scales as any).y.suggestedMax =
          Math.max(Math.ceil((Math.max(...uvals, 0) + 5) / 5) * 5, 10);
        umiChart.update();
      }
      if (vibChart) {
        vibChart.data.labels = labels;
        vibChart.data.datasets[0].data = vvals;
        (vibChart.options.scales as any).y.suggestedMax =
          Math.max(Math.ceil((Math.max(...vvals, 0) + 1) / 1) * 1, 5);
        vibChart.update();
      }

      const mediaT = tvals.length ? tvals.reduce((a, b) => a + b, 0) / tvals.length : 0;
      const mediaU = uvals.length ? uvals.reduce((a, b) => a + b, 0) / uvals.length : 0;
      const mediaV = vvals.length ? vvals.reduce((a, b) => a + b, 0) / vvals.length : 0;
      const maxT = tvals.length ? Math.max(...tvals) : 0;
      const maxU = uvals.length ? Math.max(...uvals) : 0;
      const maxV = vvals.length ? Math.max(...vvals) : 0;

      const currT = tvals.length ? tvals[tvals.length - 1] : 0;
      const currU = uvals.length ? uvals[uvals.length - 1] : 0;
      const currV = vvals.length ? vvals[vvals.length - 1] : 0;

      // Valores atuais em destaque
      setText("temp-atual", (currT ? currT.toFixed(1) : "--") + " °C");
      setText("umi-atual",  (currU ? currU.toFixed(1) : "--") + " %");
      setText("vib-atual",  (currV ? currV.toFixed(1) : "--"));

      // Médias e máximas 24h
      setText("temp-media", mediaT ? mediaT.toFixed(1) + " °C" : "-- °C");
      setText("temp-max",   maxT ? maxT.toFixed(1)   + " °C" : "-- °C");
      setText("umi-media",  mediaU ? mediaU.toFixed(1) + " %" : "-- %");
      setText("umi-max",    maxU ? maxU.toFixed(1)   + " %" : "-- %");
      setText("vib-media",  mediaV ? mediaV.toFixed(1) : "--");
      setText("vib-max",    maxV ? maxV.toFixed(1)   : "--");
    }

    await loadSerie();
    stopFns.push(poll(loadSerie, 5000, () => {}));

    // MOTORES
    const motores = await api.motores().catch(() => []);
    const tbMotores = document.getElementById("tb-motores");
    if (tbMotores) {
      tbMotores.innerHTML =
        motores.map((m: any) => {
          const st = String(m.status || "online").toUpperCase();
          const statusClass = st === "ALERTA" ? "warn" : st === "OFFLINE" ? "err" : "ok";
          return `<tr>
            <td>${m.id}</td>
            <td>${m.nome}</td>
            <td>${m.localizacao || "-"}</td>
            <td><span class="badge ${statusClass}">${st}</span></td>
            <td><a class="link" href="#/motor/${m.id}">${t("abrir") ?? "Abrir"}</a></td>
          </tr>`;
        }).join("") || `<tr><td colspan="5">Nenhum dispositivo</td></tr>`;
    }
  }, 0);

  return main;
}
