import Chart from "chart.js/auto";
import { Sidebar } from "../components/sidebar";
import { Topbar } from "../components/topbar";
import api, { poll, fmtTime } from "../services/api";

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
    o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.start(); o.stop(ctx.currentTime + ms / 1000 + 0.01);
  } catch {}
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
      const m = await api.motor(motorId).catch(
        () => ({ nome: `Motor ${motorId}`, localizacao: "--" } as any)
      ) || { nome: `Motor ${motorId}`, localizacao: "--" };
      $("#mtitle").textContent = `${(m as any).nome}`;
      $("#mloc").textContent =
        `Local: ${(m as any).localizacao || "-"} | Último Update: ${
          new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: "America/Sao_Paulo" })
            .format(toBrasiliaTime(new Date()))
        }`;
    } catch {}

    let chart: Chart | null = null;
    try {
      chart = new Chart(document.getElementById("chartMotor") as HTMLCanvasElement, {
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

    function setAlertVisual(status: "NORMAL" | "CRÍTICO", detalhe?: string) {
      const bar = $("#alertBar");
      if (status === "CRÍTICO") {
        bar.textContent = detalhe
          ? `⚠️ ALERTA CRÍTICO – ${detalhe}`
          : "⚠️ ALERTA CRÍTICO DETECTADO ⚠️";
      } else {
        bar.textContent = "NORMAL";
      }

      let bg = "rgba(50,200,100,.35)";
      if (status === "CRÍTICO") bg = "rgba(255,50,50,.85)";
      (bar as HTMLElement).style.background = bg;

      if (blinkTimer) { window.clearInterval(blinkTimer); blinkTimer = null; (bar as HTMLElement).style.opacity = "1"; }
      if (status === "CRÍTICO") {
        let on = false;
        blinkTimer = window.setInterval(() => {
          on = !on;
          (bar as HTMLElement).style.opacity = on ? "1" : "0.45";
        }, 550);
        const now = Date.now();
        if (now - lastAudible > 2000) {
          beep(880, 180);
          setTimeout(() => beep(660, 160), 220);
          lastAudible = now;
        }
      }
    }

    function formatLabel(ts: string | number | Date, range: "1h" | "7d" | "30d") {
      const dt = toBrasiliaTime(ts);
      if (range === "1h") {
        return new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo"
        }).format(dt);
      }
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo"
      }).format(dt);
    }

    async function load(janela: "1h" | "7d" | "30d" = currentRange) {
      currentRange = janela;
      try {
        // 1) Série para o GRÁFICO (respeita a aba 1h / 7d / 30d)
        const [tJan, uJan, vJan] = await Promise.all([
          api.temperaturaSerie(motorId, janela),
          api.umidadeSerie(motorId, janela),
          api.vibracaoSerie(motorId, janela),
        ]);

        // 2) Série FIXA de 24h para KPIs + alerta → igual ao Dashboard
        const [t24, u24, v24] = await Promise.all([
          api.temperaturaSerie(motorId, "24h"),
          api.umidadeSerie(motorId, "24h"),
          api.vibracaoSerie(motorId, "24h"),
        ]);

        // Atualiza gráfico com a janela selecionada
        const labels = tJan.map(x => formatLabel(x.ts, janela));
        const tvalsJan = tJan.map(x => Number(x.valor) || 0);
        const uvalsJan = uJan.map(x => Number(x.valor) || 0);
        const vvalsJan = vJan.map(x => Number(x.valor) || 0);

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

        // KPIs e alerta sempre baseados em 24h (como no dashboard)
        const tvals = t24.map(x => Number(x.valor) || 0);
        const uvals = u24.map(x => Number(x.valor) || 0);
        const vvals = v24.map(x => Number(x.valor) || 0);

        const currT = tvals.length ? tvals[tvals.length - 1] : NaN;
        const currU = uvals.length ? uvals[uvals.length - 1] : NaN;
        const currV = vvals.length ? vvals[vvals.length - 1] : NaN;

        (document.getElementById("k-temp")!).textContent =
          Number.isFinite(currT) ? `${currT.toFixed(1)} °C` : "-- °C";
        (document.getElementById("k-umi")!).textContent  =
          Number.isFinite(currU) ? `${currU.toFixed(1)} %` : "-- %";
        (document.getElementById("k-vib")!).textContent  =
          Number.isFinite(currV) ? `${currV.toFixed(1)}`   : "--";

        (document.getElementById("k-pico")!).textContent =
          tvals.length ? `${Math.max(...tvals, 0).toFixed(1)} °C` : "-- °C";

        const TEMP_MIN = 22.0, TEMP_MAX = 24.0;
        const UMID_MIN = 40.0, UMID_MAX = 45.0;
        const MOV_MIN  = 5.0,  MOV_MAX  = 20.0;

        const foraFaixa = (v: number, min: number, max: number) =>
          Number.isFinite(v) && (v < min || v > max);

        const tempOff = foraFaixa(currT, TEMP_MIN, TEMP_MAX);
        const umiOff  = foraFaixa(currU, UMID_MIN, UMID_MAX);
        const vibOff  = foraFaixa(currV, MOV_MIN, MOV_MAX);

        (document.getElementById("k-temp") as HTMLElement).style.color =
          tempOff ? "#ff4d4d" : "#ffffff";
        (document.getElementById("k-umi") as HTMLElement).style.color =
          umiOff ? "#ff4d4d" : "#ffffff";
        (document.getElementById("k-vib") as HTMLElement).style.color =
          vibOff ? "#ff4d4d" : "#ffffff";

        const problemas: string[] = [];
        if (tempOff) problemas.push("Temperatura fora da faixa");
        if (umiOff)  problemas.push("Umidade fora da faixa");
        if (vibOff)  problemas.push("Vibração fora da faixa");

        let status: "NORMAL" | "CRÍTICO" = "NORMAL";
        let detalhe = "";
        if (problemas.length) {
          status = "CRÍTICO";
          detalhe = problemas.join(" · ");
        }

        setAlertVisual(status, detalhe);

        // Histórico de alertas
        let alertas: any[] = [];
        try {
          alertas = await api.alertas(20);
        } catch {
          alertas = [];
        }

        const linhas = alertas
          .filter(a => a.motorId === motorId)
          .slice(0, 10)
          .map(a => {
            const corBadge = a.severidade === "alta" ? "err" :
                             a.severidade === "media" ? "warn" : "ok";
            return `
              <tr>
                <td>${fmtTime(a.criado_em)}</td>
                <td>${a.tipo}</td>
                <td>${a.valor ?? "-"}</td>
                <td><span class="badge ${corBadge}">${a.status}</span></td>
              </tr>`;
          })
          .join("");
        (document.getElementById("tb-hist")!).innerHTML =
          linhas || "<tr><td colspan='4'>Sem alertas recentes</td></tr>";

        (document.getElementById("mloc")!).textContent =
          `Local: ${(document.getElementById("mloc")!.textContent?.split("|")[0].replace("Local: ", "").trim()) || "-"} | Último Update: ${
            new Intl.DateTimeFormat("pt-BR", { timeStyle: "medium", hour12: false, timeZone: "America/Sao_Paulo" })
              .format(toBrasiliaTime(new Date()))
          }`;

      } catch (e) {
        console.warn("Falha ao carregar leituras/alertas:", e);
        (document.getElementById("tb-hist")!).innerHTML =
          "<tr><td colspan='4'>Erro ao carregar histórico</td></tr>";
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

    await load("1h");
    stop = poll(() => load(currentRange), 5000, () => {});
  }, 0);

  return view;
}
