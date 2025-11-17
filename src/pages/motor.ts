// src/pages/motor.ts
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

  const view = `
    ${Sidebar("motores")}
    ${Topbar(`Motor ${motorId}`, company)}
    <div class="main-content">
      <div class="container">
        <div class="card">
          <div class="critical-bar" id="alertBar">NORMAL</div>
          <h2 id="mtitle" style="margin:0 0 6px 0">MTR ${motorId}</h2>
          <div id="mloc" style="opacity:.9; margin-bottom:12px">Local: -- | Último Update: --</div>

          <div class="kpi-cards">
            <div class="card">
              <div>Temperatura</div>
              <div id="k-temp" style="font-size:28px; font-weight:800">-- °C</div>
              <div id="k-temp-sub" style="opacity:.85">—</div>
            </div>
            <div class="card">
              <div>Umidade</div>
              <div id="k-umi" style="font-size:28px; font-weight:800">-- %</div>
              <div id="k-umi-sub" style="opacity:.85">—</div>
            </div>
            <div class="card">
              <div>Vibração (RMS)</div>
              <div id="k-vib" style="font-size:28px; font-weight:800">--</div>
              <div id="k-vib-sub" style="opacity:.85">—</div>
            </div>
            <div class="card">
              <div>Pico (Temp) 24h</div>
              <div id="k-pico" style="font-size:32px; font-weight:800">-- °C</div>
              <div style="opacity:.85">—</div>
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

    function setAlertVisual(status: "NORMAL"|"ATENÇÃO"|"CRÍTICO") {
      const bar = $("#alertBar");
      bar.textContent = status;

      let bg = "rgba(50,200,100,.35)";
      if (status === "ATENÇÃO") bg = "rgba(255,180,40,.7)";
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
        // beep a cada 2 segundos em crítico
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
        const [t, u, v, alertas] = await Promise.all([
          api.temperaturaSerie(motorId, janela),
          api.umidadeSerie(motorId, janela),
          api.vibracaoSerie(motorId, janela),
          api.alertas(20)
        ]);

        const labels = t.map(x => formatLabel(x.ts, janela));
        const tvals = t.map(x => Number(x.valor) || 0);
        const uvals = u.map(x => Number(x.valor) || 0);
        const vvals = v.map(x => Number(x.valor) || 0);

        if (chart) {
          chart.data.labels = labels;
          chart.data.datasets[0].data = tvals;
          chart.data.datasets[1].data = uvals;
          chart.data.datasets[2].data = vvals;

          (chart.options.scales!.y as any).suggestedMax =
            Math.max(
              Math.ceil((Math.max(...tvals, 0) + 5) / 5) * 5,
              Math.ceil((Math.max(...uvals, 0) + 5) / 5) * 5,
              Math.ceil((Math.max(...vvals, 0) + 1) / 1) * 1,
              10
            );
          chart.update();
        }

        const lastT = t.length ? t[t.length - 1].valor : 0;
        const lastU = u.length ? u[u.length - 1].valor : 0;
        const lastV = v.length ? v[v.length - 1].valor : 0;

        (document.getElementById("k-temp")!).textContent = `${lastT.toFixed(1)} °C`;
        (document.getElementById("k-umi")!).textContent  = `${lastU.toFixed(1)} %`;
        (document.getElementById("k-vib")!).textContent  = `${lastV.toFixed(1)}`;
        (document.getElementById("k-pico")!).textContent = `${Math.max(...tvals, 0).toFixed(1)} °C`;
        (document.getElementById("k-temp-sub")!).textContent = t.length ? "Monitorando" : "Sem dados";
        (document.getElementById("k-umi-sub")!).textContent  = u.length ? "Monitorando" : "Sem dados";
        (document.getElementById("k-vib-sub")!).textContent  = v.length ? "Monitorando" : "Sem dados";

        let status: "NORMAL"|"ATENÇÃO"|"CRÍTICO" = "NORMAL";
        if (lastT > 95 || lastV > 90) status = "CRÍTICO";
        else if (lastT > 80 || lastV > 75) status = "ATENÇÃO";

        (document.getElementById("k-temp") as HTMLElement).style.color =
          (lastT > 95) ? "#ff4d4f" : (lastT > 80) ? "#ffcc00" : "#ffb0b0";
        (document.getElementById("k-vib") as HTMLElement).style.color =
          (lastV > 90) ? "#ff4d4f" : (lastV > 75) ? "#ffcc00" : "#b7e3ff";
        (document.getElementById("k-umi") as HTMLElement).style.color = "#b0ffd1";

        setAlertVisual(status);

        const linhas = alertas
          .filter(a => a.motorId === motorId)
          .slice(0, 10)
          .map(a => {
            const corBadge = a.severidade === "alta" ? "err" : a.severidade === "media" ? "warn" : "ok";
            return `
              <tr>
                <td>${fmtTime(a.criado_em)}</td>
                <td>${a.tipo}</td>
                <td>${a.valor ?? "-"}</td>
                <td><span class="badge ${corBadge}">${a.status}</span></td>
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

    await load("1h");
    stop = poll(() => load(currentRange), 5000, () => {});
  }, 0);

  return view;
}
