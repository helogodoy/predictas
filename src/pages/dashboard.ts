// src/pages/dashboard.ts
import "chart.js/auto";
import { Topbar } from "../components/topbar";
import { Sidebar } from "../components/sidebar";
import api from "../services/api"; // remover import nomeado poll
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

function beep(f = 880, ms = 150) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "square"; o.frequency.value = f as any;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.01);
  } catch {}
}

let stopFns: Array<() => void> = [];
function toBrasiliaTime(ts: string | number | Date): Date {
  const d = new Date(ts);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000);
}
function startPoll(fn: () => void, ms: number) {
  try {
    const p = (api as any).poll;
    if (typeof p === "function") return p(fn, ms);
  } catch {}
  const id = window.setInterval(fn, ms);
  return () => window.clearInterval(id);
}

export function Dashboard() {
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

        <div class="grid" style="grid-template-columns:0.9fr 2.1fr; gap:16px; margin-bottom:18px">
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

        <div class="grid kpi" style="gap:16px">
          <div class="card" style="text-align:center">
            <div style="font-weight:800">Temperatura</div>
            <div id="temp-atual" style="font-size:48px; font-weight:800; margin-top:12px">-- °C</div>
            <div style="margin-top:4px; font-size:13px; opacity:.9">Faixa ideal: 22–24 °C</div>
            <div style="margin-top:6px; opacity:.9; font-size:14px">
              Média 24h: <span id="temp-media" style="font-weight:700">-- °C</span>
              &nbsp;|&nbsp;
              Máx 24h: <span id="temp-max" style="font-weight:700">-- °C</span>
            </div>
            <div style="height:260px; margin-top:8px"><canvas id="chartTemp"></canvas></div>
          </div>

          <div class="card" style="text-align:center">
            <div style="font-weight:800">Umidade</div>
            <div id="umi-atual" style="font-size:48px; font-weight:800; margin-top:12px">-- %</div>
            <div style="margin-top:4px; font-size:13px; opacity:.9">Faixa ideal: 40–45 %</div>
            <div style="margin-top:6px; opacity:.9; font-size:14px">
              Média 24h: <span id="umi-media" style="font-weight:700">-- %</span>
              &nbsp;|&nbsp;
              Máx 24h: <span id="umi-max" style="font-weight:700">-- %</span>
            </div>
            <div style="height:260px; margin-top:8px"><canvas id="chartUmi"></canvas></div>
          </div>

          <div class="card" style="text-align:center">
            <div style="font-weight:800">Vibração</div>
            <div id="vib-atual" style="font-size:48px; font-weight:800; margin-top:12px">--</div>
            <div style="margin-top:4px; font-size:13px; opacity:.9">Faixa ideal: 5–20 % ativo</div>
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
    const setText = (id: string, text: string) => { const el = $(id); if (el) el.textContent = text; };

    const statusBar = $("statusBar")!;
    let blinkTimer: number | null = null;
    let lastBeep = 0;

    function updateStatusVisual(level: "normal" | "critico") {
      let bg = "rgba(50,200,100,.3)";
      let text = "SISTEMA NORMAL";
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
        if (now - lastBeep > 2000) { beep(900, 160); lastBeep = now; }
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
      scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.1)" } } },
      elements: { point: { radius: 0 } }
    };

    if (tempCanvas) tempChart = new (window as any).Chart(tempCanvas, {
      type: "line",
      data: { labels: [], datasets: [{ label: "Temperatura (°C)", data: [], tension: .35, borderWidth: 2, fill: false }] },
      options: commonOpts
    });
    if (umiCanvas) umiChart = new (window as any).Chart(umiCanvas, {
      type: "line",
      data: { labels: [], datasets: [{ label: "Umidade (%)", data: [], tension: .35, borderWidth: 2, fill: false }] },
      options: commonOpts
    });
    if (vibCanvas) vibChart = new (window as any).Chart(vibCanvas, {
      type: "line",
      data: { labels: [], datasets: [{ label: "Vibração (mm/s)", data: [], tension: .35, borderWidth: 2, fill: false }] },
      options: commonOpts
    });

    // === STATUS GERAL com cálculo de disponibilidade por batimento de vida ===
    const ONLINE_MS = 60 * 1000;

    async function loadStatusGeral() {
      try {
        const motores = await (api as any).motores().catch(() => []);
        const now = Date.now();
        let online = 0, offline = 0;
        motores.forEach((m: any) => {
          const tsRef = m.atualizado_em ?? m.ultimo_update ?? m.momento ?? m.ts;
          const last = tsRef ? new Date(tsRef).getTime() : 0;
          if (last && (now - last) <= ONLINE_MS) online++; else offline++;
        });

        // total de alertas (fallback busca direta)
        let totalAlertas = 0;
        try {
          const s = await (api as any).statusGeral?.();
          totalAlertas = s?.alertas ?? 0;
          if (!totalAlertas) {
            const rows = await (api as any).alertas?.(100).catch(() => []);
            totalAlertas = Array.isArray(rows) ? rows.length : 0;
          }
        } catch {}

        setText("k-online", String(online));
        setText("k-offline", String(offline));
        setText("k-alerta", String(totalAlertas));

        // Tabela de motores com badge OFFLINE e “Reconhecer”
        const tb = document.getElementById("tb-motores");
        if (tb) {
          tb.innerHTML = motores.map((m: any) => {
            const tsRef = m.atualizado_em ?? m.ultimo_update ?? m.momento ?? m.ts;
            const last = tsRef ? new Date(tsRef).getTime() : 0;
            const isOn = last && (Date.now() - last) <= ONLINE_MS;
            const st = isOn ? "ONLINE" : "OFFLINE";
            const statusClass = isOn ? "ok" : "err";
            const ackKey = `predictas_ack_offline_${m.id}`;
            const ack = localStorage.getItem(ackKey);
            const ackBtn = isOn ? "" : `<button class="btn btn-outline" data-ack="${m.id}" style="padding:4px 8px; font-size:12px">OK</button>`;
            return `<tr>
              <td>${m.id}</td>
              <td>${m.nome ?? `Motor ${m.id}`}</td>
              <td>${m.localizacao || "-"}</td>
              <td>
                <span class="badge ${statusClass}">${st}</span>
                ${!isOn && ack ? '<span class="badge ok" style="margin-left:6px">OK</span>' : ""}
              </td>
              <td><a class="link" href="#/motor/${m.id}">${t("abrir") ?? "Abrir"}</a> ${ackBtn}</td>
            </tr>`;
          }).join("") || `<tr><td colspan="5">Nenhum dispositivo</td></tr>`;

          // wire ACK
          document.querySelectorAll("[data-ack]").forEach(btn => {
            btn.addEventListener("click", (ev) => {
              const id = (ev.currentTarget as HTMLElement).getAttribute("data-ack");
              if (id) {
                localStorage.setItem(`predictas_ack_offline_${id}`, new Date().toISOString());
                loadStatusGeral(); // refresh
              }
            });
          });
        }
      } catch (e) {
        console.warn("Falha status geral:", e);
      }
    }

    // Séries + lógica de alerta visual
    async function loadSerie() {
      const [tserie, userie, vserie] = await Promise.all([
        (api as any).temperaturaSerie(1, "24h"),
        (api as any).umidadeSerie(1, "24h"),
        (api as any).vibracaoSerie(1, "24h"),
      ]);

      const labels = tserie.map((x: any) =>
        new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" })
          .format(toBrasiliaTime(x.ts))
      );

      const tvals = tserie.map((x: any) => Number(x.valor) || 0);
      const uvals = userie.map((x: any) => Number(x.valor) || 0);
      const vvals = vserie.map((x: any) => Number(x.valor) || 0);

      if (tempChart) {
        tempChart.data.labels = labels;
        tempChart.data.datasets[0].data = tvals;
        (tempChart.options.scales as any).y.suggestedMax = Math.max(Math.ceil((Math.max(...tvals, 0) + 5) / 5) * 5, 10);
        tempChart.update();
      }
      if (umiChart) {
        umiChart.data.labels = labels;
        umiChart.data.datasets[0].data = uvals;
        (umiChart.options.scales as any).y.suggestedMax = Math.max(Math.ceil((Math.max(...uvals, 0) + 5) / 5) * 5, 10);
        umiChart.update();
      }
      if (vibChart) {
        vibChart.data.labels = labels;
        vibChart.data.datasets[0].data = vvals;
        (vibChart.options.scales as any).y.suggestedMax = Math.max(Math.ceil((Math.max(...vvals, 0) + 1) / 1) * 1, 5);
        vibChart.update();
      }

      const currT = tvals.at(-1); const currU = uvals.at(-1); const currV = vvals.at(-1);

      const set = (id: string, val: string) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set("temp-atual", Number.isFinite(currT!) ? currT!.toFixed(1) + " °C" : "-- °C");
      set("umi-atual",  Number.isFinite(currU!) ? currU!.toFixed(1) + " %" : "-- %");
      set("vib-atual",  Number.isFinite(currV!) ? currV!.toFixed(1)       : "--");

      const media = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      set("temp-media", tvals.length ? media(tvals).toFixed(1) + " °C" : "-- °C");
      set("temp-max",   tvals.length ? Math.max(...tvals).toFixed(1)   + " °C" : "-- °C");
      set("umi-media",  uvals.length ? media(uvals).toFixed(1) + " %" : "-- %");
      set("umi-max",    uvals.length ? Math.max(...uvals).toFixed(1)   + " %" : "-- %");
      set("vib-media",  vvals.length ? media(vvals).toFixed(1)         : "--");
      set("vib-max",    vvals.length ? Math.max(...vvals).toFixed(1)   : "--");

      const TEMP_MIN = 22.0, TEMP_MAX = 24.0;
      const UMID_MIN = 40.0, UMID_MAX = 45.0;
      const MOV_MIN  = 5.0,  MOV_MAX  = 20.0;

      const tempOff = Number.isFinite(currT!) && (currT! < TEMP_MIN || currT! > TEMP_MAX);
      const umiOff  = Number.isFinite(currU!) && (currU! < UMID_MIN || currU! > UMID_MAX);
      const vibOff  = Number.isFinite(currV!) && (currV! < MOV_MIN  || currV! > MOV_MAX);

      const setColor = (id: string, bad: boolean) => { const el = document.getElementById(id) as HTMLElement | null; if (el) el.style.color = bad ? "#ff4d4d" : "#ffffff"; };
      setColor("temp-atual", tempOff); setColor("umi-atual", umiOff); setColor("vib-atual", vibOff);

      if (tempOff || umiOff || vibOff) updateStatusVisual("critico"); else updateStatusVisual("normal");
    }

    await Promise.all([loadStatusGeral(), loadSerie()]);
    stopFns.push(startPoll(loadStatusGeral, 5000));
    stopFns.push(startPoll(loadSerie, 5000));
  }, 0);

  return main;
}
