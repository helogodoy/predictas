import "chart.js/auto"; // evitar necessidade de tipos
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
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

function toBrasiliaTime(ts: string | number | Date): Date {
  const d = new Date(ts);
  return new Date(d.getTime() - 3 * 60 * 60 * 1000);
}

function beep(f = 880, ms = 180) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = f as any;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.01);
  } catch {}
}

function startPoll(fn: () => void, ms: number) {
  try {
    const p = (api as any).poll;
    if (typeof p === "function") return p(fn, ms);
  } catch {}
  const id = window.setInterval(fn, ms);
  return () => window.clearInterval(id);
}

export function MotorDetail(motorId: number) {
  let stop: () => void = () => {};
  let lastAudible = 0;

  let company = "Predictas";
  try {
    const raw = localStorage.getItem("predictas_user");
    if (raw) {
      const u = JSON.parse(raw);
      company = (u.company || u.nome || u.email || company).toString();
    }
  } catch {}

  const title = `Motor ${motorId}`;

  const view = `
    ${Sidebar("motores")}
    ${Topbar(title, company)}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div id="alertBar" style="width:100%; padding:6px 8px; font-weight:700; background:rgba(50,200,100,.35); margin-bottom:8px">NORMAL</div>

          <h2 id="mtitle" style="margin:0 0 6px 0">MTR ${motorId}</h2>
          <div id="mloc" style="opacity:.9; margin-bottom:12px">Local: -- | Último Update: --</div>

          <div class="kpi-cards">
            <div class="card">
              <div>Temperatura</div>
              <div id="k-temp" style="font-size:32px; font-weight:800">-- °C</div>
              <div id="k-temp-sub" style="opacity:.85">Faixa ideal: 22–24 °C</div>
            </div>
            <div class="card">
              <div>Umidade</div>
              <div id="k-umi" style="font-size:32px; font-weight:800">-- %</div>
              <div id="k-umi-sub" style="opacity:.85">Faixa ideal: 40–45 %</div>
            </div>
            <div class="card">
              <div>Vibração (RMS)</div>
              <div id="k-vib" style="font-size:32px; font-weight:800">--</div>
              <div id="k-vib-sub" style="opacity:.85">Faixa ideal: 5–20 % ativo</div>
            </div>
            <div class="card">
              <div>Pico (Temp) 24h</div>
              <div id="k-pico" style="font-size:32px; font-weight:800">-- °C</div>
              <div style="opacity:.85">Maior valor das últimas 24h</div>
            </div>
          </div>

          <div class="card" style="margin-top:14px">
            <div class="tabs">
              <button class="tab active" id="t1"  data-range="1h">1h</button>
              <button class="tab"        id="t7"  data-range="7d">7d</button>
              <button class="tab"        id="t30" data-range="30d">30d</button>
              <div style="margin-left:auto; display:flex; gap:8px">
                <button id="btnAckOff" class="btn btn-outline" style="padding:6px 10px">OK (Reconhecer offline)</button>
              </div>
            </div>
            <div id="offlineNote" style="display:none; margin-top:6px; font-size:13px; opacity:.9">
              Dispositivo offline. Exibindo dados anteriormente coletados.
            </div>
            <div style="height:360px; margin-top:8px"><canvas id="chartMotor"></canvas></div>
          </div>

          <div class="card" style="margin-top:14px">
            <div style="font-weight:800; margin-bottom:8px">Histórico</div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Hora</th><th>Evento</th><th>Valor</th><th>Status</th></tr></thead>
                <tbody id="tb-hist">
                  <tr><td>—</td><td>—</td><td>—</td><td><span class="badge ok">—</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(async () => {
    wireSidebar();
    const $ = (id: string) => document.getElementById(id)!;

    try {
      const m = await (api as any).motor(motorId).catch(
        () => ({ nome: `Motor ${motorId}`, localizacao: "--" } as any)
      ) || { nome: `Motor ${motorId}`, localizacao: "--" };
      $("#mtitle").textContent = `${(m as any).nome}`;
      $("#mloc").textContent =
        `Local: ${(m as any).localizacao || "-"} | Último Update: ${
          new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: "America/Sao_Paulo" })
            .format(toBrasiliaTime(new Date()))
        }`;
    } catch {}

    let chart: any = null;
    try {
      const ChartCtor = (window as any).Chart;
      chart = new ChartCtor(document.getElementById("chartMotor") as HTMLCanvasElement, {
        type: "line",
        data: {
          labels: [],
          datasets: [
            { label: "Temperatura (°C)", data: [], tension: .35, borderWidth: 2, fill: false },
            { label: "Umidade (%)",     data: [], tension: .35, borderWidth: 2, fill: false },
            { label: "Vibração (mm/s)", data: [], tension: .35, borderWidth: 2, fill: false }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "nearest" },
          plugins: { legend: { display: true }, decimation: { enabled: true } },
          elements: { point: { radius: 0 } },
          scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.1)" } }
          }
        }
      });
    } catch (e) {
      console.error("Falha ao inicializar gráfico:", e);
    }

    let currentRange: "1h" | "7d" | "30d" = "1h";
    let blinkTimer: number | null = null;
    const ONLINE_MS = 60 * 1000;
    const ackKey = `predictas_ack_offline_${motorId}`;

    function setAlertVisual(status: "NORMAL" | "CRÍTICO" | "OFFLINE", detalhe?: string) {
      const bar = $("#alertBar");
      let text = "NORMAL";
      let bg = "rgba(50,200,100,.35)";
      if (status === "CRÍTICO") {
        text = detalhe ? `⚠️ ALERTA CRÍTICO – ${detalhe}` : "⚠️ ALERTA CRÍTICO DETECTADO ⚠️";
        bg = "rgba(255,50,50,.85)";
      }
      if (status === "OFFLINE") {
        const ack = localStorage.getItem(ackKey);
        text = ack ? "OFFLINE (OK reconhecido)" : "⚠️ SENSOR OFFLINE – sem dados recentes";
        bg = "rgba(255,180,0,.85)";
      }
      bar.textContent = text;
      (bar as HTMLElement).style.background = bg;

      if (blinkTimer) { window.clearInterval(blinkTimer); blinkTimer = null; (bar as HTMLElement).style.opacity = "1"; }
      if (status !== "NORMAL") {
        let on = false;
        blinkTimer = window.setInterval(() => {
          on = !on;
          (bar as HTMLElement).style.opacity = on ? "1" : "0.45";
        }, 550);
        const now = Date.now();
        if (status === "CRÍTICO" && now - lastAudible > 2000) {
          beep(880, 180);
          setTimeout(() => beep(660, 160), 220);
          lastAudible = now;
        }
      }
    }

    function formatLabel(ts: string | number | Date, range: "1h" | "7d" | "30d") {
      const dt = toBrasiliaTime(ts);
      if (range === "1h") {
        return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(dt);
      }
      return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(dt);
    }

    async function load(janela: "1h" | "7d" | "30d" = currentRange) {
      currentRange = janela;
      try {
        const [tJan, uJan, vJan] = await Promise.all([
          (api as any).temperaturaSerie(motorId, janela),
          (api as any).umidadeSerie(motorId, janela),
          (api as any).vibracaoSerie(motorId, janela),
        ]);

        const [t24, u24, v24] = await Promise.all([
          (api as any).temperaturaSerie(motorId, "24h"),
          (api as any).umidadeSerie(motorId, "24h"),
          (api as any).vibracaoSerie(motorId, "24h"),
        ]);

        const labels = tJan.map((x: any) => formatLabel(x.ts, janela));
        const tvalsJan = tJan.map((x: any) => Number(x.valor) || 0);
        const uvalsJan = uJan.map((x: any) => Number(x.valor) || 0);
        const vvalsJan = vJan.map((x: any) => Number(x.valor) || 0);

        if (chart) {
          chart.data.labels = labels;
          chart.data.datasets[0].data = tvalsJan;
          chart.data.datasets[1].data = uvalsJan;
          chart.data.datasets[2].data = vvalsJan;
          (chart.options.scales!.y as any).suggestedMax =
            Math.max(
              Math.ceil((Math.max(...tvalsJan, 0) + 5) / 5) * 5,
              Math.ceil((Math.max(...uvalsJan, 0) + 5) / 5) * 5,
              Math.ceil((Math.max(...vvalsJan, 0) + 1) / 1) * 1,
              10
            );
          chart.update();
        }

        const tvals = t24.map((x: any) => Number(x.valor) || 0);
        const uvals = u24.map((x: any) => Number(x.valor) || 0);
        const vvals = v24.map((x: any) => Number(x.valor) || 0);

        const currT = tvals.at(-1);
        const currU = uvals.at(-1);
        const currV = vvals.at(-1);

        (document.getElementById("k-temp")!).textContent = Number.isFinite(currT!) ? `${currT!.toFixed(1)} °C` : "-- °C";
        (document.getElementById("k-umi")!).textContent  = Number.isFinite(currU!) ? `${currU!.toFixed(1)} %` : "-- %";
        (document.getElementById("k-vib")!).textContent  = Number.isFinite(currV!) ? `${currV!.toFixed(1)}`   : "--";
        (document.getElementById("k-pico")!).textContent = tvals.length ? `${Math.max(...tvals, 0).toFixed(1)} °C` : "-- °C";

        const TEMP_MIN = 22.0, TEMP_MAX = 24.0;
        const UMID_MIN = 40.0, UMID_MAX = 45.0;
        const MOV_MIN  = 5.0,  MOV_MAX  = 20.0;

        const tempOff = Number.isFinite(currT!) && (currT! < TEMP_MIN || currT! > TEMP_MAX);
        const umiOff  = Number.isFinite(currU!) && (currU! < UMID_MIN || currU! > UMID_MAX);
        const vibOff  = Number.isFinite(currV!) && (currV! < MOV_MIN  || currV! > MOV_MAX);

        (document.getElementById("k-temp") as HTMLElement).style.color = tempOff ? "#ff4d4d" : "#ffffff";
        (document.getElementById("k-umi")  as HTMLElement).style.color = umiOff  ? "#ff4d4d" : "#ffffff";
        (document.getElementById("k-vib")  as HTMLElement).style.color = vibOff  ? "#ff4d4d" : "#ffffff";

        // Disponibilidade
        let isOnline = true;
        try {
          const m = await (api as any).motor(motorId).catch(() => null);
          const tsRef = m?.atualizado_em ?? m?.ultimo_update ?? m?.momento ?? m?.ts;
          const last = tsRef ? new Date(tsRef).getTime() : 0;
          isOnline = !!(last && (Date.now() - last) <= ONLINE_MS);
          (document.getElementById("offlineNote") as HTMLElement).style.display = isOnline ? "none" : "block";
        } catch {
          isOnline = true;
        }

        const problemas: string[] = [];
        if (tempOff) problemas.push("Temperatura fora da faixa");
        if (umiOff)  problemas.push("Umidade fora da faixa");
        if (vibOff)  problemas.push("Vibração fora da faixa");

        if (!isOnline) {
          setAlertVisual("OFFLINE");
        } else if (problemas.length) {
          setAlertVisual("CRÍTICO", problemas.join(" · "));
        } else {
          setAlertVisual("NORMAL");
        }

        // Histórico de alertas (inclui “sensor_offline” se desejar cadastrar no backend futuramente)
        let alertas: any[] = [];
        try {
          alertas = await (api as any).alertas(50);
        } catch { alertas = []; }

        const linhas = alertas
          .filter(a => a.motorId === motorId)
          .slice(0, 10)
          .map(a => {
            const corBadge = a.severidade === "alta" ? "err" :
                             a.severidade === "media" ? "warn" : "ok";
            return `
              <tr>
                <td>${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(toBrasiliaTime(a.criado_em))}</td>
                <td>${a.tipo}</td>
                <td>${a.valor ?? "-"}</td>
                <td><span class="badge ${corBadge}">${(a.status ?? a.severidade ?? "").toString().toUpperCase()}</span></td>
              </tr>`;
          })
          .join("");
        (document.getElementById("tb-hist")!).innerHTML = linhas || "<tr><td colspan='4'>Sem alertas recentes</td></tr>";

        (document.getElementById("mloc")!).textContent =
          `Local: ${(document.getElementById("mloc")!.textContent?.split("|")[0].replace("Local: ", "").trim()) || "-"} | Último Update: ${
            new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: "America/Sao_Paulo" })
              .format(toBrasiliaTime(new Date()))
          }`;

      } catch (e) {
        console.warn("Falha ao carregar leituras/alertas:", e);
        (document.getElementById("tb-hist")!).innerHTML = "<tr><td colspan='4'>Erro ao carregar histórico</td></tr>";
      }
    }

    ["t1","t7","t30"].forEach(id => {
      document.getElementById(id)?.addEventListener("click", (ev) => {
        document.querySelectorAll(".tabs .tab").forEach(el => el.classList.remove("active"));
        (ev.target as HTMLElement).classList.add("active");
        const jan = (ev.target as HTMLElement).getAttribute("data-range") as "1h"|"7d"|"30d" || "1h";
        load(jan);
      });
    });

    // ACK offline
    document.getElementById("btnAckOff")?.addEventListener("click", () => {
      localStorage.setItem(ackKey, new Date().toISOString());
      load(currentRange);
    });

    await load("1h");
    stop = startPoll(() => load(currentRange), 5000);
  }, 0);

  return view;
}
